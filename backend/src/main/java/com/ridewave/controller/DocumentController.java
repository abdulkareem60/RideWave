package com.ridewave.controller;

import com.ridewave.dto.request.UploadDocumentRequest;
import com.ridewave.dto.response.ApiResponse;
import com.ridewave.dto.response.DocumentResponse;
import com.ridewave.exception.BadRequestException;
import com.ridewave.exception.ResourceNotFoundException;
import com.ridewave.model.DriverDocument;
import com.ridewave.model.User;
import com.ridewave.model.enums.DocumentType;
import com.ridewave.model.enums.UserStatus;
import com.ridewave.model.enums.VerificationStatus;
import com.ridewave.repository.DriverDocumentRepository;
import com.ridewave.repository.UserRepository;
import com.ridewave.security.UserPrincipal;
import com.ridewave.service.LocalDocumentVerificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/documents")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Documents")
@SecurityRequirement(name = "bearerAuth")
public class DocumentController {

    private static final Set<DocumentType> REQUIRED_DRIVER_DOCS = Set.of(
            DocumentType.LICENSE, DocumentType.VEHICLE_REGISTRATION);

    private static final Set<DocumentType> OCR_TYPES = Set.of(
            DocumentType.LICENSE, DocumentType.VEHICLE_REGISTRATION);

    private final DriverDocumentRepository         documentRepository;
    private final UserRepository                   userRepository;
    private final LocalDocumentVerificationService verificationService;

    // ── Upload ─────────────────────────────────────────────────────────────

    @PostMapping
    @Transactional
    @Operation(summary = "Upload profile photo or driver verification document")
    public ResponseEntity<ApiResponse<DocumentResponse>> upload(
            @Valid @RequestBody UploadDocumentRequest request,
            @AuthenticationPrincipal UserPrincipal currentUser) {

        log.info("UPLOAD docType={} userId={}", request.getDocType(), currentUser.getId());

        User user = userRepository.findById(currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (request.getDocType() == DocumentType.PROFILE_PHOTO) {
            userRepository.updateProfilePic(user.getUserId(), request.getFileUrl());
            return ResponseEntity.ok(ApiResponse.success(
                    DocumentResponse.builder()
                            .docType(DocumentType.PROFILE_PHOTO)
                            .fileUrl(request.getFileUrl())
                            .verified(true)
                            .ocrStatus(VerificationStatus.PASS)
                            .ocrAttemptCount(0)
                            .build(),
                    "Profile photo updated."));
        }

        // ── Re-upload: update existing row, reset ALL OCR state ──────────
        DriverDocument doc = documentRepository
                .findTopByUser_UserIdAndDocTypeOrderByUploadedAtDesc(
                        user.getUserId(), request.getDocType())
                .orElse(null);

        if (doc != null) {
            log.info("UPLOAD re-upload detected docId={} — resetting OCR state", doc.getDocId());
            doc.setFileUrl(request.getFileUrl());
            doc.setAiScore(null);
            doc.setAiFlags(null);
            doc.setAiExtractedData(null);
            doc.setAiCheckedAt(null);
            doc.setAiRawResponse(null);
            doc.setOcrStatus(VerificationStatus.PENDING);
            doc.setOcrAttemptCount(0);
            doc.setVerified(false);
        } else {
            doc = DriverDocument.builder()
                    .user(user)
                    .docType(request.getDocType())
                    .fileUrl(request.getFileUrl())
                    .verified(false)
                    .ocrStatus(VerificationStatus.PENDING)
                    .ocrAttemptCount(0)
                    .build();
        }
        doc = documentRepository.save(doc);
        log.info("UPLOAD saved docId={} status=PENDING", doc.getDocId());

        // ── Schedule OCR AFTER transaction commits ────────────────────────
        // CRITICAL: analyzeAsync calls findById() from a new DB connection.
        // If called before commit, the row isn't visible → ifPresent is a no-op
        // → all AI fields stay NULL forever. afterCommit() guarantees visibility.
        if (OCR_TYPES.contains(request.getDocType())) {
            final UUID   id   = doc.getDocId();
            final String url  = doc.getFileUrl();
            final String name = user.getFullName();
            TransactionSynchronizationManager.registerSynchronization(
                    new TransactionSynchronization() {
                        @Override public void afterCommit() {
                            log.info("UPLOAD tx committed → scheduling OCR for docId={}", id);
                            verificationService.analyzeAsync(id, url, name);
                        }
                    });
        }

        // Transition driver to PENDING_VERIFICATION once all required docs are in
        if (user.getStatus() == UserStatus.PENDING) {
            List<DriverDocument> all = documentRepository.findByUser_UserId(user.getUserId());
            Set<DocumentType> submitted = new java.util.HashSet<>();
            all.forEach(d -> submitted.add(d.getDocType()));
            if (submitted.containsAll(REQUIRED_DRIVER_DOCS)) {
                userRepository.updateStatus(user.getUserId(), UserStatus.PENDING_VERIFICATION);
                log.info("UPLOAD userId={} → PENDING_VERIFICATION", user.getUserId());
            }
        }

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(DocumentResponse.from(doc),
                        "Document uploaded. OCR processing in background."));
    }

