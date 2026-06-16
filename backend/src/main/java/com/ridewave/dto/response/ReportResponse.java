package com.ridewave.dto.response;

import com.ridewave.model.Report;
import com.ridewave.model.enums.ReportReason;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Builder
public class ReportResponse {

    private UUID          reportId;
    private UUID          reporterId;
    private String        reporterName;
    private UUID          reportedId;
    private String        reportedName;
    private UUID          rideId;
    private ReportReason  reason;
    private String        description;
    private String        status;
    private String        resolutionNotes;
    private LocalDateTime createdAt;
    private LocalDateTime resolvedAt;

    public static ReportResponse from(Report r) {
        return ReportResponse.builder()
                .reportId(r.getReportId())
                .reporterId(r.getReporter().getUserId())
                .reporterName(r.getReporter().getFullName())
                .reportedId(r.getReported().getUserId())
                .reportedName(r.getReported().getFullName())
                .rideId(r.getRideId())
                .reason(r.getReason())
                .description(r.getDescription())
                .status(r.getStatus())
                .resolutionNotes(r.getResolutionNotes())
                .createdAt(r.getCreatedAt())
                .resolvedAt(r.getResolvedAt())
                .build();
    }
}