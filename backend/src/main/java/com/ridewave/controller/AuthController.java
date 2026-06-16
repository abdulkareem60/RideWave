package com.ridewave.controller;

import com.ridewave.dto.request.*;
import com.ridewave.dto.response.ApiResponse;
import com.ridewave.dto.response.AuthResponse;
import com.ridewave.dto.response.UserResponse;
import com.ridewave.security.UserPrincipal;
import com.ridewave.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * Auth Controller — all endpoints under /api/v1/auth are publicly accessible
 * (no JWT required) except /me which requires a valid access token.
 *
 * Keeps methods thin: validates input via @Valid, delegates entirely to
 * AuthService, returns the standardised ApiResponse envelope.
 */
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Tag(name = "Authentication", description = "Registration, login, OTP verification, password reset")
public class AuthController {

    private final AuthService authService;

    // ── POST /register ────────────────────────────────────────────────────

    @PostMapping("/register")
    @Operation(
            summary = "Register a new account",
            description = "Creates a DRIVER or PASSENGER account. An email OTP is dispatched " +
                    "immediately — the account cannot be used until email is verified."
    )
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "201",
                    description = "Account created; OTP sent to email"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400",
                    description = "Validation error or duplicate email/phone"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "409",
                    description = "Email or phone already registered")
    })
    public ResponseEntity<ApiResponse<UserResponse>> register(
            @Valid @RequestBody RegisterRequest request) {

        UserResponse user = authService.register(request);
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.success(user,
                        "Account created successfully. Please check your email for the verification OTP."));
    }

    // ── POST /verify-email ────────────────────────────────────────────────

    @PostMapping("/verify-email")
    @Operation(
            summary = "Verify email with OTP",
            description = "Validates the 6-digit OTP sent to the user's email. " +
                    "On success, PASSENGER accounts become ACTIVE; " +
                    "DRIVER accounts move to PENDING_VERIFICATION."
    )
    public ResponseEntity<ApiResponse<Void>> verifyEmail(
            @Valid @RequestBody VerifyOtpRequest request) {

        authService.verifyEmail(request);
        return ResponseEntity.ok(
                ApiResponse.ok("Email verified successfully. You may now log in."));
    }

    // ── POST /verify-phone ────────────────────────────────────────────────

    @PostMapping("/verify-phone")
    @Operation(
            summary = "Verify phone number with OTP",
            description = "Validates the 6-digit OTP sent to the user's phone via SMS."
    )
    public ResponseEntity<ApiResponse<Void>> verifyPhone(
            @Valid @RequestBody VerifyOtpRequest request) {

        authService.verifyPhone(request);
        return ResponseEntity.ok(
                ApiResponse.ok("Phone number verified successfully."));
    }

    // ── POST /login ───────────────────────────────────────────────────────

    @PostMapping("/login")
    @Operation(
            summary = "Login with email and password",
            description = "Returns a JWT access token (24h) and refresh token (7d). " +
                    "Embed the access token as 'Authorization: Bearer <token>' in subsequent requests."
    )
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200",
                    description = "Login successful — tokens returned"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400",
                    description = "Email not verified or invalid credentials"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401",
                    description = "Wrong password")
    })
    public ResponseEntity<ApiResponse<AuthResponse>> login(
            @Valid @RequestBody LoginRequest request) {

        AuthResponse authResponse = authService.login(request);
        return ResponseEntity.ok(
                ApiResponse.success(authResponse, "Login successful."));
    }

    // ── POST /refresh ─────────────────────────────────────────────────────

    @PostMapping("/refresh")
    @Operation(
            summary = "Refresh access token",
            description = "Exchanges a valid refresh token for a new access token " +
                    "without requiring the user to log in again."
    )
    public ResponseEntity<ApiResponse<AuthResponse>> refresh(
            @Valid @RequestBody RefreshTokenRequest request) {

        AuthResponse authResponse = authService.refreshToken(request);
        return ResponseEntity.ok(
                ApiResponse.success(authResponse, "Token refreshed successfully."));
    }

    // ── POST /forgot-password ─────────────────────────────────────────────

    @PostMapping("/forgot-password")
    @Operation(
            summary = "Request a password-reset OTP",
            description = "Sends a 6-digit OTP to the registered email. " +
                    "Returns 404 if no account exists for the given email " +
                    "(by product decision, this endpoint is not anti-enumeration)."
    )
    public ResponseEntity<ApiResponse<Void>> forgotPassword(
            @Valid @RequestBody ForgotPasswordRequest request) {

        authService.forgotPassword(request);
        return ResponseEntity.ok(
                ApiResponse.ok("Reset OTP sent. Please check your email."));
    }

    // ── POST /reset-password ──────────────────────────────────────────────

    @PostMapping("/reset-password")
    @Operation(
            summary = "Reset password using OTP",
            description = "Validates the OTP from /forgot-password and sets the new password."
    )
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200",
                    description = "Password updated successfully"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400",
                    description = "Invalid or expired OTP")
    })
    public ResponseEntity<ApiResponse<Void>> resetPassword(
            @Valid @RequestBody ResetPasswordRequest request) {

        authService.resetPassword(request);
        return ResponseEntity.ok(
                ApiResponse.ok("Password reset successfully. You may now log in with your new password."));
    }

    // ── GET /me ───────────────────────────────────────────────────────────

    @GetMapping("/me")
    @Operation(
            summary = "Get current user profile",
            description = "Returns the authenticated user's profile. Requires a valid access token.",
            security = @SecurityRequirement(name = "bearerAuth")
    )
    public ResponseEntity<?> getCurrentUser(
            @AuthenticationPrincipal UserPrincipal currentUser) {

        if (currentUser == null) {
            // JWT was invalid or the user no longer exists in DB.
            // Return 401 so the frontend clears its stale token and redirects to login.
            return ResponseEntity.status(401)
                    .body(ApiResponse.ok("Session expired. Please log in again."));
        }

        UserResponse user = authService.getCurrentUser(currentUser.getId());
        return ResponseEntity.ok(ApiResponse.success(user));
    }

    // ── POST /logout ──────────────────────────────────────────────────────

    @PostMapping("/logout")
    @Operation(
            summary = "Logout",
            description = "Stateless logout — instruct the client to discard its tokens. " +
                    "For true server-side invalidation, implement a token blacklist.",
            security = @SecurityRequirement(name = "bearerAuth")
    )
    public ResponseEntity<ApiResponse<Void>> logout() {
        // JWT is stateless — actual invalidation is client-side (clear localStorage).
        // A production hardening step: store the JTI in a Redis blacklist with TTL = expiry.
        return ResponseEntity.ok(ApiResponse.ok("Logged out successfully."));
    }
}