package com.ridewave.patterns.factory;

import com.ridewave.model.Booking;
import com.ridewave.model.Ride;
import com.ridewave.model.User;
import lombok.Builder;
import lombok.Getter;
import org.springframework.stereotype.Component;

/**
 * Factory Pattern — NotificationFactory
 *
 * Problem this solves:
 *   When a booking is confirmed, the notification content differs based on
 *   WHO receives it (driver vs passenger), WHAT happened (confirmed vs cancelled),
 *   and HOW the message should be worded.
 *
 *   Without a factory, every observer would inline these string templates,
 *   scattering notification content across the codebase and making rewording
 *   a multi-file change.
 *
 * How it works:
 *   Each method creates a NotificationPayload with the correct title and body
 *   for a specific business event. Observers call the factory and then pass
 *   the payload to a NotificationChannel for delivery.
 *
 * The inner NotificationPayload record is intentionally kept simple —
 * it's just a title + body container.
 */
@Component
public class NotificationFactory {

    // ── Payload record ────────────────────────────────────────────────────

    @Getter
    @Builder
    public static class NotificationPayload {
        private final String title;
        private final String body;
    }

    // ── Booking events ────────────────────────────────────────────────────

    public NotificationPayload bookingConfirmedForPassenger(Booking booking) {
        Ride ride = booking.getRide();
        return NotificationPayload.builder()
                .title("Booking Confirmed!")
                .body(String.format(
                        "Your booking for %s → %s on %s is confirmed. " +
                                "Seats: %d | Fare: PKR %.0f. Driver: %s.",
                        ride.getOriginName(), ride.getDestName(),
                        ride.getDepartureTime().toLocalDate(),
                        booking.getSeatsBooked(), booking.getTotalFare(),
                        ride.getDriver().getFullName()))
                .build();
    }

    public NotificationPayload bookingRequestedForDriver(Booking booking) {
        return NotificationPayload.builder()
                .title("New Booking Request")
                .body(String.format(
                        "%s has requested %d seat(s) on your ride (%s → %s). " +
                                "Open the app to approve or reject.",
                        booking.getPassenger().getFullName(),
                        booking.getSeatsBooked(),
                        booking.getRide().getOriginName(),
                        booking.getRide().getDestName()))
                .build();
    }

    public NotificationPayload bookingApprovedForPassenger(Booking booking) {
        return NotificationPayload.builder()
                .title("Booking Approved!")
                .body(String.format(
                        "Your booking for %s → %s has been approved by the driver. " +
                                "You're all set!",
                        booking.getRide().getOriginName(),
                        booking.getRide().getDestName()))
                .build();
    }

    public NotificationPayload bookingRejectedForPassenger(Booking booking) {
        return NotificationPayload.builder()
                .title("Booking Not Approved")
                .body(String.format(
                        "Unfortunately, your booking request for %s → %s was not approved. " +
                                "Your payment (if any) will be refunded within 3–5 business days.",
                        booking.getRide().getOriginName(),
                        booking.getRide().getDestName()))
                .build();
    }

    public NotificationPayload bookingCancelledForDriver(Booking booking) {
        return NotificationPayload.builder()
                .title("Booking Cancelled")
                .body(String.format(
                        "%s has cancelled their booking (%d seat(s)) for your ride (%s → %s).",
                        booking.getPassenger().getFullName(),
                        booking.getSeatsBooked(),
                        booking.getRide().getOriginName(),
                        booking.getRide().getDestName()))
                .build();
    }

    // ── OTP ───────────────────────────────────────────────────────────────

    public NotificationPayload rideStartOtp(String otp, Ride ride) {
        return NotificationPayload.builder()
                .title("Ride OTP")
                .body(String.format(
                        "Your RideWave ride OTP is: %s. " +
                                "Share this code with your driver (%s) when you board. " +
                                "Valid for 30 minutes. Never share with anyone else.",
                        otp, ride.getDriver().getFullName()))
                .build();
    }

    // ── Ride lifecycle ────────────────────────────────────────────────────

    public NotificationPayload rideStartedForPassenger(Ride ride) {
        return NotificationPayload.builder()
                .title("Your Ride Has Started!")
                .body(String.format(
                        "Your ride with %s from %s to %s is now in progress. " +
                                "Have a safe journey!",
                        ride.getDriver().getFullName(),
                        ride.getOriginName(), ride.getDestName()))
                .build();
    }

    public NotificationPayload rideCompletedForPassenger(Ride ride) {
        return NotificationPayload.builder()
                .title("Ride Completed")
                .body(String.format(
                        "You have arrived at %s. " +
                                "Please take a moment to rate your driver %s.",
                        ride.getDestName(), ride.getDriver().getFullName()))
                .build();
    }

    public NotificationPayload rideCompletedForDriver(Ride ride) {
        return NotificationPayload.builder()
                .title("Ride Completed — Payment Released")
                .body(String.format(
                        "Your ride from %s to %s is complete. " +
                                "Payment has been released to your account.",
                        ride.getOriginName(), ride.getDestName()))
                .build();
    }

    public NotificationPayload rideCancelledForPassenger(Ride ride, String reason) {
        return NotificationPayload.builder()
                .title("Ride Cancelled")
                .body(String.format(
                        "Your booked ride (%s → %s on %s) has been cancelled. " +
                                "Reason: %s. Any payment will be refunded within 3–5 business days.",
                        ride.getOriginName(), ride.getDestName(),
                        ride.getDepartureTime().toLocalDate(), reason))
                .build();
    }

    // ── Account events ────────────────────────────────────────────────────

    public NotificationPayload driverApproved(User driver) {
        return NotificationPayload.builder()
                .title("Driver Account Approved!")
                .body("Congratulations " + driver.getFullName() +
                        "! Your driver account has been approved. " +
                        "You can now log in and start creating rides.")
                .build();
    }

    public NotificationPayload requestReupload(String docType, String reason) {
        return NotificationPayload.builder()
                .title("Action Required: Re-upload Document")
                .body(String.format(
                        "Please re-upload your %s. Reason: %s. " +
                                "Open the app to upload a new document.",
                        docType.replace("_", " ").toLowerCase(), reason))
                .build();
    }

    public NotificationPayload driverRejected(String notes) {
        return NotificationPayload.builder()
                .title("Driver Application Update")
                .body("Your driver application could not be approved. " +
                        "Reason: " + notes + ". " +
                        "Please re-submit your documents after resolving this issue.")
                .build();
    }

    // ── Ratings ───────────────────────────────────────────────────────────

    public NotificationPayload rateYourRide(User ratedUser, Ride ride) {
        return NotificationPayload.builder()
                .title("How Was Your Ride?")
                .body(String.format(
                        "Please rate %s for your recent ride (%s → %s). " +
                                "Your feedback keeps RideWave safe.",
                        ratedUser.getFullName(),
                        ride.getOriginName(), ride.getDestName()))
                .build();
    }
}