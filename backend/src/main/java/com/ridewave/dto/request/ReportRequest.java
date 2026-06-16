package com.ridewave.dto.request;

import com.ridewave.model.enums.ReportReason;
import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
public class ReportRequest {

    @NotNull(message = "Reported user ID is required")
    private UUID reportedUserId;

    /** Optional — report may relate to a specific ride. */
    private UUID rideId;

    @NotNull(message = "Report reason is required")
    private ReportReason reason;

    @Size(max = 2000, message = "Description must be under 2000 characters")
    private String description;
}