package com.ridewave.patterns.builder;

import com.ridewave.model.Ride;
import com.ridewave.model.User;
import com.ridewave.model.Vehicle;
import com.ridewave.model.enums.RideStatus;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

/**
 * Builder Pattern — RideBuilder
 *
 * Problem this solves:
 *   A Ride entity has 15+ fields. A constructor with 15 parameters is unreadable,
 *   fragile (easy to swap arguments of the same type), and can't validate field
 *   interdependencies (e.g. availableSeats must not exceed vehicle.totalSeats).
 *
 * How it works:
 *   - Each setter returns 'this' for fluent chaining.
 *   - Each setter performs immediate, atomic field-level validation.
 *   - build() performs cross-field validation before constructing the entity.
 *   - reset() allows the same Spring singleton bean to be reused across requests
 *     without creating a new instance each time.
 *
 * Usage in RideService:
 *   Ride ride = rideBuilder
 *       .driver(driverUser)
 *       .vehicle(vehicle)
 *       .origin("Karachi", 24.8607, 67.0011)
 *       .destination("Lahore", 31.5204, 74.3587)
 *       .departureAt(LocalDateTime.now().plusHours(2))
 *       .farePerSeat(new BigDecimal("500.00"))
 *       .seats(3)
 *       .requiresApproval(false)
 *       .build();
 *
 * Note on thread safety:
 *   RideBuilder is @Component (Spring singleton) but each service call begins with
 *   reset(), making the state per-call. For true thread safety in high-concurrency
 *   environments, use a prototype-scoped bean or a static factory that creates a
 *   new builder instance per call.
 */
@Component
public class RideBuilder {

    // ── State ─────────────────────────────────────────────────────────────

    private User          driver;
    private Vehicle       vehicle;
    private String        originName;
    private BigDecimal    originLat;
    private BigDecimal    originLng;
    private String        destName;
    private BigDecimal    destLat;
    private BigDecimal    destLng;
    private LocalDateTime departureTime;
    private BigDecimal    farePerSeat;
    private Integer       availableSeats;
    private boolean       requiresApproval = false;

    // ── Fluent setters (each validates its own input) ─────────────────────

    public RideBuilder driver(User driver) {
        Objects.requireNonNull(driver, "Driver must not be null");
        this.driver = driver;
        return this;
    }

    public RideBuilder vehicle(Vehicle vehicle) {
        Objects.requireNonNull(vehicle, "Vehicle must not be null");
        this.vehicle = vehicle;
        return this;
    }

    public RideBuilder origin(String name, BigDecimal lat, BigDecimal lng) {
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("Origin name must not be blank");
        }
        this.originName = name.trim();
        this.originLat  = lat;
        this.originLng  = lng;
        return this;
    }

    public RideBuilder destination(String name, BigDecimal lat, BigDecimal lng) {
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("Destination name must not be blank");
        }
        this.destName = name.trim();
        this.destLat  = lat;
        this.destLng  = lng;
        return this;
    }

    public RideBuilder departureAt(LocalDateTime time) {
        Objects.requireNonNull(time, "Departure time must not be null");
        if (time.isBefore(LocalDateTime.now().plusMinutes(15))) {
            throw new IllegalArgumentException(
                    "Departure time must be at least 15 minutes in the future");
        }
        this.departureTime = time;
        return this;
    }

    public RideBuilder farePerSeat(BigDecimal fare) {
        Objects.requireNonNull(fare, "Fare per seat must not be null");
        if (fare.compareTo(BigDecimal.ONE) < 0) {
            throw new IllegalArgumentException("Fare per seat must be at least 1.00");
        }
        this.farePerSeat = fare;
        return this;
    }

    public RideBuilder seats(int seats) {
        if (seats < 1) {
            throw new IllegalArgumentException("At least 1 seat must be offered");
        }
        if (seats > 8) {
            throw new IllegalArgumentException("Maximum 8 seats allowed per ride");
        }
        this.availableSeats = seats;
        return this;
    }

    public RideBuilder requiresApproval(boolean requiresApproval) {
        this.requiresApproval = requiresApproval;
        return this;
    }

    // ── Build ─────────────────────────────────────────────────────────────

    /**
     * Performs cross-field validation then constructs the Ride entity.
     *
     * Cross-field rules:
     *   1. Seats offered must not exceed the vehicle's total seat capacity.
     *   2. Origin and destination names must differ (no zero-distance rides).
     *   3. All mandatory fields must be non-null (defensive final check).
     *
     * @throws IllegalStateException if any mandatory field is missing.
     * @throws IllegalArgumentException if cross-field rules are violated.
     */
    public Ride build() {
        // ── Mandatory field guard ────────────────────────────────────────
        List<String> missing = new ArrayList<>();
        if (driver        == null) missing.add("driver");
        if (vehicle       == null) missing.add("vehicle");
        if (originName    == null) missing.add("originName");
        if (destName      == null) missing.add("destName");
        if (departureTime == null) missing.add("departureTime");
        if (farePerSeat   == null) missing.add("farePerSeat");
        if (availableSeats == null) missing.add("seats");

        if (!missing.isEmpty()) {
            throw new IllegalStateException(
                    "Cannot build Ride — missing required fields: " + missing);
        }

        // ── Cross-field validation ────────────────────────────────────────
        if (availableSeats > vehicle.getTotalSeats()) {
            throw new IllegalArgumentException(
                    String.format("Offered seats (%d) cannot exceed vehicle capacity (%d)",
                            availableSeats, vehicle.getTotalSeats()));
        }

        if (originName.equalsIgnoreCase(destName)) {
            throw new IllegalArgumentException(
                    "Origin and destination must be different locations");
        }

        // ── Construct entity ─────────────────────────────────────────────
        Ride ride = new Ride();
        ride.setDriver(driver);
        ride.setVehicle(vehicle);
        ride.setOriginName(originName);
        ride.setOriginLat(originLat);
        ride.setOriginLng(originLng);
        ride.setDestName(destName);
        ride.setDestLat(destLat);
        ride.setDestLng(destLng);
        ride.setDepartureTime(departureTime);
        ride.setFarePerSeat(farePerSeat);
        ride.setAvailableSeats(availableSeats);
        ride.setTotalSeats(availableSeats);
        ride.setRequiresApproval(requiresApproval);
        ride.setStatus(RideStatus.SCHEDULED);

        return ride;
    }

    // ── Reset ─────────────────────────────────────────────────────────────

    /**
     * Clears all state so this singleton bean can be reused for the next request.
     * Always call this before building a new ride.
     */
    public RideBuilder reset() {
        driver         = null;
        vehicle        = null;
        originName     = null;
        originLat      = null;
        originLng      = null;
        destName       = null;
        destLat        = null;
        destLng        = null;
        departureTime  = null;
        farePerSeat    = null;
        availableSeats = null;
        requiresApproval = false;
        return this;
    }
}