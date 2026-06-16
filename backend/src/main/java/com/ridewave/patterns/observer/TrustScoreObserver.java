package com.ridewave.patterns.observer;

import com.ridewave.model.Booking;
import com.ridewave.model.enums.BookingStatus;
import com.ridewave.repository.BookingRepository;
import com.ridewave.service.TrustScoreService;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Observer Pattern — TrustScoreObserver (Concrete Observer)
 *
 * After a ride completes, prompts TrustScoreService to recalculate scores
 * for the driver and all passengers who were on the ride.
 *
 * Decoupled entirely from RideService — rides fire COMPLETED, this observer
 * decides what trust-score recalculation work needs to happen.
 *
 * Note: Scores are recalculated eagerly here so that a newly submitted
 * rating takes effect before the next booking attempt. A lazy approach
 * (recalculate only at booking time) would also be valid for high-load systems.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class TrustScoreObserver implements RideEventObserver {

    private final RideEventPublisher publisher;
    private final TrustScoreService  trustScoreService;
    private final BookingRepository  bookingRepository;

    @PostConstruct
    public void register() {
        publisher.register(this);
        log.info("TrustScoreObserver registered with RideEventPublisher");
    }

    @Override
    public void onRideEvent(RideEvent event) {
        if (event.eventType() != RideEventType.COMPLETED) {
            return;
        }

        // Recalculate driver's score
        try {
            trustScoreService.recalculate(event.ride().getDriver().getUserId());
        } catch (Exception e) {
            log.error("Failed to recalculate trust score for driverId={}: {}",
                    event.ride().getDriver().getUserId(), e.getMessage());
        }

        // Recalculate each completed passenger's score
        List<Booking> completedBookings = bookingRepository
                .findByRide_RideIdAndStatus(event.ride().getRideId(), BookingStatus.COMPLETED);

        completedBookings.forEach(booking -> {
            try {
                trustScoreService.recalculate(booking.getPassenger().getUserId());
            } catch (Exception e) {
                log.error("Failed to recalculate trust score for passengerId={}: {}",
                        booking.getPassenger().getUserId(), e.getMessage());
            }
        });

        log.info("TrustScoreObserver: recalculated scores for driver + {} passengers on rideId={}",
                completedBookings.size(), event.ride().getRideId());
    }
}