package com.ridewave.service;

import com.ridewave.dto.request.RatingRequest;
import com.ridewave.dto.response.RatingResponse;
import com.ridewave.exception.*;
import com.ridewave.model.Booking;
import com.ridewave.model.Rating;
import com.ridewave.model.Ride;
import com.ridewave.model.User;
import com.ridewave.model.enums.BookingStatus;
import com.ridewave.model.enums.RideStatus;
import com.ridewave.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Rating Service — manages ride ratings between drivers and passengers.
 *
 * Rating rules:
 *   1. Both rater and rated must have been on the same completed ride.
 *   2. Each pair (rater → rated) can only rate once per ride.
 *   3. Drivers rate passengers; passengers rate drivers.
 *   4. Self-rating is blocked.
 *   5. After saving, TrustScoreService recalculates the rated user's score.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class RatingService {

    private final RatingRepository  ratingRepository;
    private final RideRepository    rideRepository;
    private final BookingRepository bookingRepository;
    private final UserRepository    userRepository;
    private final TrustScoreService trustScoreService;

    // ── Submit rating ─────────────────────────────────────────────────────

    @Transactional
    public RatingResponse submitRating(UUID raterId, RatingRequest request) {
        if (raterId.equals(request.getRatedUserId())) {
            throw new BadRequestException("You cannot rate yourself.");
        }

        Ride ride = rideRepository.findById(request.getRideId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Ride not found: " + request.getRideId()));

        if (ride.getStatus() != RideStatus.COMPLETED) {
            throw new InvalidRideStateException(
                    "Ratings can only be submitted for COMPLETED rides.");
        }

        User rater = userRepository.findById(raterId)
                .orElseThrow(() -> new ResourceNotFoundException("Rater not found"));

        User rated = userRepository.findById(request.getRatedUserId())
                .orElseThrow(() -> new ResourceNotFoundException("Rated user not found"));

        // ── Eligibility: rater must have been on the ride ─────────────────
        verifyParticipation(raterId, ride);

        // ── Eligibility: rated must have been on the ride ─────────────────
        verifyParticipation(rated.getUserId(), ride);

        // ── Duplicate check ───────────────────────────────────────────────
        if (ratingRepository.existsByRide_RideIdAndRater_UserId(
                ride.getRideId(), raterId)) {
            throw new DuplicateResourceException(
                    "You have already rated someone for this ride.");
        }

        // ── Validate rating bounds ────────────────────────────────────────
        if (request.getRating() < 1 || request.getRating() > 5) {
            throw new BadRequestException("Rating must be between 1 and 5.");
        }

        Rating rating = Rating.builder()
                .ride(ride)
                .rater(rater)
                .rated(rated)
                .rating(request.getRating())
                .review(request.getReview())
                .build();

        rating = ratingRepository.save(rating);

        // Recalculate trust score for the rated user immediately
        trustScoreService.recalculate(rated.getUserId());

        log.info("Rating submitted: rideId={}, rater={}, rated={}, stars={}",
                ride.getRideId(), raterId, rated.getUserId(), request.getRating());

        return RatingResponse.from(rating);
    }

    // ── Read ──────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Page<RatingResponse> getRatingsForUser(UUID userId, Pageable pageable) {
        return ratingRepository
                .findByRated_UserIdOrderByCreatedAtDesc(userId, pageable)
                .map(RatingResponse::from);
    }

    // ── Private helpers ───────────────────────────────────────────────────

    /**
     * Verifies that a user participated in a completed ride, either as
     * the driver or as a confirmed/completed passenger.
     */
    private void verifyParticipation(UUID userId, Ride ride) {
        boolean isDriver = ride.getDriver().getUserId().equals(userId);
        if (isDriver) return;

        boolean isPassenger = bookingRepository
                .findByRide_RideIdAndStatus(ride.getRideId(), BookingStatus.COMPLETED)
                .stream()
                .anyMatch(b -> b.getPassenger().getUserId().equals(userId));

        if (!isPassenger) {
            throw new AccessDeniedException(
                    "You were not a participant on this ride and cannot submit a rating.");
        }
    }
}