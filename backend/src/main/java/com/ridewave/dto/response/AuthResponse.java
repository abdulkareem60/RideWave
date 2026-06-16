package com.ridewave.dto.response;

import com.ridewave.model.enums.UserRole;
import com.ridewave.model.enums.UserStatus;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.util.UUID;

@Getter
@Builder
public class AuthResponse {

    private String     accessToken;
    private String     refreshToken;
    private String     tokenType;        // Always "Bearer"

    // ── Embedded user summary — avoids a second /me call ──────────────────
    private UUID       userId;
    private String     email;
    private String     fullName;
    private UserRole   role;
    private UserStatus status;
    private BigDecimal trustScore;
    private boolean    emailVerified;
    private boolean    phoneVerified;
}