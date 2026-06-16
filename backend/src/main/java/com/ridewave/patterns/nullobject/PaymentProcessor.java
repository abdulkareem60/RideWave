package com.ridewave.patterns.nullobject;

import java.math.BigDecimal;

/**
 * Null Object Pattern — PaymentProcessor Interface
 *
 * Problem this solves:
 *   PaymentService must work identically in development (no real gateway),
 *   test environments, and production (Stripe/JazzCash). Without the Null
 *   Object pattern, PaymentService would be littered with:
 *
 *     if (paymentProcessor != null) { paymentProcessor.charge(...); }
 *
 *   This is brittle — a missed null-check at 2 AM causes a NullPointerException
 *   in production during a booking.
 *
 * How it works:
 *   Both NullPaymentProcessor (dev/test) and StripePaymentProcessor (production)
 *   implement this interface. PaymentService depends only on this interface —
 *   it never checks which implementation it has. The Null Object silently
 *   simulates success; no real API call is made.
 *
 * Implementations:
 *   - NullPaymentProcessor  (@Profile "dev | test")  — simulates, logs, never throws
 *   - StripePaymentProcessor (@Profile "production") — real Stripe API (stub provided)
 */
public interface PaymentProcessor {

    /**
     * Charge the passenger immediately (for CASH: record only; for card: capture).
     *
     * @return PaymentResult with success flag and transaction reference
     */
    PaymentResult charge(BigDecimal amount, String paymentMethodRef, String description);

    /**
     * Place a hold on funds (authorise without capture).
     * Used for card payments — captured when ride completes.
     */
    PaymentResult hold(BigDecimal amount, String paymentMethodRef, String description);

    /**
     * Release/capture a previously held amount.
     * Called by PaymentObserver on ride COMPLETED.
     */
    PaymentResult release(String holdRef);

    /**
     * Refund a completed or held transaction.
     * Called by PaymentObserver on ride CANCELLED.
     */
    PaymentResult refund(String transactionRef, BigDecimal amount);
}