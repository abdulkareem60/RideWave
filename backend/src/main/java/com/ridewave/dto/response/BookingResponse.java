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

    private UUID          bookingId;
    private UUID          rideId;

    // ── Ride summary (avoids a second API call) ───────────────────────────
    private String        originName;
    private String        destName;
    private LocalDateTime departureTime;
    private BigDecimal    farePerSeat;

    // ── Driver summary ────────────────────────────────────────────────────
    private DriverSummaryResponse driver;

    // ── Vehicle summary (added for passenger booking views) ───────────────
    private VehicleResponse vehicle;

    // ── Passenger summary ─────────────────────────────────────────────────
    private UUID          passengerId;
    private String        passengerName;
    private String        passengerPhoto;
    private java.math.BigDecimal passengerTrustScore;

    // ── Booking details ───────────────────────────────────────────────────
    private Integer       seatsBooked;
    private BigDecimal    totalFare;
    private BookingStatus status;
    private LocalDateTime bookingTime;
    private String        cancellationReason;

    // ── Payment (present after payment processing) ────────────────────────
    private PaymentResponse payment;

    public static BookingResponse from(Booking booking) {
        return BookingResponse.builder()
                .bookingId(booking.getBookingId())
                .rideId(booking.getRide().getRideId())
                .originName(booking.getRide().getOriginName())
                .destName(booking.getRide().getDestName())
                .departureTime(booking.getRide().getDepartureTime())
                .farePerSeat(booking.getRide().getFarePerSeat())
                .driver(DriverSummaryResponse.from(booking.getRide().getDriver()))
                .vehicle(booking.getRide().getVehicle() != null
                        ? VehicleResponse.from(booking.getRide().getVehicle()) : null)
                .passengerId(booking.getPassenger().getUserId())
                .passengerName(booking.getPassenger().getFullName())
                .passengerPhoto(booking.getPassenger().getProfilePic())
                .passengerTrustScore(booking.getPassenger().getTrustScore())
                .seatsBooked(booking.getSeatsBooked())
                .totalFare(booking.getTotalFare())
                .status(booking.getStatus())
                .bookingTime(booking.getBookingTime())
                .cancellationReason(booking.getCancellationReason())
                .payment(booking.getPayment() != null
                        ? PaymentResponse.from(booking.getPayment()) : null)
                .build();
    }
}