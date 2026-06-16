package com.ridewave.controller;

import com.ridewave.dto.request.ApproveBookingRequest;
import com.ridewave.dto.request.BookingRequest;
import com.ridewave.dto.request.CancelBookingRequest;
import com.ridewave.dto.response.ApiResponse;
import com.ridewave.dto.response.BookingResponse;
import com.ridewave.model.enums.BookingStatus;
import com.ridewave.model.enums.UserRole;
import com.ridewave.security.UserPrincipal;
import com.ridewave.service.BookingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/bookings")
@RequiredArgsConstructor
@Tag(name = "Bookings", description = "Request, approve, cancel and view bookings")
@SecurityRequirement(name = "bearerAuth")
public class BookingController {

    private final BookingService bookingService;

    // ── POST /bookings  (PASSENGER) ───────────────────────────────────────

    @PostMapping
    @PreAuthorize("hasAnyRole('PASSENGER', 'ADMIN')")
    @Operation(
            summary = "Request a booking",
            description = "PASSENGER books seats on a ride. All validation (seat availability, " +
                    "trust score, duplicate booking guard) runs inside the RideBookingMediator."
    )
    public ResponseEntity<ApiResponse<BookingResponse>> requestBooking(
            @Valid @RequestBody BookingRequest request,
            @AuthenticationPrincipal UserPrincipal currentUser) {

        BookingResponse booking = bookingService.requestBooking(currentUser.getId(), request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(booking,
                        booking.getStatus().name().equals("PENDING")
                                ? "Booking request submitted. Waiting for driver approval."
                                : "Booking confirmed! Check your SMS for details."));
    }

    // ── GET /bookings/{id}  (own booking or ADMIN) ────────────────────────

    @GetMapping("/{bookingId}")
    @Operation(summary = "Get booking details")
    public ResponseEntity<ApiResponse<BookingResponse>> getBooking(
            @PathVariable UUID bookingId,
            @AuthenticationPrincipal UserPrincipal currentUser) {

        boolean isAdmin = currentUser.getRole() == UserRole.ADMIN;
        BookingResponse booking = bookingService.getBookingById(
                currentUser.getId(), bookingId, isAdmin);
        return ResponseEntity.ok(ApiResponse.success(booking));
    }

    // ── POST /bookings/{id}/decision  (DRIVER) ────────────────────────────

    @PostMapping("/{bookingId}/decision")
    @PreAuthorize("hasRole('DRIVER')")
    @Operation(
            summary = "Approve or reject a booking request",
            description = "DRIVER only. Only applies to rides with requiresApproval = true. " +
                    "Set approved=true to confirm, false to reject (reason required)."
    )
    public ResponseEntity<ApiResponse<BookingResponse>> handleApproval(
            @PathVariable UUID bookingId,
            @Valid @RequestBody ApproveBookingRequest request,
            @AuthenticationPrincipal UserPrincipal currentUser) {

        BookingResponse booking = bookingService.handleApproval(
                currentUser.getId(), bookingId, request);

        String message = Boolean.TRUE.equals(request.getApproved())
                ? "Booking approved. Passenger has been notified."
                : "Booking rejected. Passenger will be refunded.";

        return ResponseEntity.ok(ApiResponse.success(booking, message));
    }

    // ── DELETE /bookings/{id}  (PASSENGER own or ADMIN any) ───────────────

    @DeleteMapping("/{bookingId}")
    @PreAuthorize("hasAnyRole('PASSENGER', 'ADMIN')")
    @Operation(
            summary = "Cancel a booking",
            description = "PASSENGER cancels their own booking. ADMIN can cancel any booking. " +
                    "Seat is restored to the ride; payment is refunded."
    )
    public ResponseEntity<ApiResponse<BookingResponse>> cancelBooking(
            @PathVariable UUID bookingId,
            @Valid @RequestBody CancelBookingRequest request,
            @AuthenticationPrincipal UserPrincipal currentUser) {

        boolean isAdmin = currentUser.getRole() == UserRole.ADMIN;
        BookingResponse booking = bookingService.cancelBooking(
                currentUser.getId(), bookingId, request, isAdmin);

        return ResponseEntity.ok(ApiResponse.success(booking,
                "Booking cancelled. Refund will be processed within 3–5 business days."));
    }

    // ── GET /bookings/my  (PASSENGER) ─────────────────────────────────────

    @GetMapping("/my")
    @PreAuthorize("hasAnyRole('PASSENGER', 'ADMIN')")
    @Operation(
            summary = "Get the current passenger's bookings",
            description = "Paginated. Filter by status: PENDING, APPROVED, CONFIRMED, CANCELLED, COMPLETED."
    )
    public ResponseEntity<ApiResponse<Page<BookingResponse>>> getMyBookings(
            @RequestParam(required = false)    BookingStatus status,
            @RequestParam(defaultValue = "0")  int           page,
            @RequestParam(defaultValue = "20") int           size,
            @AuthenticationPrincipal UserPrincipal currentUser) {

        Page<BookingResponse> bookings = bookingService.getMyBookings(
                currentUser.getId(), status,
                PageRequest.of(page, size, Sort.by("bookingTime").descending()));

        return ResponseEntity.ok(ApiResponse.success(bookings));
    }

    // ── GET /bookings/ride/{rideId}  (DRIVER) ─────────────────────────────

    @GetMapping("/ride/{rideId}")
    @PreAuthorize("hasAnyRole('DRIVER', 'ADMIN')")
    @Operation(
            summary = "Get all bookings for a specific ride",
            description = "DRIVER views bookings on their own ride. ADMIN can view any."
    )
    public ResponseEntity<ApiResponse<Page<BookingResponse>>> getBookingsForRide(
            @PathVariable UUID rideId,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal UserPrincipal currentUser) {

        Page<BookingResponse> bookings = bookingService.getBookingsForRide(
                currentUser.getId(), rideId,
                PageRequest.of(page, size));

        return ResponseEntity.ok(ApiResponse.success(bookings));
    }
}