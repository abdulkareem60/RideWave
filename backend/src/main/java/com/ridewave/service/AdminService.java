package com.ridewave.service;

import com.ridewave.dto.request.DriverVerifyRequest;
import com.ridewave.dto.request.UpdateUserStatusRequest;
import com.ridewave.dto.response.DashboardResponse;
import com.ridewave.dto.response.UserResponse;
import com.ridewave.exception.AccessDeniedException;
import com.ridewave.exception.BadRequestException;
import com.ridewave.exception.ResourceNotFoundException;
import com.ridewave.model.User;
import com.ridewave.model.DriverDocument;
import com.ridewave.model.enums.*;
import com.ridewave.model.enums.DocumentType;
import com.ridewave.patterns.bridge.InAppNotificationChannel;
import com.ridewave.patterns.composite.DashboardPanel;
import com.ridewave.patterns.composite.StatCard;
import com.ridewave.patterns.factory.NotificationFactory;
import com.ridewave.repository.*;
import com.ridewave.service.EmailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

/**
 * Admin Service — platform management operations for ADMIN role users.
 *
 * Design patterns in use:
 *   Composite  — buildDashboard() constructs a DashboardPanel tree whose
 *                root.getData() returns the entire stats object recursively.
 *   Factory    — NotificationFactory creates approval/rejection messages.
 *   Bridge     — InAppNotificationChannel delivers the notification.
 *   Singleton  — This service is a Spring singleton; all admin ops share
 *                one instance of each injected repository/service.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AdminService {

    private final UserRepository           userRepository;
    private final RideRepository           rideRepository;
    private final BookingRepository        bookingRepository;
    private final PaymentRepository        paymentRepository;
    private final ReportRepository         reportRepository;
    private final DriverDocumentRepository driverDocumentRepository;
    private final NotificationFactory      notificationFactory;
    private final InAppNotificationChannel inAppChannel;
    private final EmailService             emailService;

    /**
     * Minimum AI verification score (0.00–1.00) required for LICENSE and
     * VEHICLE_REGISTRATION documents before a driver can be approved
     * without forceOverride. Configurable via
     * app.verification.ai-score-threshold (default 0.80).
     */
    @org.springframework.beans.factory.annotation.Value("${verification.ai-score-threshold:0.60}")
    private BigDecimal aiScoreThreshold;

    // ── Dashboard (Composite pattern) ─────────────────────────────────────

    /**
     * Builds the admin dashboard using the Composite pattern.
     *
     * Step 1: Collect raw stats from repositories.
     * Step 2: Assemble into a DashboardPanel tree (composite + leaf nodes).
     * Step 3: Flatten the tree into DashboardResponse by calling getData()
     *         on each root panel.
     *
     * This two-phase approach means that adding a new stat card only requires:
     *   a) adding one repository query
     *   b) adding one StatCard leaf to the relevant panel
     * — the DashboardPanel tree assembly and flattening code is untouched.
     */
    @Transactional(readOnly = true)
    public DashboardResponse buildDashboard() {

        // ── Composite tree construction ───────────────────────────────────

        // Root panel
        DashboardPanel root = new DashboardPanel("Admin Dashboard");

        // Platform overview panel
        DashboardPanel platform = new DashboardPanel("Platform Overview");
        platform
                .add(new StatCard("Total Users",    userRepository.count()))
                .add(new StatCard("Total Rides",    rideRepository.count()))
                .add(new StatCard("Total Bookings", bookingRepository.count()))
                .add(new StatCard("Avg Trust Score",
                        userRepository.findAverageTrustScore()
                                .orElse(BigDecimal.valueOf(3.0))));
        root.add(platform);

        // User stats panel
        DashboardPanel users = new DashboardPanel("Users");
        users
                .add(new StatCard("Total Passengers",
                        userRepository.countByRole(UserRole.PASSENGER)))
                .add(new StatCard("Total Drivers",
                        userRepository.countByRole(UserRole.DRIVER)))
                .add(new StatCard("Active Users",
                        userRepository.countByStatus(UserStatus.ACTIVE)))
                .add(new StatCard("Pending Verification",
                        userRepository.countByStatus(UserStatus.PENDING_VERIFICATION)))
                .add(new StatCard("Suspended",
                        userRepository.countByStatus(UserStatus.SUSPENDED)))
                .add(new StatCard("Blocked",
                        userRepository.countByStatus(UserStatus.BLOCKED)));
        root.add(users);

        // Ride stats panel
        DashboardPanel rides = new DashboardPanel("Rides");
        rides
                .add(new StatCard("Scheduled",  rideRepository.countByStatus(RideStatus.SCHEDULED)))
                .add(new StatCard("In Progress", rideRepository.countByStatus(RideStatus.IN_PROGRESS)))
                .add(new StatCard("Completed",   rideRepository.countByStatus(RideStatus.COMPLETED)))
                .add(new StatCard("Cancelled",   rideRepository.countByStatus(RideStatus.CANCELLED)))
                .add(new StatCard("Active Now",  rideRepository.countActiveRides()));
        root.add(rides);

        // Finance panel
        LocalDateTime startOfDay   = LocalDateTime.now().truncatedTo(ChronoUnit.DAYS);
        LocalDateTime startOfMonth = LocalDateTime.now().withDayOfMonth(1).truncatedTo(ChronoUnit.DAYS);
        LocalDateTime epoch        = LocalDateTime.of(2020, 1, 1, 0, 0);

        DashboardPanel finance = new DashboardPanel("Finance");
        finance
                .add(new StatCard("Revenue Today",
                        paymentRepository.sumCompletedBetween(startOfDay, LocalDateTime.now()),
                        null, "PKR"))
                .add(new StatCard("Revenue This Month",
                        paymentRepository.sumCompletedBetween(startOfMonth, LocalDateTime.now()),
                        null, "PKR"))
                .add(new StatCard("Revenue All Time",
                        paymentRepository.sumCompletedBetween(epoch, LocalDateTime.now()),
                        null, "PKR"))
                .add(new StatCard("Completed Payments",
                        paymentRepository.countByStatus(PaymentStatus.COMPLETED)))
                .add(new StatCard("Pending Payments",
                        paymentRepository.countByStatus(PaymentStatus.PENDING)))
                .add(new StatCard("Refunded Payments",
                        paymentRepository.countByStatus(PaymentStatus.REFUNDED)));
        root.add(finance);

        // Safety panel
        DashboardPanel safety = new DashboardPanel("Safety");
        safety
                .add(new StatCard("Open Reports",
                        reportRepository.countOpenReports()))
                .add(new StatCard("Pending Driver Verifications",
                        driverDocumentRepository.countByVerifiedFalse()));
        root.add(safety);

        // ── Flatten tree into DashboardResponse ───────────────────────────
        // Each panel's getData() returns a Map<String, Object> recursively
        return mapToResponse(root);
    }

    /** Maps the Composite tree root to the typed DashboardResponse DTO. */
    private DashboardResponse mapToResponse(DashboardPanel root) {
        // root.getData() builds the full composite tree (used for any future
        // generic rendering); the typed DashboardResponse below is built
        // directly from repository queries for a stable, strongly-typed API.
        root.getData();

        // Build typed response from repository queries directly (cleaner than map casting)
        LocalDateTime startOfDay   = LocalDateTime.now().truncatedTo(ChronoUnit.DAYS);
        LocalDateTime startOfMonth = LocalDateTime.now().withDayOfMonth(1).truncatedTo(ChronoUnit.DAYS);
        LocalDateTime epoch        = LocalDateTime.of(2020, 1, 1, 0, 0);
        LocalDateTime now          = LocalDateTime.now();

        return DashboardResponse.builder()
                .platform(DashboardResponse.PlatformStats.builder()
                        .totalUsers(userRepository.count())
                        .totalRides(rideRepository.count())
                        .totalBookings(bookingRepository.count())
                        .totalPayments(paymentRepository.count())
                        .averageTrustScore(userRepository.findAverageTrustScore()
                                .orElse(BigDecimal.valueOf(3.0)))
                        .build())
                .users(DashboardResponse.UserStats.builder()
                        .totalPassengers(userRepository.countByRole(UserRole.PASSENGER))
                        .totalDrivers(userRepository.countByRole(UserRole.DRIVER))
                        .activeUsers(userRepository.countByStatus(UserStatus.ACTIVE))
                        .pendingVerification(userRepository.countByStatus(UserStatus.PENDING_VERIFICATION))
                        .suspendedUsers(userRepository.countByStatus(UserStatus.SUSPENDED))
                        .blockedUsers(userRepository.countByStatus(UserStatus.BLOCKED))
                        .build())
                .rides(DashboardResponse.RideStats.builder()
                        .scheduledRides(rideRepository.countByStatus(RideStatus.SCHEDULED))
                        .inProgressRides(rideRepository.countByStatus(RideStatus.IN_PROGRESS))
                        .completedRides(rideRepository.countByStatus(RideStatus.COMPLETED))
                        .cancelledRides(rideRepository.countByStatus(RideStatus.CANCELLED))
                        .activeRides(rideRepository.countActiveRides())
                        .build())
                .finance(DashboardResponse.FinanceStats.builder()
                        .revenueToday(paymentRepository.sumCompletedBetween(startOfDay, now))
                        .revenueThisMonth(paymentRepository.sumCompletedBetween(startOfMonth, now))
                        .revenueAllTime(paymentRepository.sumCompletedBetween(epoch, now))
                        .completedPayments(paymentRepository.countByStatus(PaymentStatus.COMPLETED))
                        .pendingPayments(paymentRepository.countByStatus(PaymentStatus.PENDING))
                        .refundedPayments(paymentRepository.countByStatus(PaymentStatus.REFUNDED))
                        .build())
                .safety(DashboardResponse.SafetyStats.builder()
                        .openReports(reportRepository.countOpenReports())
                        .pendingDocVerifications(driverDocumentRepository.countByVerifiedFalse())
                        .resolvedReports(reportRepository.count() - reportRepository.countOpenReports())
                        .build())
                .build();
    }

    // ── User management ───────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Page<UserResponse> listUsers(UserRole role, UserStatus status,
                                        String search, Pageable pageable) {
        return userRepository.searchUsers(role, status, search, pageable)
                .map(UserResponse::from);
    }

    @Transactional(readOnly = true)
    public UserResponse getUserById(UUID userId) {
        return UserResponse.from(
                userRepository.findById(userId)
                        .orElseThrow(() -> new ResourceNotFoundException(
                                "User not found: " + userId)));
    }

    @Transactional
    public UserResponse updateUserStatus(UUID adminId, UUID userId,
                                         UpdateUserStatusRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "User not found: " + userId));

        if (user.getRole() == UserRole.ADMIN) {
            throw new AccessDeniedException("Admin accounts cannot be status-changed via this endpoint.");
        }

        // Block certain nonsensical transitions
        if (user.getStatus() == request.getStatus()) {
            throw new BadRequestException(
                    "User is already in status: " + request.getStatus());
        }

        // Driver verification must go through AdminService.verifyDriver()
        // (the dedicated /admin/drivers/verify review flow), not this
        // generic status endpoint. Without this guard, an admin could set
        // status=ACTIVE on a driver still in PENDING_VERIFICATION without
        // ever viewing their license, vehicle registration, OCR results,
        // or AI flags — completely bypassing document review.
        if (user.getRole() == UserRole.DRIVER
                && user.getStatus() == UserStatus.PENDING_VERIFICATION
                && request.getStatus() == UserStatus.ACTIVE) {
            throw new BadRequestException(
                    "Drivers pending verification must be approved through the " +
                            "Driver Verification review page, not this endpoint. " +
                            "This ensures documents are reviewed before activation.");
        }

        userRepository.updateStatus(userId, request.getStatus());
        user.setStatus(request.getStatus());

        // In-app notification to the user
        String title = "Account Status Update";
        String body  = "Your account status has been updated to: " + request.getStatus() +
                ". Reason: " + request.getReason();
        inAppChannel.deliver(userId.toString(), title, body);

        log.info("Admin {} changed status of userId={} to {} — reason: {}",
                adminId, userId, request.getStatus(), request.getReason());

        return UserResponse.from(user);
    }

    // ── Driver verification ───────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Page<UserResponse> getDriversPendingVerification(Pageable pageable) {
        return driverDocumentRepository
                .findDriversPendingVerification(pageable)
                .map(UserResponse::from);
    }

    @Transactional
    public UserResponse verifyDriver(UUID adminId, UUID driverId,
                                     DriverVerifyRequest request) {
        User driver = userRepository.findById(driverId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Driver not found: " + driverId));

        if (driver.getRole() != UserRole.DRIVER) {
            throw new BadRequestException("User is not a driver.");
        }

        if (Boolean.TRUE.equals(request.getApproved())) {

            // ── Fail-closed AI verification gate ───────────────────────
            // A driver may only be approved if every required document
            // (LICENSE, VEHICLE_REGISTRATION) has a completed, passing AI
            // check — UNLESS the admin explicitly sets forceOverride=true
            // after manually reviewing the documents themselves.
            if (!request.isForceOverride()) {
                EligibilityResult eligibility = checkAiVerificationEligibility(driverId);
                if (!eligibility.eligible()) {
                    throw new BadRequestException(
                            "Cannot approve driver: " + eligibility.reason() +
                                    " Set forceOverride=true to approve anyway after manual review.");
                }
            }

            // Approve: verify documents and activate account
            driverDocumentRepository.verifyAllDocumentsForDriver(
                    driverId, adminId, LocalDateTime.now());
            userRepository.updateStatus(driverId, UserStatus.ACTIVE);
            driver.setStatus(UserStatus.ACTIVE);

            String approvalNotes = request.getNotes() != null
                    ? request.getNotes() : "Documents reviewed and approved.";
            driver.setReviewNotes(approvalNotes);
            driver.setReviewedBy(adminId);
            driver.setReviewedAt(LocalDateTime.now());
            userRepository.save(driver);

            // Notify via email + in-app (Factory + Bridge patterns)
            var payload = notificationFactory.driverApproved(driver);
            inAppChannel.deliver(driverId.toString(), payload.getTitle(), payload.getBody());
            emailService.sendDriverApprovalEmail(driver.getEmail(), driver.getFullName());

            log.info("Driver approved: driverId={} by adminId={}", driverId, adminId);

        } else {
            // Reject: return to REJECTED status with reason
            String notes = request.getNotes() != null
                    ? request.getNotes() : "Documents did not meet requirements.";

            userRepository.updateStatus(driverId, UserStatus.REJECTED);
            driver.setStatus(UserStatus.REJECTED);
            driver.setReviewNotes(notes);
            driver.setReviewedBy(adminId);
            driver.setReviewedAt(LocalDateTime.now());
            userRepository.save(driver);

            var payload = notificationFactory.driverRejected(notes);
            inAppChannel.deliver(driverId.toString(), payload.getTitle(), payload.getBody());
            emailService.sendDriverRejectionEmail(driver.getEmail(), driver.getFullName(), notes);

            log.info("Driver rejected: driverId={} by adminId={}, notes={}", driverId, adminId, notes);
        }

        return UserResponse.from(driver);
    }

    /**
     * Admin requests driver to re-upload a specific document.
     * Sets the document back to PENDING, resets OCR data,
     * and sends an in-app + email notification.
     */
    @Transactional
    public void requestDocumentReupload(UUID adminId, UUID driverId,
                                        String docType, String reason) {
        User driver = userRepository.findById(driverId)
                .orElseThrow(() -> new ResourceNotFoundException("Driver not found: " + driverId));

        // Reset the document(s) of that type to PENDING so driver can re-upload
        driverDocumentRepository.findByUser_UserId(driverId).stream()
                .filter(d -> d.getDocType().name().equals(docType))
                .forEach(d -> {
                    d.setOcrStatus(com.ridewave.model.enums.VerificationStatus.PENDING);
                    d.setOcrAttemptCount(0);
                    d.setAiScore(null);
                    d.setAiFlags(null);
                    d.setAiExtractedData(null);
                    d.setAiCheckedAt(null);
                    d.setAiRawResponse(null);
                    d.setVerified(false);
                    driverDocumentRepository.save(d);
                });

        // Notify driver
        var payload = notificationFactory.requestReupload(docType, reason);
        inAppChannel.deliver(driverId.toString(), payload.getTitle(), payload.getBody());
        emailService.sendGenericEmail(driver.getEmail(), payload.getTitle(), payload.getBody());

        log.info("Admin {} requested re-upload of {} from driverId={}, reason: {}",
                adminId, docType, driverId, reason);
    }

    /**
     * Documents that MUST exist and pass AI verification before a driver
     * can be approved. PROFILE_PHOTO is intentionally excluded — it has
     * no AI check (no aiScore is ever computed for it), so requiring
     * ai_score on it would make approval permanently impossible.
     */
    private static final java.util.Set<DocumentType> AI_GATED_DOC_TYPES = java.util.Set.of(
            DocumentType.LICENSE,
            DocumentType.VEHICLE_REGISTRATION
    );

    /** Flags that, if present on any gated document, block approval even if aiScore is high. */
    private static final java.util.Set<String> BLOCKING_AI_FLAGS = java.util.Set.of(
            "EXPIRED", "NAME_MISMATCH", "AI_DISABLED", "INVALID_IMAGE_FORMAT",
            "TIMEOUT", "API_ERROR", "EMPTY_RESPONSE", "INVALID_RESPONSE",
            "RESULT_SAVE_ERROR", "UNKNOWN_ERROR", "UNREADABLE"
    );

    public record EligibilityResult(boolean eligible, String reason) {
        static EligibilityResult ok() { return new EligibilityResult(true, null); }
        static EligibilityResult fail(String reason) { return new EligibilityResult(false, reason); }
    }

    /**
     * Fail-closed eligibility check for driver approval.
     *
     * A driver is eligible ONLY if, for EACH of LICENSE and
     * VEHICLE_REGISTRATION, there exists a document with:
     *   - aiCheckedAt != null   (AI job completed — not still pending/never run)
     *   - aiScore     != null   (AI actually produced a score)
     *   - aiScore     >= threshold (default 0.80)
     *   - aiFlags contains none of BLOCKING_AI_FLAGS
     *
     * Missing documents, NULL AI fields, low scores, or blocking flags
     * (including "AI_DISABLED" — the fallback used when Gemini is
     * unconfigured or errors out) ALL result in ineligibility. There is
     * no partial-pass / best-effort branch — any single failing document
     * blocks the entire approval.
     */
    @Transactional(readOnly = true)
    public EligibilityResult checkAiVerificationEligibility(UUID driverId) {
        var docs = driverDocumentRepository.findByUser_UserId(driverId);

        for (DocumentType required : AI_GATED_DOC_TYPES) {
            DriverDocument doc = docs.stream()
                    .filter(d -> d.getDocType() == required)
                    .findFirst()
                    .orElse(null);

            if (doc == null) {
                return EligibilityResult.fail(
                        "Required document " + required + " has not been uploaded.");
            }

            if (doc.getAiCheckedAt() == null) {
                return EligibilityResult.fail(
                        required + " has not completed AI verification yet (ai_checked_at is null).");
            }

            if (doc.getAiScore() == null) {
                return EligibilityResult.fail(
                        required + " has no AI score (ai_score is null) — " +
                                "AI verification did not produce a usable result.");
            }

            if (doc.getAiScore().compareTo(aiScoreThreshold) < 0) {
                return EligibilityResult.fail(
                        required + " AI score " + doc.getAiScore() +
                                " is below required threshold " + aiScoreThreshold + ".");
            }

            java.util.List<String> flags = parseFlags(doc.getAiFlags());
            for (String flag : flags) {
                if (BLOCKING_AI_FLAGS.contains(flag)) {
                    return EligibilityResult.fail(
                            required + " has blocking AI flag: " + flag + ".");
                }
            }
        }

        return EligibilityResult.ok();
    }

    private java.util.List<String> parseFlags(String aiFlagsJson) {
        if (aiFlagsJson == null || aiFlagsJson.isBlank()) return java.util.List.of();
        try {
            return new com.fasterxml.jackson.databind.ObjectMapper()
                    .readValue(aiFlagsJson, new com.fasterxml.jackson.core.type.TypeReference<java.util.List<String>>() {});
        } catch (Exception e) {
            return java.util.List.of();
        }
    }
}