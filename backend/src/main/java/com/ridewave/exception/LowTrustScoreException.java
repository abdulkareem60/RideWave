package com.ridewave.exception;
public class LowTrustScoreException extends RuntimeException {
    public LowTrustScoreException(String message) { super(message); }
}