package com.ridewave.service;

import com.ridewave.dto.request.ReportRequest;
import com.ridewave.dto.request.ResolveReportRequest;
import com.ridewave.dto.response.ReportResponse;
import com.ridewave.exception.*;
import com.ridewave.model.Report;
import com.ridewave.model.User;
import com.ridewave.model.enums.UserStatus;
import com.ridewave.repository.ReportRepository;
import com.ridewave.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReportService {

    private final ReportRepository reportRepository;
    private final UserRepository   userRepository;

    // ── File a report ─────────────────────────────────────────────────────

    @Transactional
    public ReportResponse fileReport(UUID reporterId, ReportRequest request) {
        if (reporterId.equals(request.getReportedUserId())) {
            throw new BadRequestException("You cannot report yourself.");
        }

        User reporter = userRepository.findById(reporterId)
                .orElseThrow(() -> new ResourceNotFoundException("Reporter not found"));

        User reported = userRepository.findById(request.getReportedUserId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "User to report not found: " + request.getReportedUserId()));

        Report report = Report.builder()
                .reporter(reporter)
                .reported(reported)
                .rideId(request.getRideId())
                .reason(request.getReason())
                .description(request.getDescription())
                .status("OPEN")
                .build();

        report = reportRepository.save(report);

        log.info("Report filed: reportId={}, reporterId={}, reportedId={}, reason={}",
                report.getReportId(), reporterId, reported.getUserId(), request.getReason());

        return ReportResponse.from(report);
    }

    // ── Admin: list and resolve reports ───────────────────────────────────

    @Transactional(readOnly = true)
    public Page<ReportResponse> getReports(String status, Pageable pageable) {
        if (status != null && !status.isBlank()) {
            return reportRepository
                    .findByStatusOrderByCreatedAtDesc(status.toUpperCase(), pageable)
                    .map(ReportResponse::from);
        }
        return reportRepository.findAll(pageable).map(ReportResponse::from);
    }

    @Transactional(readOnly = true)
    public Page<ReportResponse> getReportsAgainstUser(UUID userId, Pageable pageable) {
        return reportRepository
                .findByReported_UserIdOrderByCreatedAtDesc(userId, pageable)
                .map(ReportResponse::from);
    }

    /**
     * Admin resolves a report and optionally applies a user action.
     *
     * Actions:
     *   WARN      → log warning, no status change
     *   SUSPEND   → set user status to SUSPENDED
     *   BLOCK     → set user status to BLOCKED
     *   DISMISSED → close without action
     */
    @Transactional
    public ReportResponse resolveReport(UUID adminId, UUID reportId,
                                        ResolveReportRequest request) {
        Report report = reportRepository.findById(reportId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Report not found: " + reportId));

        if ("RESOLVED".equals(report.getStatus())) {
            throw new InvalidRideStateException("Report is already resolved.");
        }

        // Apply action to the reported user
        applyAction(report.getReported().getUserId(), request.getAction());

        report.setStatus("RESOLVED");
        report.setResolvedBy(adminId);
        report.setResolutionNotes(request.getNotes());
        report.setResolvedAt(LocalDateTime.now());
        report = reportRepository.save(report);

        log.info("Report resolved: reportId={}, adminId={}, action={}, reportedUserId={}",
                reportId, adminId, request.getAction(),
                report.getReported().getUserId());

        return ReportResponse.from(report);
    }

    // ── Private ───────────────────────────────────────────────────────────

    private void applyAction(UUID userId, String action) {
        switch (action.toUpperCase()) {
            case "SUSPEND" -> {
                userRepository.updateStatus(userId, UserStatus.SUSPENDED);
                log.warn("User SUSPENDED via report action: userId={}", userId);
            }
            case "BLOCK" -> {
                userRepository.updateStatus(userId, UserStatus.BLOCKED);
                log.warn("User BLOCKED via report action: userId={}", userId);
            }
            case "WARN", "DISMISSED" -> {
                // No status change — logged for audit purposes
                log.info("Report action={} for userId={} — no status change", action, userId);
            }
            default -> throw new BadRequestException(
                    "Unknown action: " + action +
                            ". Valid: WARN, SUSPEND, BLOCK, DISMISSED");
        }
    }
}