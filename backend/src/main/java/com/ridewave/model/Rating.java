package com.ridewave.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "ratings",
        uniqueConstraints = @UniqueConstraint(
                name = "uq_rating_ride_rater_rated",
                columnNames = {"ride_id", "rater_id", "rated_id"}),
        indexes = {
                @Index(name = "idx_rating_ride",  columnList = "ride_id"),
                @Index(name = "idx_rating_rated", columnList = "rated_id")
        })
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class Rating {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @EqualsAndHashCode.Include
    @Column(updatable = false, nullable = false)
    private UUID ratingId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "ride_id", nullable = false)
    private Ride ride;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "rater_id", nullable = false)
    private User rater;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "rated_id", nullable = false)
    private User rated;

    /** Must be between 1 and 5 — enforced at DB and service layer. */
    @Column(nullable = false)
    private Integer rating;

    @Column(columnDefinition = "TEXT")
    private String review;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;
}