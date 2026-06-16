package com.ridewave.patterns.observer;

/**
 * All events a Ride can emit in its lifecycle.
 * Published by RideEventPublisher; consumed by registered observers.
 */
public enum RideEventType {

    /** A new ride has been created and is accepting bookings. */
    CREATED,

    /** A passenger has requested a booking (requiresApproval = true). */
    BOOKING_REQUESTED,

    /** Driver approved a pending booking request. */
    BOOKING_APPROVED,

    /** Driver rejected a pending booking request. */
    BOOKING_REJECTED,

    /** Driver validated the OTP — ride is now in progress. */
    STARTED,

    /** Driver marked the ride as done — triggers payments + rating prompts. */
    COMPLETED,

    /** Ride was cancelled — triggers refunds and passenger notifications. */
    CANCELLED
}