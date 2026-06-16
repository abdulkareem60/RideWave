package com.ridewave.model.enums;

/**
 * Lifecycle states of a Ride entity.
 */
public enum RideStatus {

    /** Ride is created and accepting bookings. */
    SCHEDULED,

    /** Driver validated the OTP — ride is currently in progress. */
    IN_PROGRESS,

    /** Driver marked the ride as done — payments released, ratings enabled. */
    COMPLETED,

    /** Ride was cancelled by driver or admin before it started. */
    CANCELLED
}