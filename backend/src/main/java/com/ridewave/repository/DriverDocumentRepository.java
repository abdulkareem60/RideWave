package com.ridewave.repository;

import com.ridewave.model.DriverDocument;
import com.ridewave.model.enums.DocumentType;
import com.ridewave.model.enums.VerificationStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DriverDocumentRepository extends JpaRepository<DriverDocument, UUID> {

    List<DriverDocument> findByUser_UserId(UUID userId);

    /** Fetch just the userId FK without loading the User proxy — safe in async threads. */
    @Query("SELECT d.user.userId FROM DriverDocument d WHERE d.docId = :docId")
    UUID findUserIdByDocId(@Param("docId") UUID docId);

    Optional<DriverDocument> findTopByUser_UserIdAndDocTypeOrderByUploadedAtDesc(
            UUID userId, DocumentType docType);

    /**
     * Admin verification queue.
     *
     * Returns every driver currently sitting in PENDING_VERIFICATION status.
     * Under the current policy, drivers whose documents pass OCR cleanly on
     * both LICENSE and VEHICLE_REGISTRATION (no blocking flags) are
     * auto-activated by DriverActivationService.tryActivate() and never
     * enter this status at all — they go straight to ACTIVE and never
     * appear here.
     *
     * This query therefore naturally contains only the manual-review
     * population: documents that failed OCR, were flagged REVIEW, or
     * passed with a blocking flag (e.g. NAME_MISMATCH) that automated
     * checks can't confidently clear. Queried by user status rather than
     * per-document flags so a driver is never silently missing from the
     * queue due to a partial/inconsistent document-level state.
     */
    @Query("""
           SELECT u FROM User u
           WHERE u.role = 'DRIVER'
             AND u.status = 'PENDING_VERIFICATION'
           ORDER BY u.updatedAt ASC
           """)
    Page<com.ridewave.model.User> findDriversPendingVerification(Pageable pageable);

    @Modifying
    @Query("""
           UPDATE DriverDocument d
              SET d.verified   = true,
                  d.verifiedBy = :adminId,
                  d.verifiedAt = :now,
                  d.ocrStatus  = 'PASS'
           WHERE d.user.userId = :driverId
           """)
    int verifyAllDocumentsForDriver(@Param("driverId") UUID driverId,
                                    @Param("adminId")  UUID adminId,
                                    @Param("now")      LocalDateTime now);

    long countByVerifiedFalse();

    boolean existsByUser_UserIdAndVerifiedTrue(UUID userId);

    List<DriverDocument> findByUser_UserIdAndOcrStatus(UUID userId, VerificationStatus status);
}