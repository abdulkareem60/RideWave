package com.ridewave.service;

import com.ridewave.model.DriverDocument;
import com.ridewave.model.enums.VerificationStatus;
import com.ridewave.repository.DriverDocumentRepository;
import com.ridewave.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * Decides whether a driver can be activated automatically, or must be
 * routed to manual admin review.
 *
 * Two paths to UserStatus.ACTIVE:
 *   1. Fast path (this class) — both LICENSE and VEHICLE_REGISTRATION
 *      pass OCR cleanly, no blocking flags → ACTIVE immediately, no
 *      admin involved.
 *   2. Slow path (AdminService.verifyDriver) — anything OCR can't
 *      confidently clear (FAIL, REVIEW, or a blocking flag on a PASS)
 *      stays in PENDING_VERIFICATION and is queued for manual review.
 *
 * Separate bean so @Transactional on tryActivate() is actually enforced
 * by Spring's proxy — calling it from another bean (
 * LocalDocumentVerificationService) means the proxy is used, so
 * the @Modifying updateStatus() query runs inside a real transaction
 * and commits properly. (Originally this was a private method on the
 * caller's own class, which silently broke @Transactional — see git
 * history for that bug if curious.)
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DriverActivationService {

    private final UserRepository           userRepo;
    private final DriverDocumentRepository docRepo;

    private static final Set<String> BLOCKING_FLAGS = Set.of(
            "NAME_MISMATCH", "EXPIRED", "UNREADABLE", "BLURRY",
            "OCR_FAILED", "INVALID_FORMAT", "NAME_NOT_FOUND");

    /**
     * Auto-activates a driver once BOTH required documents (LICENSE,
     * VEHICLE_REGISTRATION) have passed OCR with no blocking flags.
     *
     * This is the fast path: a driver whose documents are read cleanly by
     * OCR with a clear name match, valid expiry, and no quality issues
     * never needs a human in the loop. They go straight to ACTIVE and
     * land on the dashboard immediately after upload.
     *
     * Admin review is reserved for the slow path — anything OCR can't
     * confidently approve (FAIL, REVIEW, or a PASS carrying a blocking
     * flag) leaves the driver in PENDING_VERIFICATION, where they are
     * picked up by the admin queue (DriverDocumentRepository
     * .findDriversPendingVerification) for manual approve/reject.
     *
     * Called after every individual document PASS; this method itself
     * checks that BOTH documents are PASS before doing anything, so it
     * safely no-ops on the first of the two documents to pass.
     */
    @Transactional
    public void tryActivate(UUID userId) {
        com.ridewave.model.User user = userRepo.findById(userId).orElse(null);
        if (user == null) {
            log.warn("ACTIVATION[{}]: user not found", userId);
            return;
        }

        if (user.getStatus() != com.ridewave.model.enums.UserStatus.PENDING_VERIFICATION
                && user.getStatus() != com.ridewave.model.enums.UserStatus.PENDING) {
            log.debug("ACTIVATION[{}]: skipped — status={}", userId, user.getStatus());
            return;
        }

        log.info("ACTIVATION[{}]: checking eligibility (status=PENDING_VERIFICATION)", userId);

        List<DriverDocument> docs = docRepo.findByUser_UserId(userId);

        for (com.ridewave.model.enums.DocumentType required : List.of(
                com.ridewave.model.enums.DocumentType.LICENSE,
                com.ridewave.model.enums.DocumentType.VEHICLE_REGISTRATION)) {

            DriverDocument d = docs.stream()
                    .filter(x -> x.getDocType() == required)
                    .filter(x -> x.getOcrStatus() == VerificationStatus.PASS)
                    .findFirst().orElse(null);

            if (d == null) {
                log.info("ACTIVATION[{}]: not eligible yet — {} is not PASS (or missing)", userId, required);
                return;
            }

            List<String> flags = parseFlags(d.getAiFlags());
            String blocking = flags.stream().filter(BLOCKING_FLAGS::contains).findFirst().orElse(null);
            if (blocking != null) {
                log.info("ACTIVATION[{}]: blocked — {} has blocking flag: {} → routed to admin review",
                        userId, required, blocking);
                return;
            }
        }

        // Both documents PASS with no blocking flags — activate immediately,
        // no admin involvement.
        int updated = userRepo.updateStatus(userId, com.ridewave.model.enums.UserStatus.ACTIVE);
        if (updated > 0) {
            log.info("ACTIVATION[{}]: ✓ driver.status = ACTIVE — auto-verified, no admin review needed", userId);
        } else {
            log.warn("ACTIVATION[{}]: updateStatus returned 0 rows — concurrent update?", userId);
        }
    }

    private List<String> parseFlags(String aiFlags) {
        if (aiFlags == null || aiFlags.isBlank()) return List.of();
        try {
            return new com.fasterxml.jackson.databind.ObjectMapper()
                    .readValue(aiFlags, new com.fasterxml.jackson.core.type.TypeReference<List<String>>() {});
        } catch (Exception e) { return List.of(); }
    }
}