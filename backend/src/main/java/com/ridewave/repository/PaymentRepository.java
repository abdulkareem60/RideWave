package com.ridewave.repository;

import com.ridewave.model.Payment;
import com.ridewave.model.enums.PaymentStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, UUID> {

    Optional<Payment> findByBooking_BookingId(UUID bookingId);

    Page<Payment> findByPayer_UserIdOrderByCreatedAtDesc(UUID payerId, Pageable pageable);

    Page<Payment> findAllByOrderByCreatedAtDesc(Pageable pageable);

    @Modifying
    @Query("""
           UPDATE Payment p
              SET p.status         = :status,
                  p.transactionRef = :ref,
                  p.processedAt    = :processedAt
           WHERE p.paymentId = :paymentId
           """)
    int updatePaymentResult(@Param("paymentId")  UUID          paymentId,
                            @Param("status")     PaymentStatus status,
                            @Param("ref")        String        ref,
                            @Param("processedAt") LocalDateTime processedAt);

    @Query("""
           SELECT COALESCE(SUM(p.amount), 0)
             FROM Payment p
            WHERE p.status = 'COMPLETED'
              AND p.processedAt >= :from
              AND p.processedAt <  :to
           """)
    BigDecimal sumCompletedBetween(@Param("from") LocalDateTime from,
                                   @Param("to")   LocalDateTime to);

    long countByStatus(PaymentStatus status);
}