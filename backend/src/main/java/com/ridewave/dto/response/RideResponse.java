package com.ridewave.dto.response;

import com.ridewave.model.Ride;
import com.ridewave.model.enums.RideStatus;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Response DTO for ride list, detail, and search endpoints.
 * Includes the stored route polyline so the frontend can draw the
 * driver's route on the map and validate passenger pickup/drop client-side
 * before submitting a booking request.
 */
@Getter
@Builder(toBuilder = true)
public class RideResponse {

    private UUID   rideId;
    private RideStatus status;

    // ── Driver & vehicle ─────────────────────────────────────────────────
    private DriverSummaryResponse driver;
    private VehicleResponse       vehicle;

    // ── Route ─────────────────────────────────────────────────────────────
    private String     originName;
    private BigDecimal originLat;
    private BigDecimal originLng;
    private String     destName;
    private BigDecimal destLat;
    private BigDecimal destLng;

    /**
     * Google Maps encoded polyline of the driver's full route.
     * Stored at ride-creation time (sent from client via Directions API).
     * Returned here so:
     *   1. SearchRidesPage can draw the route on the map.
     *   2. The booking modal can render the route and let the passenger
     *      pin their pickup/drop along it.
     *   3. RouteValidationService uses the server-side copy for validation.
     */
    private String routePolyline;

    // ── Timing & pricing ──────────────────────────────────────────────────
    private LocalDateTime departureTime;
    private LocalDateTime estimatedArrivalTime;
    private BigDecimal    farePerSeat;
    private Integer       availableSeats;
    private Integer       totalSeats;
    private Boolean       requiresApproval;
    private LocalDateTime createdAt;

    // ── Booking state for the requesting passenger ─────────────────────
    // canBookNow is computed by the service layer, not stored on the entity.
    private boolean canBookNow;

    // ── Management state for the driver ──────────────────────────────────
    // Tells the frontend whether this ride can still be edited/deleted/cancelled.
    // Populated by RideService.createRide/getRideById/getMyRides.
    private long    bookingCount; // active (non-cancelled) bookings
    private boolean canModify;    // true only when status=SCHEDULED AND bookingCount=0

    // ──────────────────────────────────────────────────────────────────────

    public static RideResponse from(Ride ride) {
        return RideResponse.builder()
                .rideId(ride.getRideId())
                .status(ride.getStatus())
                .driver(DriverSummaryResponse.from(ride.getDriver()))
                .vehicle(ride.getVehicle() != null ? VehicleResponse.from(ride.getVehicle()) : null)
                .originName(ride.getOriginName())
                .originLat(ride.getOriginLat())
                .originLng(ride.getOriginLng())
                .destName(ride.getDestName())
                .destLat(ride.getDestLat())
                .destLng(ride.getDestLng())
                .routePolyline(ride.getRoutePolyline())  // ← NEW
                .departureTime(ride.getDepartureTime())
                .estimatedArrivalTime(ride.getEstimatedArrivalTime())
                .farePerSeat(ride.getFarePerSeat())
                .availableSeats(ride.getAvailableSeats())
                .totalSeats(ride.getTotalSeats())
                .requiresApproval(ride.getRequiresApproval())
                .createdAt(ride.getCreatedAt())
                .canBookNow(ride.getStatus() == com.ridewave.model.enums.RideStatus.SCHEDULED
                        && ride.getAvailableSeats() != null
                        && ride.getAvailableSeats() > 0)
                // bookingCount and canModify are set by RideService after
                // querying the bookings table — default 0/false here.
                .bookingCount(0)
                .canModify(false)
                .build();
    }

    /**
     * Enriched factory — used by RideService after querying the booking count.
     * Avoids needing @Builder(toBuilder = true) on this class.
     */
    public static RideResponse fromEnriched(Ride ride, long bookingCount, boolean canModify) {
        return from(ride).toBuilder()
                .bookingCount(bookingCount)
                .canModify(canModify)
                .build();
    }
}