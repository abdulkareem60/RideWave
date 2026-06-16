package com.ridewave.model.enums;

/**
 * Roles that a registered user can hold.
 *
 * Spring Security maps each role to a GrantedAuthority of the form
 * "ROLE_<name>" (e.g. ROLE_ADMIN) via UserPrincipal.getAuthorities().
 */
public enum UserRole {

    /** Platform administrator – full access including driver verification,
     *  user suspension, report resolution, and dashboard analytics. */
    ADMIN,

    /** Verified driver – can create/manage rides, approve/reject booking requests,
     *  start/complete rides, and rate passengers. */
    DRIVER,

    /** Regular passenger – can search/book/cancel rides and rate drivers. */
    PASSENGER
}