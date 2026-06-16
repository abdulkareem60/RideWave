package com.ridewave.model;

import com.ridewave.model.enums.UserRole;
import com.ridewave.model.enums.UserStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Core user entity — represents any platform actor (Admin, Driver, Passenger).
 *
 * Role assignment happens at registration and can be changed only by an Admin.
 * Trust score is maintained by TrustScoreService and drives access gating.
 */
@Entity
@Table(name = "users", indexes = {
        @Index(name = "idx_users_email",  columnList = "email",  unique = true),
        @Index(name = "idx_users_phone",  columnList = "phone",  unique = true),
        @Index(name = "idx_users_role",   columnList = "role"),
        @Index(name = "idx_users_status", columnList = "status")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(exclude = {"ridesAsDriver", "bookings", "documents", "vehicles",
        "ratingsGiven", "ratingsReceived", "notifications"})
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @EqualsAndHashCode.Include
    @Column(updatable = false, nullable = false)
    private UUID userId;

    @Column(nullable = false, unique = true, length = 255)
    private String email;

    @Column(nullable = false, unique = true, length = 20)
    private String phone;

    /** BCrypt-hashed password — never stored in plain text. */
    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(nullable = false, length = 100)
    private String fullName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private UserRole role;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private UserStatus status = UserStatus.PENDING;

    /**
     * Rolling weighted average of all ratings received (0.00 – 5.00).
     * Default 3.00 for new users. Updated by TrustScoreService after every ride.
     */
    @Column(nullable = false, precision = 3, scale = 2)
    @Builder.Default
    private BigDecimal trustScore = BigDecimal.valueOf(3.00);

    @Column(nullable = false)
    @Builder.Default
    private Boolean emailVerified = false;

    @Column(nullable = false)
    @Builder.Default
    private Boolean phoneVerified = false;

    @Column(columnDefinition = "TEXT")
    private String profilePic;

    /**
     * Admin's notes/reason from the most recent verification decision
     * (approve or reject). Persisted so the driver's pending-approval
     * page can display the actual rejection reason, and so any admin
     * opening the review page later can see the prior decision context.
     */
    @Column(name = "review_notes", columnDefinition = "TEXT")
    private String reviewNotes;

    /** UUID of the admin who made the most recent verification decision. */
    @Column(name = "reviewed_by")
    private UUID reviewedBy;

    /** Timestamp of the most recent verification decision (approve/reject). */
    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    /**
     * Legal consent tracking — captured at registration.
     *
     * termsAcceptedAt/privacyAcceptedAt are independent timestamps (not a
     * single boolean) so we have proof of exactly when consent was given,
     * which matters for compliance audits. The version fields record which
     * revision of each document the user actually agreed to — if the ToS
     * or Privacy Policy is updated later, we can tell which users agreed
     * to an older version and may need to re-consent.
     */
    @Column(name = "terms_accepted_at")
    private LocalDateTime termsAcceptedAt;

    @Column(name = "terms_version", length = 20)
    private String termsVersion;

    @Column(name = "privacy_accepted_at")
    private LocalDateTime privacyAcceptedAt;

    @Column(name = "privacy_version", length = 20)
    private String privacyVersion;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    // ── Relationships ──────────────────────────────────────────────────────

    @OneToMany(mappedBy = "driver", fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    @Builder.Default
    private List<Ride> ridesAsDriver = new ArrayList<>();

    @OneToMany(mappedBy = "passenger", fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    @Builder.Default
    private List<Booking> bookings = new ArrayList<>();

    @OneToMany(mappedBy = "user", fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    @Builder.Default
    private List<DriverDocument> documents = new ArrayList<>();

    @OneToMany(mappedBy = "user", fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    @Builder.Default
    private List<Vehicle> vehicles = new ArrayList<>();

    @OneToMany(mappedBy = "rater", fetch = FetchType.LAZY)
    @Builder.Default
    private List<Rating> ratingsGiven = new ArrayList<>();

    @OneToMany(mappedBy = "rated", fetch = FetchType.LAZY)
    @Builder.Default
    private List<Rating> ratingsReceived = new ArrayList<>();

    @OneToMany(mappedBy = "user", fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    @Builder.Default
    private List<Notification> notifications = new ArrayList<>();

    // ── Convenience helpers ────────────────────────────────────────────────

    public boolean isActive()  { return status == UserStatus.ACTIVE; }
    public boolean isDriver()  { return role == UserRole.DRIVER; }
    public boolean isAdmin()   { return role == UserRole.ADMIN; }
}