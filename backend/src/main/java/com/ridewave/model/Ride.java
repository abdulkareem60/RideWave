package com.ridewave.model;

import com.ridewave.model.enums.RideStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "rides", indexes = {
        @Index(name = "idx_ride_driver",     columnList = "driver_id"),
        @Index(name = "idx_ride_status",     columnList = "status"),
        @Index(name = "idx_ride_departure",  columnList = "departure_time"),
        @Index(name = "idx_ride_origin",     columnList = "origin_name"),
        @Index(name = "idx_ride_dest",       columnList = "dest_name")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@ToString(exclude = {"driver", "vehicle", "bookings", "ratings"})
public class Ride {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @EqualsAndHashCode.Include
    @Column(updatable = false, nullable = false)
    private UUID rideId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "driver_id", nullable = false)
    private User driver;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "vehicle_id", nullable = false)
    private Vehicle vehicle;

    // ── Origin ────────────────────────────────────────────────────────────

    @Column(nullable = false, length = 200)
    private String originName;

    @Column(precision = 9, scale = 6)
    private BigDecimal originLat;

    @Column(precision = 9, scale = 6)
    private BigDecimal originLng;

    // ── Destination ───────────────────────────────────────────────────────

    @Column(nullable = false, length = 200)
    private String destName;

    @Column(precision = 9, scale = 6)
    private BigDecimal destLat;

    @Column(precision = 9, scale = 6)
    private BigDecimal destLng;

    // ── Timing & Pricing ──────────────────────────────────────────────────

    @Column(nullable = false)
    private LocalDateTime departureTime;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal farePerSeat;

    /** Starts equal to totalSeats; decremented atomically on each booking. */
    @Column(nullable = false)
    private Integer availableSeats;

    @Column(nullable = false)
    private Integer totalSeats;

    // ── Status & Safety ───────────────────────────────────────────────────

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private RideStatus status = RideStatus.SCHEDULED;

    /**
     * When true, driver must manually approve each booking request before
     * a seat is confirmed.
     */
    @Column(nullable = false)
    @Builder.Default
    private Boolean requiresApproval = false;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    /** Timestamp when the driver pressed Start — null until ride begins. */
    private LocalDateTime startedAt;

    // ── Relationships ──────────────────────────────────────────────────────

    @OneToMany(mappedBy = "ride", fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    @Builder.Default
    private List<Booking> bookings = new ArrayList<>();

    @OneToMany(mappedBy = "ride", fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    @Builder.Default
    private List<Rating> ratings = new ArrayList<>();
}