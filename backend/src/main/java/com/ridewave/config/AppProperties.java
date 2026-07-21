package com.ridewave.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import java.util.ArrayList;
import java.util.List;

/**
 * Strongly-typed wrapper around the {@code app.*} namespace in application.yml.
 *
 * <p>Spring Boot's relaxed binding handles:
 * <ul>
 *   <li>Comma-separated {@code CORS_ORIGINS} env var → {@code cors.allowedOrigins} List</li>
 *   <li>Kebab-case yml keys (e.g. {@code from-address}) → camelCase Java fields</li>
 * </ul>
 *
 * <p>All nested classes use {@code @Data} so Lombok generates the getters/setters
 * that Spring needs to populate the fields via reflection.
 */
@Data
@Configuration
@ConfigurationProperties(prefix = "app")
public class AppProperties {

    private final Cors  cors  = new Cors();
    private final Mail  mail  = new Mail();
    private final Otp   otp   = new Otp();
    private final Admin admin = new Admin();

    // ── CORS ──────────────────────────────────────────────────────────────

    @Data
    public static class Cors {
        /**
         * Comma-separated list of allowed origins.
         *
         * Populated from the {@code CORS_ORIGINS} environment variable, e.g.:
         * <pre>
         *   CORS_ORIGINS=https://ride-wave-murex.vercel.app,https://custom.domain.com
         * </pre>
         *
         * Spring Boot automatically splits comma-separated env var values
         * into a {@code List<String>} for {@code @ConfigurationProperties} fields.
         *
         * The default includes localhost dev servers and the production Vercel URL.
         */
        private List<String> allowedOrigins = new ArrayList<>(List.of(
                "http://localhost:3000",
                "http://localhost:5173",
                "https://ride-wave-murex.vercel.app"
        ));
    }

    // ── Mail ──────────────────────────────────────────────────────────────

    @Data
    public static class Mail {
        /**
         * The "From" address shown to email recipients.
         *
         * Set {@code MAIL_FROM_ADDRESS} on Render to override the default.
         * This is separate from {@code spring.mail.username} (the SMTP login).
         * Many providers (Brevo, SendGrid) require the from-address to be a
         * verified sender; using the SMTP username as the from-address often
         * causes delivery failures.
         */
        private String fromAddress = "noreply@ridewave.pk";

        /**
         * The display name shown alongside the from-address.
         * Set {@code MAIL_FROM_NAME} on Render to override.
         */
        private String fromName = "RideWave";
    }

    // ── OTP ───────────────────────────────────────────────────────────────

    @Data
    public static class Otp {
        /** Minutes before an OTP expires. Default: 10. */
        private int expiryMinutes = 10;

        /** Maximum verification attempts before the OTP is invalidated. Default: 3. */
        private int maxAttempts   = 3;
    }

    // ── Admin seeder ──────────────────────────────────────────────────────

    @Data
    public static class Admin {
        private String email    = "admin@ridewave.com";
        private String password = "Admin@RideWave123";
        private String fullName = "RideWave Admin";
        private String phone    = "+920000000000";
    }
}