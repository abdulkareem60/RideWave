package com.ridewave.patterns.observer;

import com.ridewave.model.Booking;
import com.ridewave.model.Ride;
import com.ridewave.patterns.bridge.InAppNotificationChannel;
import com.ridewave.patterns.bridge.SmsNotificationChannel;
import com.ridewave.patterns.factory.NotificationFactory;
import com.ridewave.patterns.factory.NotificationFactory.NotificationPayload;
import com.ridewave.repository.BookingRepository;
import com.ridewave.model.enums.BookingStatus;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Observer Pattern — NotificationObserver (Concrete Observer)
 *
 * Reacts to ride lifecycle events and dispatches notifications
 * via the Bridge pattern (SMS + in-app channels).
 *
 * Registered with RideEventPublisher on startup via @PostConstruct.
 * RideService never imports or directly references this class.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class NotificationObserver implements RideEventObserver {

    private final RideEventPublisher      publisher;
    private final NotificationFactory     factory;
    private final SmsNotificationChannel  smsChannel;
    private final InAppNotificationChannel inAppChannel;
    private final BookingRepository       bookingRepository;

    @PostConstruct
    public void register() {
        publisher.register(this);
        log.info("NotificationObserver registered with RideEventPublisher");
    }

    @Override
    public void onRideEvent(RideEvent event) {
        Ride ride = event.ride();

        switch (event.eventType()) {

            case BOOKING_REQUESTED -> {
                Booking booking = (Booking) event.payload();
                NotificationPayload p = factory.bookingRequestedForDriver(booking);
                // Notify driver — SMS + in-app
                smsChannel.deliver(ride.getDriver().getPhone(), p.getTitle(), p.getBody());
                inAppChannel.deliver(ride.getDriver().getUserId().toString(),
                        p.getTitle(), p.getBody());
            }

            case BOOKING_APPROVED -> {
                Booking booking = (Booking) event.payload();
                NotificationPayload p = factory.bookingApprovedForPassenger(booking);
                smsChannel.deliver(booking.getPassenger().getPhone(), p.getTitle(), p.getBody());
                inAppChannel.deliver(booking.getPassenger().getUserId().toString(),
                        p.getTitle(), p.getBody());
            }

            case BOOKING_REJECTED -> {
                Booking booking = (Booking) event.payload();
                NotificationPayload p = factory.bookingRejectedForPassenger(booking);
                inAppChannel.deliver(booking.getPassenger().getUserId().toString(),
                        p.getTitle(), p.getBody());
            }

            case STARTED -> {
                // Notify all confirmed passengers that the ride has started
                List<Booking> active = bookingRepository
                        .findActiveBookingsForRide(ride.getRideId());
                active.forEach(b -> {
                    NotificationPayload p = factory.rideStartedForPassenger(ride);
                    inAppChannel.deliver(b.getPassenger().getUserId().toString(),
                            p.getTitle(), p.getBody());
                });
                log.debug("STARTED notifications sent to {} passengers for rideId={}",
                        active.size(), ride.getRideId());
            }

            case COMPLETED -> {
                // Notify driver + all passengers; prompt ratings
                NotificationPayload driverPayload = factory.rideCompletedForDriver(ride);
                inAppChannel.deliver(ride.getDriver().getUserId().toString(),
                        driverPayload.getTitle(), driverPayload.getBody());

                List<Booking> active = bookingRepository
                        .findActiveBookingsForRide(ride.getRideId());
                active.forEach(b -> {
                    NotificationPayload p = factory.rideCompletedForPassenger(ride);
                    inAppChannel.deliver(b.getPassenger().getUserId().toString(),
                            p.getTitle(), p.getBody());
                    // Rating prompt
                    NotificationPayload rateDriver = factory.rateYourRide(ride.getDriver(), ride);
                    inAppChannel.deliver(b.getPassenger().getUserId().toString(),
                            rateDriver.getTitle(), rateDriver.getBody());
                });
            }

            case CANCELLED -> {
                String reason = event.payload() instanceof String s ? s : "Unexpected cancellation";
                // Notify all non-cancelled bookings
                bookingRepository.findByRide_RideIdAndStatus(
                        ride.getRideId(), BookingStatus.CONFIRMED).forEach(b -> {
                    NotificationPayload p = factory.rideCancelledForPassenger(ride, reason);
                    smsChannel.deliver(b.getPassenger().getPhone(), p.getTitle(), p.getBody());
                    inAppChannel.deliver(b.getPassenger().getUserId().toString(),
                            p.getTitle(), p.getBody());
                });
                bookingRepository.findByRide_RideIdAndStatus(
                        ride.getRideId(), BookingStatus.PENDING).forEach(b -> {
                    NotificationPayload p = factory.rideCancelledForPassenger(ride, reason);
                    inAppChannel.deliver(b.getPassenger().getUserId().toString(),
                            p.getTitle(), p.getBody());
                });
            }

            default -> log.debug("NotificationObserver: no action for event type {}",
                    event.eventType());
        }
    }
}