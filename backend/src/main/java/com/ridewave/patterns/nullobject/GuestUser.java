package com.ridewave.patterns.nullobject;

import com.ridewave.model.User;
import com.ridewave.model.enums.UserRole;
import com.ridewave.model.enums.UserStatus;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Null Object Pattern — GuestUser
 *
 * Represents an unauthenticated visitor who has no account.
 * Used in contexts where a User object is expected but the caller
 * may not be logged in (e.g. public ride search with analytics logging).
 *
 * Benefits:
 *   - Eliminates "if (user != null)" guards in analytics/logging code.
 *   - Safe to pass to any method that accepts a User.
 *   - All permission checks return false — cannot perform any privileged action.
 */
public class GuestUser extends User {

    private static final UUID   GUEST_ID   = UUID.fromString("00000000-0000-0000-0000-000000000000");
    private static final String GUEST_NAME = "Guest";

    /** Singleton instance — GuestUser has no state that needs to vary. */
    private static final GuestUser INSTANCE = new GuestUser();

    private GuestUser() {
        setUserId(GUEST_ID);
        setFullName(GUEST_NAME);
        setEmail("guest@ridewave.com");
        setPhone("+000000000000");
        setRole(UserRole.PASSENGER);         // lowest privilege
        setStatus(UserStatus.PENDING);       // inactive — cannot perform actions
        setTrustScore(BigDecimal.ZERO);
        setEmailVerified(false);
        setPhoneVerified(false);
    }

    public static GuestUser getInstance() {
        return INSTANCE;
    }

    /** Always false — guests are never authenticated. */
    public boolean isAuthenticated() {
        return false;
    }

    /** Always false — guests have no role-based permissions. */
    public boolean isActive() {
        return false;
    }
}