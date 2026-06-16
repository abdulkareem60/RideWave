package com.ridewave.model.enums;

/**
 * Status of a payment transaction.
 */
public enum PaymentStatus {

    /** Payment initiated but not yet settled (e.g. cash on delivery, pending card). */
    PENDING,

    /** Payment successfully processed and captured. */
    COMPLETED,

    /** Payment attempt failed (card declined, timeout, etc.). */
    FAILED,

    /** Payment was refunded (booking cancelled after payment). */
    REFUNDED
}