package com.ridewave.service;

import com.ridewave.dto.request.CreateRideRequest;
import com.ridewave.dto.request.UpdateRideRequest;
import com.ridewave.dto.response.RideResponse;
import com.ridewave.exception.*;
import com.ridewave.model.Ride;
import com.ridewave.model.User;
import com.ridewave.model.Vehicle;
import com.ridewave.model.enums.RideStatus;
import com.ridewave.model.enums.UserStatus;
import com.ridewave.patterns.builder.RideBuilder;
import com.ridewave.patterns.observer.RideEvent;
import com.ridewave.patterns.observer.RideEventPublisher;
import com.ridewave.patterns.observer.RideEventType;
import com.ridewave.patterns.adapter.SmsProvider;
import com.ridewave.patterns.factory.NotificationFactory;
import com.ridewave.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Ride Service — owns the complete ride lifecycle.
 *
 * ── Ride management rules ────────────────────────────────────────────────
 *
 * Rule 1 — No overlapping rides (estimatedArrivalTime-based)
 *   Uses true interval overlap: [departure, estimatedArrival] of the new ride
 *   must not intersect any existing SCHEDULED or IN_PROGRESS ride by the same driver.
 *   Fallback: when estimatedArrivalTime is null, departure + 3h is used.
 *
 * Rule 2 — Free modification before bookings
 *   Driver can Edit / Delete / Cancel while bookingCount == 0.
 *
 * Rule 3 — Locked once booked
 *   Edit / Delete / Cancel rejected once ≥1 active booking exists.
 *
 * Rule 4 — In-progress / completed are immutable
 *   Cancellation not allowed in these states.
 *
 * Rule 5 — EXPIRED rides are fully immutable
 *   Cannot be booked, started, edited, or cancelled.
 *   Set automatically by RideExpiryScheduler.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class RideService {

    // Default ride duration when estimatedArrivalTime is not provided.
    // Used for both overlap detection and expiry fallback.
    private static final int DEFAULT_RIDE_DURATION_HOURS = 3;

    private final RideRepository      rideRepository;
    private final UserRepository      userRepository;
    private final VehicleRepository   vehicleRepository;
    private final BookingRepository   bookingRepository;
    private final RideBuilder         rideBuilder;
    private final RideEventPublisher  eventPublisher;
    private final SmsProvider         smsProvider;
    private final NotificationFactory notificationFactory;

    // ── Helpers ────────────────────────────────────────────────────────────

    private RideResponse enrichResponse(Ride ride) {
        long count     = rideRepository.countActiveBookings(ride.getRideId());
        boolean canMod = ride.getStatus() == RideStatus.SCHEDULED && count == 0;
        return RideResponse.fromEnriched(ride, count, canMod);
    }

    /**
     * Throws BadRequestException if the proposed [departure, arrival] interval
     * overlaps an existing SCHEDULED or IN_PROGRESS ride for this driver.
     */
    private void assertNoOverlap(UUID driverId,
                                 LocalDateTime proposedDeparture,
                                 LocalDateTime proposedArrival,
                                 UUID excludeRideId) {

        UUID exclude = excludeRideId != null ? excludeRideId
                : UUID.fromString("00000000-0000-0000-0000-000000000000");

        long conflicts = rideRepository.countOverlappingRides(
                driverId, exclude, proposedDeparture, proposedArrival);

        if (conflicts > 0) {
            throw new BadRequestException(
                    "This ride overlaps with one of your existing active rides. " +
                            "Please choose a different departure time or adjust your " +
                            "estimated arrival time so the rides do not conflict.");
        }
    }

    private void assertNoActiveBookings(Ride ride, String action) {
        long count = rideRepository.countActiveBookings(ride.getRideId());
        if (count > 0) {
            throw new ConflictException(
                    "This ride can no longer be " + action + " because " + count +
                            " passenger" + (count == 1 ? " has" : "s have") +
                            " already booked it. Contact your passengers directly if plans have changed.");
        }
    }

    private void assertNotExpired(Ride ride, String action) {
        if (ride.getStatus() == RideStatus.EXPIRED) {
            throw new BadRequestException(
                    "This ride has expired and cannot be " + action + ". " +
                            "Please create a new ride.");
        }
    }

    // ── Create ────────────────────────────────────────────────────────────

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

        // Compute estimatedArrivalTime
        LocalDateTime departure = request.getDepartureTime();
        LocalDateTime arrival;
        if (request.getRouteDurationS() != null && request.getRouteDurationS() > 0) {
            arrival = departure.plusSeconds(request.getRouteDurationS());
        } else {
            arrival = departure.plusHours(DEFAULT_RIDE_DURATION_HOURS);
        }

        // ── Rule 1: interval-based overlap check ───────────────────────────
        assertNoOverlap(driverId, departure, arrival, null);

        // Derive per-seat fare from the driver's total trip fare
        BigDecimal perSeatFare = request.getTotalTripFare()
                .divide(BigDecimal.valueOf(request.getSeats()), 2, RoundingMode.HALF_UP);

        Ride ride;
        try {
            ride = rideBuilder.reset()
                    .driver(driver)
                    .vehicle(vehicle)
                    .origin(request.getOriginName(), request.getOriginLat(), request.getOriginLng())
                    .destination(request.getDestName(), request.getDestLat(), request.getDestLng())
                    .departureAt(departure)
                    .estimatedArrivalTime(arrival)
                    .farePerSeat(perSeatFare)
                    .seats(request.getSeats())
                    .requiresApproval(request.isRequiresApproval())
                    .routePolyline(request.getRoutePolyline())
                    .routeDistanceM(request.getRouteDistanceM())
                    .build();
        } catch (IllegalArgumentException e) {
            throw new BadRequestException(e.getMessage());
        }

        ride = rideRepository.save(ride);
        eventPublisher.publish(RideEvent.of(ride, RideEventType.CREATED));

        log.info("Ride created: rideId={}, driver={}, {}→{}, departure={}, arrival={}",
                ride.getRideId(), driverId, ride.getOriginName(), ride.getDestName(),
                departure, arrival);

        return RideResponse.fromEnriched(ride, 0L, true);
    }

    // ── Search / Browse ───────────────────────────────────────────────────

    /**
     * Passenger search. When origin and dest are both blank, returns all
     * available rides (browse mode). EXPIRED rides are excluded at query level.
     */
    @Transactional(readOnly = true)
    public Page<RideResponse> searchRides(String origin, String dest,
                                          LocalDate date, int seats,
                                          Pageable pageable) {
        LocalDateTime now = LocalDateTime.now();
        // Date filtering done in Java since HQL :date IS NULL check can be unreliable.
        // Backend returns all future SCHEDULED rides; controller/service filters by date if provided.
        Page<Ride> page = rideRepository
                .searchRides(
                        origin != null ? origin : "",
                        dest   != null ? dest   : "",
                        seats, now, pageable);
        if (date != null) {
            // Post-filter by date — getContent() returns Ride entities
            java.util.List<RideResponse> filtered = page.getContent()
                    .stream()
                    .filter(ride -> ride.getDepartureTime().toLocalDate().equals(date))
                    .map(RideResponse::from)
                    .toList();
            return new org.springframework.data.domain.PageImpl<>(
                    filtered, pageable, filtered.size());
        }
        return page.map(RideResponse::from);
    }

    /**
     * Returns all available SCHEDULED rides with future departure times.
     * Used by the passenger search page on load (before the user searches).
     */
    @Transactional(readOnly = true)
    public Page<RideResponse> browseAllRides(Pageable pageable) {
        return rideRepository
                .findAllAvailableForPassengers(LocalDateTime.now(), pageable)
                .map(RideResponse::from);
    }

    // ── Get single ────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public RideResponse getRideById(UUID rideId) {
        Ride ride = rideRepository.findById(rideId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Ride not found: " + rideId));
        return enrichResponse(ride);
    }

    // ── Update ────────────────────────────────────────────────────────────

    @Transactional
    public RideResponse updateRide(UUID driverId, UUID rideId, UpdateRideRequest request) {
        Ride ride = rideRepository.findByRideIdAndDriver_UserId(rideId, driverId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Ride not found or does not belong to you."));

        assertNotExpired(ride, "edited");

        if (ride.getStatus() != RideStatus.SCHEDULED) {
            throw new BadRequestException(
                    "Only SCHEDULED rides can be updated. Current status: " + ride.getStatus());
        }

        assertNoActiveBookings(ride, "edited");

        if (request.getDepartureTime() != null) {
            LocalDateTime newDeparture = request.getDepartureTime();
            LocalDateTime newArrival   = ride.getEstimatedArrivalTime() != null
                    ? newDeparture.plus(
                    java.time.Duration.between(ride.getDepartureTime(),
                            ride.getEstimatedArrivalTime()))
                    : newDeparture.plusHours(DEFAULT_RIDE_DURATION_HOURS);

            assertNoOverlap(driverId, newDeparture, newArrival, rideId);
            ride.setDepartureTime(newDeparture);
            ride.setEstimatedArrivalTime(newArrival);
        }

        if (request.getFarePerSeat()      != null) ride.setFarePerSeat(request.getFarePerSeat());
        if (request.getSeats()            != null) ride.setAvailableSeats(request.getSeats());
        if (request.getRequiresApproval() != null) ride.setRequiresApproval(request.getRequiresApproval());

        ride = rideRepository.save(ride);
        log.info("Ride updated: rideId={}, driver={}", rideId, driverId);
        return enrichResponse(ride);
    }

    // ── Delete ────────────────────────────────────────────────────────────

    @Transactional
    public void deleteRide(UUID driverId, UUID rideId) {
        Ride ride = rideRepository.findByRideIdAndDriver_UserId(rideId, driverId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Ride not found or does not belong to you."));

        if (ride.getStatus() != RideStatus.SCHEDULED) {
            throw new BadRequestException(
                    "Only SCHEDULED rides with no bookings can be deleted. " +
                            "Current status: " + ride.getStatus());
        }

        assertNoActiveBookings(ride, "deleted");

        rideRepository.delete(ride);
        log.info("Ride deleted: rideId={}, driver={}", rideId, driverId);
    }

    // ── Cancel ────────────────────────────────────────────────────────────

    @Transactional
    public RideResponse cancelRide(UUID requesterId, UUID rideId,
                                   String reason, boolean isAdmin) {
        Ride ride = isAdmin
                ? rideRepository.findById(rideId)
                .orElseThrow(() -> new ResourceNotFoundException("Ride not found: " + rideId))
                : rideRepository.findByRideIdAndDriver_UserId(rideId, requesterId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Ride not found or does not belong to you."));

        if (ride.getStatus() == RideStatus.IN_PROGRESS) {
            throw new BadRequestException(
                    "A ride that is already in progress cannot be cancelled. " +
                            "Complete the ride instead.");
        }
        if (ride.getStatus() == RideStatus.COMPLETED) {
            throw new BadRequestException("Completed rides cannot be cancelled.");
        }
        if (ride.getStatus() == RideStatus.CANCELLED) {
            throw new BadRequestException("This ride is already cancelled.");
        }
        if (ride.getStatus() == RideStatus.EXPIRED) {
            throw new BadRequestException("Expired rides cannot be cancelled.");
        }

        if (!isAdmin) {
            assertNoActiveBookings(ride, "cancelled");
        }

        ride.setStatus(RideStatus.CANCELLED);
        ride = rideRepository.save(ride);

        eventPublisher.publish(RideEvent.of(ride, RideEventType.CANCELLED));
        log.info("Ride cancelled: rideId={}, by={}, reason={}", rideId, requesterId, reason);
        return enrichResponse(ride);
    }

    // ── Start ─────────────────────────────────────────────────────────────

    @Transactional
    public void startRide(UUID driverId, UUID rideId) {
        Ride ride = rideRepository.findByRideIdAndDriver_UserId(rideId, driverId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Ride not found or does not belong to you."));

        assertNotExpired(ride, "started");

        if (ride.getStatus() != RideStatus.SCHEDULED) {
            throw new InvalidRideStateException(
                    "Only SCHEDULED rides can be started. Current status: " + ride.getStatus());
        }

        ride.setStatus(RideStatus.IN_PROGRESS);
        ride.setStartedAt(LocalDateTime.now());
        rideRepository.save(ride);

        eventPublisher.publish(RideEvent.of(ride, RideEventType.STARTED));
        log.info("Ride started: rideId={}, driverId={}", rideId, driverId);
    }

    // ── GPS Check-in ──────────────────────────────────────────────────────

    @Transactional
    public String gpsCheckIn(UUID passengerId, UUID rideId,
                             BigDecimal passengerLat,
                             BigDecimal passengerLng) {

        Ride ride = rideRepository.findById(rideId)
                .orElseThrow(() -> new ResourceNotFoundException("Ride not found: " + rideId));

        if (ride.getStatus() != RideStatus.IN_PROGRESS) {
            throw new InvalidRideStateException(
                    "GPS check-in is only available for IN_PROGRESS rides.");
        }

        com.ridewave.model.Booking booking = bookingRepository
                .findActiveBookingsForRide(rideId)
                .stream()
                .filter(b -> b.getPassenger().getUserId().equals(passengerId))
                .findFirst()
                .orElseThrow(() -> new AccessDeniedException(
                        "No confirmed booking found for this ride."));

        if (ride.getOriginLat() == null || ride.getOriginLng() == null) {
            return "Driver location not available. Please check in manually.";
        }

        double distMetres = haversineMetres(
                passengerLat.doubleValue(), passengerLng.doubleValue(),
                ride.getOriginLat().doubleValue(), ride.getOriginLng().doubleValue());

        log.info("GPS check-in: passengerId={} rideId={} distance={}m",
                passengerId, rideId, (int) distMetres);

        return distMetres <= 50.0
                ? String.format("Checked in! You are %.0f m from the vehicle. Have a safe ride.", distMetres)
                : String.format("You are %.0f m away. Please move within 50 m of the vehicle to check in.", distMetres);
    }

    private double haversineMetres(double lat1, double lng1, double lat2, double lng2) {
        final double R = 6_371_000;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    // ── Complete ──────────────────────────────────────────────────────────

    @Transactional
    public void completeRide(UUID driverId, UUID rideId) {
        Ride ride = rideRepository.findByRideIdAndDriver_UserId(rideId, driverId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Ride not found or does not belong to you."));

        if (ride.getStatus() != RideStatus.IN_PROGRESS) {
            throw new InvalidRideStateException(
                    "Only IN_PROGRESS rides can be completed. Current status: " + ride.getStatus());
        }

        ride.setStatus(RideStatus.COMPLETED);
        rideRepository.save(ride);

        bookingRepository.completeAllForRide(rideId);

        eventPublisher.publish(RideEvent.of(ride, RideEventType.COMPLETED));
        log.info("Ride completed: rideId={}, driver={}", rideId, driverId);
    }

    // ── My rides ──────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Page<RideResponse> getMyRides(UUID driverId, RideStatus status, Pageable pageable) {
        // Drivers see ALL their rides including EXPIRED — for history/dashboard
        Page<Ride> rides = (status != null)
                ? rideRepository.findByDriver_UserIdAndStatusOrderByDepartureTimeDesc(
                driverId, status, pageable)
                : rideRepository.findByDriver_UserIdOrderByDepartureTimeDesc(
                driverId, pageable);
        return rides.map(this::enrichResponse);
    }
}