package com.ridewave.model;

import com.ridewave.model.enums.OtpType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "otp_tokens", indexes = {
        @Index(name = "idx_otp_user", columnList = "user_id"),
        @Index(name = "idx_otp_type", columnList = "type"),
        @Index(name = "idx_otp_ride", columnList = "ride_id")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class OtpToken {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @EqualsAndHashCode.Include
    @Column(updatable = false, nullable = false)
    private UUID tokenId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /**
     * For RIDE_START OTPs this links to the ride.
     * Nullable — user-level OTPs don't need a ride reference.
     */
    @Column(name = "ride_id")
    private UUID rideId;

    /** BCrypt hash of the 6-digit OTP — never store plain text. */
    @Column(nullable = false, length = 72)
    private String tokenHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private OtpType type;

    @Column(nullable = false)
    private LocalDateTime expiresAt;

    @Column(nullable = false)
    @Builder.Default
    private Boolean used = false;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    public boolean isExpired() {
        return LocalDateTime.now().isAfter(expiresAt);
    }
}