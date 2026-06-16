package com.ridewave.dto.request;

import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Partial update DTO — all fields are optional.
 * Only non-null fields are applied by RideService.
 * Only allowed while ride status is SCHEDULED.
 */
@Getter
@Setter
public class UpdateRideRequest {

    @Size(min = 3, max = 200)
    private String originName;

    private BigDecimal originLat;
    private BigDecimal originLng;

    @Size(min = 3, max = 200)
    private String destName;

    private BigDecimal destLat;
    private BigDecimal destLng;

    @Future(message = "Departure time must be in the future")
    private LocalDateTime departureTime;

    @DecimalMin(value = "1.00", message = "Fare must be at least 1.00")
    private BigDecimal farePerSeat;

    @Min(value = 1) @Max(value = 8)
    private Integer seats;

    private Boolean requiresApproval;
}