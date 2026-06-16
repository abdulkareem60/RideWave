package com.ridewave.repository;

import com.ridewave.model.Rating;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface RatingRepository extends JpaRepository<Rating, UUID> {

    Page<Rating> findByRated_UserIdOrderByCreatedAtDesc(UUID ratedId, Pageable pageable);

    boolean existsByRide_RideIdAndRater_UserId(UUID rideId, UUID raterId);

    /** Average rating for a user — used by TrustScoreService. */
    @Query("SELECT AVG(r.rating) FROM Rating r WHERE r.rated.userId = :userId")
    Optional<Double> findAverageRatingForUser(@Param("userId") UUID userId);

    @Query("SELECT COUNT(r) FROM Rating r WHERE r.rated.userId = :userId")
    long countRatingsForUser(@Param("userId") UUID userId);
}