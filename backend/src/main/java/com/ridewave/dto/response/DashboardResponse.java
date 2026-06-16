package com.ridewave.dto.response;

import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * Top-level response for GET /api/v1/admin/dashboard.
 *
 * Each nested record maps to a Composite DashboardPanel or StatCard leaf.
 * The React frontend receives this single object and renders all dashboard
 * panels from it — no N+1 API calls needed.
 */
@Getter
@Builder
public class DashboardResponse {

    private PlatformStats   platform;
    private UserStats       users;
    private RideStats       rides;
    private FinanceStats    finance;
    private SafetyStats     safety;

    // ── Nested stat panels ─────────────────────────────────────────────────

    @Getter @Builder
    public static class PlatformStats {
        private long totalUsers;
        private long totalRides;
        private long totalBookings;
        private long totalPayments;
        private BigDecimal averageTrustScore;
    }

    @Getter @Builder
    public static class UserStats {
        private long totalPassengers;
        private long totalDrivers;
        private long activeUsers;
        private long pendingVerification;
        private long suspendedUsers;
        private long blockedUsers;
    }

    @Getter @Builder
    public static class RideStats {
        private long scheduledRides;
        private long inProgressRides;
        private long completedRides;
        private long cancelledRides;
        private long activeRides;
    }

    @Getter @Builder
    public static class FinanceStats {
        private BigDecimal revenueToday;
        private BigDecimal revenueThisMonth;
        private BigDecimal revenueAllTime;
        private long       completedPayments;
        private long       pendingPayments;
        private long       refundedPayments;
    }

    @Getter @Builder
    public static class SafetyStats {
        private long openReports;
        private long pendingDocVerifications;
        private long resolvedReports;
    }
}