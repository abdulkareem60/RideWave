package com.ridewave.service;

import com.ridewave.exception.BadRequestException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/**
 * Validates that a passenger's requested pickup and drop points are valid
 * positions along the driver's stored route.
 *
 * <h3>Algorithm</h3>
 * <ol>
 *   <li>Decode the Google Maps encoded polyline into a list of (lat, lng) pairs.</li>
 *   <li>For each candidate point (pickup, then drop), find the closest point
 *       on the polyline — measured as the shortest great-circle distance from
 *       the candidate to any segment of the polyline.</li>
 *   <li>Validate that the closest-point distance is ≤ {@code MAX_DEVIATION_METRES}
 *       (default 300 m).</li>
 *   <li>Track the polyline index of the closest segment for both pickup and
 *       drop. Validate that the pickup index ≤ drop index (direction check —
 *       passenger cannot board after they've passed their drop point).</li>
 * </ol>
 *
 * <h3>Fallback</h3>
 * When the ride has no stored polyline (older rides or rides created without
 * the Directions API call), validation falls back to a simple bounding-box
 * check: both pickup and drop must lie within the convex hull of origin and
 * destination, extended by {@code MAX_DEVIATION_METRES}.
 *
 * <h3>No external API calls at booking time</h3>
 * All computation uses the polyline already stored on the Ride entity —
 * no live Google Maps calls happen here. The client fetches the polyline
 * once at ride-creation time; the backend just stores and decodes it.
 */
@Service
@Slf4j
public class RouteValidationService {

    /** Maximum allowed distance from the route line (metres). */
    private static final double MAX_DEVIATION_METRES = 300.0;

    /** Earth radius for Haversine calculations (metres). */
    private static final double EARTH_RADIUS_M = 6_371_000.0;

    // ──────────────────────────────────────────────────────────────────────
    // Public entry point
    // ──────────────────────────────────────────────────────────────────────

    /**
     * Validates the passenger's requested pickup and drop against the
     * driver's route. Throws {@link BadRequestException} with a specific,
     * human-readable message for each failure condition.
     *
     * @param routePolyline  Google encoded polyline stored on the Ride entity
     *                       (may be null for legacy rides)
     * @param originLat/Lng  driver's origin (fallback when polyline is null)
     * @param destLat/Lng    driver's destination (fallback when polyline is null)
     * @param pickupLat/Lng  passenger's requested pickup
     * @param dropLat/Lng    passenger's requested drop
     */
    public void validate(
            String routePolyline,
            BigDecimal originLat,  BigDecimal originLng,
            BigDecimal destLat,    BigDecimal destLng,
            BigDecimal pickupLat,  BigDecimal pickupLng,
            BigDecimal dropLat,    BigDecimal dropLng) {

        double pLat = pickupLat.doubleValue();
        double pLng = pickupLng.doubleValue();
        double dLat = dropLat.doubleValue();
        double dLng = dropLng.doubleValue();

        if (routePolyline != null && !routePolyline.isBlank()) {
            validateWithPolyline(routePolyline, pLat, pLng, dLat, dLng);
        } else {
            validateFallback(
                    originLat.doubleValue(), originLng.doubleValue(),
                    destLat.doubleValue(),   destLng.doubleValue(),
                    pLat, pLng, dLat, dLng);
        }
    }

    // ──────────────────────────────────────────────────────────────────────
    // Polyline-based validation
    // ──────────────────────────────────────────────────────────────────────

    private void validateWithPolyline(
            String polyline,
            double pickupLat, double pickupLng,
            double dropLat,   double dropLng) {

        List<double[]> points = decodePolyline(polyline);
        if (points.size() < 2) {
            log.warn("Stored polyline decoded to < 2 points — falling back to no-route check");
            return; // permissive: don't block booking if polyline is degenerate
        }

        ClosestPoint pickup = nearestOnPolyline(points, pickupLat, pickupLng);
        ClosestPoint drop   = nearestOnPolyline(points, dropLat,   dropLng);

        if (pickup.distanceM > MAX_DEVIATION_METRES) {
            throw new BadRequestException(
                    String.format("Your pickup location is %.0f m from the driver's route " +
                                    "(maximum allowed: %.0f m). Please choose a point closer to the route.",
                            pickup.distanceM, MAX_DEVIATION_METRES));
        }

        if (drop.distanceM > MAX_DEVIATION_METRES) {
            throw new BadRequestException(
                    String.format("Your drop location is %.0f m from the driver's route " +
                                    "(maximum allowed: %.0f m). Please choose a point closer to the route.",
                            drop.distanceM, MAX_DEVIATION_METRES));
        }

        if (pickup.segmentIndex > drop.segmentIndex) {
            throw new BadRequestException(
                    "Your drop location comes before your pickup along the driver's route. " +
                            "Please check that your pickup is earlier in the direction of travel.");
        }

        // pickup == drop index: only a problem if pickup ≈ drop (same stop)
        if (pickup.segmentIndex == drop.segmentIndex &&
                haversineM(pickupLat, pickupLng, dropLat, dropLng) < 50) {
            throw new BadRequestException(
                    "Your pickup and drop locations are the same point. " +
                            "Please enter different locations.");
        }

        log.debug("Route validation passed: pickup seg={}, drop seg={}, " +
                        "pickup_dist={:.1f}m, drop_dist={:.1f}m",
                pickup.segmentIndex, drop.segmentIndex,
                pickup.distanceM, drop.distanceM);
    }

    // ──────────────────────────────────────────────────────────────────────
    // Fallback: straight-line proximity check (no polyline)
    // ──────────────────────────────────────────────────────────────────────

