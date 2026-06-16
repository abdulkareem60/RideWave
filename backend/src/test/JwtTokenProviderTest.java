package com.ridewave.security;

import com.ridewave.model.User;
import com.ridewave.model.enums.UserRole;
import com.ridewave.model.enums.UserStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;

@DisplayName("JwtTokenProvider")
class JwtTokenProviderTest {

    private JwtTokenProvider tokenProvider;

    private static final String SECRET =
            "TestSecretKeyForRideWaveJWTTokensMustBeAtLeast256BitsLongForHS512Algorithm";
    private static final long   EXPIRY_MS         = 3_600_000L;  // 1 hour
    private static final long   REFRESH_EXPIRY_MS = 86_400_000L; // 24 hours

    @BeforeEach
    void setUp() {
        tokenProvider = new JwtTokenProvider();
        ReflectionTestUtils.setField(tokenProvider, "jwtSecret",          SECRET);
        ReflectionTestUtils.setField(tokenProvider, "jwtExpirationMs",    EXPIRY_MS);
        ReflectionTestUtils.setField(tokenProvider, "refreshExpirationMs", REFRESH_EXPIRY_MS);
        tokenProvider.init();
    }

    // ── Helpers ───────────────────────────────────────────────────────────

    private UserPrincipal buildPrincipal(UserRole role) {
        User user = User.builder()
                .userId(UUID.randomUUID())
                .email("test@ridewave.com")
                .passwordHash("$2a$12$hash")
                .fullName("Test User")
                .role(role)
                .status(UserStatus.ACTIVE)
                .trustScore(BigDecimal.valueOf(4.0))
                .build();
        return UserPrincipal.create(user);
    }

    private Authentication buildAuth(UserRole role) {
        UserPrincipal principal = buildPrincipal(role);
        return new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());
    }

    // ── Access Token Tests ────────────────────────────────────────────────

    @Test
    @DisplayName("generateAccessToken returns non-null token string")
    void generateAccessToken_returnsToken() {
        String token = tokenProvider.generateAccessToken(buildAuth(UserRole.DRIVER));
        assertThat(token).isNotBlank();
    }

    @Test
    @DisplayName("Generated access token is a valid JWT (3 dot-separated parts)")
    void generateAccessToken_isValidJwtFormat() {
        String token = tokenProvider.generateAccessToken(buildAuth(UserRole.PASSENGER));
        assertThat(token.split("\\.")).hasSize(3);
    }

    @Test
    @DisplayName("getUserIdFromToken extracts the correct userId")
    void getUserIdFromToken_extractsCorrectId() {
        UserPrincipal principal = buildPrincipal(UserRole.PASSENGER);
        Authentication auth = new UsernamePasswordAuthenticationToken(
                principal, null, principal.getAuthorities());

        String token  = tokenProvider.generateAccessToken(auth);
        UUID   userId = tokenProvider.getUserIdFromToken(token);

        assertThat(userId).isEqualTo(principal.getId());
    }

    @Test
    @DisplayName("getRoleFromToken extracts the correct role claim")
    void getRoleFromToken_extractsCorrectRole() {
        String token = tokenProvider.generateAccessToken(buildAuth(UserRole.ADMIN));
        assertThat(tokenProvider.getRoleFromToken(token)).isEqualTo("ADMIN");
    }

    // ── Validation Tests ──────────────────────────────────────────────────

    @Test
    @DisplayName("validateToken returns true for a freshly generated token")
    void validateToken_validToken_returnsTrue() {
        String token = tokenProvider.generateAccessToken(buildAuth(UserRole.PASSENGER));
        assertThat(tokenProvider.validateToken(token)).isTrue();
    }

    @Test
    @DisplayName("validateToken returns false for a tampered token")
    void validateToken_tamperedToken_returnsFalse() {
        String token    = tokenProvider.generateAccessToken(buildAuth(UserRole.DRIVER));
        String tampered = token.substring(0, token.length() - 5) + "XXXXX";
        assertThat(tokenProvider.validateToken(tampered)).isFalse();
    }

    @Test
    @DisplayName("validateToken returns false for an empty string")
    void validateToken_emptyString_returnsFalse() {
        assertThat(tokenProvider.validateToken("")).isFalse();
    }

    @Test
    @DisplayName("validateToken returns false for a random string")
    void validateToken_randomString_returnsFalse() {
        assertThat(tokenProvider.validateToken("not.a.jwt")).isFalse();
    }

    @Test
    @DisplayName("validateToken returns false for an expired token")
    void validateToken_expiredToken_returnsFalse() throws Exception {
        // Use a provider configured with 1 ms expiry
        JwtTokenProvider shortLivedProvider = new JwtTokenProvider();
        ReflectionTestUtils.setField(shortLivedProvider, "jwtSecret",          SECRET);
        ReflectionTestUtils.setField(shortLivedProvider, "jwtExpirationMs",    1L);
        ReflectionTestUtils.setField(shortLivedProvider, "refreshExpirationMs", 1L);
        shortLivedProvider.init();

        String token = shortLivedProvider.generateAccessToken(buildAuth(UserRole.PASSENGER));
        Thread.sleep(10);  // Ensure expiry

        assertThat(shortLivedProvider.validateToken(token)).isFalse();
    }

    // ── Refresh Token Tests ───────────────────────────────────────────────

    @Test
    @DisplayName("generateRefreshToken returns a valid token")
    void generateRefreshToken_returnsValidToken() {
        UUID   userId = UUID.randomUUID();
        String token  = tokenProvider.generateRefreshToken(userId);
        assertThat(tokenProvider.validateToken(token)).isTrue();
    }

    @Test
    @DisplayName("Refresh token contains the correct userId")
    void generateRefreshToken_containsCorrectUserId() {
        UUID   userId = UUID.randomUUID();
        String token  = tokenProvider.generateRefreshToken(userId);
        assertThat(tokenProvider.getUserIdFromToken(token)).isEqualTo(userId);
    }
}