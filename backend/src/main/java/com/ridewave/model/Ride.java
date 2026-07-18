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
        @Index(name = "idx_ride_driver",    columnList = "driver_id"),
        @Index(name = "idx_ride_status",    columnList = "status"),
        @Index(name = "idx_ride_departure", columnList = "departure_time"),
        @Index(name = "idx_ride_origin",    columnList = "origin_name"),
        @Index(name = "idx_ride_dest",      columnList = "dest_name")
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

    /**
     * Total driving distance of the route in metres, from Google Directions API.
     * Stored at ride-creation time alongside the encoded polyline.
     * Used by BookingService to calculate pro-rated fares for partial segments.
     * Nullable: legacy rides without this value fall back to polyline-derived
     * Haversine distance for fare calculation.
     */
    @Column(name = "route_distance_m")
    private Integer routeDistanceM;

    /**
     * Google Maps encoded polyline representing the driver's full route
     * from origin to destination, stored at ride-creation time via the
     * Directions API (client-side fetch → sent in CreateRideRequest).
     *
     * Nullable for backward-compatibility with rides created before this
     * feature was added. When null, route-segment validation falls back to
     * a straight-line (Haversine) check instead of polyline projection.
     */
    @Column(columnDefinition = "TEXT")
    private String routePolyline;

    // ── Timing & Pricing ──────────────────────────────────────────────────

    @Column(nullable = false)
    private LocalDateTime departureTime;

    /**
     * Driver's expected arrival time at the destination.
     * Derived at ride-creation time: departureTime + estimated driving duration
     * (from Google Directions API routeDurationS, or a 3-hour fallback).
     *
     * Used for:
     *   1. Overlap detection — a driver cannot have two rides whose
     *      [departure, estimatedArrival] intervals intersect.
     *   2. Expiry — RideExpiryScheduler marks this ride EXPIRED once
     *      estimatedArrivalTime has passed and there are no active bookings.
     *
     * Nullable for backward-compat with rides created before this field existed;
     * the scheduler falls back to departureTime + 3 hours when null.
     */
    @Column(name = "estimated_arrival_time")
    private LocalDateTime estimatedArrivalTime;

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

    @Column(length = 72)   // BCrypt hash length
    private String rideOtpHash;

    private LocalDateTime startedAt;

    @Column(nullable = false)
    @Builder.Default
    private Boolean requiresApproval = false;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    // ── Relationships ──────────────────────────────────────────────────────

    @OneToMany(mappedBy = "ride", fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    @Builder.Default
    private List<Booking> bookings = new ArrayList<>();

    @OneToMany(mappedBy = "ride", fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    @Builder.Default
    private List<Rating> ratings = new ArrayList<>();
}