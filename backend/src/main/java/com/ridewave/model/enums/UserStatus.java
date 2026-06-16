package com.ridewave.model.enums;

/**
 * Lifecycle status of a user account.
 */
public enum UserStatus {

    /** Account created; email/phone not yet verified. */
    PENDING,

    /** Driver submitted documents; awaiting admin approval. */
    PENDING_VERIFICATION,

    /** Fully active account — all verifications passed. */
    ACTIVE,

    /** Admin has temporarily suspended the account (e.g. after a report). */
    SUSPENDED,

    /** Account permanently blocked — trust score too low or policy violation. */
    BLOCKED,

    /** Driver's document submission was rejected by admin. */
    REJECTED
}