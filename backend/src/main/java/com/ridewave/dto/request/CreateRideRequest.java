package com.ridewave.dto.request;

import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Request body for POST /api/v1/rides.
 *
 * The client is responsible for resolving place names to coordinates and
 * for fetching the Google Directions polyline before submitting. The
 * backend does not call Google Maps — it uses the polyline that arrives
 * here for all downstream route-segment validation at booking time.
 */
@Getter
@Setter
public class CreateRideRequest {

    // ── Origin ────────────────────────────────────────────────────────────

    @NotBlank(message = "Origin name is required")
    @Size(min = 3, max = 200, message = "Origin name must be between 3 and 200 characters")
    private String originName;

    @DecimalMin(value = "-90.0",  message = "Origin latitude must be >= -90")
    @DecimalMax(value = "90.0",   message = "Origin latitude must be <= 90")
    private BigDecimal originLat;

    @DecimalMin(value = "-180.0", message = "Origin longitude must be >= -180")
    @DecimalMax(value = "180.0",  message = "Origin longitude must be <= 180")
    private BigDecimal originLng;

    // ── Destination ───────────────────────────────────────────────────────

    @NotBlank(message = "Destination name is required")
    @Size(min = 3, max = 200, message = "Destination name must be between 3 and 200 characters")
    private String destName;

    @DecimalMin(value = "-90.0",  message = "Destination latitude must be >= -90")
    @DecimalMax(value = "90.0",   message = "Destination latitude must be <= 90")
    private BigDecimal destLat;

    @DecimalMin(value = "-180.0", message = "Destination longitude must be >= -180")
    @DecimalMax(value = "180.0",  message = "Destination longitude must be <= 180")
    private BigDecimal destLng;

    /**
     * Google Maps encoded polyline for the full driver route.
     * Fetched client-side via the Directions API and sent here at
     * ride-creation time. Stored on the Ride entity and later decoded
     * by RouteValidationService when passengers submit booking requests
     * with pickup/drop coordinates.
     *
     * Optional: rides created without a polyline (e.g. from older clients)
     * fall back to straight-line (Haversine) proximity checks.
     */
    private String routePolyline;

    /**
     * Total driving distance of the route in metres, from Google Directions API.
     * Stored on the Ride entity so BookingService can calculate pro-rated fares
     * without making a live API call at booking time.
     */
    private Integer routeDistanceM;

    /**
     * Estimated driving duration in seconds from Google Directions API.
     * Sent alongside routeDistanceM. Used by RideService to compute
     * estimatedArrivalTime = departureTime + routeDurationS seconds.
     * When null, estimatedArrivalTime defaults to departureTime + 3 hours.
     */
    private Integer routeDurationS;

    // ── Timing & Pricing ──────────────────────────────────────────────────

    @NotNull(message = "Departure time is required")
    @Future(message = "Departure time must be in the future")
    private LocalDateTime departureTime;

    /**
     * Total fare for the complete journey across ALL seats.
     * Per-seat fare is derived: totalTripFare ÷ seats.
     * Passenger fare is then pro-rated: (segmentDistM ÷ routeDistanceM) × perSeatFare.
     */
    @NotNull(message = "Total trip fare is required")
    @DecimalMin(value = "0.01", message = "Total fare must be greater than 0")
    @DecimalMax(value = "999999.99", message = "Total fare cannot exceed 999,999")
    private BigDecimal totalTripFare;

    @NotNull(message = "Number of seats is required")
    @Min(value = 1, message = "At least 1 seat must be offered")
    @Max(value = 8, message = "Maximum 8 seats can be offered per ride")
    private Integer seats;

    // ── Vehicle ───────────────────────────────────────────────────────────

    @NotNull(message = "Vehicle ID is required")
    private UUID vehicleId;

    // ── Optional settings ─────────────────────────────────────────────────

    private boolean requiresApproval = false;
}