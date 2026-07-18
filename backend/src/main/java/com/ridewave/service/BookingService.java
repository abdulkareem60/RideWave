package com.ridewave.service;

import com.ridewave.dto.request.ApproveBookingRequest;
import com.ridewave.dto.request.BookingRequest;
import com.ridewave.dto.request.CancelBookingRequest;
import com.ridewave.dto.response.BookingResponse;
import com.ridewave.exception.BadRequestException;
import com.ridewave.exception.ResourceNotFoundException;
import com.ridewave.model.Booking;
import com.ridewave.model.Ride;
import com.ridewave.model.enums.BookingStatus;
import com.ridewave.patterns.mediator.RideBookingMediator;
import com.ridewave.repository.BookingRepository;
import com.ridewave.repository.RideRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.UUID;

/**
 * Booking Service — thin orchestration layer.
 *
 * All multi-service coordination is delegated to RideBookingMediator (Mediator pattern).
 * BookingService is responsible for:
 *   - Route-based validation (RouteValidationService) before a booking is created
 *   - Pro-rated fare calculation for partial-route bookings (pickup ≠ origin)
 *   - Persisting the passenger's pickup/drop segment and fare breakdown
 *   - Read operations (getById, my bookings, ride bookings)
 *
 * ── Pro-rated fare formula ────────────────────────────────────────────────
 *
 *   perSeatTripFare       = ride.farePerSeat           (set by driver via totalTripFare ÷ seats)
 *   passengerFarePerSeat  = (passengerDistanceM / rideDistanceM) × perSeatTripFare
 *   totalFare             = passengerFarePerSeat × seatsRequested
 *
 * Falls back to flat fare (farePerSeat × seats) when:
 *   - No pickup/drop specified (full-route booking)
 *   - No passengerDistanceM provided by client
 *   - Ride has no stored routeDistanceM (legacy rides)
 *
 * The mediator sets an interim totalFare = farePerSeat × seats. BookingService
 * then OVERRIDES that with the pro-rated amount and re-saves the booking.
 * This keeps the mediator's internal seat-decrement and event logic intact.
 *
 * ── Route validation strategy ─────────────────────────────────────────────
 *   1. Load the ride to get its stored polyline and origin/dest fallback.
 *   2. If pickup/drop are provided, validate against the stored polyline via
 *      RouteValidationService (no live API call — uses stored polyline).
 *   3. After the Mediator creates the Booking, override totalFare with the
 *      pro-rated amount and set pickup/drop + fare breakdown fields.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class BookingService {

    private final RideBookingMediator    mediator;
    private final BookingRepository      bookingRepository;
    private final RideRepository         rideRepository;
    private final RouteValidationService routeValidationService;

    // Minimum fare — a passenger is always charged at least this amount
    // regardless of how short their segment is.
    private static final BigDecimal MIN_FARE = BigDecimal.valueOf(10);

    // ── Request ────────────────────────────────────────────────────────────

    @Transactional
    public BookingResponse requestBooking(UUID passengerId, BookingRequest request) {

        // 1. Load ride — needed for polyline, distances, and fare
        Ride ride = rideRepository.findById(request.getRideId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Ride not found: " + request.getRideId()));

        // 2. Determine if pickup/drop were provided
        boolean hasPickup = request.getPickupLat() != null && request.getPickupLng() != null;
        boolean hasDrop   = request.getDropLat()   != null && request.getDropLng()   != null;

        if (hasPickup && hasDrop) {
            // Route validation: both points must lie on driver's route,
            // pickup must appear before drop in direction of travel.
            routeValidationService.validate(
                    ride.getRoutePolyline(),
                    ride.getOriginLat(),  ride.getOriginLng(),
                    ride.getDestLat(),    ride.getDestLng(),
                    request.getPickupLat(), request.getPickupLng(),
                    request.getDropLat(),   request.getDropLng());
        } else if (hasPickup || hasDrop) {
            throw new BadRequestException(
                    "Both pickup and drop locations are required. " +
                            "Please provide both or leave both empty to book the full route.");
        }

        // 3. Delegate to Mediator — creates Booking with interim flat fare
        Booking booking = mediator.requestBooking(
                passengerId,
                request.getRideId(),
                request.getSeatsRequested(),
                request.getPaymentMethod());

        // 4. Pro-rated fare calculation (overrides mediator's flat calculation)
        boolean isPartialRoute = hasPickup
                && request.getPassengerDistanceM() != null
                && request.getPassengerDistanceM() > 0
                && ride.getRouteDistanceM() != null
                && ride.getRouteDistanceM() > 0;

        BigDecimal perSeatTripFare     = ride.getFarePerSeat();   // already computed: totalTripFare ÷ seats
        BigDecimal passengerFarePerSeat;
        BigDecimal newTotalFare;

        if (isPartialRoute) {
            // Pro-rate based on actual route distances
            BigDecimal segmentRatio = BigDecimal.valueOf(request.getPassengerDistanceM())
                    .divide(BigDecimal.valueOf(ride.getRouteDistanceM()), 6, RoundingMode.HALF_UP);

            passengerFarePerSeat = perSeatTripFare
                    .multiply(segmentRatio)
                    .setScale(2, RoundingMode.HALF_UP);

            // Enforce minimum fare per seat
            if (passengerFarePerSeat.compareTo(MIN_FARE) < 0) {
                passengerFarePerSeat = MIN_FARE;
            }

            newTotalFare = passengerFarePerSeat
                    .multiply(BigDecimal.valueOf(request.getSeatsRequested()))
                    .setScale(2, RoundingMode.HALF_UP);

            log.info("Partial-route fare: segment={}m / route={}m = {:.4f} ratio, " +
                            "perSeatFull={}, perSeatPassenger={}, seats={}, total={}",
                    request.getPassengerDistanceM(), ride.getRouteDistanceM(),
                    segmentRatio.doubleValue(),
                    perSeatTripFare, passengerFarePerSeat,
                    request.getSeatsRequested(), newTotalFare);

        } else {
            // Full-route booking — flat fare
            passengerFarePerSeat = perSeatTripFare;
            newTotalFare = perSeatTripFare
                    .multiply(BigDecimal.valueOf(request.getSeatsRequested()))
                    .setScale(2, RoundingMode.HALF_UP);

            log.info("Full-route fare: perSeat={}, seats={}, total={}",
                    perSeatTripFare, request.getSeatsRequested(), newTotalFare);
        }

        // 5. Override the mediator's fare and persist pickup/drop + fare breakdown
        booking.setTotalFare(newTotalFare);
        booking.setPerSeatTripFare(perSeatTripFare);
        booking.setPassengerFarePerSeat(passengerFarePerSeat);

        if (hasPickup) {
            booking.setPickupName(request.getPickupName());
            booking.setPickupLat(request.getPickupLat());
            booking.setPickupLng(request.getPickupLng());
            booking.setDropName(request.getDropName());
            booking.setDropLat(request.getDropLat());
            booking.setDropLng(request.getDropLng());
        }

        if (isPartialRoute) {
            booking.setPassengerDistanceM(request.getPassengerDistanceM());
        }

        bookingRepository.save(booking);

        log.info("Booking {} created: pickup={}, drop={}, fare=PKR {}, distM={}",
                booking.getBookingId(),
                hasPickup ? request.getPickupName() : "origin",
                hasPickup ? request.getDropName()   : "destination",
                newTotalFare,
                isPartialRoute ? request.getPassengerDistanceM() : ride.getRouteDistanceM());

        return BookingResponse.from(booking);
    }

    // ── Approve / Reject (driver) ──────────────────────────────────────────

    @Transactional
    public BookingResponse handleApproval(UUID driverId, UUID bookingId,
                                          ApproveBookingRequest request) {
        Booking booking = request.getApproved()
                ? mediator.approveBooking(driverId, bookingId)
                : mediator.rejectBooking(driverId, bookingId, request.getReason());
        return BookingResponse.from(booking);
    }

    // ── Cancel (passenger or admin) ────────────────────────────────────────

    @Transactional
    public BookingResponse cancelBooking(UUID requesterId, UUID bookingId,
                                         CancelBookingRequest request, boolean isAdmin) {
        Booking booking = mediator.cancelBooking(
                requesterId, bookingId, request.getReason(), isAdmin);
        return BookingResponse.from(booking);
    }

    // ── Read ───────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public BookingResponse getBookingById(UUID requesterId, UUID bookingId, boolean isAdmin) {
        Booking booking = isAdmin
                ? bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Booking not found: " + bookingId))
                : bookingRepository.findByBookingIdAndPassenger_UserId(bookingId, requesterId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Booking not found or does not belong to you."));
        return BookingResponse.from(booking);
    }

    @Transactional(readOnly = true)
    public Page<BookingResponse> getMyBookings(UUID passengerId,
                                               BookingStatus status,
                                               Pageable pageable) {
        Page<Booking> bookings = (status != null)
                ? bookingRepository.findByPassenger_UserIdAndStatusOrderByBookingTimeDesc(
                passengerId, status, pageable)
                : bookingRepository.findByPassenger_UserIdOrderByBookingTimeDesc(
                passengerId, pageable);
        return bookings.map(BookingResponse::from);
    }

    @Transactional(readOnly = true)
    public Page<BookingResponse> getBookingsForRide(UUID driverId, UUID rideId, Pageable pageable) {
        Page<Booking> bookings = bookingRepository
                .findByRide_RideIdOrderByBookingTimeAsc(rideId, pageable);
        return bookings.map(BookingResponse::from);
    }
}