package com.ridewave;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * RideWave – Ride-sharing Platform
 *
 * Entry point for the Spring Boot application.
 *
 * @EnableScheduling  – enables @Scheduled tasks (e.g. OTP expiry cleanup,
 *                       trust-score recalculation jobs).
 *
 * @Async is enabled via config/AsyncConfig.java, which also configures
 * the dedicated thread pool ("taskExecutor") used by EmailService and
 * GeminiVerificationService.
 */
@SpringBootApplication
@EnableScheduling
public class RideWaveApplication {

	public static void main(String[] args) {
		SpringApplication.run(RideWaveApplication.class, args);
	}
}