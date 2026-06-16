package com.ridewave.controller;

import com.ridewave.dto.request.*;
import com.ridewave.dto.response.*;
import com.ridewave.model.enums.UserRole;
import com.ridewave.model.enums.UserStatus;
import com.ridewave.security.UserPrincipal;
import com.ridewave.service.AdminService;
import com.ridewave.service.ReportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * Admin Controller — all endpoints under /api/v1/admin.
 *
 * Every endpoint is secured by:
 *   1. URL-level: SecurityConfig.requestMatchers("/api/v1/admin/**").hasRole("ADMIN")
 *   2. Method-level: @PreAuthorize("hasRole('ADMIN')") — defence in depth
 *
 * The @PreAuthorize on the class level applies to all methods.
 * Individual methods can further restrict if needed.
 */
@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Admin", description = "Platform administration — ADMIN role required for all endpoints")
@SecurityRequirement(name = "bearerAuth")
public class AdminController {

    private final AdminService  adminService;
    private final ReportService reportService;

    // ── GET /admin/dashboard ──────────────────────────────────────────────

    @GetMapping("/dashboard")
    @Operation(
            summary = "Get admin dashboard",
            description = "Returns platform-wide statistics across 5 panels: Platform, Users, " +
                    "Rides, Finance, Safety. Built using the Composite design pattern."
    )
    public ResponseEntity<ApiResponse<DashboardResponse>> getDashboard() {
        return ResponseEntity.ok(ApiResponse.success(adminService.buildDashboard()));
    }

    // ── Users ─────────────────────────────────────────────────────────────

    @GetMapping("/users")
    @Operation(
            summary = "List all users",
            description = "Paginated user list. Filter by role, status, or name/email search."
    )
    public ResponseEntity<ApiResponse<Page<UserResponse>>> listUsers(
            @RequestParam(required = false)    UserRole   role,
            @RequestParam(required = false)    UserStatus status,
            @RequestParam(required = false)    String     search,
            @RequestParam(defaultValue = "0")  int        page,
            @RequestParam(defaultValue = "20") int        size) {

        Page<UserResponse> users = adminService.listUsers(
                role, status, search,
                PageRequest.of(page, size, Sort.by("createdAt").descending()));

        return ResponseEntity.ok(ApiResponse.success(users));
    }

    @GetMapping("/users/{userId}")
    @Operation(summary = "Get full user profile by ID")
    public ResponseEntity<ApiResponse<UserResponse>> getUserById(@PathVariable UUID userId) {
        return ResponseEntity.ok(ApiResponse.success(adminService.getUserById(userId)));
    }

    @PatchMapping("/users/{userId}/status")
    @Operation(
            summary = "Change a user's account status",
            description = "Set status to ACTIVE, SUSPENDED, or BLOCKED with a mandatory reason. " +
                    "The user receives an in-app notification."
    )
    public ResponseEntity<ApiResponse<UserResponse>> updateUserStatus(
            @PathVariable UUID userId,
            @Valid @RequestBody UpdateUserStatusRequest request,
            @AuthenticationPrincipal UserPrincipal currentUser) {

        UserResponse user = adminService.updateUserStatus(
                currentUser.getId(), userId, request);

        return ResponseEntity.ok(
                ApiResponse.success(user, "User status updated to " + request.getStatus()));
    }

    // ── Driver verification ───────────────────────────────────────────────

    @GetMapping("/drivers/pending")
    @Operation(
            summary = "List drivers awaiting document verification",
            description = "Returns drivers with PENDING_VERIFICATION status who have uploaded documents."
    )
    public ResponseEntity<ApiResponse<Page<UserResponse>>> getDriversPendingVerification(
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size) {

        Page<UserResponse> drivers = adminService.getDriversPendingVerification(
                PageRequest.of(page, size));

        return ResponseEntity.ok(ApiResponse.success(drivers));
    }

