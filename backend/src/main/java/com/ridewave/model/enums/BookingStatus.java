package com.ridewave.model.enums;

/**
 * Lifecycle states of a Booking entity.
 */
public enum BookingStatus {

    /** Booking submitted; waiting for driver approval (requiresApproval = true). */
    PENDING,

    /** Driver approved the booking request. */
    APPROVED,

    /** Booking is confirmed and seats are reserved (used when approval not required). */
    CONFIRMED,

    /** Booking was cancelled by passenger or admin. */
    CANCELLED,

    /** Ride completed — booking is finalised, rating now allowed. */
    COMPLETED
}