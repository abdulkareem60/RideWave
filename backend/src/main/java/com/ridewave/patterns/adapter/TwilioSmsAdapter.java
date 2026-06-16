package com.ridewave.patterns.adapter;

import com.twilio.Twilio;
import com.twilio.exception.ApiException;
import com.twilio.rest.api.v2010.account.Message;
import com.twilio.type.PhoneNumber;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

/**
 * Adapter Pattern — Twilio Concrete Adapter
 *
 * Wraps the Twilio Java SDK behind the SmsProvider interface.
 * Active only in the "production" Spring profile.
 *
 * The Twilio SDK uses a completely different API shape (builder pattern,
 * checked exceptions, nested types) — the adapter translates all of that
 * into our single send(phone, message) contract.
 */
@Component
@Profile("production")
@Slf4j
public class TwilioSmsAdapter implements SmsProvider {

    @Value("${twilio.account-sid}")
    private String accountSid;

    @Value("${twilio.auth-token}")
    private String authToken;

    @Value("${twilio.from-number}")
    private String fromNumber;

    @PostConstruct
    public void init() {
        Twilio.init(accountSid, authToken);
        log.info("Twilio SMS adapter initialised with from-number: {}", fromNumber);
    }

    @Override
    public boolean send(String phoneNumber, String message) {
        try {
            Message.creator(
                    new PhoneNumber(phoneNumber),
                    new PhoneNumber(fromNumber),
                    message
            ).create();

            log.debug("SMS sent via Twilio to {}", phoneNumber);
            return true;

        } catch (ApiException e) {
            log.error("Twilio SMS delivery failed to {}: [{}] {}",
                    phoneNumber, e.getCode(), e.getMessage());
            return false;
        }
    }
}