package com.ridewave.patterns.bridge;

import com.ridewave.patterns.adapter.SmsProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * Bridge Pattern — Concrete Implementation: SMS Channel
 *
 * Uses the SmsProvider adapter — note how the Bridge and Adapter
 * patterns compose naturally here: the Bridge doesn't care whether
 * the SMS is delivered by Twilio, Vonage, or a mock.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class SmsNotificationChannel implements NotificationChannel {

    private final SmsProvider smsProvider;

    @Override
    public void deliver(String phoneNumber, String title, String body) {
        // SMS bodies are character-limited — combine title and body concisely
        String smsText = title + ": " + body;
        boolean sent = smsProvider.send(phoneNumber, smsText);
        if (!sent) {
            log.warn("SMS delivery failed for phone: {}", phoneNumber);
        }
    }
}