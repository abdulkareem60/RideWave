package com.ridewave.config;

import com.ridewave.security.JwtAuthenticationEntryPoint;
import com.ridewave.security.JwtAuthenticationFilter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

/**
 * Central security configuration.
 *
 * Design decisions:
 *   - STATELESS session — JWT replaces HttpSession entirely.
 *   - CSRF disabled — safe for stateless APIs; no browser form submissions.
 *   - CORS configured here (not in a separate @Bean CorsConfig) so Spring
 *     Security's filter chain handles preflight OPTIONS before JWT validation.
 *
 * CORS fix (Spring Security 6 + credentials):
 *   When {@code allowCredentials = true} you MUST use
 *   {@code setAllowedOriginPatterns} instead of {@code setAllowedOrigins}.
 *   Using {@code setAllowedOrigins} with credentials throws an
 *   IllegalArgumentException at startup in Spring Security ≥ 6.
 *
 *   The allowed patterns are read from {@code app.cors.allowed-origins}
 *   (→ {@code AppProperties.Cors.allowedOrigins}), which in turn reads the
 *   {@code CORS_ORIGINS} environment variable. Adding a new origin on Render
 *   requires only an env var update, no code change.
 *
 *   The OPTIONS preflight is allowed without authentication via
 *   {@code .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()}.
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)
@RequiredArgsConstructor
@Slf4j
public class SecurityConfig {

    private final JwtAuthenticationFilter     jwtAuthFilter;
    private final JwtAuthenticationEntryPoint jwtEntryPoint;
    private final UserDetailsService          userDetailsService;
    private final AppProperties               appProperties;

    // ── Security Filter Chain ─────────────────────────────────────────────

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                // Disable CSRF — not needed for stateless JWT APIs
                .csrf(AbstractHttpConfigurer::disable)

                // CORS — must be configured before JWT filter fires
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))

                // 401 handler — returns JSON instead of HTML redirect
                .exceptionHandling(ex -> ex.authenticationEntryPoint(jwtEntryPoint))

                // Stateless — no HttpSession created or used
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

                // ── URL-level authorisation rules ─────────────────────────────
                .authorizeHttpRequests(auth -> auth

                        // OPTIONS preflight must be permitted unconditionally.
                        // Without this, browsers never get the CORS headers because
                        // Spring Security rejects the preflight before the CORS filter runs.
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                        // Public auth endpoints
                        .requestMatchers("/api/v1/auth/**").permitAll()

                        // Swagger / OpenAPI — useful in development
                        .requestMatchers(
                                "/swagger-ui.html", "/swagger-ui/**",
                                "/api-docs",        "/api-docs/**",
                                "/v3/api-docs/**"
                        ).permitAll()

                        // Actuator health — public (metrics locked down)
                        .requestMatchers("/actuator/health").permitAll()

                        // Public ride browse + search — guests can preview the platform
                        .requestMatchers(HttpMethod.GET, "/api/v1/rides/browse").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/rides/search").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/rides/{rideId}").permitAll()

                        // Admin-only endpoints
                        .requestMatchers("/api/v1/admin/**").hasRole("ADMIN")

                        // Driver-only: create & manage rides
                        .requestMatchers(HttpMethod.POST,   "/api/v1/rides").hasRole("DRIVER")
                        .requestMatchers(HttpMethod.PUT,    "/api/v1/rides/**").hasRole("DRIVER")
                        .requestMatchers(HttpMethod.DELETE, "/api/v1/rides/**").hasRole("DRIVER")
                        .requestMatchers("/api/v1/rides/*/start").hasRole("DRIVER")
                        .requestMatchers("/api/v1/rides/*/complete").hasRole("DRIVER")

                        // Booking — passenger or admin
                        .requestMatchers(HttpMethod.POST, "/api/v1/bookings").hasAnyRole("PASSENGER", "ADMIN")

                        // Everything else requires authentication
                        .anyRequest().authenticated()
                )

                // Register JWT filter before the username/password filter
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    // ── CORS ──────────────────────────────────────────────────────────────

    /**
     * CORS configuration source shared with Spring Security's filter chain.
     *
     * Key points:
     *   1. {@code setAllowedOriginPatterns} is used (not {@code setAllowedOrigins})
     *      because {@code allowCredentials = true} requires it in Spring Security 6+.
     *   2. Patterns are read from {@code AppProperties.Cors.allowedOrigins}, which
     *      binds to the {@code CORS_ORIGINS} environment variable.
     *   3. The method is {@code @Bean} so it can also be injected elsewhere if needed.
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        List<String> origins = appProperties.getCors().getAllowedOrigins();
        log.info("[CORS] Allowed origins: {}", origins);

        CorsConfiguration config = new CorsConfiguration();

        // Use patterns, not setAllowedOrigins, to support credentials
        config.setAllowedOriginPatterns(origins);

        config.setAllowedMethods(List.of(
                "GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"
        ));
        config.setAllowedHeaders(List.of(
                "Authorization", "Content-Type", "Accept",
                "X-Requested-With", "Origin"
        ));
        config.setExposedHeaders(List.of("Authorization"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);  // browsers cache preflight for 1 hour

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    // ── Authentication Provider ────────────────────────────────────────────

    @Bean
    public DaoAuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
        provider.setUserDetailsService(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder());
        return provider;
    }

    @Bean
    public AuthenticationManager authenticationManager(
            AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}