package com.ridewave.model.enums;

public enum RideStatus {

    /** Ride is created and accepting bookings. */
    SCHEDULED,

    /** Ride is currently in progress. */
    IN_PROGRESS,

    /** Driver marked the ride as done — payments released, ratings enabled. */
    COMPLETED,

    /** Ride was cancelled by driver or admin before it started. */
    CANCELLED,

    /**
     * Ride's estimatedArrivalTime has passed, ride was still SCHEDULED,
     * and it had zero active bookings.
     * Set automatically by the RideExpiryScheduler every 5 minutes.
     * Expired rides are hidden from passenger search and cannot be booked,
     * edited, or started. They appear in the driver's history with an
     * "Expired" badge.
     */
    EXPIRED
}