package com.ridewave.dto.response;

import com.ridewave.model.Booking;
import com.ridewave.model.enums.BookingStatus;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Builder
public class BookingResponse {

    private UUID bookingId;
    private UUID rideId;
    private UUID passengerId;
    private String passengerName;
    private String passengerPhoto;
    private BigDecimal passengerTrustScore;

    private Integer seatsBooked;
    private BigDecimal totalFare;
    private BookingStatus status;
    private LocalDateTime bookingTime;
    private String cancellationReason;
    private LocalDateTime cancelledAt;

    // ── Driver's full route (origin → destination) ────────────────────────
    private String rideOriginName;
    private BigDecimal rideOriginLat;
    private BigDecimal rideOriginLng;
    private String rideDestName;
    private BigDecimal rideDestLat;
    private BigDecimal rideDestLng;
    private LocalDateTime rideDepartureTime;
    private BigDecimal rideFarePerSeat;
    private String rideRoutePolyline;
    private DriverSummaryResponse driver;
    private VehicleResponse vehicle;

    // ── Fare breakdown ────────────────────────────────────────────────────────
    // Null for full-route bookings and legacy bookings created before
    // partial-route fare was implemented.
    private Integer     passengerDistanceM;    // pickup→drop metres
    private Integer     rideDistanceM;         // full driver route metres
    private BigDecimal  perSeatTripFare;       // totalTripFare ÷ seats
    private BigDecimal  passengerFarePerSeat;  // pro-rated per-seat

    // ── Passenger's actual segment (pickup → drop) ────────────────────────
    // Null for legacy bookings created before route-matching was added;
    // the UI falls back to showing the full driver route in that case.
    private String pickupName;
    private BigDecimal pickupLat;
    private BigDecimal pickupLng;
    private String dropName;
    private BigDecimal dropLat;
    private BigDecimal dropLng;

    public static BookingResponse from(Booking b) {
        var ride = b.getRide();
        return BookingResponse.builder()
                .bookingId(b.getBookingId())
                .rideId(ride.getRideId())
                .passengerId(b.getPassenger().getUserId())
                .passengerName(b.getPassenger().getFullName())
                .passengerPhoto(b.getPassenger().getProfilePic())
                .passengerTrustScore(b.getPassenger().getTrustScore())
                .seatsBooked(b.getSeatsBooked())
                .totalFare(b.getTotalFare())
                .status(b.getStatus())
                .bookingTime(b.getBookingTime())
                .cancellationReason(b.getCancellationReason())
                .cancelledAt(b.getCancelledAt())
                .rideOriginName(ride.getOriginName())
                .rideOriginLat(ride.getOriginLat())
                .rideOriginLng(ride.getOriginLng())
                .rideDestName(ride.getDestName())
                .rideDestLat(ride.getDestLat())
                .rideDestLng(ride.getDestLng())
                .rideDepartureTime(ride.getDepartureTime())
                .rideFarePerSeat(ride.getFarePerSeat())
                .rideRoutePolyline(ride.getRoutePolyline())
                .driver(DriverSummaryResponse.from(ride.getDriver()))
                .vehicle(ride.getVehicle() != null ? VehicleResponse.from(ride.getVehicle()) : null)
                .pickupName(b.getPickupName())
                .pickupLat(b.getPickupLat())
                .pickupLng(b.getPickupLng())
                .dropName(b.getDropName())
                .dropLat(b.getDropLat())
                .dropLng(b.getDropLng())
                .passengerDistanceM(b.getPassengerDistanceM())
                .rideDistanceM(b.getRide().getRouteDistanceM())
                .perSeatTripFare(b.getPerSeatTripFare())
                .passengerFarePerSeat(b.getPassengerFarePerSeat())
                .build();
    }
}