package com.ridewave.exception;
import lombok.Builder;
import lombok.Getter;
import java.util.Map;

@Getter
@Builder
public class ErrorResponse {
    private boolean             success;
    private int                 status;
    private String              error;
    private String              message;
    private String              path;
    private String              timestamp;
    private Map<String, String> fieldErrors;
}