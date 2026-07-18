package com.ridewave.model;

import com.ridewave.model.enums.BookingStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "bookings", indexes = {
        @Index(name = "idx_booking_ride",      columnList = "ride_id"),
        @Index(name = "idx_booking_passenger", columnList = "passenger_id"),
        @Index(name = "idx_booking_status",    columnList = "status")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@ToString(exclude = {"ride", "passenger", "payment"})
public class Booking {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @EqualsAndHashCode.Include
    @Column(updatable = false, nullable = false)
    private UUID bookingId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "ride_id", nullable = false)
    private Ride ride;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "passenger_id", nullable = false)
    private User passenger;

    @Column(nullable = false)
    @Builder.Default
    private Integer seatsBooked = 1;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal totalFare;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private BookingStatus status = BookingStatus.PENDING;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime bookingTime;

    @Column(length = 500)
    private String cancellationReason;

    private LocalDateTime cancelledAt;

    // ── Passenger's actual journey segment ───────────────────────────────
    //
    // The passenger does not necessarily travel the driver's full route.
    // These fields store where the passenger wants to be picked up and
    // dropped off — validated by RouteValidationService to ensure both
    // points lie on (or near) the driver's stored route polyline, and
    // that the pickup appears before the drop in the direction of travel.
    //
    // All nullable: old bookings (created before this feature) will show
    // the driver's full origin → destination in the UI instead.

    @Column(name = "pickup_name", length = 300)
    private String pickupName;

    @Column(name = "pickup_lat", precision = 9, scale = 6)
    private BigDecimal pickupLat;

    @Column(name = "pickup_lng", precision = 9, scale = 6)
    private BigDecimal pickupLng;

    @Column(name = "drop_name", length = 300)
    private String dropName;

    @Column(name = "drop_lat", precision = 9, scale = 6)
    private BigDecimal dropLat;

    @Column(name = "drop_lng", precision = 9, scale = 6)
    private BigDecimal dropLng;

    // ── Partial-route fare breakdown ─────────────────────────────────────
    // These fields are set by BookingService after the mediator runs and
    // override the mediator's flat-fare calculation for segment bookings.
    // Null for full-route bookings and legacy bookings.

    /** Passenger's pickup→drop segment distance in metres (Directions API). */
    @Column(name = "passenger_distance_m")
    private Integer passengerDistanceM;

    /** Driver's total fare ÷ seats offered. */
    @Column(name = "per_seat_trip_fare", precision = 10, scale = 2)
    private BigDecimal perSeatTripFare;

    /** Pro-rated per-seat fare for the passenger's segment. */
    @Column(name = "passenger_fare_per_seat", precision = 10, scale = 2)
    private BigDecimal passengerFarePerSeat;

    @OneToOne(mappedBy = "booking", fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    private Payment payment;
}