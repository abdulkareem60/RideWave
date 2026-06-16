package com.ridewave.patterns.bridge;

import com.ridewave.service.EmailService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Bridge Pattern — Concrete Implementation: Email Channel
 *
 * Delegates to EmailService which owns SMTP configuration and async dispatch.
 */
@Component
@RequiredArgsConstructor
public class EmailNotificationChannel implements NotificationChannel {

    private final EmailService emailService;

    @Override
    public void deliver(String emailAddress, String title, String body) {
        emailService.sendGenericEmail(emailAddress, "[RideWave] " + title, body);
    }
}