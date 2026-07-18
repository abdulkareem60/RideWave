package com.ridewave.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Thrown when an operation is rejected because the resource is in a
 * conflicting state — e.g. a driver tries to edit/delete/cancel a ride
 * that already has active passenger bookings.
 *
 * Maps to HTTP 409 Conflict.
 */
@ResponseStatus(HttpStatus.CONFLICT)
public class ConflictException extends RuntimeException {
    public ConflictException(String message) {
        super(message);
    }
}