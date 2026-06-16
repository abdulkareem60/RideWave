package com.ridewave.dto.response;

import com.ridewave.model.User;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Minimal driver info embedded inside RideResponse.
 * Never exposes email, phone, or password hash to passengers.
 */
@Getter
@Builder
public class DriverSummaryResponse {

    private UUID       userId;
    private String     fullName;
    private BigDecimal trustScore;
    private String     profilePic;

    public static DriverSummaryResponse from(User driver) {
        return DriverSummaryResponse.builder()
                .userId(driver.getUserId())
                .fullName(driver.getFullName())
                .trustScore(driver.getTrustScore())
                .profilePic(driver.getProfilePic())
                .build();
    }
}