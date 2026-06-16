package com.ridewave.model;

import com.ridewave.model.enums.DocumentType;
import com.ridewave.model.enums.VerificationStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "driver_documents", indexes = {
        @Index(name = "idx_doc_user",     columnList = "user_id"),
        @Index(name = "idx_doc_verified", columnList = "verified"),
        @Index(name = "idx_doc_ocr_status", columnList = "ocr_status")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class DriverDocument {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @EqualsAndHashCode.Include
    @Column(updatable = false, nullable = false)
    private UUID docId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private DocumentType docType;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String fileUrl;

    @Column(nullable = false)
    @Builder.Default
    private Boolean verified = false;

    @Column(name = "verified_by")
    private UUID verifiedBy;

    private LocalDateTime verifiedAt;

    // ── State machine ────────────────────────────────────────────────────
    @Enumerated(EnumType.STRING)
    @Column(name = "ocr_status", length = 20, nullable = false)
    @Builder.Default
    private VerificationStatus ocrStatus = VerificationStatus.PENDING;

    @Column(name = "ocr_attempt_count", nullable = false)
    @Builder.Default
    private Integer ocrAttemptCount = 0;

    // ── OCR Results ──────────────────────────────────────────────────────
    /**
     * Strict JSON output from the OCR pipeline:
     * { "ocrText":"...", "score":85, "flags":["BLUR"], "status":"PASS" }
     */
    @Column(columnDefinition = "TEXT")
    private String aiExtractedData;

    /**
     * Score stored as 0.00–1.00 for DB compatibility.
     * Multiply by 100 to get the 0-100 score shown in UI.
     * NEVER NULL after OCR completes (set to 0.00 on failure).
     */
    @Column(precision = 3, scale = 2)
    private BigDecimal aiScore;

    /**
     * JSON array of flag codes: ["BLUR","UNREADABLE","EXPIRED","NAME_MISMATCH",
     *   "LOW_CONTRAST","OCR_FAILED","NAME_NOT_FOUND","ADMIN_REVIEW"]
     * NEVER NULL after OCR completes (set to [] on clean pass).
     */
    @Column(columnDefinition = "TEXT")
    private String aiFlags;

    /**
     * Timestamp OCR job completed. NEVER NULL after OCR completes —
     * frontend polls on this field to detect completion.
     */
    private LocalDateTime aiCheckedAt;

    /**
     * Raw OCR text (first 4000 chars), stored for admin debugging and
     * audit. NEVER NULL after OCR completes.
     */
    @Column(columnDefinition = "TEXT")
    private String aiRawResponse;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime uploadedAt;
}