package com.ridewave.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import java.util.List;

/**
 * Strongly-typed binding for all custom "app.*" properties in application.yml.
 * Injected wherever needed via constructor injection.
 */
@Configuration
@ConfigurationProperties(prefix = "app")
@Getter
@Setter
public class AppProperties {

    private Cors cors = new Cors();
    private Otp otp = new Otp();
    private TrustScore trustScore = new TrustScore();
    private Mail mail = new Mail();

    @Getter @Setter
    public static class Cors {
        private List<String> allowedOrigins = List.of("http://localhost:3000");
    }

    @Getter @Setter
    public static class Otp {
        private int expiryMinutes = 10;
    }

    @Getter @Setter
    public static class TrustScore {
        private double defaultScore = 3.00;
        private double minToBook = 1.50;
        private double minToDrive = 2.00;
        private double autoSuspendBelow = 1.00;
    }

    @Getter @Setter
    public static class Mail {
        private String fromAddress = "noreply@ridewave.com";
        private String fromName = "RideWave";
    }
}