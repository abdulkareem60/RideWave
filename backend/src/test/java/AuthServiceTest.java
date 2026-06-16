package com.ridewave.service;

import com.ridewave.dto.request.LoginRequest;
import com.ridewave.dto.request.RegisterRequest;
import com.ridewave.dto.response.AuthResponse;
import com.ridewave.dto.response.UserResponse;
import com.ridewave.exception.BadRequestException;
import com.ridewave.exception.DuplicateResourceException;
import com.ridewave.model.User;
import com.ridewave.model.enums.UserRole;
import com.ridewave.model.enums.UserStatus;
import com.ridewave.repository.UserRepository;
import com.ridewave.security.CustomUserDetailsService;
import com.ridewave.security.JwtTokenProvider;
import com.ridewave.security.UserPrincipal;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("AuthService")
class AuthServiceTest {

    @Mock UserRepository            userRepository;
    @Mock PasswordEncoder           passwordEncoder;
    @Mock AuthenticationManager     authManager;
    @Mock JwtTokenProvider          jwtProvider;
    @Mock CustomUserDetailsService  userDetailsService;
    @Mock OtpService                otpService;

    @InjectMocks AuthService authService;

    private User sampleUser;

    @BeforeEach
    void setUp() {
        sampleUser = User.builder()
                .userId(UUID.randomUUID())
                .email("driver@ridewave.com")
                .phone("+923001234567")
                .passwordHash("$2a$12$hashed")
                .fullName("Ahmed Khan")
                .role(UserRole.DRIVER)
                .status(UserStatus.PENDING)
                .trustScore(BigDecimal.valueOf(3.00))
                .emailVerified(false)
                .phoneVerified(false)
                .build();
    }

    // ── register ─────────────────────────────────────────────────────────

    @Test
    @DisplayName("register: success returns UserResponse with correct fields")
    void register_success() {
        RegisterRequest req = new RegisterRequest();
        req.setFullName("Ahmed Khan");
        req.setEmail("driver@ridewave.com");
        req.setPhone("+923001234567");
        req.setPassword("Secure@123");
        req.setRole(UserRole.DRIVER);

        when(userRepository.existsByEmail(anyString())).thenReturn(false);
        when(userRepository.existsByPhone(anyString())).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("$2a$12$hashed");
        when(userRepository.save(any(User.class))).thenReturn(sampleUser);
        doNothing().when(otpService).issueEmailVerificationOtp(any(User.class));

        UserResponse response = authService.register(req);

        assertThat(response).isNotNull();
        assertThat(response.getEmail()).isEqualTo("driver@ridewave.com");
        assertThat(response.getRole()).isEqualTo(UserRole.DRIVER);
        assertThat(response.getStatus()).isEqualTo(UserStatus.PENDING);

        verify(otpService, times(1)).issueEmailVerificationOtp(any(User.class));
        verify(userRepository, times(1)).save(any(User.class));
    }

    @Test
    @DisplayName("register: throws DuplicateResourceException when email already exists")
    void register_duplicateEmail_throwsException() {
        RegisterRequest req = new RegisterRequest();
        req.setEmail("driver@ridewave.com");
        req.setPhone("+923001234567");
        req.setPassword("Secure@123");
        req.setRole(UserRole.PASSENGER);

        when(userRepository.existsByEmail(anyString())).thenReturn(true);

        assertThatThrownBy(() -> authService.register(req))
                .isInstanceOf(DuplicateResourceException.class)
                .hasMessageContaining("already exists");

        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("register: throws BadRequestException when role is ADMIN")
    void register_adminRole_throwsException() {
        RegisterRequest req = new RegisterRequest();
        req.setEmail("admin@ridewave.com");
        req.setPhone("+920000000001");
        req.setPassword("Secure@123");
        req.setRole(UserRole.ADMIN);

        when(userRepository.existsByEmail(anyString())).thenReturn(false);
        when(userRepository.existsByPhone(anyString())).thenReturn(false);

        assertThatThrownBy(() -> authService.register(req))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Admin accounts cannot be created");
    }

    // ── login ─────────────────────────────────────────────────────────────

    @Test
    @DisplayName("login: throws BadRequestException when email is not verified")
    void login_emailNotVerified_throwsException() {
        LoginRequest req = new LoginRequest();
        req.setEmail("driver@ridewave.com");
        req.setPassword("Secure@123");

        sampleUser.setEmailVerified(false);
        when(userRepository.findByEmail(anyString())).thenReturn(Optional.of(sampleUser));

        assertThatThrownBy(() -> authService.login(req))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("verify your email");
    }

    @Test
    @DisplayName("login: returns AuthResponse with tokens when credentials are valid")
    void login_validCredentials_returnsTokens() {
        LoginRequest req = new LoginRequest();
        req.setEmail("driver@ridewave.com");
        req.setPassword("Secure@123");

        sampleUser.setEmailVerified(true);
        sampleUser.setStatus(UserStatus.ACTIVE);

        UserPrincipal principal = UserPrincipal.create(sampleUser);
        UsernamePasswordAuthenticationToken authToken =
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());

        when(userRepository.findByEmail(anyString())).thenReturn(Optional.of(sampleUser));
        when(authManager.authenticate(any())).thenReturn(authToken);
        when(jwtProvider.generateAccessToken(any(
                org.springframework.security.core.Authentication.class)))
                .thenReturn("access.token.jwt");
        when(jwtProvider.generateRefreshToken(any(UUID.class))).thenReturn("refresh.token.jwt");

        AuthResponse response = authService.login(req);

        assertThat(response.getAccessToken()).isEqualTo("access.token.jwt");
        assertThat(response.getRefreshToken()).isEqualTo("refresh.token.jwt");
        assertThat(response.getTokenType()).isEqualTo("Bearer");
        assertThat(response.getRole()).isEqualTo(UserRole.DRIVER);
    }

    // ── forgotPassword ────────────────────────────────────────────────────

    @Test
    @DisplayName("forgotPassword: silently succeeds when email does not exist (anti-enumeration)")
    void forgotPassword_unknownEmail_noException() {
        var req = new com.ridewave.dto.request.ForgotPasswordRequest();
        req.setEmail("nobody@ridewave.com");

        when(userRepository.findByEmail(anyString())).thenReturn(Optional.empty());

        // Must not throw — prevents email enumeration
        assertThatCode(() -> authService.forgotPassword(req)).doesNotThrowAnyException();
        verify(otpService, never()).issuePasswordResetOtp(any());
    }
}