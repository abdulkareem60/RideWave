package com.ridewave.controller;

import com.ridewave.dto.request.ReportRequest;
import com.ridewave.dto.response.ApiResponse;
import com.ridewave.dto.response.ReportResponse;
import com.ridewave.security.UserPrincipal;
import com.ridewave.service.ReportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/reports")
@RequiredArgsConstructor
@Tag(name = "Reports", description = "Report unsafe or abusive users")
@SecurityRequirement(name = "bearerAuth")
public class ReportController {

    private final ReportService reportService;

    @PostMapping
    @Operation(
            summary = "File a report against a user",
            description = "Any authenticated user can report another user. " +
                    "Optionally attach a ride ID for context. " +
                    "Admin team reviews all OPEN reports."
    )
    public ResponseEntity<ApiResponse<ReportResponse>> fileReport(
            @Valid @RequestBody ReportRequest request,
            @AuthenticationPrincipal UserPrincipal currentUser) {

        ReportResponse report = reportService.fileReport(currentUser.getId(), request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(report,
                        "Report submitted. Our safety team will review it shortly."));
    }
}