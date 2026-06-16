package com.ridewave.patterns.observer;

import com.ridewave.model.Ride;

/**
 * Immutable event record published to all registered RideEventObservers.
 *
 * The payload is typed as Object so different event types can carry
 * different context without inflating the class hierarchy:
 *   - BOOKING_APPROVED / REJECTED  → payload is a Booking
 *   - CANCELLED                    → payload is the cancellation reason (String)
 *   - STARTED / COMPLETED          → payload is null (ride itself has all context)
 *
 * Java 16+ record — equals(), hashCode(), toString() auto-generated.
 */
public record RideEvent(
        Ride          ride,
        RideEventType eventType,
        Object        payload
) {
    /** Convenience factory — no payload needed for lifecycle transitions. */
    public static RideEvent of(Ride ride, RideEventType type) {
        return new RideEvent(ride, type, null);
    }

    /** Convenience factory — with payload (booking, reason string, etc.). */
    public static RideEvent of(Ride ride, RideEventType type, Object payload) {
        return new RideEvent(ride, type, payload);
    }
}