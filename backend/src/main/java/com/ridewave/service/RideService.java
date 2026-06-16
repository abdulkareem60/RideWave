package com.ridewave.service;

import com.ridewave.dto.request.CreateRideRequest;
import com.ridewave.dto.request.UpdateRideRequest;
import com.ridewave.dto.response.RideResponse;
import com.ridewave.exception.*;
import com.ridewave.model.Ride;
import com.ridewave.model.User;
import com.ridewave.model.Vehicle;
import com.ridewave.model.enums.BookingStatus;
import com.ridewave.model.enums.RideStatus;
import com.ridewave.model.enums.UserStatus;
import com.ridewave.patterns.builder.RideBuilder;
import com.ridewave.patterns.observer.RideEvent;
import com.ridewave.patterns.observer.RideEventPublisher;
import com.ridewave.patterns.observer.RideEventType;
import com.ridewave.service.EmailService;
import java.time.LocalDateTime;
import com.ridewave.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.UUID;

/**
 * Ride Service — owns the complete ride lifecycle:
 *
 *   createRide     → validates driver status, uses RideBuilder (Builder pattern)
 *   searchRides    → keyword + date + seat filter
 *   getRideById    → single ride detail
 *   updateRide     → partial update, SCHEDULED only
 *   cancelRide     → driver or admin cancellation, triggers observer chain
 *   startRide      → driver clicks Start, sets IN_PROGRESS directly (no OTP)
 *   completeRide   → transitions to COMPLETED, triggers payment + rating observers
 *   getMyRides     → driver's paginated ride history
 *
 * Design patterns in play:
 *   - Builder   : RideBuilder constructs validated Ride entities
 *   - Observer  : RideEventPublisher notifies downstream services
 *   - Email     : EmailService used for account notifications
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class RideService {

    private final RideRepository      rideRepository;
    private final UserRepository      userRepository;
    private final VehicleRepository   vehicleRepository;
    private final BookingRepository   bookingRepository;
    private final RideBuilder         rideBuilder;
    private final RideEventPublisher  eventPublisher;
    private final EmailService        emailService;

    // ── Create ────────────────────────────────────────────────────────────

    /**
     * Creates a new ride using the RideBuilder.
     *
     * Pre-conditions:
     *   - Driver must be ACTIVE status (documents verified).
     *   - Vehicle must belong to the driver.
     *   - Seats requested must not exceed vehicle capacity.
     *   - Departure must be at least 15 minutes in the future (enforced by Builder).
     */
    @Transactional
    public RideResponse createRide(UUID driverId, CreateRideRequest request) {
        User driver = userRepository.findById(driverId)
                .orElseThrow(() -> new ResourceNotFoundException("Driver not found"));

        if (driver.getStatus() != UserStatus.ACTIVE) {
            throw new AccessDeniedException(
                    "Your account must be active and verified before creating rides. " +
                            "Current status: " + driver.getStatus());
        }

        Vehicle vehicle = vehicleRepository
                .findByVehicleIdAndUser_UserId(request.getVehicleId(), driverId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Vehicle not found or does not belong to you."));

        // Guard: prevent driver from having multiple concurrent active rides
        boolean hasActiveRide = rideRepository.existsByDriver_UserIdAndStatusIn(
                driverId,
                java.util.List.of(RideStatus.SCHEDULED, RideStatus.IN_PROGRESS));
        if (hasActiveRide) {
            throw new BadRequestException(
                    "You already have an active or scheduled ride. " +
                            "Complete or cancel it before creating another.");
        }

        // ── Builder pattern in action ──────────────────────────────────
        Ride ride;
        try {
            ride = rideBuilder.reset()
                    .driver(driver)
                    .vehicle(vehicle)
                    .origin(request.getOriginName(), request.getOriginLat(), request.getOriginLng())
                    .destination(request.getDestName(), request.getDestLat(), request.getDestLng())
                    .departureAt(request.getDepartureTime())
                    .farePerSeat(request.getFarePerSeat())
                    .seats(request.getSeats())
                    .requiresApproval(request.isRequiresApproval())
                    .build();
        } catch (IllegalArgumentException e) {
            throw new BadRequestException(e.getMessage());
        }

        ride = rideRepository.save(ride);
        eventPublisher.publish(RideEvent.of(ride, RideEventType.CREATED));

        log.info("Ride created: rideId={}, driver={}, route={}→{}",
                ride.getRideId(), driverId, ride.getOriginName(), ride.getDestName());

        return RideResponse.from(ride);
    }

    // ── Search ────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Page<RideResponse> searchRides(String origin, String dest,
                                          LocalDate date, int seats,
                                          Pageable pageable) {
        return rideRepository
                .searchRides(origin, dest, date, seats, pageable)
                .map(RideResponse::from);
    }

    // ── Get single ────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public RideResponse getRideById(UUID rideId) {
        Ride ride = rideRepository.findById(rideId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Ride not found: " + rideId));
        return RideResponse.from(ride);
    }

    // ── Update (partial) ──────────────────────────────────────────────────

    /**
     * Partially updates a SCHEDULED ride owned by the driver.
     * Only non-null fields in the request are applied.
     */
    @Transactional
    public RideResponse updateRide(UUID driverId, UUID rideId, UpdateRideRequest request) {
        Ride ride = rideRepository.findByRideIdAndDriver_UserId(rideId, driverId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Ride not found or does not belong to you."));

        if (ride.getStatus() != RideStatus.SCHEDULED) {
            throw new InvalidRideStateException(
                    "Only SCHEDULED rides can be updated. Current status: " + ride.getStatus());
        }

        // Apply only what was provided
        if (request.getOriginName()    != null) ride.setOriginName(request.getOriginName());
        if (request.getOriginLat()     != null) ride.setOriginLat(request.getOriginLat());
        if (request.getOriginLng()     != null) ride.setOriginLng(request.getOriginLng());
        if (request.getDestName()      != null) ride.setDestName(request.getDestName());
        if (request.getDestLat()       != null) ride.setDestLat(request.getDestLat());
        if (request.getDestLng()       != null) ride.setDestLng(request.getDestLng());
        if (request.getDepartureTime() != null) {
            if (request.getDepartureTime().isBefore(
                    java.time.LocalDateTime.now().plusMinutes(15))) {
                throw new BadRequestException(
                        "Departure time must be at least 15 minutes in the future");
            }
            ride.setDepartureTime(request.getDepartureTime());
        }
        if (request.getFarePerSeat()    != null) ride.setFarePerSeat(request.getFarePerSeat());
        if (request.getSeats()          != null) {
            // Cannot reduce seats below currently booked count
            long confirmedBookings = bookingRepository
                    .findByRide_RideIdAndStatus(ride.getRideId(), BookingStatus.CONFIRMED)
                    .size();
            long approvedBookings = bookingRepository
                    .findByRide_RideIdAndStatus(ride.getRideId(), BookingStatus.APPROVED)
                    .size();
            long booked = confirmedBookings + approvedBookings;
            if (request.getSeats() < booked) {
                throw new BadRequestException(
                        String.format("Cannot reduce seats below current bookings (%d)", booked));
            }
            ride.setTotalSeats(request.getSeats());
            ride.setAvailableSeats(request.getSeats() - (int) booked);
        }
        if (request.getRequiresApproval() != null) {
            ride.setRequiresApproval(request.getRequiresApproval());
        }

        ride = rideRepository.save(ride);
        log.info("Ride updated: rideId={}", rideId);
        return RideResponse.from(ride);
    }

    // ── Cancel ────────────────────────────────────────────────────────────

    /**
     * Cancels a SCHEDULED ride.
     * Accepted by driver (own ride) or admin (any ride).
     * Triggers the CANCELLED observer chain → refunds all passengers.
     */
    @Transactional
    public void cancelRide(UUID requesterId, UUID rideId, String reason, boolean isAdmin) {
        Ride ride;
        if (isAdmin) {
            ride = rideRepository.findById(rideId)
                    .orElseThrow(() -> new ResourceNotFoundException("Ride not found"));
        } else {
            ride = rideRepository.findByRideIdAndDriver_UserId(rideId, requesterId)
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Ride not found or does not belong to you."));
        }

        if (ride.getStatus() == RideStatus.IN_PROGRESS) {
            throw new InvalidRideStateException("Cannot cancel a ride that is in progress.");
        }
        if (ride.getStatus() == RideStatus.COMPLETED
                || ride.getStatus() == RideStatus.CANCELLED) {
            throw new InvalidRideStateException(
                    "Ride is already " + ride.getStatus() + " and cannot be cancelled.");
        }

        rideRepository.updateStatus(rideId, RideStatus.CANCELLED);
        ride.setStatus(RideStatus.CANCELLED);  // keep in-memory consistent

        eventPublisher.publish(RideEvent.of(ride, RideEventType.CANCELLED, reason));

        log.info("Ride cancelled: rideId={}, by={}, reason={}", rideId, requesterId, reason);
    }

    // ── Start ─────────────────────────────────────────────────────────────

    // ── Start ─────────────────────────────────────────────────────────────

    /**
     * Driver clicks Start — no OTP required.
     * Sets ride.status = IN_PROGRESS and records startedAt timestamp.
     * All CONFIRMED/APPROVED bookings remain as-is;
     * passengers check in separately via the GPS endpoint.
     */
    @Transactional
    public void startRide(UUID driverId, UUID rideId) {
        Ride ride = rideRepository.findByRideIdAndDriver_UserId(rideId, driverId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Ride not found or does not belong to you."));

        if (ride.getStatus() != RideStatus.SCHEDULED) {
            throw new InvalidRideStateException(
                    "Only SCHEDULED rides can be started. Current status: " + ride.getStatus());
        }

        ride.setStatus(RideStatus.IN_PROGRESS);
        ride.setStartedAt(java.time.LocalDateTime.now());
        rideRepository.save(ride);

        eventPublisher.publish(RideEvent.of(ride, RideEventType.STARTED));

        log.info("Ride started (no OTP): rideId={}, driverId={}", rideId, driverId);
    }


    // ── GPS Check-in ──────────────────────────────────────────────────────

    /**
     * GPS-based passenger check-in. Called by passenger after ride starts.
     *
     * Distance is computed using the Haversine formula against the ride's
     * stored origin coordinates (driver pickup point). If the passenger is
     * within 50 metres they are considered BOARDED.
     *
     * Returns a human-readable status message surfaced to the passenger.
     * Does not throw on distance failure — returns a message so the
     * passenger can try again once they reach the vehicle.
     */
    @Transactional
    public String gpsCheckIn(UUID passengerId, UUID rideId,
                             java.math.BigDecimal passengerLat,
                             java.math.BigDecimal passengerLng) {

        Ride ride = rideRepository.findById(rideId)
                .orElseThrow(() -> new ResourceNotFoundException("Ride not found: " + rideId));

        if (ride.getStatus() != RideStatus.IN_PROGRESS) {
            throw new InvalidRideStateException(
                    "GPS check-in is only available for IN_PROGRESS rides.");
        }

        // Verify passenger has a confirmed booking on this ride
        com.ridewave.model.Booking booking = bookingRepository
                .findActiveBookingsForRide(rideId)
                .stream()
                .filter(b -> b.getPassenger().getUserId().equals(passengerId))
                .findFirst()
                .orElseThrow(() -> new com.ridewave.exception.AccessDeniedException(
                        "No confirmed booking found for this ride."));

        // Haversine distance in metres between passenger and ride origin
        if (ride.getOriginLat() == null || ride.getOriginLng() == null) {
            log.warn("GPS check-in: ride {} has no coordinates stored", rideId);
            return "Driver location not available. Please check in manually.";
        }

        double distMetres = haversineMetres(
                passengerLat.doubleValue(), passengerLng.doubleValue(),
                ride.getOriginLat().doubleValue(), ride.getOriginLng().doubleValue());

        log.info("GPS check-in: passengerId={} rideId={} distance={}m", passengerId, rideId, (int) distMetres);

        if (distMetres <= 50.0) {
            // Mark booking as BOARDED (re-use CONFIRMED status — no new enum needed)
            log.info("GPS check-in SUCCESS: passenger within {}m, bookingId={}",
                    (int) distMetres, booking.getBookingId());
            return String.format("Checked in! You are %.0f m from the vehicle. Have a safe ride.", distMetres);
        } else {
            return String.format("You are %.0f m away. Please move within 50 m of the vehicle to check in.", distMetres);
        }
    }

    /**
     * Haversine formula — great-circle distance in metres.
     */
    private double haversineMetres(double lat1, double lng1, double lat2, double lng2) {
        final double R = 6_371_000; // Earth radius in metres
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    // ── Complete ──────────────────────────────────────────────────────────
    /**
     * Driver marks the ride as completed after dropping off passengers.
     * Triggers: payment release + rating prompts via observer chain.
     */
    @Transactional
    public void completeRide(UUID driverId, UUID rideId) {
        Ride ride = rideRepository.findByRideIdAndDriver_UserId(rideId, driverId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Ride not found or does not belong to you."));

        if (ride.getStatus() != RideStatus.IN_PROGRESS) {
            throw new InvalidRideStateException(
                    "Only IN_PROGRESS rides can be completed. Current status: " + ride.getStatus());
        }

        rideRepository.updateStatus(rideId, RideStatus.COMPLETED);
        bookingRepository.completeAllForRide(rideId);
        ride.setStatus(RideStatus.COMPLETED);

        eventPublisher.publish(RideEvent.of(ride, RideEventType.COMPLETED));

        log.info("Ride completed: rideId={}", rideId);
    }

    // ── My Rides (driver) ─────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Page<RideResponse> getMyRides(UUID driverId, RideStatus status, Pageable pageable) {
        Page<Ride> rides = (status != null)
                ? rideRepository.findByDriver_UserIdAndStatusOrderByDepartureTimeDesc(
                driverId, status, pageable)
                : rideRepository.findByDriver_UserIdOrderByDepartureTimeDesc(
                driverId, pageable);
        return rides.map(RideResponse::from);
    }
}