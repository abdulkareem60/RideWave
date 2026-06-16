package com.ridewave.service;

import com.ridewave.dto.request.*;
import com.ridewave.dto.response.AuthResponse;
import com.ridewave.dto.response.UserResponse;
import com.ridewave.exception.BadRequestException;
import com.ridewave.exception.DuplicateResourceException;
import com.ridewave.exception.ResourceNotFoundException;
import com.ridewave.model.User;
import com.ridewave.model.enums.UserRole;
import com.ridewave.model.enums.UserStatus;
import com.ridewave.repository.UserRepository;
import com.ridewave.security.CustomUserDetailsService;
import com.ridewave.security.JwtTokenProvider;
import com.ridewave.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Auth Service — owns the full authentication lifecycle:
 *
 *   register   → creates account in PENDING status, issues email OTP
 *   verifyEmail → validates OTP, transitions to ACTIVE (or PENDING_VERIFICATION for drivers)
 *   verifyPhone → validates SMS OTP, marks phone as verified
 *   login      → authenticates credentials, issues JWT access + refresh tokens
 *   refresh    → validates refresh token, issues new access token
 *   forgot     → issues password-reset OTP via email
 *   reset      → validates OTP + sets new BCrypt password
 *   me         → returns the current user's profile
 *
 * Design patterns in play:
 *   - Null Object: GuestUser returned when Spring Security principal is not a User (test aid)
 *   - Builder: User entity built via Lombok @Builder
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    /**
     * Current revision identifiers for the legal documents users consent to
     * at registration. Bump these when /terms or /privacy content changes
     * in a way that requires re-consent; existing users' stored
     * termsVersion/privacyVersion will then reflect an older revision,
     * which a future compliance check can detect.
     */
    private static final String CURRENT_TERMS_VERSION   = "2026-06-16";
    private static final String CURRENT_PRIVACY_VERSION = "2026-06-16";

    private final UserRepository        userRepository;
    private final PasswordEncoder       passwordEncoder;
    private final AuthenticationManager authManager;
    private final JwtTokenProvider      jwtProvider;
    private final CustomUserDetailsService userDetailsService;
    private final OtpService            otpService;

    // ── Registration ──────────────────────────────────────────────────────

    /**
     * Registers a new user.
     *
     * Rules:
     *   - Email and phone must be globally unique.
     *   - Role must be DRIVER or PASSENGER; ADMIN accounts are seeded only.
     *   - Account starts in PENDING status — email must be verified before login is allowed.
     *   - After registration, an email OTP is dispatched asynchronously.
     */
    @Transactional
    public UserResponse register(RegisterRequest request) {
        // Prevent duplicate accounts
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new DuplicateResourceException(
                    "An account with email " + request.getEmail() + " already exists.");
        }
        if (userRepository.existsByPhone(request.getPhone())) {
            throw new DuplicateResourceException(
                    "An account with phone " + request.getPhone() + " already exists.");
        }
        // Block direct ADMIN registration through the API
        if (request.getRole() == UserRole.ADMIN) {
            throw new BadRequestException("Admin accounts cannot be created through registration.");
        }

        User user = User.builder()
                .email(request.getEmail().toLowerCase().trim())
                .phone(request.getPhone().trim())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .fullName(request.getFullName().trim())
                .role(request.getRole())
                .status(UserStatus.PENDING)
                .termsAcceptedAt(java.time.LocalDateTime.now())
                .termsVersion(CURRENT_TERMS_VERSION)
                .privacyAcceptedAt(java.time.LocalDateTime.now())
                .privacyVersion(CURRENT_PRIVACY_VERSION)
                .build();

        user = userRepository.save(user);

        // Issue email verification OTP — fire and forget (async)
        otpService.issueEmailVerificationOtp(user);

        log.info("New user registered: userId={}, role={}, email={}",
                user.getUserId(), user.getRole(), user.getEmail());

        return UserResponse.from(user);
    }

    // ── OTP Verification ─────────────────────────────────────────────────

    /**
     * Verifies the email OTP sent after registration.
     *
     * After success:
     *   - PASSENGER → status set to ACTIVE (can log in and book rides)
     *   - DRIVER    → status set to PENDING_VERIFICATION (must upload docs for admin review)
     */
    @Transactional
    public void verifyEmail(VerifyOtpRequest request) {
        if (request.getEmail() == null || request.getEmail().isBlank()) {
            throw new BadRequestException("Email is required for email OTP verification.");
        }

        User user = userRepository.findByEmail(request.getEmail().toLowerCase())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No account found with email: " + request.getEmail()));

        if (user.getEmailVerified()) {
            throw new BadRequestException("Email is already verified.");
        }

        // Validates and consumes the OTP (throws on failure)
        otpService.validateEmailOtp(user, request.getOtp());

        // Mark email verified
        userRepository.markEmailVerified(user.getUserId());

        // Transition status
        UserStatus nextStatus = user.getRole() == UserRole.DRIVER
                ? UserStatus.PENDING_VERIFICATION   // driver must upload documents
                : UserStatus.ACTIVE;                // passenger is ready immediately

        userRepository.updateStatus(user.getUserId(), nextStatus);

        log.info("Email verified for userId={} → status={}", user.getUserId(), nextStatus);
    }

    /**
     * Verifies a phone OTP.
     * The OTP must have been previously requested via /auth/resend-phone-otp.
     */
    @Transactional
    public void verifyPhone(VerifyOtpRequest request) {
        if (request.getPhone() == null || request.getPhone().isBlank()) {
            throw new BadRequestException("Phone number is required for phone OTP verification.");
        }

        User user = userRepository.findByPhone(request.getPhone())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No account found with phone: " + request.getPhone()));

        if (user.getPhoneVerified()) {
            throw new BadRequestException("Phone is already verified.");
        }

        otpService.validateEmailOtp(user, request.getOtp()); // reuses same token structure
        userRepository.markPhoneVerified(user.getUserId());

        log.info("Phone verified for userId={}", user.getUserId());
    }

    // ── Login ─────────────────────────────────────────────────────────────

    /**
     * Authenticates credentials and returns a JWT access + refresh token pair.
     *
     * Pre-conditions checked by Spring Security's DaoAuthenticationProvider:
     *   - Email exists in DB.
     *   - Password matches BCrypt hash.
     *   - Account is not locked (isAccountNonLocked → status == ACTIVE).
     *
     * Extra guard here: email must be verified before the first login is allowed.
     */
    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        // Load user to check email verification before attempting authentication
        User user = userRepository.findByEmail(request.getEmail().toLowerCase())
                .orElseThrow(() -> new BadRequestException("Invalid email or password."));

        if (!user.getEmailVerified()) {
            throw new BadRequestException(
                    "Please verify your email before logging in. Check your inbox for the OTP.");
        }

        // Delegate credential check to Spring Security
        Authentication authentication = authManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getEmail().toLowerCase(),
                        request.getPassword()
                )
        );

        UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();

        String accessToken  = jwtProvider.generateAccessToken(authentication);
        String refreshToken = jwtProvider.generateRefreshToken(principal.getId());

        log.info("User logged in: userId={}, role={}", principal.getId(), principal.getRole());

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .userId(user.getUserId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .role(user.getRole())
                .status(user.getStatus())
                .trustScore(user.getTrustScore())
                .emailVerified(user.getEmailVerified())
                .phoneVerified(user.getPhoneVerified())
                .build();
    }

    // ── Token Refresh ─────────────────────────────────────────────────────

    /**
     * Exchanges a valid refresh token for a new access token.
     * The refresh token itself is not rotated here — implement rotation
     * (store refresh tokens in DB) for higher security production deployments.
     */
    @Transactional(readOnly = true)
    public AuthResponse refreshToken(RefreshTokenRequest request) {
        String refreshToken = request.getRefreshToken();

        if (!jwtProvider.validateToken(refreshToken)) {
            throw new BadRequestException("Refresh token is invalid or has expired. Please log in again.");
        }

        UUID userId = jwtProvider.getUserIdFromToken(refreshToken);
        UserPrincipal principal = (UserPrincipal) userDetailsService.loadUserById(userId);

        String newAccessToken = jwtProvider.generateAccessToken(principal);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        log.debug("Access token refreshed for userId={}", userId);

        return AuthResponse.builder()
                .accessToken(newAccessToken)
                .refreshToken(refreshToken)   // Same refresh token returned
                .tokenType("Bearer")
                .userId(user.getUserId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .role(user.getRole())
                .status(user.getStatus())
                .trustScore(user.getTrustScore())
                .emailVerified(user.getEmailVerified())
                .phoneVerified(user.getPhoneVerified())
                .build();
    }

    // ── Password Reset ────────────────────────────────────────────────────

    /**
     * Step 1: Issues a password-reset OTP to the registered email.
     * Always returns success to prevent email enumeration attacks.
     */
    @Transactional
    /**
     * Step 1: issues a password-reset OTP.
     *
     * By product decision this endpoint is NOT anti-enumeration: an unknown
     * email returns a 404 with a clear "No account found" message rather
     * than a generic 200. This trades email-enumeration resistance for a
     * clearer UX (the user immediately knows to check their email spelling
     * or that they registered with a different address, instead of being
     * silently redirected to a reset-OTP page that will only ever fail).
     *
     * No OTP is created and no OTP row is inserted unless a matching user
     * is found — userRepository.findByEmail() throwing before
     * otpService.issuePasswordResetOtp() is ever called guarantees this.
     */
    public void forgotPassword(ForgotPasswordRequest request) {
        User user = userRepository.findByEmail(request.getEmail().toLowerCase())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No account found with this email address."));

        otpService.issuePasswordResetOtp(user);
        log.info("Password reset OTP sent for userId={}", user.getUserId());
    }

    /**
     * Step 2: Validates the OTP and sets the new password.
     */
    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        User user = userRepository.findByEmail(request.getEmail().toLowerCase())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No account found with this email address."));

        otpService.validatePasswordResetOtp(user, request.getOtp());

        String newHash = passwordEncoder.encode(request.getNewPassword());
        userRepository.updatePasswordHash(user.getUserId(), newHash);

        log.info("Password reset completed for userId={}", user.getUserId());
    }

    // ── Current User Profile ──────────────────────────────────────────────

    @Transactional(readOnly = true)
    public UserResponse getCurrentUser(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return UserResponse.from(user);
    }
}