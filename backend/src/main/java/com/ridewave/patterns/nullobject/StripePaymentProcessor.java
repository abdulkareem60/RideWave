package com.ridewave.patterns.nullobject;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

/**
 * Production PaymentProcessor — Stripe implementation stub.
 *
 * Wire in the Stripe Java SDK (com.stripe:stripe-java) and replace
 * the TODO blocks to go live. The interface contract is identical to
 * NullPaymentProcessor — no changes required in PaymentService.
 *
 * Active only in "production" profile.
 */
@Component
@Profile("production")
@Slf4j
public class StripePaymentProcessor implements PaymentProcessor {

    @Value("${stripe.secret-key:sk_test_placeholder}")
    private String secretKey;

    @Override
    public PaymentResult charge(BigDecimal amount, String paymentMethodRef, String description) {
        // TODO: Stripe.apiKey = secretKey;
        //       PaymentIntent intent = PaymentIntent.create(params);
        //       return intent.getStatus().equals("succeeded")
        //           ? PaymentResult.success(intent.getId(), amount)
        //           : PaymentResult.failure(intent.getLastPaymentError().getMessage());
        log.warn("StripePaymentProcessor.charge() not yet implemented — returning failure");
        return PaymentResult.failure("Stripe integration pending");
    }

    @Override
    public PaymentResult hold(BigDecimal amount, String paymentMethodRef, String description) {
        // TODO: create PaymentIntent with capture_method=manual
        log.warn("StripePaymentProcessor.hold() not yet implemented");
        return PaymentResult.failure("Stripe integration pending");
    }

    @Override
    public PaymentResult release(String holdRef) {
        // TODO: PaymentIntent.retrieve(holdRef).capture()
        log.warn("StripePaymentProcessor.release() not yet implemented");
        return PaymentResult.failure("Stripe integration pending");
    }

    @Override
    public PaymentResult refund(String transactionRef, BigDecimal amount) {
        // TODO: Refund.create(params with payment_intent=transactionRef)
        log.warn("StripePaymentProcessor.refund() not yet implemented");
        return PaymentResult.failure("Stripe integration pending");
    }
}