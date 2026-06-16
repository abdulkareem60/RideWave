package com.ridewave.model.enums;

/**
 * OCR verification state machine for each DriverDocument.
 *
 * PENDING    → newly uploaded, OCR not yet started
 * PROCESSING → OCR job running asynchronously
 * PASS       → score ≥ threshold, step unlocked
 * FAIL       → score < threshold, retry allowed (max 3)
 * REVIEW     → 3rd FAIL or score in [60,80) → sent to admin queue
 *
 * Only forward transitions allowed. No backwards from PASS/REVIEW.
 */
public enum VerificationStatus {
    PENDING,
    PROCESSING,
    PASS,
    FAIL,
    REVIEW
}