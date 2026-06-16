package com.ridewave.dto.response;

import com.ridewave.model.User;
import com.ridewave.model.enums.UserRole;
import com.ridewave.model.enums.UserStatus;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Builder
public class UserResponse {

    private UUID       userId;
    private String     email;
    private String     phone;
    private String     fullName;
    private UserRole   role;
    private UserStatus status;
    private BigDecimal trustScore;
    private boolean    emailVerified;
    private boolean    phoneVerified;
    private String     profilePic;
    private LocalDateTime createdAt;
    private String     reviewNotes;
    private UUID        reviewedBy;
    private LocalDateTime reviewedAt;

    /** Map from JPA entity — never exposes passwordHash. */
    public static UserResponse from(User user) {
        return UserResponse.builder()
                .userId(user.getUserId())
                .email(user.getEmail())
                .phone(user.getPhone())
                .fullName(user.getFullName())
                .role(user.getRole())
                .status(user.getStatus())
                .trustScore(user.getTrustScore())
                .emailVerified(user.getEmailVerified())
                .phoneVerified(user.getPhoneVerified())
                .profilePic(user.getProfilePic())
                .createdAt(user.getCreatedAt())
                .reviewNotes(user.getReviewNotes())
                .reviewedBy(user.getReviewedBy())
                .reviewedAt(user.getReviewedAt())
                .build();
    }
}