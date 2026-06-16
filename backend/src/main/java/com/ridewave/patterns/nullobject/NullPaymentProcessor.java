package com.ridewave.patterns.nullobject;

import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Null Object Pattern — NullPaymentProcessor
 *
 * Active in "dev" and "test" profiles.
 *
 * This is the canonical Null Object implementation:
 *   - Satisfies the PaymentProcessor interface contract completely.
 *   - Performs NO real operation — always returns a successful result.
 *   - Logs each simulated call so developers can verify the flow
 *     without incurring real charges or needing API credentials.
 *   - Never throws — safe to inject anywhere without wrapping in try/catch.
 *
 * The critical design benefit: PaymentService, RideBookingMediator,
 * and PaymentObserver are written with ZERO null-checks for the processor.
 * Swapping to production is a single Spring profile change.
 */
@Component
@Profile({"dev", "test"})
@Slf4j
public class NullPaymentProcessor implements PaymentProcessor {

    @Override
    public PaymentResult charge(BigDecimal amount, String paymentMethodRef, String description) {
        String simulatedRef = "NULL-CHG-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        log.info("┌─ [NULL PAYMENT] charge ─────────────────────────");
        log.info("│  Amount:  PKR {}", amount);
        log.info("│  Method:  {}", paymentMethodRef);
        log.info("│  Desc:    {}", description);
        log.info("│  TxnRef:  {}", simulatedRef);
        log.info("└─ Simulated — no real charge made ───────────────");
        return PaymentResult.success(simulatedRef, amount);
    }

    @Override
    public PaymentResult hold(BigDecimal amount, String paymentMethodRef, String description) {
        String simulatedRef = "NULL-HLD-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        log.info("┌─ [NULL PAYMENT] hold ──────────────────────────");
        log.info("│  Amount:  PKR {}", amount);
        log.info("│  Ref:     {}", simulatedRef);
        log.info("└─ Simulated hold — no real authorisation made ──");
        return PaymentResult.success(simulatedRef, amount);
    }

    @Override
    public PaymentResult release(String holdRef) {
        String simulatedRef = "NULL-RLS-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        log.info("[NULL PAYMENT] release holdRef={} → txnRef={}", holdRef, simulatedRef);
        return PaymentResult.success(simulatedRef);
    }

    @Override
    public PaymentResult refund(String transactionRef, BigDecimal amount) {
        String simulatedRef = "NULL-RFD-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        log.info("[NULL PAYMENT] refund txnRef={} amount=PKR {} → refundRef={}",
                transactionRef, amount, simulatedRef);
        return PaymentResult.success(simulatedRef, amount);
    }
}