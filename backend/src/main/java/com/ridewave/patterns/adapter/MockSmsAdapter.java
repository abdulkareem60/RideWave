package com.ridewave.patterns.adapter;

import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

/**
 * Adapter Pattern — Mock / No-Op Concrete Adapter
 *
 * Active in "dev" and "test" profiles.
 * Logs the would-be SMS to the console so developers can see the OTPs
 * without needing a Twilio account or spending SMS credits.
 */
@Component

@Slf4j
public class MockSmsAdapter implements SmsProvider {

    @Override
    public boolean send(String phoneNumber, String message) {
        log.info("┌─────────────────────────────────────────────");
        log.info("│  [MOCK SMS] To:      {}", phoneNumber);
        log.info("│  [MOCK SMS] Message: {}", message);
        log.info("└─────────────────────────────────────────────");
        return true;   // Always succeeds in simulation
    }
}