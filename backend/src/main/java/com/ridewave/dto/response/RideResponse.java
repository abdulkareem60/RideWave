package com.ridewave.dto.response;

import com.ridewave.model.Ride;
import com.ridewave.model.enums.RideStatus;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Full ride representation returned to clients.
 *
 * delivered by SMS only; the hash is never sent over the API.
 *
 * The "canBookNow" convenience flag is computed by the service layer
 * so the React frontend doesn't need to replicate the booking-eligibility logic.
 */
@Getter
@Builder
public class RideResponse {

    private UUID       rideId;

    // ── Participants ──────────────────────────────────────────────────────
    private DriverSummaryResponse driver;
    private VehicleResponse       vehicle;

    // ── Route ─────────────────────────────────────────────────────────────
    private String     originName;
    private BigDecimal originLat;
    private BigDecimal originLng;
    private String     destName;
    private BigDecimal destLat;
    private BigDecimal destLng;

    // ── Timing & Pricing ──────────────────────────────────────────────────
    private LocalDateTime departureTime;
    private BigDecimal    farePerSeat;

    // ── Availability ──────────────────────────────────────────────────────
    private Integer    availableSeats;
    private Integer    totalSeats;

    // ── Status ────────────────────────────────────────────────────────────
    private RideStatus status;
    private boolean    requiresApproval;

    // ── Convenience ───────────────────────────────────────────────────────
    /** True when ride is SCHEDULED with at least 1 seat available. */
    private boolean    canBookNow;

    private LocalDateTime createdAt;
    private LocalDateTime startedAt;

    /** Map from JPA entity. */
    public static RideResponse from(Ride ride) {
        return RideResponse.builder()
                .rideId(ride.getRideId())
                .driver(DriverSummaryResponse.from(ride.getDriver()))
                .vehicle(VehicleResponse.from(ride.getVehicle()))
                .originName(ride.getOriginName())
                .originLat(ride.getOriginLat())
                .originLng(ride.getOriginLng())
                .destName(ride.getDestName())
                .destLat(ride.getDestLat())
                .destLng(ride.getDestLng())
                .departureTime(ride.getDepartureTime())
                .farePerSeat(ride.getFarePerSeat())
                .availableSeats(ride.getAvailableSeats())
                .totalSeats(ride.getTotalSeats())
                .status(ride.getStatus())
                .requiresApproval(ride.getRequiresApproval())
                .canBookNow(ride.getStatus() == RideStatus.SCHEDULED
                        && ride.getAvailableSeats() > 0)
                .createdAt(ride.getCreatedAt())
                .startedAt(ride.getStartedAt())
                .build();
    }
}