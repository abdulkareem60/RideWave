package com.ridewave.service;

import com.ridewave.config.AppProperties;
import com.ridewave.model.enums.UserStatus;
import com.ridewave.repository.RatingRepository;
import com.ridewave.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.UUID;

/**
 * Trust Score Service — owns the calculation and enforcement of trust scores.
 *
 * Score formula:
 *   trustScore = average(all ratings received by this user), rounded to 2dp.
 *   New users start at the configured default (3.00).
 *   After each completed ride, recalculate from the full rating history.
 *
 * Enforcement thresholds (from application.yml):
 *   < autoSuspendBelow (1.00) → automatic BLOCKED status
 *   < minToBook        (1.50) → LowTrustScoreException in RideBookingMediator
 *   < minToDrive       (2.00) → prevented from creating rides (checked in RideService)
 *
 * Called by TrustScoreObserver after every ride COMPLETED event.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class TrustScoreService {

    private final RatingRepository ratingRepository;
    private final UserRepository   userRepository;
    private final AppProperties    appProperties;

    // ── Recalculate ───────────────────────────────────────────────────────

    /**
     * Recalculates and persists the trust score for a given user based on
     * their entire rating history. Triggered after every new rating is saved.
     *
     * If the updated score falls below autoSuspendBelow, the account is
     * automatically blocked and logged for admin review.
     */
    @Transactional
    public void recalculate(UUID userId) {
        long ratingCount = ratingRepository.countRatingsForUser(userId);

        BigDecimal newScore;
        if (ratingCount == 0) {
            // No ratings yet — keep default
            newScore = BigDecimal.valueOf(appProperties.getTrustScore().getDefaultScore());
        } else {
            double avg = ratingRepository.findAverageRatingForUser(userId)
                    .orElse(appProperties.getTrustScore().getDefaultScore());
            newScore = BigDecimal.valueOf(avg)
                    .setScale(2, RoundingMode.HALF_UP);
        }

        // Clamp to [0.00, 5.00]
        newScore = newScore.max(BigDecimal.ZERO).min(BigDecimal.valueOf(5.0));

        int rows = userRepository.updateTrustScore(userId, newScore);
        if (rows > 0) {
            log.info("Trust score updated: userId={}, score={} (based on {} ratings)",
                    userId, newScore, ratingCount);
        }

        // Auto-block enforcement
        enforceAutoBlock(userId, newScore);
    }

    // ── Read ──────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public BigDecimal getScore(UUID userId) {
        return userRepository.findById(userId)
                .map(u -> u.getTrustScore())
                .orElse(BigDecimal.valueOf(appProperties.getTrustScore().getDefaultScore()));
    }

    // ── Enforcement ───────────────────────────────────────────────────────

    private void enforceAutoBlock(UUID userId, BigDecimal score) {
        double threshold = appProperties.getTrustScore().getAutoSuspendBelow();

        if (score.doubleValue() < threshold) {
            userRepository.findById(userId).ifPresent(user -> {
                if (user.getStatus() != UserStatus.BLOCKED) {
                    userRepository.updateStatus(userId, UserStatus.BLOCKED);
                    log.warn("User AUTO-BLOCKED: userId={}, trustScore={} (below threshold {})",
                            userId, score, threshold);
                }
            });
        }
    }
}