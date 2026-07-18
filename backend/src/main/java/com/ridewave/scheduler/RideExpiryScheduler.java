package com.ridewave.scheduler;

import com.ridewave.repository.RideRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * Ride Expiry Scheduler
 *
 * Runs every 5 minutes and marks SCHEDULED rides as EXPIRED when:
 *   1. Their estimatedArrivalTime has passed (or departureTime + 3h when null).
 *   2. They have zero active (non-cancelled/rejected) bookings.
 *
 * Rides with active bookings are NOT expired automatically — the driver
 * must manually cancel them so passengers can be notified and refunded.
 *
 * Expired rides are:
 *   - Hidden from passenger search and browse.
 *   - Visible in the driver's history with an "Expired" badge.
 *   - Not bookable, editable, or startable.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class RideExpiryScheduler {

    private final RideRepository rideRepository;

    /**
     * Runs every 5 minutes.
     * Uses a bulk UPDATE query for performance — no individual ride loading.
     */
    @Scheduled(fixedDelay = 5 * 60 * 1000)   // every 5 minutes
    @Transactional
    public void expireStaleRides() {
        LocalDateTime now    = LocalDateTime.now();
        int            count = rideRepository.expireStaleRides(now);
        if (count > 0) {
            log.info("[RideExpiryScheduler] Marked {} ride(s) as EXPIRED at {}", count, now);
        }
    }
}