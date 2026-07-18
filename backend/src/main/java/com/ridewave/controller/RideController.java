package com.ridewave.controller;

import com.ridewave.dto.request.CancelRideRequest;
import com.ridewave.dto.request.CreateRideRequest;
import com.ridewave.dto.request.GpsCheckinRequest;
import com.ridewave.dto.request.UpdateRideRequest;
import com.ridewave.dto.response.ApiResponse;
import com.ridewave.dto.response.RideResponse;
import com.ridewave.model.enums.RideStatus;
import com.ridewave.model.enums.UserRole;
import com.ridewave.security.UserPrincipal;
import com.ridewave.service.RideService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/rides")
@RequiredArgsConstructor
@Tag(name = "Rides", description = "Create, search, manage and track rides")
@SecurityRequirement(name = "bearerAuth")
public class RideController {

    private final RideService rideService;

    // ── GET /rides/browse  (public — all available rides, no filter) ────────

    @GetMapping("/browse")
    @Operation(summary = "Browse all available rides",
            description = "Public endpoint. Returns all SCHEDULED rides with future departures. " +
                    "Used to populate the search page before the user types anything. " +
                    "EXPIRED rides are excluded.")
    public ResponseEntity<ApiResponse<Page<RideResponse>>> browseRides(
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "50") int size) {

        Page<RideResponse> rides = rideService.browseAllRides(PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.success(rides));
    }

    // ── GET /rides/search  (public) ───────────────────────────────────────

    @GetMapping("/search")
    @Operation(summary = "Search available rides",
            description = "Public endpoint — no auth required. " +
                    "Filters SCHEDULED rides by keyword, date, and seat count. " +
                    "EXPIRED rides are excluded at query level.")
    public ResponseEntity<ApiResponse<Page<RideResponse>>> searchRides(
            @RequestParam(defaultValue = "") String from,
            @RequestParam(defaultValue = "") String to,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(defaultValue = "1")  int seats,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "50") int size) {

        Page<RideResponse> rides = rideService.searchRides(
                from, to, date, seats, PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.success(rides));
    }

    // ── GET /rides/my  (DRIVER) ───────────────────────────────────────────

    @GetMapping("/my")
    @PreAuthorize("hasRole('DRIVER')")
    @Operation(summary = "Get my rides",
            description = "DRIVER only. Returns paginated list of the driver's own rides, " +
                    "enriched with bookingCount and canModify fields.")
    public ResponseEntity<ApiResponse<Page<RideResponse>>> getMyRides(
            @RequestParam(required = false) RideStatus status,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal UserPrincipal currentUser) {

        Page<RideResponse> rides = rideService.getMyRides(
                currentUser.getId(), status, PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.success(rides));
    }

    // ── GET /rides/{rideId}  (public) ─────────────────────────────────────

    @GetMapping("/{rideId}")
    @Operation(summary = "Get ride details")
    public ResponseEntity<ApiResponse<RideResponse>> getRide(
            @PathVariable UUID rideId) {

        return ResponseEntity.ok(ApiResponse.success(rideService.getRideById(rideId)));
    }

    // ── POST /rides  (DRIVER) ─────────────────────────────────────────────

    @PostMapping
    @PreAuthorize("hasRole('DRIVER')")
    @Operation(
            summary = "Create a new ride",
            description = "DRIVER only. Validates:\n" +
                    "• Driver account is ACTIVE\n" +
                    "• Vehicle belongs to the driver\n" +
                    "• No overlapping active ride within ±2 hours of departure"
    )
    public ResponseEntity<ApiResponse<RideResponse>> createRide(
            @Valid @RequestBody CreateRideRequest request,
            @AuthenticationPrincipal UserPrincipal currentUser) {

        RideResponse ride = rideService.createRide(currentUser.getId(), request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(ride, "Ride created successfully."));
    }

    // ── PUT /rides/{rideId}  (DRIVER) ─────────────────────────────────────

    @PutMapping("/{rideId}")
    @PreAuthorize("hasRole('DRIVER')")
    @Operation(
            summary = "Update a ride",
            description = "DRIVER only. Allowed only if ride is SCHEDULED and has NO active bookings. " +
                    "If passengers have booked, returns 409 with explanation message."
    )
    public ResponseEntity<ApiResponse<RideResponse>> updateRide(
            @PathVariable UUID rideId,
            @Valid @RequestBody UpdateRideRequest request,
            @AuthenticationPrincipal UserPrincipal currentUser) {

        RideResponse ride = rideService.updateRide(currentUser.getId(), rideId, request);
        return ResponseEntity.ok(ApiResponse.success(ride, "Ride updated successfully."));
    }

    // ── DELETE /rides/{rideId}  (DRIVER) ──────────────────────────────────

    @DeleteMapping("/{rideId}")
    @PreAuthorize("hasRole('DRIVER')")
    @Operation(
            summary = "Delete a ride",
            description = "DRIVER only. Hard-deletes the ride. " +
                    "Allowed only if ride is SCHEDULED and has NO active bookings. " +
                    "Use /cancel to soft-cancel instead."
    )
    public ResponseEntity<ApiResponse<Void>> deleteRide(
            @PathVariable UUID rideId,
            @AuthenticationPrincipal UserPrincipal currentUser) {

        rideService.deleteRide(currentUser.getId(), rideId);
        return ResponseEntity.ok(ApiResponse.success(null, "Ride deleted."));
    }

    // ── POST /rides/{rideId}/cancel  (DRIVER or ADMIN) ────────────────────

    @PostMapping("/{rideId}/cancel")
    @PreAuthorize("hasAnyRole('DRIVER', 'ADMIN')")
    @Operation(
            summary = "Cancel a ride",
            description = "DRIVER cancels their own SCHEDULED ride (soft cancel, status → CANCELLED). " +
                    "ADMIN can cancel any SCHEDULED ride bypassing the booking guard. " +
                    "Rejected if the ride is IN_PROGRESS or COMPLETED (Rule 4). " +
                    "Rejected for drivers if passengers have booked (Rule 3)."
    )
    public ResponseEntity<ApiResponse<RideResponse>> cancelRide(
            @PathVariable UUID rideId,
            @Valid @RequestBody(required = false) CancelRideRequest request,
            @AuthenticationPrincipal UserPrincipal currentUser) {

        boolean isAdmin = currentUser.getRole() == UserRole.ADMIN;
        String reason   = request != null ? request.getReason() : null;

        RideResponse ride = rideService.cancelRide(currentUser.getId(), rideId, reason, isAdmin);
        return ResponseEntity.ok(ApiResponse.success(ride, "Ride cancelled."));
    }

    // ── POST /rides/{rideId}/start  (DRIVER) ──────────────────────────────

    @PostMapping("/{rideId}/start")
    @PreAuthorize("hasRole('DRIVER')")
    @Operation(summary = "Start a ride",
            description = "DRIVER clicks Start. Ride transitions to IN_PROGRESS.")
    public ResponseEntity<ApiResponse<Void>> startRide(
            @PathVariable UUID rideId,
            @AuthenticationPrincipal UserPrincipal currentUser) {

        rideService.startRide(currentUser.getId(), rideId);
        return ResponseEntity.ok(ApiResponse.success(null, "Ride started! Have a safe journey."));
    }

    // ── POST /rides/{rideId}/checkin  (PASSENGER) ─────────────────────────

    @PostMapping("/{rideId}/checkin")
    @PreAuthorize("hasRole('PASSENGER')")
    @Operation(summary = "GPS check-in for passenger",
            description = "PASSENGER sends GPS coordinates. " +
                    "Returns proximity result (within 50 m = checked in).")
    public ResponseEntity<ApiResponse<String>> checkIn(
            @PathVariable UUID rideId,
            @Valid @RequestBody GpsCheckinRequest request,
            @AuthenticationPrincipal UserPrincipal currentUser) {

        String result = rideService.gpsCheckIn(
                currentUser.getId(), rideId,
                request.getPassengerLat(), request.getPassengerLng());
        return ResponseEntity.ok(ApiResponse.success(result, "Check-in processed."));
    }

    // ── POST /rides/{rideId}/complete  (DRIVER) ───────────────────────────

    @PostMapping("/{rideId}/complete")
    @PreAuthorize("hasRole('DRIVER')")
    @Operation(summary = "Complete a ride",
            description = "DRIVER marks the ride as COMPLETED. " +
                    "Triggers payment release and rating prompts.")
    public ResponseEntity<ApiResponse<Void>> completeRide(
            @PathVariable UUID rideId,
            @AuthenticationPrincipal UserPrincipal currentUser) {

        rideService.completeRide(currentUser.getId(), rideId);
        return ResponseEntity.ok(ApiResponse.success(null, "Ride completed. Thank you!"));
    }
}