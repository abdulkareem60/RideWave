package com.ridewave.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CancelRideRequest {

    @NotBlank(message = "A cancellation reason is required")
    @Size(max = 500, message = "Reason must be under 500 characters")
    private String reason;
}