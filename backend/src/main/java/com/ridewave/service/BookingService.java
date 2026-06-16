package com.ridewave.service;

import com.ridewave.dto.request.ApproveBookingRequest;
import com.ridewave.dto.request.BookingRequest;
import com.ridewave.dto.request.CancelBookingRequest;
import com.ridewave.dto.response.BookingResponse;
import com.ridewave.exception.ResourceNotFoundException;
import com.ridewave.model.Booking;
import com.ridewave.model.enums.BookingStatus;
import com.ridewave.patterns.mediator.RideBookingMediator;
import com.ridewave.repository.BookingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Booking Service — thin orchestration layer.
 *
 * All multi-service coordination is delegated to RideBookingMediator (Mediator pattern).
 * BookingService is responsible only for:
 *   - Mapping DTOs → domain calls
 *   - Read operations (getById, my bookings)
 *   - Routing approve/reject/cancel to the Mediator
 *
 * This keeps the Mediator focused on coordination and the Service focused on
 * request/response translation.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class BookingService {

    private final RideBookingMediator mediator;
    private final BookingRepository   bookingRepository;

    // ── Request ───────────────────────────────────────────────────────────

    @Transactional
    public BookingResponse requestBooking(UUID passengerId, BookingRequest request) {
        Booking booking = mediator.requestBooking(
                passengerId,
                request.getRideId(),
                request.getSeats(),
                request.getPaymentMethod());
        return BookingResponse.from(booking);
    }

    // ── Approve / Reject (driver) ─────────────────────────────────────────

    @Transactional
    public BookingResponse handleApproval(UUID driverId, UUID bookingId,
                                          ApproveBookingRequest request) {
        Booking booking = request.getApproved()
                ? mediator.approveBooking(driverId, bookingId)
                : mediator.rejectBooking(driverId, bookingId, request.getReason());
        return BookingResponse.from(booking);
    }

    // ── Cancel (passenger or admin) ───────────────────────────────────────

    @Transactional
    public BookingResponse cancelBooking(UUID requesterId, UUID bookingId,
                                         CancelBookingRequest request, boolean isAdmin) {
        Booking booking = mediator.cancelBooking(
                requesterId, bookingId, request.getReason(), isAdmin);
        return BookingResponse.from(booking);
    }

    // ── Read ──────────────────────────────────────────────────────────────

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
        // Ownership check is implicit — we fetch only bookings matching this rideId
        // and verify the requesting driver later in the controller via @PreAuthorize
        Page<Booking> bookings = bookingRepository
                .findByRide_RideIdOrderByBookingTimeAsc(rideId, pageable);
        return bookings.map(BookingResponse::from);
    }
}