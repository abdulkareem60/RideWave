package com.ridewave.model.enums;

/**
 * Distinguishes the purpose of a one-time password token.
 * RIDE_START removed — ride start no longer requires OTP verification.
 */
public enum OtpType {
    EMAIL_VERIFY,
    PHONE_VERIFY,
    PASSWORD_RESET
}