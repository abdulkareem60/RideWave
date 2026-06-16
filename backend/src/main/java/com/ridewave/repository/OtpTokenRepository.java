package com.ridewave.repository;

import com.ridewave.model.OtpToken;
import com.ridewave.model.enums.OtpType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface OtpTokenRepository extends JpaRepository<OtpToken, UUID> {

    /**
     * Fetches the most recent, unused, non-expired token for a user+type combo.
     * Used for email/phone/password-reset OTPs.
     */
    @Query("""
           SELECT t FROM OtpToken t
           WHERE t.user.userId = :userId
             AND t.type        = :type
             AND t.used        = false
             AND t.expiresAt   > :now
           ORDER BY t.createdAt DESC
           LIMIT 1
           """)
    Optional<OtpToken> findActiveToken(@Param("userId") UUID userId,
                                       @Param("type")   OtpType type,
                                       @Param("now")    LocalDateTime now);


    /** Invalidate all pending OTPs of a given type for a user (before issuing a new one). */
    @Modifying
    @Query("""
           UPDATE OtpToken t SET t.used = true
           WHERE t.user.userId = :userId
             AND t.type        = :type
             AND t.used        = false
           """)
    int invalidatePreviousTokens(@Param("userId") UUID userId,
                                 @Param("type")   OtpType type);

    /** Scheduled cleanup — deletes tokens older than 24 hours. */
    @Modifying
    @Query("DELETE FROM OtpToken t WHERE t.expiresAt < :cutoff")
    int deleteExpiredTokens(@Param("cutoff") LocalDateTime cutoff);
}