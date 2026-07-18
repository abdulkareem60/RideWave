package com.ridewave.repository;

import com.ridewave.model.Booking;
import com.ridewave.model.enums.BookingStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface BookingRepository extends JpaRepository<Booking, UUID> {

    Page<Booking> findByPassenger_UserIdOrderByBookingTimeDesc(UUID passengerId, Pageable pageable);

    Page<Booking> findByPassenger_UserIdAndStatusOrderByBookingTimeDesc(
            UUID passengerId, BookingStatus status, Pageable pageable);

    Page<Booking> findByRide_RideIdOrderByBookingTimeAsc(UUID rideId, Pageable pageable);

    Optional<Booking> findByBookingIdAndPassenger_UserId(UUID bookingId, UUID passengerId);

    List<Booking> findByRide_RideIdAndStatus(UUID rideId, BookingStatus status);

    boolean existsByRide_RideIdAndPassenger_UserIdAndStatusIn(
            UUID rideId, UUID passengerId, List<BookingStatus> statuses);

    @Modifying
    @Query("UPDATE Booking b SET b.status = :status WHERE b.bookingId = :bookingId")
    int updateStatus(@Param("bookingId") UUID bookingId,
                     @Param("status")    BookingStatus status);

    /** Mark all CONFIRMED/APPROVED bookings for a ride as COMPLETED in one shot. */
    @Modifying
    @Query("""
       UPDATE Booking b
       SET b.status = 'COMPLETED'
       WHERE b.ride.rideId = :rideId
         AND b.status IN ('PENDING','APPROVED','CONFIRMED')
       """)
    int completeAllForRide(@Param("rideId") UUID rideId);

    @Query("""
           SELECT b FROM Booking b
            JOIN FETCH b.passenger
            JOIN FETCH b.ride
           WHERE b.ride.rideId = :rideId
             AND b.status IN ('CONFIRMED','APPROVED')
           """)
    List<Booking> findActiveBookingsForRide(@Param("rideId") UUID rideId);

    long countByStatus(BookingStatus status);
}