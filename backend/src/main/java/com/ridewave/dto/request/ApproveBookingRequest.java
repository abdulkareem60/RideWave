package com.ridewave.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ApproveBookingRequest {

    @NotNull(message = "approved field is required (true = approve, false = reject)")
    private Boolean approved;

    @Size(max = 500, message = "Reason must be under 500 characters")
    private String reason;
}