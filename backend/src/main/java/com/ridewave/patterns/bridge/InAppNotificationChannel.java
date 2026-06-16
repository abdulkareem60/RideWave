package com.ridewave.patterns.bridge;

import com.ridewave.model.Notification;
import com.ridewave.model.User;
import com.ridewave.repository.NotificationRepository;
import com.ridewave.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Bridge Pattern — Concrete Implementation: In-App Notification Channel
 *
 * Persists the notification to the notifications table.
 * The React frontend polls GET /api/v1/notifications to display these.
 *
 * The "recipient" for in-app notifications is the userId as a string.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class InAppNotificationChannel implements NotificationChannel {

    private final NotificationRepository notificationRepository;
    private final UserRepository         userRepository;

    @Override
    public void deliver(String userId, String title, String body) {
        try {
            User user = userRepository.findById(UUID.fromString(userId))
                    .orElseThrow(() -> new IllegalArgumentException(
                            "User not found for in-app notification: " + userId));

            Notification notification = Notification.builder()
                    .user(user)
                    .type(deriveType(title))
                    .title(title)
                    .body(body)
                    .read(false)
                    .build();

            notificationRepository.save(notification);
        } catch (Exception e) {
            log.error("Failed to persist in-app notification for userId={}: {}",
                    userId, e.getMessage());
        }
    }

    private String deriveType(String title) {
        if (title == null) return "GENERAL";
        String upper = title.toUpperCase();
        if (upper.contains("BOOKING"))    return "BOOKING";
        if (upper.contains("RIDE"))       return "RIDE";
        if (upper.contains("OTP"))        return "OTP";
        if (upper.contains("PAYMENT"))    return "PAYMENT";
        if (upper.contains("RATING"))     return "RATING";
        return "GENERAL";
    }
}