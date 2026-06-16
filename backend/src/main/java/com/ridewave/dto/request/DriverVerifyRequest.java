package com.ridewave.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class DriverVerifyRequest {

    @NotNull(message = "approved field is required")
    private Boolean approved;

    /** Required when approved = false. */
    @Size(max = 500)
    private String notes;

    /**
     * When approved = true, the system normally requires every
     * LICENSE/VEHICLE_REGISTRATION document to have passed AI verification
     * (ai_checked_at set, ai_score >= threshold, no blocking flags).
     *
     * If AI verification is unavailable or failed (ai_score is null /
     * below threshold) and the admin has manually reviewed the documents
     * themselves, setting forceOverride=true allows approval to proceed
     * anyway. Defaults to false — approval is blocked by default when AI
     * results are missing or failing (fail-closed).
     */
    private boolean forceOverride = false;
}