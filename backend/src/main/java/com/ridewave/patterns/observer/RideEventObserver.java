package com.ridewave.patterns.observer;

/**
 * Observer interface — any service that needs to react to ride state changes
 * implements this and registers itself with RideEventPublisher.
 *
 * Current concrete observers:
 *   - NotificationObserver  (sends SMS/email/in-app notifications)
 *   - PaymentObserver       (releases payments on COMPLETED, refunds on CANCELLED)
 *   - TrustScoreObserver    (recalculates trust scores after COMPLETED)
 */
public interface RideEventObserver {
    void onRideEvent(RideEvent event);
}