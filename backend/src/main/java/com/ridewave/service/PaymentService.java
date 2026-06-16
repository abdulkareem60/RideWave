package com.ridewave.service;

import com.ridewave.dto.response.PaymentResponse;
import com.ridewave.exception.BadRequestException;
import com.ridewave.exception.ResourceNotFoundException;
import com.ridewave.model.Booking;
import com.ridewave.model.Payment;
import com.ridewave.model.enums.PaymentMethod;
import com.ridewave.model.enums.PaymentStatus;
import com.ridewave.patterns.nullobject.PaymentProcessor;
import com.ridewave.patterns.nullobject.PaymentResult;
import com.ridewave.repository.BookingRepository;
import com.ridewave.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Payment Service — owns payment creation, capture, and refund.
 *
 * This service depends on PaymentProcessor (the interface), not on any
 * concrete implementation. In dev/test, the NullPaymentProcessor (Null Object)
 * is injected — PaymentService never knows the difference and requires
 * zero null-checks.
 *
 * Payment flow per booking:
 *   CASH          → status = PENDING until ride completes (driver collects physically)
 *   CARD/WALLET   → hold on booking, capture on ride COMPLETED
 *   EASYPAISA/    → treated as PENDING; simulate capture on COMPLETED
 *   JAZZCASH
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final BookingRepository bookingRepository;
    private final PaymentProcessor  paymentProcessor;   // NullPaymentProcessor in dev

    // ── Create and hold payment on booking ────────────────────────────────

    /**
     * Creates a Payment record and calls the processor to hold/charge funds.
     *
     * Called by RideBookingMediator immediately after the Booking is persisted.
     *
     * @return the saved Payment entity
     */
    @Transactional
    public Payment createPaymentForBooking(Booking booking, PaymentMethod method) {
        BigDecimal amount = booking.getTotalFare();
        String description = String.format("RideWave booking %s — %s → %s",
                booking.getBookingId(),
                booking.getRide().getOriginName(),
                booking.getRide().getDestName());

        // For card payments, hold funds (authorise without capture)
        // For cash/wallet, record as PENDING — driver collects or wallet deducted at completion
        PaymentResult result = isCardLike(method)
                ? paymentProcessor.hold(amount, method.name(), description)
                : paymentProcessor.charge(amount, method.name(), description);

        Payment payment = Payment.builder()
                .booking(booking)
                .payer(booking.getPassenger())
                .amount(amount)
                .method(method)
                .status(result.isSuccess()
                        ? (isCardLike(method) ? PaymentStatus.PENDING : PaymentStatus.COMPLETED)
                        : PaymentStatus.FAILED)
                .transactionRef(result.getTransactionRef())
                .processedAt(result.isSuccess() ? result.getProcessedAt() : null)
                .build();

        payment = paymentRepository.save(payment);

        if (!result.isSuccess()) {
            log.error("Payment failed for bookingId={}: {}", booking.getBookingId(),
                    result.getMessage());
            throw new BadRequestException("Payment failed: " + result.getMessage() +
                    ". Please try a different payment method.");
        }

        log.info("Payment created: paymentId={}, bookingId={}, amount=PKR {}, method={}",
                payment.getPaymentId(), booking.getBookingId(), amount, method);

        return payment;
    }

    // ── Release payment on ride COMPLETED ────────────────────────────────

    /**
     * Called by PaymentObserver when a ride is COMPLETED.
     * Captures the held amount for card payments; marks cash as COMPLETED.
     */
    @Transactional
    public void releasePayment(UUID bookingId) {
        Payment payment = paymentRepository.findByBooking_BookingId(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Payment not found for bookingId: " + bookingId));

        if (payment.getStatus() == PaymentStatus.COMPLETED
                || payment.getStatus() == PaymentStatus.REFUNDED) {
            log.debug("Payment {} already in terminal state {}, skipping release",
                    payment.getPaymentId(), payment.getStatus());
            return;
        }

        PaymentResult result = isCardLike(payment.getMethod())
                ? paymentProcessor.release(payment.getTransactionRef())
                : PaymentResult.success(payment.getTransactionRef(), payment.getAmount());

        PaymentStatus newStatus = result.isSuccess()
                ? PaymentStatus.COMPLETED : PaymentStatus.FAILED;

        paymentRepository.updatePaymentResult(
                payment.getPaymentId(),
                newStatus,
                result.getTransactionRef() != null
                        ? result.getTransactionRef()
                        : payment.getTransactionRef(),
                LocalDateTime.now());

        log.info("Payment released: paymentId={}, bookingId={}, status={}",
                payment.getPaymentId(), bookingId, newStatus);
    }

    // ── Refund on booking/ride CANCELLED ─────────────────────────────────

    /**
     * Called by PaymentObserver when a ride is CANCELLED, or directly when
     * a passenger cancels their booking.
     *
     * Refund policy:
     *   - If ride hasn't started: full refund.
     *   - Cash payments: status set to REFUNDED (no digital reversal needed).
     *   - Card/Wallet: real reversal via PaymentProcessor.
     */
    @Transactional
    public void refundPayment(UUID bookingId) {
        Payment payment = paymentRepository.findByBooking_BookingId(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Payment not found for bookingId: " + bookingId));

        if (payment.getStatus() == PaymentStatus.REFUNDED) {
            log.debug("Payment {} is already refunded, skipping", payment.getPaymentId());
            return;
        }
        if (payment.getStatus() == PaymentStatus.FAILED) {
            log.debug("Payment {} failed originally, nothing to refund", payment.getPaymentId());
            return;
        }

        PaymentResult result;
        if (payment.getMethod() == PaymentMethod.CASH) {
            // Cash: just mark refunded — no digital reversal
            result = PaymentResult.success("CASH-REFUND-" + bookingId, payment.getAmount());
        } else {
            result = paymentProcessor.refund(payment.getTransactionRef(), payment.getAmount());
        }

        paymentRepository.updatePaymentResult(
                payment.getPaymentId(),
                PaymentStatus.REFUNDED,
                result.getTransactionRef(),
                LocalDateTime.now());

        log.info("Payment refunded: paymentId={}, bookingId={}, amount=PKR {}",
                payment.getPaymentId(), bookingId, payment.getAmount());
    }

    // ── Read ──────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public PaymentResponse getPaymentForBooking(UUID bookingId) {
        Payment payment = paymentRepository.findByBooking_BookingId(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Payment not found for bookingId: " + bookingId));
        return PaymentResponse.from(payment);
    }

    // ── Helpers ───────────────────────────────────────────────────────────

    private boolean isCardLike(PaymentMethod method) {
        return method == PaymentMethod.CARD;
    }
}