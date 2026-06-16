package com.ridewave.patterns.observer;

import com.ridewave.model.Booking;
import com.ridewave.model.enums.BookingStatus;
import com.ridewave.repository.BookingRepository;
import com.ridewave.service.PaymentService;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Observer Pattern — PaymentObserver (Concrete Observer)
 *
 * Reacts to ride completion and cancellation events to settle payments.
 *
 * COMPLETED → release/capture all held payments for confirmed passengers
 * CANCELLED → refund all non-cancelled bookings on the ride
 *
 * This observer is completely decoupled from RideService — the ride service
 * fires the event and this class handles the financial side-effect.
 * Adding a new payment action (e.g. tip processing) only requires
 * modifying this observer, not RideService.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class PaymentObserver implements RideEventObserver {

    private final RideEventPublisher publisher;
    private final PaymentService     paymentService;
    private final BookingRepository  bookingRepository;

    @PostConstruct
    public void register() {
        publisher.register(this);
        log.info("PaymentObserver registered with RideEventPublisher");
    }

    @Override
    public void onRideEvent(RideEvent event) {
        switch (event.eventType()) {

            case COMPLETED -> {
                // Release payments for all confirmed/approved bookings
                List<Booking> activeBookings = bookingRepository
                        .findActiveBookingsForRide(event.ride().getRideId());

                log.info("PaymentObserver: releasing {} payments for completed rideId={}",
                        activeBookings.size(), event.ride().getRideId());

                activeBookings.forEach(booking -> {
                    try {
                        paymentService.releasePayment(booking.getBookingId());
                    } catch (Exception e) {
                        log.error("Failed to release payment for bookingId={}: {}",
                                booking.getBookingId(), e.getMessage());
                    }
                });
            }

            case CANCELLED -> {
                // Refund all passengers who were not already cancelled
                List<BookingStatus> refundableStatuses = List.of(
                        BookingStatus.PENDING,
                        BookingStatus.APPROVED,
                        BookingStatus.CONFIRMED);

                refundableStatuses.forEach(status ->
                        bookingRepository.findByRide_RideIdAndStatus(
                                        event.ride().getRideId(), status)
                                .forEach(booking -> {
                                    try {
                                        paymentService.refundPayment(booking.getBookingId());
                                    } catch (Exception e) {
                                        log.error("Failed to refund payment for bookingId={}: {}",
                                                booking.getBookingId(), e.getMessage());
                                    }
                                })
                );

                log.info("PaymentObserver: refunds processed for cancelled rideId={}",
                        event.ride().getRideId());
            }

            default -> { /* PaymentObserver only cares about COMPLETED and CANCELLED */ }
        }
    }
}