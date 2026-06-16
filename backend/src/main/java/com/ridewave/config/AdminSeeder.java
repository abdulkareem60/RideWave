package com.ridewave.config;

import com.ridewave.model.User;
import com.ridewave.model.enums.UserRole;
import com.ridewave.model.enums.UserStatus;
import com.ridewave.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

/**
 * AdminSeeder — production-grade replacement for manual SQL admin insertion.
 *
 * On every application startup, checks whether an account with the
 * configured admin email exists. If not, creates one programmatically
 * using the standard {@link PasswordEncoder} bean (same BCrypt strength
 * as normal registration — no hardcoded hashes).
 *
 * Idempotent: if the admin already exists, this is a no-op every time
 * the app restarts. Safe to leave enabled in all environments.
 *
 * Configuration (application.yml / env vars):
 *   app.admin.email     (default: admin@ridewave.com)
 *   app.admin.password  (default: Admin@RideWave123)
 *     -> bound to ADMIN_EMAIL / ADMIN_PASSWORD env vars via relaxed binding
 *   app.admin.full-name (default: RideWave Admin)
 *   app.admin.phone     (default: +920000000000)
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class AdminSeeder implements ApplicationRunner {

    private final UserRepository  userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.admin.email:admin@ridewave.com}")
    private String adminEmail;

    @Value("${app.admin.password:Admin@RideWave123}")
    private String adminPassword;

    @Value("${app.admin.full-name:RideWave Admin}")
    private String adminFullName;

    @Value("${app.admin.phone:+920000000000}")
    private String adminPhone;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        String normalizedEmail = adminEmail.toLowerCase().trim();

        if (userRepository.existsByEmail(normalizedEmail)) {
            log.debug("AdminSeeder: admin account '{}' already exists — skipping.", normalizedEmail);
            return;
        }

        User admin = User.builder()
                .email(normalizedEmail)
                .phone(adminPhone)
                .passwordHash(passwordEncoder.encode(adminPassword))
                .fullName(adminFullName)
                .role(UserRole.ADMIN)
                .status(UserStatus.ACTIVE)
                .trustScore(BigDecimal.valueOf(5.00))
                .emailVerified(true)
                .phoneVerified(true)
                .build();

        userRepository.save(admin);

        log.info("AdminSeeder: created default admin account ({}). " +
                        "If ADMIN_PASSWORD was not set via environment variable, " +
                        "the default password is in use — change it after first login.",
                normalizedEmail);
    }
}