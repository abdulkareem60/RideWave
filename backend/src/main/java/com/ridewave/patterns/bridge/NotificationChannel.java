package com.ridewave.patterns.bridge;

/**
 * Bridge Pattern — Implementation Interface
 *
 * This is the "implementation" side of the Bridge.
 * It defines HOW a notification is delivered (the channel).
 *
 * Current implementations:
 *   - EmailNotificationChannel  → JavaMailSender
 *   - SmsNotificationChannel    → SmsProvider (which is itself an Adapter)
 *   - InAppNotificationChannel  → persists to notifications table
 *
 * The "abstraction" side (what we notify about) lives in AbstractNotificationSender.
 * The Bridge separates these two dimensions so either can vary independently.
 */
public interface NotificationChannel {

    /**
     * Deliver a notification to a recipient.
     *
     * @param recipient The address — email address for email channel,
     *                  phone number for SMS channel, userId string for in-app.
     * @param title     Short subject / heading
     * @param body      Full message body
     */
    void deliver(String recipient, String title, String body);
}