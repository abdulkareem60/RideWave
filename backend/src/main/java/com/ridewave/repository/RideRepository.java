package com.ridewave.repository;

import com.ridewave.model.Ride;
import com.ridewave.model.enums.RideStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

public interface RideRepository extends JpaRepository<Ride, UUID> {

    // ── Passenger search ──────────────────────────────────────────────────
    //
    // Only returns SCHEDULED rides with a future departure time.
    // EXPIRED rides are excluded at query level — not filtered in-memory.
    // When no origin/dest is provided (empty string), all available rides
    // are returned so the pre-search "browse all rides" view works.

    @Query("""
           SELECT r FROM Ride r
            JOIN FETCH r.driver d
            JOIN FETCH r.vehicle v
           WHERE r.status         = 'SCHEDULED'
             AND r.availableSeats >= :seats
             AND r.departureTime  > :now
             AND (
                  :origin = ''
                  OR LOWER(r.originName) LIKE LOWER(CONCAT('%', :origin, '%'))
                  OR LOWER(r.destName)   LIKE LOWER(CONCAT('%', :dest,   '%'))
                 )
           ORDER BY r.departureTime ASC
           """)
    Page<Ride> searchRides(@Param("origin") String        origin,
                           @Param("dest")   String        dest,
                           @Param("seats")  int           seats,
                           @Param("now")    LocalDateTime now,
                           Pageable pageable);

    // ── All available rides (pre-search browse) ───────────────────────────
    // Same as searchRides but without keyword/date filter.
    // Used by the passenger search page to populate the initial "all rides" view.

    @Query("""
           SELECT r FROM Ride r
            JOIN FETCH r.driver d
            JOIN FETCH r.vehicle v
           WHERE r.status         = 'SCHEDULED'
             AND r.availableSeats >= 1
             AND r.departureTime  > :now
           ORDER BY r.departureTime ASC
           """)
    Page<Ride> findAllAvailableForPassengers(@Param("now") LocalDateTime now,
                                             Pageable pageable);

    // ── Driver ride history ───────────────────────────────────────────────

    Page<Ride> findByDriver_UserIdOrderByDepartureTimeDesc(UUID driverId, Pageable pageable);

    Page<Ride> findByDriver_UserIdAndStatusOrderByDepartureTimeDesc(
            UUID driverId, RideStatus status, Pageable pageable);

    Optional<Ride> findByRideIdAndDriver_UserId(UUID rideId, UUID driverId);

    // ── Overlap detection (improved: uses estimatedArrivalTime) ───────────
    //
    // Two rides conflict when their [departure, estimatedArrival] intervals
    // overlap. This replaces the previous ±2-hour window approach.
    //
    // Logic: intervals [A_start, A_end] and [B_start, B_end] overlap when:
    //   A_start < B_end  AND  A_end > B_start
    //
    // For the new ride:   start = proposedDeparture, end = proposedArrival
    // For existing rides: start = r.departureTime,   end = r.estimatedArrivalTime
    //                     (falls back to departureTime + 3h when null)
    //
    // rideIdToExclude lets updateRide skip the ride being edited.

    // COALESCE fallback uses :fallbackArrival = ride.departureTime + 3h,
    // computed in Java (RideService.assertNoOverlap) and passed as a parameter
    // because HQL does not support interval arithmetic expressions.
    @Query("""
           SELECT COUNT(r) FROM Ride r
           WHERE r.driver.userId = :driverId
             AND r.status IN ('SCHEDULED', 'IN_PROGRESS')
             AND r.rideId <> :excludeRideId
             AND :proposedDeparture < COALESCE(r.estimatedArrivalTime, r.departureTime)
             AND :proposedArrival   > r.departureTime
           """)
    long countOverlappingRides(
            @Param("driverId")          UUID          driverId,
            @Param("excludeRideId")     UUID          excludeRideId,
            @Param("proposedDeparture") LocalDateTime proposedDeparture,
            @Param("proposedArrival")   LocalDateTime proposedArrival);

    // ── Expiry ────────────────────────────────────────────────────────────
    //
    // Marks SCHEDULED rides as EXPIRED when:
    //   - Their estimatedArrivalTime (or departureTime + 3h fallback) has passed.
    //   - They have ZERO active bookings.
    //
    // Called by RideExpiryScheduler every 5 minutes.
    // Returns the number of rides expired.

    // :fallbackCutoff = now - 3 hours, computed in Java (RideExpiryScheduler).
    // A ride expires when its estimatedArrivalTime (or departureTime when null)
    // is before now. We pass (now - 3h) as the fallback so that rides without
    // estimatedArrivalTime are expired 3 hours after their departure.
    @Modifying
    @Query("""
           UPDATE Ride r
              SET r.status = 'EXPIRED'
           WHERE r.status = 'SCHEDULED'
             AND COALESCE(r.estimatedArrivalTime, r.departureTime) < :now
             AND (SELECT COUNT(b) FROM Booking b
                  WHERE b.ride.rideId = r.rideId
                    AND b.status NOT IN ('CANCELLED', 'REJECTED')) = 0
           """)
    int expireStaleRides(@Param("now") LocalDateTime now);

    // ── Active booking count ──────────────────────────────────────────────

    @Query("""
           SELECT COUNT(b) FROM Booking b
           WHERE b.ride.rideId = :rideId
             AND b.status NOT IN ('CANCELLED', 'REJECTED')
           """)
    long countActiveBookings(@Param("rideId") UUID rideId);

    // ── Atomic seat mutations ──────────────────────────────────────────────

    @Modifying
    @Query("""
           UPDATE Ride r
              SET r.availableSeats = r.availableSeats - :count
           WHERE r.rideId          = :rideId
             AND r.availableSeats  >= :count
           """)
    int decrementAvailableSeats(@Param("rideId") UUID rideId, @Param("count") int count);

    @Modifying
    @Query("""
           UPDATE Ride r
              SET r.availableSeats = r.availableSeats + :count
           WHERE r.rideId = :rideId
           """)
    int incrementAvailableSeats(@Param("rideId") UUID rideId, @Param("count") int count);

    @Modifying
    @Query("UPDATE Ride r SET r.status = :status WHERE r.rideId = :rideId")
    int updateStatus(@Param("rideId") UUID rideId, @Param("status") RideStatus status);

    @Modifying
    @Query("UPDATE Ride r SET r.rideOtpHash = :hash WHERE r.rideId = :rideId")
    int updateOtpHash(@Param("rideId") UUID rideId, @Param("hash") String hash);

    long countByStatus(RideStatus status);

    @Query("SELECT COUNT(r) FROM Ride r WHERE r.status IN ('SCHEDULED','IN_PROGRESS')")
    long countActiveRides();
}