    // ── Retry OCR ─────────────────────────────────────────────────────────

    @PostMapping("/{docId}/retry")
    @Transactional
    @Operation(summary = "Retry OCR on a FAIL-state document (max 3 total attempts)")
    public ResponseEntity<ApiResponse<DocumentResponse>> retry(
            @PathVariable UUID docId,
            @AuthenticationPrincipal UserPrincipal currentUser) {

        DriverDocument doc = documentRepository.findById(docId)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found"));

        if (!doc.getUser().getUserId().equals(currentUser.getId()))
            throw new com.ridewave.exception.AccessDeniedException("Not your document");

        if (doc.getOcrStatus() != VerificationStatus.FAIL)
            throw new BadRequestException("Document is not in FAIL state, cannot retry");

        if (doc.getOcrAttemptCount() != null && doc.getOcrAttemptCount() >= LocalDocumentVerificationService.MAX_ATTEMPTS)
            throw new BadRequestException("Maximum retry attempts (" + LocalDocumentVerificationService.MAX_ATTEMPTS + ") reached");

        // Reset for fresh attempt — don't clear ocrAttemptCount (tracks total)
        doc.setOcrStatus(VerificationStatus.PENDING);
        doc.setAiCheckedAt(null);
        doc = documentRepository.save(doc);

        final UUID   id   = doc.getDocId();
        final String url  = doc.getFileUrl();
        final String name = doc.getUser().getFullName();
        final int    att  = doc.getOcrAttemptCount();

        TransactionSynchronizationManager.registerSynchronization(
                new TransactionSynchronization() {
                    @Override public void afterCommit() {
                        log.info("RETRY tx committed → scheduling OCR attempt {} for docId={}", att, id);
                        verificationService.analyzeAsync(id, url, name);
                    }
                });

        return ResponseEntity.ok(ApiResponse.success(DocumentResponse.from(doc),
                "Retry scheduled. Attempt " + att + "/" + LocalDocumentVerificationService.MAX_ATTEMPTS));
    }

    // ── Query endpoints ───────────────────────────────────────────────────

    @GetMapping("/me")
    @Operation(summary = "Current user's documents")
    public ResponseEntity<ApiResponse<List<DocumentResponse>>> myDocuments(
            @AuthenticationPrincipal UserPrincipal currentUser) {
        return ResponseEntity.ok(ApiResponse.success(
                documentRepository.findByUser_UserId(currentUser.getId())
                        .stream().map(DocumentResponse::from).toList()));
    }

    @GetMapping("/user/{userId}")
    @org.springframework.security.access.prepost.PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Admin: driver's documents with OCR results")
    public ResponseEntity<ApiResponse<List<DocumentResponse>>> documentsForUser(
            @PathVariable UUID userId) {
        return ResponseEntity.ok(ApiResponse.success(
                documentRepository.findByUser_UserId(userId)
                        .stream().map(DocumentResponse::from).toList()));
    }
}