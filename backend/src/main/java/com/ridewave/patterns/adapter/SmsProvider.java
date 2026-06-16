package com.ridewave.patterns.adapter;

/**
 * Adapter Pattern — Target Interface
 *
 * This is the interface RideWave's internal code depends on.
 * It knows nothing about Twilio, Vonage, or any other SMS vendor.
 *
 * Two concrete adapters exist:
 *   - TwilioSmsAdapter  (@Profile "production") — sends real SMS via Twilio SDK
 *   - MockSmsAdapter    (@Profile "dev | test")  — logs to console, no real SMS
 *
 * Swapping from Twilio to a different provider requires only a new adapter
 * class; no service layer code changes.
 */
public interface SmsProvider {

    /**
     * Send an SMS message.
     *
     * @param phoneNumber  E.164 format, e.g. "+923001234567"
     * @param message      Plain-text body (max ~160 chars for single SMS)
     * @return true if the message was accepted for delivery; false on failure
     */
    boolean send(String phoneNumber, String message);
}