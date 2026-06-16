package com.ridewave.service;

import com.ridewave.dto.response.NotificationResponse;
import com.ridewave.exception.ResourceNotFoundException;
import com.ridewave.model.Notification;
import com.ridewave.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Notification Service — singleton bean (Spring @Service default scope).
 *
 * Singleton pattern note:
 *   Spring manages exactly one instance for the application lifetime.
 *   This is the canonical Singleton usage in a Spring context —
 *   shared state is the notification repository reference, not mutable fields.
 *
 * Responsibilities:
 *   - Persist in-app notifications (called by InAppNotificationChannel)
 *   - Serve paginated notification list to the React frontend
 *   - Mark individual or all notifications as read
 *   - Return the unread count (used for the bell badge in the UI)
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    private final NotificationRepository notificationRepository;

    // ── Read ──────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Page<NotificationResponse> getNotifications(UUID userId, Pageable pageable) {
        return notificationRepository
                .findByUser_UserIdOrderByCreatedAtDesc(userId, pageable)
                .map(NotificationResponse::from);
    }

    @Transactional(readOnly = true)
    public long getUnreadCount(UUID userId) {
        return notificationRepository.countByUser_UserIdAndReadFalse(userId);
    }

    // ── Mark read ─────────────────────────────────────────────────────────

    @Transactional
    public void markOneRead(UUID userId, UUID notificationId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Notification not found: " + notificationId));

        if (!notification.getUser().getUserId().equals(userId)) {
            throw new com.ridewave.exception.AccessDeniedException(
                    "This notification does not belong to you.");
        }

        notificationRepository.markOneRead(notificationId);
    }

    @Transactional
    public int markAllRead(UUID userId) {
        int count = notificationRepository.markAllReadForUser(userId);
        log.debug("Marked {} notifications as read for userId={}", count, userId);
        return count;
    }
}