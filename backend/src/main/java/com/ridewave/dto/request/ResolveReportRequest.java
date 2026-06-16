package com.ridewave.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ResolveReportRequest {

    /** Action taken: WARN | SUSPEND | BLOCK | DISMISSED */
    @NotBlank(message = "Action is required")
    private String action;

    @NotNull(message = "Resolution notes are required")
    @Size(min = 10, max = 1000, message = "Notes must be between 10 and 1000 characters")
    private String notes;
}