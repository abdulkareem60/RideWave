package com.ridewave.repository;

import com.ridewave.model.Report;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface ReportRepository extends JpaRepository<Report, UUID> {

    Page<Report> findByStatusOrderByCreatedAtDesc(String status, Pageable pageable);

    Page<Report> findByReported_UserIdOrderByCreatedAtDesc(UUID reportedId, Pageable pageable);

    @Query("SELECT COUNT(r) FROM Report r WHERE r.status = 'OPEN'")
    long countOpenReports();

    @Query("SELECT COUNT(r) FROM Report r WHERE r.reported.userId = :userId")
    long countReportsAgainstUser(@Param("userId") UUID userId);
}