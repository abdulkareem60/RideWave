package com.ridewave.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

import jakarta.annotation.PostConstruct;
import java.security.Key;
import java.util.Date;
import java.util.UUID;

/**
 * JWT Token Provider — Singleton pattern.
 *
 * Spring's @Component is singleton-scoped by default: exactly one instance
 * exists for the lifetime of the application context, ensuring the signing
 * key and expiry configuration are consistent across every request.
 *
 * Responsibilities:
 *   1. Generate access tokens after successful authentication.
 *   2. Generate refresh tokens (longer-lived, used to obtain new access tokens).
 *   3. Validate incoming tokens (signature, expiry, format).
 *   4. Extract the userId claim from a valid token.
 */
@Component
@Slf4j
public class JwtTokenProvider {

    @Value("${jwt.secret}")
    private String jwtSecret;

    @Value("${jwt.expiration-ms}")
    private long jwtExpirationMs;

    @Value("${jwt.refresh-expiration-ms}")
    private long refreshExpirationMs;

    /** Derived once at startup — not re-derived on every call. */
    private Key signingKey;

    @PostConstruct
    public void init() {
        this.signingKey = Keys.hmacShaKeyFor(jwtSecret.getBytes());
        log.info("JwtTokenProvider initialised — access expiry: {}ms, refresh expiry: {}ms",
                jwtExpirationMs, refreshExpirationMs);
    }

    // ── Token generation ──────────────────────────────────────────────────

    /**
     * Create a short-lived access token embedded with the user's ID and role.
     */
    public String generateAccessToken(Authentication authentication) {
        UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();
        return buildToken(principal.getId(), principal.getRole().name(), jwtExpirationMs);
    }

    /**
     * Overload — generate directly from a UserPrincipal (used after refresh).
     */
    public String generateAccessToken(UserPrincipal principal) {
        return buildToken(principal.getId(), principal.getRole().name(), jwtExpirationMs);
    }

    /**
     * Create a long-lived refresh token — contains only the userId (no role).
     * Stored client-side; exchanged at /auth/refresh for a new access token.
     */
    public String generateRefreshToken(UUID userId) {
        return buildToken(userId, null, refreshExpirationMs);
    }

    private String buildToken(UUID userId, String role, long expiryMs) {
        Date now    = new Date();
        Date expiry = new Date(now.getTime() + expiryMs);

        JwtBuilder builder = Jwts.builder()
                .setSubject(userId.toString())
                .setIssuedAt(now)
                .setExpiration(expiry)
                .signWith(signingKey, SignatureAlgorithm.HS512);

        if (role != null) {
            builder.claim("role", role);
        }

        return builder.compact();
    }

    // ── Token parsing ─────────────────────────────────────────────────────

    public UUID getUserIdFromToken(String token) {
        String subject = parseClaims(token).getSubject();
        return UUID.fromString(subject);
    }

    public String getRoleFromToken(String token) {
        return (String) parseClaims(token).get("role");
    }

    // ── Validation ────────────────────────────────────────────────────────

    /**
     * Returns true if the token is structurally valid, correctly signed,
     * and has not yet expired.
     *
     * Logs the specific failure reason at WARN level — useful for debugging
     * without leaking details to the caller.
     */
    public boolean validateToken(String token) {
        try {
            parseClaims(token);
            return true;
        } catch (SecurityException | MalformedJwtException e) {
            log.warn("Invalid JWT signature: {}", e.getMessage());
        } catch (ExpiredJwtException e) {
            log.warn("Expired JWT token for user: {}", e.getClaims().getSubject());
        } catch (UnsupportedJwtException e) {
            log.warn("Unsupported JWT token: {}", e.getMessage());
        } catch (IllegalArgumentException e) {
            log.warn("JWT claims string is empty: {}", e.getMessage());
        }
        return false;
    }

    // ── Private helpers ───────────────────────────────────────────────────

    private Claims parseClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(signingKey)
                .build()
                .parseClaimsJws(token)
                .getBody();
    }
}