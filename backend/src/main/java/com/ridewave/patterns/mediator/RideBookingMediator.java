package com.ridewave.patterns.mediator;

import com.ridewave.config.AppProperties;
import com.ridewave.exception.*;
import com.ridewave.model.Booking;
import com.ridewave.model.Payment;
import com.ridewave.model.Ride;
import com.ridewave.model.User;
import com.ridewave.model.enums.BookingStatus;
import com.ridewave.model.enums.PaymentMethod;
import com.ridewave.model.enums.RideStatus;
import com.ridewave.model.enums.UserStatus;
import com.ridewave.patterns.observer.RideEvent;
import com.ridewave.patterns.observer.RideEventPublisher;
import com.ridewave.patterns.observer.RideEventType;
import com.ridewave.repository.BookingRepository;
import com.ridewave.repository.RideRepository;
import com.ridewave.repository.UserRepository;
import com.ridewave.service.PaymentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Mediator Pattern — RideBookingMediator
 *
 * Problem this solves:
 *   The booking flow involves 5 independent services:
 *     1. RideRepository        — check seat availability, decrement seats
 *     2. UserRepository        — load passenger, check trust score
 *     3. BookingRepository     — create/update booking record
 *     4. PaymentService        — hold/charge/refund
 *     5. RideEventPublisher    — notify downstream observers
 *
 *   Without a Mediator, each of these would need direct references to
 *   all the others, creating an N×N dependency mesh. Adding a new step
 *   (e.g. fraud check) would require modifying multiple services.
 *
 * How it works:
 *   RideBookingMediator is the single entry point for all booking operations.
 *   It knows WHAT must happen and in WHAT ORDER. The individual services only
 *   know HOW to do their own job. This is pure Mediator: components communicate
 *   through the mediator, not directly with each other.
 *
 * Operations:
 *   requestBooking   → full booking flow (validate → create → pay → notify)
 *   approveBooking   → driver approves a pending booking
 *   rejectBooking    → driver rejects a pending booking (seat restored, refund)
 *   cancelBooking    → passenger cancels (seat restored, conditional refund)
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class RideBookingMediator {

    private final RideRepository     rideRepository;
    private final UserRepository     userRepository;
    private final BookingRepository  bookingRepository;
    private final PaymentService     paymentService;
    private final RideEventPublisher eventPublisher;
    private final AppProperties      appProperties;

    // ── Request Booking ───────────────────────────────────────────────────

    /**
     * Core booking flow — all steps are atomic within a single transaction.
     *
     * Step 1: Load and validate the ride (status, seat availability)
     * Step 2: Load and validate the passenger (status, trust score)
     * Step 3: Guard against duplicate active bookings on the same ride
     * Step 4: Compute total fare
     * Step 5: Create the Booking record
     * Step 6: Decrement available seats atomically (prevents race condition)
     * Step 7: Process payment (hold for card, charge for cash/wallet)
     * Step 8: Publish event → NotificationObserver fires
     *
     * @return the persisted Booking
     */
    @Transactional
    public Booking requestBooking(UUID passengerId, UUID rideId,
                                  int seats, PaymentMethod paymentMethod) {

        // ── Step 1: Validate ride ────────────────────────────────────────
        Ride ride = rideRepository.findById(rideId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Ride not found: " + rideId));

        if (ride.getStatus() != RideStatus.SCHEDULED) {
            throw new InvalidRideStateException(
                    "This ride is no longer accepting bookings. Status: " + ride.getStatus());
        }
        if (ride.getAvailableSeats() < seats) {
            throw new InsufficientSeatsException(String.format(
                    "Only %d seat(s) available on this ride, but you requested %d.",
                    ride.getAvailableSeats(), seats));
        }
        if (ride.getDepartureTime().isBefore(LocalDateTime.now())) {
            throw new InvalidRideStateException(
                    "This ride has already departed and cannot be booked.");
        }

        // ── Step 2: Validate passenger ───────────────────────────────────
        User passenger = userRepository.findById(passengerId)
                .orElseThrow(() -> new ResourceNotFoundException("Passenger not found"));

        if (passenger.getStatus() != UserStatus.ACTIVE) {
            throw new AccessDeniedException(
                    "Your account must be active to book rides. Status: " + passenger.getStatus());
        }

        double minTrustScore = appProperties.getTrustScore().getMinToBook();
        if (passenger.getTrustScore().doubleValue() < minTrustScore) {
            throw new LowTrustScoreException(String.format(
                    "Your trust score (%.2f) is too low to book rides. " +
                            "Minimum required: %.2f. Please contact support.",
                    passenger.getTrustScore().doubleValue(), minTrustScore));
        }

        // Prevent driver from booking their own ride
        if (ride.getDriver().getUserId().equals(passengerId)) {
            throw new BadRequestException("You cannot book your own ride.");
        }

        // ── Step 3: Duplicate booking guard ──────────────────────────────
        boolean alreadyBooked = bookingRepository
                .existsByRide_RideIdAndPassenger_UserIdAndStatusIn(
                        rideId, passengerId,
                        List.of(BookingStatus.PENDING,
                                BookingStatus.APPROVED,
                                BookingStatus.CONFIRMED));
        if (alreadyBooked) {
            throw new DuplicateResourceException(
                    "You already have an active booking on this ride.");
        }

        // ── Step 4: Compute fare ─────────────────────────────────────────
        BigDecimal totalFare = ride.getFarePerSeat()
                .multiply(BigDecimal.valueOf(seats));

        // ── Step 5: Create booking ───────────────────────────────────────
        BookingStatus initialStatus = ride.getRequiresApproval()
                ? BookingStatus.PENDING     // driver must approve
                : BookingStatus.CONFIRMED;  // instant confirmation

        Booking booking = Booking.builder()
                .ride(ride)
                .passenger(passenger)
                .seatsBooked(seats)
                .totalFare(totalFare)
                .status(initialStatus)
                .build();

        booking = bookingRepository.save(booking);

        // ── Step 6: Decrement seats atomically ───────────────────────────
        int updated = rideRepository.decrementAvailableSeats(rideId, seats);
        if (updated == 0) {
            // Concurrent booking grabbed the last seat(s) — rollback via exception
            throw new InsufficientSeatsException(
                    "Seats were just taken by another passenger. Please try again.");
        }

        // ── Step 7: Process payment ──────────────────────────────────────
        Payment payment = paymentService.createPaymentForBooking(booking, paymentMethod);
        booking.setPayment(payment);

        // ── Step 8: Publish event ────────────────────────────────────────
        RideEventType eventType = ride.getRequiresApproval()
                ? RideEventType.BOOKING_REQUESTED
                : RideEventType.BOOKING_APPROVED;

        eventPublisher.publish(RideEvent.of(ride, eventType, booking));

        log.info("Booking created: bookingId={}, rideId={}, passengerId={}, " +
                        "seats={}, fare=PKR {}, status={}",
                booking.getBookingId(), rideId, passengerId,
                seats, totalFare, initialStatus);

        return booking;
    }

    // ── Approve Booking (driver) ──────────────────────────────────────────

    /**
     * Driver approves a PENDING booking on their ride (requiresApproval = true).
     *
     * Step 1: Load booking and verify it belongs to the driver's ride
     * Step 2: Validate booking is in PENDING status
     * Step 3: Transition to APPROVED
     * Step 4: Publish BOOKING_APPROVED → NotificationObserver alerts passenger
     */
    @Transactional
    public Booking approveBooking(UUID driverId, UUID bookingId) {
        Booking booking = loadBookingForDriver(driverId, bookingId);

        if (booking.getStatus() != BookingStatus.PENDING) {
            throw new InvalidRideStateException(
                    "Only PENDING bookings can be approved. Current status: " + booking.getStatus());
        }

        bookingRepository.updateStatus(bookingId, BookingStatus.APPROVED);
        booking.setStatus(BookingStatus.APPROVED);

        eventPublisher.publish(
                RideEvent.of(booking.getRide(), RideEventType.BOOKING_APPROVED, booking));

        log.info("Booking approved: bookingId={}, driverId={}", bookingId, driverId);
        return booking;
    }

    // ── Reject Booking (driver) ───────────────────────────────────────────

    /**
     * Driver rejects a PENDING booking.
     *
     * Step 1: Validate booking belongs to driver's ride and is PENDING
     * Step 2: Cancel the booking
     * Step 3: Restore seats — the slot opens back up for other passengers
     * Step 4: Refund payment
     * Step 5: Publish BOOKING_REJECTED event
     */
    @Transactional
    public Booking rejectBooking(UUID driverId, UUID bookingId, String reason) {
        Booking booking = loadBookingForDriver(driverId, bookingId);

        if (booking.getStatus() != BookingStatus.PENDING) {
            throw new InvalidRideStateException(
                    "Only PENDING bookings can be rejected. Current status: " + booking.getStatus());
        }

        // Cancel with reason
        bookingRepository.updateStatus(bookingId, BookingStatus.CANCELLED);
        booking.setStatus(BookingStatus.CANCELLED);
        booking.setCancellationReason(reason);
        booking.setCancelledAt(LocalDateTime.now());
        bookingRepository.save(booking);

        // Restore seats
        rideRepository.incrementAvailableSeats(booking.getRide().getRideId(),
                booking.getSeatsBooked());

        // Refund payment
        paymentService.refundPayment(bookingId);

        // Notify passenger
        eventPublisher.publish(
                RideEvent.of(booking.getRide(), RideEventType.BOOKING_REJECTED, booking));

        log.info("Booking rejected: bookingId={}, driverId={}, reason={}", bookingId, driverId, reason);
        return booking;
    }

    // ── Cancel Booking (passenger or admin) ───────────────────────────────

    /**
     * Passenger cancels their own booking (or admin cancels any booking).
     *
     * Step 1: Validate booking ownership and cancellable status
     * Step 2: Mark booking CANCELLED
     * Step 3: Restore the seats back to the ride
     * Step 4: Refund payment (if any)
     * Step 5: Notify driver via observer
     */
    @Transactional
    public Booking cancelBooking(UUID requesterId, UUID bookingId,
                                 String reason, boolean isAdmin) {
        Booking booking = isAdmin
                ? bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Booking not found: " + bookingId))
                : bookingRepository.findByBookingIdAndPassenger_UserId(bookingId, requesterId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Booking not found or does not belong to you."));

        if (booking.getStatus() == BookingStatus.CANCELLED
                || booking.getStatus() == BookingStatus.COMPLETED) {
            throw new InvalidRideStateException(
                    "Booking is already " + booking.getStatus() + " and cannot be cancelled.");
        }

        // LOCKED BOOKING RULE: once a booking is APPROVED or CONFIRMED it is
        // locked — passengers cannot cancel (only admin can override).
        // This prevents seat-availability abuse and protects driver earnings.
        if (!isAdmin
                && (booking.getStatus() == BookingStatus.APPROVED
                || booking.getStatus() == BookingStatus.CONFIRMED)) {
            throw new InvalidRideStateException(
                    "This booking is " + booking.getStatus() +
                            " and can no longer be cancelled. " +
                            "Please contact support if there is an emergency.");
        }

        Ride ride = booking.getRide();

        if (ride.getStatus() == RideStatus.COMPLETED
                && booking.getStatus() != BookingStatus.COMPLETED) {

            throw new InvalidRideStateException(
                    "This ride has already been completed.");
        }

        // Mark cancelled
        bookingRepository.updateStatus(bookingId, BookingStatus.CANCELLED);
        booking.setCancellationReason(reason);
        booking.setCancelledAt(LocalDateTime.now());
        bookingRepository.save(booking);

        // Restore seats — only if the ride is still active
        if (ride.getStatus() == RideStatus.SCHEDULED
                || ride.getStatus() == RideStatus.IN_PROGRESS) {
            rideRepository.incrementAvailableSeats(ride.getRideId(), booking.getSeatsBooked());
        }

        // Refund payment
        paymentService.refundPayment(bookingId);

        // Notify the driver (passenger cancelled)
        eventPublisher.publish(
                RideEvent.of(ride, RideEventType.BOOKING_REJECTED, booking));

        log.info("Booking cancelled: bookingId={}, by={}, reason={}", bookingId, requesterId, reason);
        return booking;
    }

    // ── Private helpers ───────────────────────────────────────────────────

    /**
     * Loads a booking and verifies the requesting driver owns the ride it belongs to.
     */
    private Booking loadBookingForDriver(UUID driverId, UUID bookingId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Booking not found: " + bookingId));

        if (!booking.getRide().getDriver().getUserId().equals(driverId)) {
            throw new AccessDeniedException(
                    "This booking does not belong to one of your rides.");
        }
        return booking;
    }
}