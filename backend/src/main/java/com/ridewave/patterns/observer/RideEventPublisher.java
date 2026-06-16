package com.ridewave.patterns.observer;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * Observer Pattern — RideEventPublisher (Observable / Subject)
 *
 * RideService calls publish() after any state transition; the publisher
 * fans the event out to every registered observer without RideService
 * needing a direct reference to NotificationService, PaymentService, etc.
 *
 * This decoupling is the core value of the Observer pattern here:
 * adding a new side-effect (e.g. analytics logging) only requires a new
 * observer class — RideService and RideEventPublisher are never modified.
 *
 * Thread safety: CopyOnWriteArrayList allows concurrent reads while
 * observers are being added/removed.
 *
 * Error isolation: one observer throwing must not prevent others from
 * receiving the event — each observer is invoked inside its own try/catch.
 */
@Component
@Slf4j
public class RideEventPublisher {

    private final List<RideEventObserver> observers = new CopyOnWriteArrayList<>();

    // ── Registration ──────────────────────────────────────────────────────

    /**
     * Observers register themselves via @PostConstruct injection.
     * Spring calls this after all beans are wired.
     */
    public void register(RideEventObserver observer) {
        observers.add(observer);
        log.debug("RideEventObserver registered: {}", observer.getClass().getSimpleName());
    }

    public void unregister(RideEventObserver observer) {
        observers.remove(observer);
    }

    // ── Publishing ────────────────────────────────────────────────────────

    /**
     * Fans the event out to all registered observers synchronously.
     *
     * Synchronous dispatch is intentional: it keeps the transaction boundary
     * predictable. For high-throughput production use, swap to an async
     * dispatcher (Spring ApplicationEventPublisher or a message broker).
     */
    public void publish(RideEvent event) {
        log.info("Publishing RideEvent: rideId={}, type={}",
                event.ride().getRideId(), event.eventType());

        for (RideEventObserver observer : observers) {
            try {
                observer.onRideEvent(event);
            } catch (Exception e) {
                // Isolated failure — log and continue to next observer
                log.error("Observer {} failed on event {}: {}",
                        observer.getClass().getSimpleName(),
                        event.eventType(),
                        e.getMessage(), e);
            }
        }
    }
}