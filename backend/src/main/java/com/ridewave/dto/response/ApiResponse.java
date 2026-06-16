package com.ridewave.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Getter;

import java.time.Instant;

/**
 * Universal API response envelope.
 *
 * Every endpoint returns this shape so the React frontend can handle
 * responses uniformly:
 *
 * Success:
 * {
 *   "success": true,
 *   "message": "Login successful",
 *   "data":    { ... },
 *   "timestamp": "2024-01-01T12:00:00Z"
 * }
 *
 * The "data" field is omitted (not null) when there is no payload (e.g. logout).
 */
@Getter
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiResponse<T> {

    private final boolean success;
    private final String  message;
    private final T       data;
    private final String  timestamp;

    private ApiResponse(boolean success, String message, T data) {
        this.success   = success;
        this.message   = message;
        this.data      = data;
        this.timestamp = Instant.now().toString();
    }

    public static <T> ApiResponse<T> success(T data, String message) {
        return new ApiResponse<>(true, message, data);
    }

    public static <T> ApiResponse<T> success(T data) {
        return new ApiResponse<>(true, "Success", data);
    }

    public static ApiResponse<Void> ok(String message) {
        return new ApiResponse<>(true, message, null);
    }
}