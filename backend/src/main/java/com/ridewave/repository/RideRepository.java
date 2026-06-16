package com.ridewave.repository;

import com.ridewave.model.Ride;
import com.ridewave.model.enums.RideStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface RideRepository extends JpaRepository<Ride, UUID> {

    /** Search rides by origin/destination keyword and date, with available seats. */
    @Query("""
           SELECT r FROM Ride r
            JOIN FETCH r.driver d
            JOIN FETCH r.vehicle v
           WHERE r.status         = 'SCHEDULED'
             AND r.availableSeats >= :seats
             AND CAST(r.departureTime AS LocalDate) = :date
             AND (LOWER(r.originName) LIKE LOWER(CONCAT('%', :origin, '%'))
                  OR LOWER(r.destName)   LIKE LOWER(CONCAT('%', :dest,   '%')))
           ORDER BY r.departureTime ASC
           """)
    Page<Ride> searchRides(@Param("origin") String     origin,
                           @Param("dest")   String     dest,
                           @Param("date")   LocalDate  date,
                           @Param("seats")  int        seats,
                           Pageable pageable);

    Page<Ride> findByDriver_UserIdOrderByDepartureTimeDesc(UUID driverId, Pageable pageable);

    Page<Ride> findByDriver_UserIdAndStatusOrderByDepartureTimeDesc(
            UUID driverId, RideStatus status, Pageable pageable);

    Optional<Ride> findByRideIdAndDriver_UserId(UUID rideId, UUID driverId);

    /** Atomically decrement available seats — prevents race condition on concurrent bookings. */
    @Modifying
    @Query("""
           UPDATE Ride r
              SET r.availableSeats = r.availableSeats - :count
           WHERE r.rideId          = :rideId
             AND r.availableSeats  >= :count
           """)
    int decrementAvailableSeats(@Param("rideId") UUID rideId, @Param("count") int count);

    /** Atomically restore seats on booking cancellation. */
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


    long countByStatus(RideStatus status);

    @Query("SELECT COUNT(r) FROM Ride r WHERE r.status IN ('SCHEDULED','IN_PROGRESS')")
    long countActiveRides();

    @Query("SELECT COUNT(r) FROM Ride r WHERE r.driver.userId = :driverId AND r.status = 'COMPLETED'")
    long countCompletedByDriver(@Param("driverId") UUID driverId);

    /** Guard: driver already has a SCHEDULED or IN_PROGRESS ride. */
    boolean existsByDriver_UserIdAndStatusIn(UUID driverId, java.util.List<RideStatus> statuses);
}