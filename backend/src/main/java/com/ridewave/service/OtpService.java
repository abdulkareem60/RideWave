package com.ridewave.service;

import com.ridewave.config.AppProperties;
import com.ridewave.exception.InvalidOtpException;
import com.ridewave.exception.OtpExpiredException;
import com.ridewave.model.OtpToken;
import com.ridewave.model.User;
import com.ridewave.model.enums.OtpType;
import com.ridewave.repository.OtpTokenRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.mindrot.jbcrypt.BCrypt;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * OTP Service — generates and validates one-time passwords for:
 *   - Email verification
 *   - Phone verification
 *   - Password reset
 *   - Ride start (passenger shares with driver)
 *
 * Security:
 *   - Tokens are generated using SecureRandom (CSPRNG).
 *   - Only the BCrypt hash is persisted — the plain OTP is returned
 *     to the caller once and is never stored.
 *   - Previous pending tokens are invalidated before a new one is issued.
 *   - Expired tokens are cleaned up by a scheduled job every hour.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class OtpService {

    private final OtpTokenRepository otpRepository;
    private final AppProperties      appProperties;
    private final EmailService       emailService;

    private static final SecureRandom RANDOM = new SecureRandom();

    // ── Generation ────────────────────────────────────────────────────────

    /**
     * Generates an email-verification OTP, persists the hash, and
     * dispatches the email asynchronously.
     */
    @Transactional
    public void issueEmailVerificationOtp(User user) {
        String otp = generateAndStore(user, null, OtpType.EMAIL_VERIFY,
                appProperties.getOtp().getExpiryMinutes());
        emailService.sendEmailVerificationOtp(user.getEmail(), user.getFullName(), otp);
        log.info("Email verification OTP issued for userId={}", user.getUserId());
    }

    /**
     * Generates a password-reset OTP and emails it.
     */
    @Transactional
    public void issuePasswordResetOtp(User user) {
        String otp = generateAndStore(user, null, OtpType.PASSWORD_RESET,
                appProperties.getOtp().getExpiryMinutes());
        emailService.sendPasswordResetOtp(user.getEmail(), user.getFullName(), otp);
        log.info("Password reset OTP issued for userId={}", user.getUserId());
    }


    // ── Validation ────────────────────────────────────────────────────────

    /**
     * Validates an email-verification OTP.
     * Marks the token as used on success.
     *
     * @throws OtpExpiredException  if the token window has passed.
     * @throws InvalidOtpException  if the OTP does not match.
     */
    @Transactional
    public void validateEmailOtp(User user, String rawOtp) {
        validateToken(user.getUserId(), null, rawOtp, OtpType.EMAIL_VERIFY);
    }

    /**
     * Validates a password-reset OTP.
     */
    @Transactional
    public void validatePasswordResetOtp(User user, String rawOtp) {
        validateToken(user.getUserId(), null, rawOtp, OtpType.PASSWORD_RESET);
    }


    // ── Scheduled cleanup ─────────────────────────────────────────────────

    /** Runs every hour — deletes OTP records past their expiry time. */
    @Scheduled(fixedDelay = 3_600_000)
    @Transactional
    public void purgeExpiredTokens() {
        int deleted = otpRepository.deleteExpiredTokens(
                LocalDateTime.now().minusHours(24));
        if (deleted > 0) {
            log.info("Purged {} expired OTP tokens", deleted);
        }
    }

    // ── Private helpers ───────────────────────────────────────────────────

    /**
     * Generates a plain 6-digit OTP, invalidates any existing pending
     * tokens of the same type for this user, persists the BCrypt hash,
     * and returns the plain text (to be sent to the user exactly once).
     */
    private String generateAndStore(User user, UUID rideId, OtpType type, int expiryMinutes) {
        // Invalidate any previous pending tokens of this type
        otpRepository.invalidatePreviousTokens(user.getUserId(), type);

        String plain = String.format("%06d", RANDOM.nextInt(1_000_000));
        String hash  = BCrypt.hashpw(plain, BCrypt.gensalt(10));

        OtpToken token = OtpToken.builder()
                .user(user)
                .rideId(rideId)
                .tokenHash(hash)
                .type(type)
                .expiresAt(LocalDateTime.now().plusMinutes(expiryMinutes))
                .build();

        otpRepository.save(token);
        return plain;
    }

    private void validateToken(UUID userId, UUID rideId, String rawOtp, OtpType type) {
        OtpToken token = otpRepository
                .findActiveToken(userId, type, LocalDateTime.now())
                .orElseThrow(() -> {
                    // Check if there was one but it expired
                    return new OtpExpiredException(
                            "OTP has expired or was already used. Please request a new one.");
                });

        checkAndConsume(token, rawOtp);
    }

    private void checkAndConsume(OtpToken token, String rawOtp) {
        if (token.isExpired()) {
            throw new OtpExpiredException("OTP has expired. Please request a new one.");
        }
        if (!BCrypt.checkpw(rawOtp, token.getTokenHash())) {
            throw new InvalidOtpException("Invalid OTP. Please check the code and try again.");
        }
        // Mark as used — prevents replay attacks
        token.setUsed(true);
        otpRepository.save(token);
    }
}