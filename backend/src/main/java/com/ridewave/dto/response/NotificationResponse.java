package com.ridewave.dto.response;

import com.ridewave.model.Notification;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Builder
public class NotificationResponse {

    private UUID          notificationId;
    private String        type;
    private String        title;
    private String        body;
    private boolean       read;
    private LocalDateTime createdAt;

    public static NotificationResponse from(Notification n) {
        return NotificationResponse.builder()
                .notificationId(n.getNotificationId())
                .type(n.getType())
                .title(n.getTitle())
                .body(n.getBody())
                .read(n.getRead())
                .createdAt(n.getCreatedAt())
                .build();
    }
}