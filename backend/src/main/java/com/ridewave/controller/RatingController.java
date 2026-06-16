package com.ridewave.controller;

import com.ridewave.dto.request.RatingRequest;
import com.ridewave.dto.response.ApiResponse;
import com.ridewave.dto.response.RatingResponse;
import com.ridewave.security.UserPrincipal;
import com.ridewave.service.RatingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/ratings")
@RequiredArgsConstructor
@Tag(name = "Ratings", description = "Submit and retrieve ride ratings")
@SecurityRequirement(name = "bearerAuth")
public class RatingController {

    private final RatingService ratingService;

    @PostMapping
    @PreAuthorize("hasAnyRole('DRIVER','PASSENGER')")
    @Operation(
            summary = "Submit a rating",
            description = "Rate a driver or passenger after a COMPLETED ride. " +
                    "Each user can rate once per ride. Trust scores update immediately."
    )
    public ResponseEntity<ApiResponse<RatingResponse>> submitRating(
            @Valid @RequestBody RatingRequest request,
            @AuthenticationPrincipal UserPrincipal currentUser) {

        RatingResponse rating = ratingService.submitRating(currentUser.getId(), request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(rating, "Rating submitted. Thank you for your feedback!"));
    }

    @GetMapping("/user/{userId}")
    @Operation(
            summary = "Get all ratings for a user",
            description = "Public-ish endpoint — any authenticated user can view a user's ratings."
    )
    public ResponseEntity<ApiResponse<Page<RatingResponse>>> getRatingsForUser(
            @PathVariable UUID userId,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size) {

        Page<RatingResponse> ratings = ratingService.getRatingsForUser(
                userId,
                PageRequest.of(page, size, Sort.by("createdAt").descending()));

        return ResponseEntity.ok(ApiResponse.success(ratings));
    }
}