package com.ridewave.exception;
public class InsufficientSeatsException extends RuntimeException {
    public InsufficientSeatsException(String message) { super(message); }
}