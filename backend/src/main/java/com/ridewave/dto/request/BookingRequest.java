package com.ridewave.dto.request;

import com.ridewave.model.enums.PaymentMethod;
import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
public class BookingRequest {

    @NotNull(message = "Ride ID is required")
    private UUID rideId;

    @NotNull(message = "Number of seats is required")
    @Min(value = 1, message = "Must book at least 1 seat")
    @Max(value = 8, message = "Cannot book more than 8 seats at once")
    private Integer seats;

    @NotNull(message = "Payment method is required")
    private PaymentMethod paymentMethod;
}