    @GetMapping("/drivers/{driverId}/verification-eligibility")
    @Operation(
            summary = "Check whether a driver passes the AI verification gate",
            description = "Returns eligible=true only if LICENSE and VEHICLE_REGISTRATION " +
                    "both have completed AI checks with score >= threshold and no " +
                    "blocking flags. If eligible=false, approving requires forceOverride=true."
    )
    public ResponseEntity<ApiResponse<java.util.Map<String, Object>>> checkVerificationEligibility(
            @PathVariable UUID driverId) {

        var result = adminService.checkAiVerificationEligibility(driverId);
        return ResponseEntity.ok(ApiResponse.success(java.util.Map.of(
                "eligible", result.eligible(),
                "reason", result.reason() == null ? "" : result.reason()
        )));
    }

    @PostMapping("/drivers/{driverId}/verify")
    @Operation(
            summary = "Approve or reject a driver's application",
            description = "approved=true activates the driver account; false rejects with notes. " +
                    "Driver receives email and in-app notification either way."
    )
    public ResponseEntity<ApiResponse<UserResponse>> verifyDriver(
            @PathVariable UUID driverId,
            @Valid @RequestBody DriverVerifyRequest request,
            @AuthenticationPrincipal UserPrincipal currentUser) {

        UserResponse driver = adminService.verifyDriver(
                currentUser.getId(), driverId, request);

        String message = Boolean.TRUE.equals(request.getApproved())
                ? "Driver approved and account activated."
                : "Driver application rejected. Driver has been notified.";

        return ResponseEntity.ok(ApiResponse.success(driver, message));
    }

    @PostMapping("/drivers/{driverId}/request-reupload")
    @Operation(
            summary = "Request driver to re-upload a specific document",
            description = "Resets the given document type to PENDING and notifies the driver " +
                    "with the reason, so they can re-submit it. Used when a document " +
                    "is unreadable, expired, or fails name-match without warranting a " +
                    "full rejection of the application."
    )
    public ResponseEntity<ApiResponse<Void>> requestReupload(
            @PathVariable UUID driverId,
            @RequestParam String docType,
            @RequestParam(required = false, defaultValue = "Document did not meet requirements.") String reason,
            @AuthenticationPrincipal UserPrincipal currentUser) {

        adminService.requestDocumentReupload(currentUser.getId(), driverId, docType, reason);
        return ResponseEntity.ok(ApiResponse.ok("Re-upload request sent to driver."));
    }

    // ── Reports ───────────────────────────────────────────────────────────

    @GetMapping("/reports")
    @Operation(
            summary = "List user reports",
            description = "Filter by status: OPEN | REVIEWED | RESOLVED. Defaults to all."
    )
    public ResponseEntity<ApiResponse<Page<ReportResponse>>> getReports(
            @RequestParam(required = false)    String status,
            @RequestParam(defaultValue = "0")  int    page,
            @RequestParam(defaultValue = "20") int    size) {

        Page<ReportResponse> reports = reportService.getReports(
                status,
                PageRequest.of(page, size, Sort.by("createdAt").descending()));

        return ResponseEntity.ok(ApiResponse.success(reports));
    }

    @GetMapping("/reports/user/{userId}")
    @Operation(summary = "Get all reports filed against a specific user")
    public ResponseEntity<ApiResponse<Page<ReportResponse>>> getReportsForUser(
            @PathVariable UUID userId,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size) {

        Page<ReportResponse> reports = reportService.getReportsAgainstUser(
                userId, PageRequest.of(page, size));

        return ResponseEntity.ok(ApiResponse.success(reports));
    }

    @PostMapping("/reports/{reportId}/resolve")
    @Operation(
            summary = "Resolve a report",
            description = "Action must be one of: WARN, SUSPEND, BLOCK, DISMISSED. " +
                    "SUSPEND and BLOCK immediately update the reported user's account status."
    )
    public ResponseEntity<ApiResponse<ReportResponse>> resolveReport(
            @PathVariable UUID reportId,
            @Valid @RequestBody ResolveReportRequest request,
            @AuthenticationPrincipal UserPrincipal currentUser) {

        ReportResponse report = reportService.resolveReport(
                currentUser.getId(), reportId, request);

        return ResponseEntity.ok(
                ApiResponse.success(report,
                        "Report resolved. Action taken: " + request.getAction()));
    }
}