    private void validateFallback(
            double originLat, double originLng,
            double destLat,   double destLng,
            double pickupLat, double pickupLng,
            double dropLat,   double dropLng) {

        // Check pickup lies near the straight line from origin to destination
        double pickupDist = distanceToSegmentM(
                originLat, originLng, destLat, destLng,
                pickupLat, pickupLng);

        if (pickupDist > MAX_DEVIATION_METRES) {
            throw new BadRequestException(
                    String.format("Your pickup location is %.0f m from the driver's route " +
                            "(maximum allowed: %.0f m).", pickupDist, MAX_DEVIATION_METRES));
        }

        double dropDist = distanceToSegmentM(
                originLat, originLng, destLat, destLng,
                dropLat, dropLng);

        if (dropDist > MAX_DEVIATION_METRES) {
            throw new BadRequestException(
                    String.format("Your drop location is %.0f m from the driver's route " +
                            "(maximum allowed: %.0f m).", dropDist, MAX_DEVIATION_METRES));
        }

        // Direction check using dot product along the origin→dest vector
        double pickupProgress = progressAlong(
                originLat, originLng, destLat, destLng,
                pickupLat, pickupLng);
        double dropProgress = progressAlong(
                originLat, originLng, destLat, destLng,
                dropLat, dropLng);

        if (pickupProgress > dropProgress + 0.01) {
            throw new BadRequestException(
                    "Your drop location comes before your pickup along the driver's route. " +
                            "Please check that your pickup is earlier in the direction of travel.");
        }

        if (haversineM(pickupLat, pickupLng, dropLat, dropLng) < 50) {
            throw new BadRequestException(
                    "Your pickup and drop locations are the same point.");
        }
    }

    // ──────────────────────────────────────────────────────────────────────
    // Google Maps encoded polyline decoder
    // ──────────────────────────────────────────────────────────────────────

    /**
     * Decodes a Google Maps encoded polyline string into a list of
     * [latitude, longitude] pairs.
     *
     * Spec: https://developers.google.com/maps/documentation/utilities/polylinealgorithm
     */
    static List<double[]> decodePolyline(String encoded) {
        List<double[]> result = new ArrayList<>();
        int index = 0, len = encoded.length();
        int lat = 0, lng = 0;

        while (index < len) {
            int b, shift = 0, value = 0;
            do {
                b = encoded.charAt(index++) - 63;
                value |= (b & 0x1f) << shift;
                shift += 5;
            } while (b >= 0x20 && index < len);
            lat += (value & 1) != 0 ? ~(value >> 1) : (value >> 1);

            shift = 0; value = 0;
            do {
                b = encoded.charAt(index++) - 63;
                value |= (b & 0x1f) << shift;
                shift += 5;
            } while (b >= 0x20 && index < len);
            lng += (value & 1) != 0 ? ~(value >> 1) : (value >> 1);

            result.add(new double[]{lat / 1e5, lng / 1e5});
        }
        return result;
    }

    // ──────────────────────────────────────────────────────────────────────
    // Nearest-point-on-polyline: finds the segment closest to a candidate
    // ──────────────────────────────────────────────────────────────────────

    private record ClosestPoint(int segmentIndex, double distanceM) {}

    private ClosestPoint nearestOnPolyline(List<double[]> points, double lat, double lng) {
        int bestSeg = 0;
        double bestDist = Double.MAX_VALUE;

        for (int i = 0; i < points.size() - 1; i++) {
            double dist = distanceToSegmentM(
                    points.get(i)[0],   points.get(i)[1],
                    points.get(i+1)[0], points.get(i+1)[1],
                    lat, lng);
            if (dist < bestDist) {
                bestDist = dist;
                bestSeg  = i;
            }
        }
        return new ClosestPoint(bestSeg, bestDist);
    }

    // ──────────────────────────────────────────────────────────────────────
    // Geometry helpers
    // ──────────────────────────────────────────────────────────────────────

    /**
     * Great-circle distance from point P to the segment (A, B), in metres.
     * Projects P onto the line through A and B; clamps to [0, 1] so the
     * result is the nearest point *on the segment*, not the infinite line.
     */
    private double distanceToSegmentM(
            double aLat, double aLng,
            double bLat, double bLng,
            double pLat, double pLng) {

        // Use flat-earth approximation for short distances (< ~50 km) —
        // accurate enough for ride-segment validation.
        double cosLat = Math.cos(Math.toRadians((aLat + bLat) / 2.0));
        double ax = aLng * cosLat, ay = aLat;
        double bx = bLng * cosLat, by = bLat;
        double px = pLng * cosLat, py = pLat;

        double dx = bx - ax, dy = by - ay;
        double lenSq = dx * dx + dy * dy;

        double t = 0;
        if (lenSq > 1e-12) {
            t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
            t = Math.max(0, Math.min(1, t));
        }
        double closestLat = aLat + t * (bLat - aLat);
        double closestLng = aLng + t * (bLng - aLng);

        return haversineM(pLat, pLng, closestLat, closestLng);
    }

    /**
     * Scalar progress of point P along segment (A→B), in [0, 1].
     * Used for direction validation in the fallback path.
     */
    private double progressAlong(
            double aLat, double aLng,
            double bLat, double bLng,
            double pLat, double pLng) {

        double cosLat = Math.cos(Math.toRadians((aLat + bLat) / 2.0));
        double ax = aLng * cosLat, ay = aLat;
        double bx = bLng * cosLat, by = bLat;
        double px = pLng * cosLat, py = pLat;
        double dx = bx - ax, dy = by - ay;
        double lenSq = dx * dx + dy * dy;
        if (lenSq < 1e-12) return 0;
        return ((px - ax) * dx + (py - ay) * dy) / lenSq;
    }

    /** Haversine distance between two points, in metres. */
    static double haversineM(double lat1, double lng1, double lat2, double lng2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        return EARTH_RADIUS_M * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
}