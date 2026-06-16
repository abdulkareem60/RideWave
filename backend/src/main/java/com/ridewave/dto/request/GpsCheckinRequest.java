package com.ridewave.dto.request;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

/**
 * Sent by a passenger for GPS-based check-in.
 * Backend computes distance to driver's last known location.
 * If within 50 metres the booking is marked BOARDED.
 */
@Getter
@Setter
public class GpsCheckinRequest {

    @NotNull(message = "Passenger latitude is required")
    @DecimalMin(value = "-90.0",  message = "Latitude must be >= -90")
    @DecimalMax(value = "90.0",   message = "Latitude must be <= 90")
    private BigDecimal passengerLat;

    @NotNull(message = "Passenger longitude is required")
    @DecimalMin(value = "-180.0", message = "Longitude must be >= -180")
    @DecimalMax(value = "180.0",  message = "Longitude must be <= 180")
    private BigDecimal passengerLng;
}