package com.ridewave.dto.response;

import com.ridewave.model.Rating;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Builder
public class RatingResponse {

    private UUID          ratingId;
    private UUID          rideId;
    private UUID          raterId;
    private String        raterName;
    private UUID          ratedId;
    private String        ratedName;
    private Integer       rating;
    private String        review;
    private LocalDateTime createdAt;

    public static RatingResponse from(Rating r) {
        return RatingResponse.builder()
                .ratingId(r.getRatingId())
                .rideId(r.getRide().getRideId())
                .raterId(r.getRater().getUserId())
                .raterName(r.getRater().getFullName())
                .ratedId(r.getRated().getUserId())
                .ratedName(r.getRated().getFullName())
                .rating(r.getRating())
                .review(r.getReview())
                .createdAt(r.getCreatedAt())
                .build();
    }
}