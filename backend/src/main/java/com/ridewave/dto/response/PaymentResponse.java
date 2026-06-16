package com.ridewave.dto.response;

import com.ridewave.model.Payment;
import com.ridewave.model.enums.PaymentMethod;
import com.ridewave.model.enums.PaymentStatus;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Builder
public class PaymentResponse {

    private UUID          paymentId;
    private UUID          bookingId;
    private BigDecimal    amount;
    private PaymentMethod method;
    private PaymentStatus status;
    private String        transactionRef;
    private LocalDateTime processedAt;
    private LocalDateTime createdAt;

    public static PaymentResponse from(Payment p) {
        return PaymentResponse.builder()
                .paymentId(p.getPaymentId())
                .bookingId(p.getBooking().getBookingId())
                .amount(p.getAmount())
                .method(p.getMethod())
                .status(p.getStatus())
                .transactionRef(p.getTransactionRef())
                .processedAt(p.getProcessedAt())
                .createdAt(p.getCreatedAt())
                .build();
    }
}