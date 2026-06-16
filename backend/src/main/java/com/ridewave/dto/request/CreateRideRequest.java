package com.ridewave.dto.request;

import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * DTO for POST /api/v1/rides — create a new ride.
 *
 * Validation is intentionally strict here: a malformed ride creation
 * request should fail at the controller boundary, not leak into the
 * service or Builder layer.
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

    // ── Timing ────────────────────────────────────────────────────────────

    @NotNull(message = "Departure time is required")
    @Future(message = "Departure time must be in the future")
    private LocalDateTime departureTime;

    // ── Pricing ───────────────────────────────────────────────────────────

    @NotNull(message = "Fare per seat is required")
    @DecimalMin(value = "1.00", inclusive = true, message = "Fare per seat must be at least 1.00")
    @Digits(integer = 8, fraction = 2, message = "Fare must have at most 8 integer and 2 decimal digits")
    private BigDecimal farePerSeat;

    // ── Seats ─────────────────────────────────────────────────────────────

    @NotNull(message = "Number of seats is required")
    @Min(value = 1, message = "At least 1 seat must be offered")
    @Max(value = 8, message = "Maximum 8 seats can be offered per ride")
    private Integer seats;

    // ── Vehicle ───────────────────────────────────────────────────────────

    @NotNull(message = "Vehicle ID is required")
    private UUID vehicleId;

    // ── Optional settings ─────────────────────────────────────────────────

    /**
     * When true, each booking request waits for driver approval before
     * the seat is confirmed. Defaults to false (instant confirmation).
     */
    private boolean requiresApproval = false;
}