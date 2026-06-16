package com.ridewave.controller;

import com.ridewave.dto.request.*;
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
import org.springframework.data.domain.Sort;
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
@Tag(name = "Rides", description = "Create, search, manage, and complete rides")
public class RideController {

    private final RideService rideService;

    // ── GET /rides/search (PUBLIC) ────────────────────────────────────────

    @GetMapping("/search")
    @Operation(summary = "Search available rides",
            description = "Public endpoint — no authentication required. " +
                    "Searches by origin/destination keyword and departure date.")
    public ResponseEntity<ApiResponse<Page<RideResponse>>> searchRides(
            @RequestParam String                                    from,
            @RequestParam String                                    to,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(defaultValue = "1")  int                 seats,
            @RequestParam(defaultValue = "0")  int                 page,
            @RequestParam(defaultValue = "20") int                 size) {

        Page<RideResponse> rides = rideService.searchRides(
                from, to, date, seats,
                PageRequest.of(page, size, Sort.by("departureTime").ascending()));

        return ResponseEntity.ok(ApiResponse.success(rides));
    }

    // ── GET /rides/{rideId} (PUBLIC) ──────────────────────────────────────

    @GetMapping("/{rideId}")
    @Operation(summary = "Get ride details by ID")
    public ResponseEntity<ApiResponse<RideResponse>> getRide(
            @PathVariable UUID rideId) {

        return ResponseEntity.ok(ApiResponse.success(rideService.getRideById(rideId)));
    }

    // ── POST /rides (DRIVER) ──────────────────────────────────────────────

    @PostMapping
    @PreAuthorize("hasRole('DRIVER')")
    @Operation(summary = "Create a new ride",
            description = "DRIVER only. Uses the RideBuilder pattern for validated construction.",
            security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<RideResponse>> createRide(
            @Valid @RequestBody CreateRideRequest request,
            @AuthenticationPrincipal UserPrincipal currentUser) {

        RideResponse ride = rideService.createRide(currentUser.getId(), request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(ride, "Ride created successfully."));
    }

    // ── PUT /rides/{rideId} (DRIVER) ──────────────────────────────────────

    @PutMapping("/{rideId}")
    @PreAuthorize("hasRole('DRIVER')")
    @Operation(summary = "Update a ride (partial)",
            description = "DRIVER only. Only SCHEDULED rides can be updated. " +
                    "Null fields are ignored.",
            security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<RideResponse>> updateRide(
            @PathVariable UUID rideId,
            @Valid @RequestBody UpdateRideRequest request,
            @AuthenticationPrincipal UserPrincipal currentUser) {

        RideResponse ride = rideService.updateRide(currentUser.getId(), rideId, request);
        return ResponseEntity.ok(ApiResponse.success(ride, "Ride updated successfully."));
    }

    // ── DELETE /rides/{rideId} (DRIVER or ADMIN) ──────────────────────────

    @DeleteMapping("/{rideId}")
    @PreAuthorize("hasAnyRole('DRIVER', 'ADMIN')")
    @Operation(summary = "Cancel a ride",
            description = "DRIVER cancels own ride; ADMIN can cancel any. " +
                    "All passengers are refunded and notified.",
            security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<Void>> cancelRide(
            @PathVariable UUID rideId,
            @Valid @RequestBody CancelRideRequest request,
            @AuthenticationPrincipal UserPrincipal currentUser) {

        boolean isAdmin = currentUser.getRole() == UserRole.ADMIN;
        rideService.cancelRide(currentUser.getId(), rideId, request.getReason(), isAdmin);
        return ResponseEntity.ok(ApiResponse.ok("Ride cancelled. Passengers will be notified."));
    }

    // ── POST /rides/{rideId}/start (DRIVER) ────────────────────────────────

    // ── POST /rides/{rideId}/start (DRIVER) ───────────────────────────────

    @PostMapping("/{rideId}/start")
    @PreAuthorize("hasRole('DRIVER')")
    @Operation(summary = "Start a ride — no OTP required",
            description = "DRIVER clicks Start. Ride transitions directly to IN_PROGRESS. " +
                    "Passengers receive check-in link via email; no OTP exchange needed.",
            security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<Void>> startRide(
            @PathVariable UUID rideId,
            @AuthenticationPrincipal UserPrincipal currentUser) {

        rideService.startRide(currentUser.getId(), rideId);
        return ResponseEntity.ok(ApiResponse.ok("Ride started! Have a safe journey."));
    }

    // ── POST /rides/{rideId}/checkin (PASSENGER GPS) ─────────────────────

    @PostMapping("/{rideId}/checkin")
    @PreAuthorize("hasRole('PASSENGER')")
    @Operation(summary = "GPS check-in for passenger",
            description = "PASSENGER sends their GPS coordinates. " +
                    "If within 50 m of driver, booking is marked BOARDED.",
            security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<String>> checkIn(
            @PathVariable UUID rideId,
            @Valid @RequestBody GpsCheckinRequest request,
            @AuthenticationPrincipal UserPrincipal currentUser) {

        String result = rideService.gpsCheckIn(currentUser.getId(), rideId,
                request.getPassengerLat(), request.getPassengerLng());
        return ResponseEntity.ok(ApiResponse.success(result, "Check-in processed."));
    }

    // ── POST /rides/{rideId}/complete (DRIVER) ────────────────────────────

    @PostMapping("/{rideId}/complete")
    @PreAuthorize("hasRole('DRIVER')")
    @Operation(summary = "Complete a ride",
            description = "DRIVER marks the ride complete after drop-off. " +
                    "Payments are released and passengers are prompted to rate.",
            security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<Void>> completeRide(
            @PathVariable UUID rideId,
            @AuthenticationPrincipal UserPrincipal currentUser) {

        rideService.completeRide(currentUser.getId(), rideId);
        return ResponseEntity.ok(
                ApiResponse.ok("Ride completed! Payment released. Thank you for driving with RideWave."));
    }

    // ── GET /rides/my (DRIVER) ────────────────────────────────────────────

    @GetMapping("/my")
    @PreAuthorize("hasRole('DRIVER')")
    @Operation(summary = "Get driver's own rides",
            description = "Paginated. Filter by status: SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED.",
            security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<Page<RideResponse>>> getMyRides(
            @RequestParam(required = false)    RideStatus status,
            @RequestParam(defaultValue = "0")  int        page,
            @RequestParam(defaultValue = "20") int        size,
            @AuthenticationPrincipal UserPrincipal currentUser) {

        Page<RideResponse> rides = rideService.getMyRides(
                currentUser.getId(), status,
                PageRequest.of(page, size));

        return ResponseEntity.ok(ApiResponse.success(rides));
    }
}