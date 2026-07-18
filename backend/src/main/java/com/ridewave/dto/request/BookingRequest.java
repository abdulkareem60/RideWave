package com.ridewave.dto.request;

import com.ridewave.model.enums.PaymentMethod;
import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Request body for POST /api/v1/bookings.
 *
 * Passengers now specify where along the driver's route they want to
 * be picked up and dropped off. RouteValidationService validates that
 * both points lie on (or near) the driver's stored route polyline,
 * that pickup appears before drop in the direction of travel, and that
 * pickup is not after the driver's destination.
 *
 * All pickup/drop fields are optional for backward-compatibility with
 * older clients. When omitted, the full driver route is used.
 */
@Getter
@Setter
public class BookingRequest {

    @NotNull(message = "Ride ID is required")
    private UUID rideId;

    /**
     * Payment method chosen by the passenger. Defaults to CASH when
     * not supplied by the client (e.g. older clients or frontend
     * implementations that do not include the field).
     */
    private PaymentMethod paymentMethod = PaymentMethod.CASH;

    @NotNull(message = "Number of seats is required")
    @Min(value = 1, message = "Must book at least 1 seat")
    @Max(value = 8, message = "Cannot book more than 8 seats")
    private Integer seatsRequested;

    // ── Passenger's actual pickup point ───────────────────────────────────

    private String pickupName;

    @DecimalMin(value = "-90.0",  message = "Pickup latitude must be >= -90")
    @DecimalMax(value = "90.0",   message = "Pickup latitude must be <= 90")
    private BigDecimal pickupLat;

    @DecimalMin(value = "-180.0", message = "Pickup longitude must be >= -180")
    @DecimalMax(value = "180.0",  message = "Pickup longitude must be <= 180")
    private BigDecimal pickupLng;

    // ── Passenger's actual drop point ─────────────────────────────────────

    private String dropName;

    @DecimalMin(value = "-90.0",  message = "Drop latitude must be >= -90")
    @DecimalMax(value = "90.0",   message = "Drop latitude must be <= 90")
    private BigDecimal dropLat;

    @DecimalMin(value = "-180.0", message = "Drop longitude must be >= -180")
    @DecimalMax(value = "180.0",  message = "Drop longitude must be <= 180")
    private BigDecimal dropLng;

    // ── Partial-route fare fields ──────────────────────────────────────────
    // The frontend fetches the passenger's pickup→drop segment distance via
    // the Google Directions API and sends it here. The backend re-validates
    // this distance by decoding its own stored polyline and independently
    // computing a Haversine distance — the client-supplied value is used
    // only as a cross-check, and the server's calculation is authoritative.

    /**
     * Distance of the passenger's pickup→drop segment in metres.
     * Sent by the frontend from the Directions API response.
     * Null for full-route bookings (passenger rides origin → destination).
     */
    private Integer passengerDistanceM;

    /**
     * Client-calculated fare for this booking.
     * Server validates and may override with its own calculation.
     * Null for full-route bookings (flat fare applies).
     */
    private BigDecimal clientCalculatedFare;
}