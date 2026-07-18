package com.ridewave.patterns.builder;

import com.ridewave.model.Ride;
import com.ridewave.model.User;
import com.ridewave.model.Vehicle;
import com.ridewave.model.enums.RideStatus;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Objects;
import java.util.UUID;

/**
 * Builder pattern: constructs a validated {@link Ride} entity step-by-step,
 * avoiding the telescoping-constructor anti-pattern.
 *
 * Spring manages this as a prototype-scoped or reset()-able singleton.
 * Call reset() at the start of each ride-creation request to clear state
 * from any previous build.
 */
@Component
public class RideBuilder {

    private UUID       driverId;
    private User       driver;
    private Vehicle    vehicle;
    private String     originName;
    private BigDecimal originLat;
    private BigDecimal originLng;
    private String     destName;
    private BigDecimal destLat;
    private BigDecimal destLng;
    private String     routePolyline;   // ← NEW: Google encoded polyline
    private Integer    routeDistanceM;  // total route distance in metres
    private LocalDateTime departureTime;
    private LocalDateTime estimatedArrivalTime;
    private BigDecimal farePerSeat;
    private Integer    availableSeats;
    private Boolean    requiresApproval = false;

    public RideBuilder reset() {
        driverId = null; driver = null; vehicle = null;
        originName = null; originLat = null; originLng = null;
        destName   = null; destLat   = null; destLng   = null;
        routePolyline  = null;
        routeDistanceM = null;
        departureTime        = null;
        estimatedArrivalTime = null;
        farePerSeat    = null;
        availableSeats = null;
        requiresApproval = false;
        return this;
    }

    public RideBuilder driver(User driver) {
        this.driver   = Objects.requireNonNull(driver, "Driver is required");
        this.driverId = driver.getUserId();
        return this;
    }

    public RideBuilder origin(String name, BigDecimal lat, BigDecimal lng) {
        this.originName = name;
        this.originLat  = lat;
        this.originLng  = lng;
        return this;
    }

    public RideBuilder destination(String name, BigDecimal lat, BigDecimal lng) {
        this.destName = name;
        this.destLat  = lat;
        this.destLng  = lng;
        return this;
    }

    /**
     * Sets the Google Maps encoded polyline for the driver's full route.
     * Stored on the Ride entity so RouteValidationService can decode and
     * validate passenger pickup/drop points at booking time without
     * making a live API call.
     */
    public RideBuilder routePolyline(String polyline) {
        this.routePolyline = polyline;
        return this;
    }

    public RideBuilder vehicle(Vehicle vehicle) {
        this.vehicle = Objects.requireNonNull(vehicle, "Vehicle is required");
        return this;
    }

    public RideBuilder departureAt(LocalDateTime time) {
        Objects.requireNonNull(time, "Departure time is required");
        if (time.isBefore(LocalDateTime.now().plusMinutes(14))) {
            throw new IllegalArgumentException(
                    "Departure must be at least 15 minutes in the future");
        }
        this.departureTime = time;
        return this;
    }

    public RideBuilder fare(BigDecimal fare) {
        Objects.requireNonNull(fare, "Fare is required");
        if (fare.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Fare must be positive");
        }
        this.farePerSeat = fare;
        return this;
    }

    /** Alias for {@link #fare(BigDecimal)} — matches the method name RideService calls. */
    public RideBuilder farePerSeat(BigDecimal fare) {
        return fare(fare);
    }

    public RideBuilder estimatedArrivalTime(LocalDateTime time) {
        this.estimatedArrivalTime = time;
        return this;
    }

    public RideBuilder routeDistanceM(Integer distanceM) {
        this.routeDistanceM = distanceM;
        return this;
    }

    public RideBuilder seats(int seats) {
        if (seats < 1 || seats > 8) {
            throw new IllegalArgumentException("Seats must be between 1 and 8");
        }
        this.availableSeats = seats;
        return this;
    }

    public RideBuilder requiresApproval(boolean requiresApproval) {
        this.requiresApproval = requiresApproval;
        return this;
    }

    public Ride build() {
        Objects.requireNonNull(driver,          "Driver is required");
        Objects.requireNonNull(vehicle,         "Vehicle is required");
        Objects.requireNonNull(originName,      "Origin name is required");
        Objects.requireNonNull(destName,        "Destination name is required");
        Objects.requireNonNull(departureTime,   "Departure time is required");
        Objects.requireNonNull(farePerSeat,     "Fare is required");
        Objects.requireNonNull(availableSeats,  "Seats are required");

        Ride ride = new Ride();
        ride.setDriver(driver);
        ride.setVehicle(vehicle);
        ride.setOriginName(originName);
        ride.setOriginLat(originLat);
        ride.setOriginLng(originLng);
        ride.setDestName(destName);
        ride.setDestLat(destLat);
        ride.setDestLng(destLng);
        ride.setRoutePolyline(routePolyline);   // ← NEW
        ride.setRouteDistanceM(routeDistanceM);
        ride.setDepartureTime(departureTime);
        ride.setEstimatedArrivalTime(estimatedArrivalTime);
        ride.setFarePerSeat(farePerSeat);
        ride.setAvailableSeats(availableSeats);
        ride.setTotalSeats(availableSeats);
        ride.setRequiresApproval(requiresApproval);
        ride.setStatus(RideStatus.SCHEDULED);
        return ride;
    }
}