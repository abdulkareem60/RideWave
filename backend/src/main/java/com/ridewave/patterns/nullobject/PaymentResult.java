package com.ridewave.patterns.nullobject;

import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Immutable result returned by every PaymentProcessor method.
 * Avoids checked exceptions in the payment flow — callers inspect
 * success() and branch accordingly.
 */
@Getter
@Builder
public class PaymentResult {

    private final boolean       success;
    private final String        transactionRef;
    private final String        message;
    private final BigDecimal    amount;
    private final LocalDateTime processedAt;

    // ── Convenience factories ─────────────────────────────────────────────

    public static PaymentResult success(String ref, BigDecimal amount) {
        return PaymentResult.builder()
                .success(true)
                .transactionRef(ref)
                .amount(amount)
                .message("Payment processed successfully")
                .processedAt(LocalDateTime.now())
                .build();
    }

    public static PaymentResult success(String ref) {
        return PaymentResult.builder()
                .success(true)
                .transactionRef(ref)
                .message("Operation successful")
                .processedAt(LocalDateTime.now())
                .build();
    }

    public static PaymentResult failure(String reason) {
        return PaymentResult.builder()
                .success(false)
                .message(reason)
                .processedAt(LocalDateTime.now())
                .build();
    }
}