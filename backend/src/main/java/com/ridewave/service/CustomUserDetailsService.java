package com.ridewave.security;

import com.ridewave.exception.ResourceNotFoundException;
import com.ridewave.model.User;
import com.ridewave.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Loads a UserPrincipal from the database for Spring Security.
 *
 * Two load paths:
 *   - loadUserByUsername(email)  — used by Spring's DaoAuthenticationProvider at login.
 *   - loadUserById(uuid)         — used by JwtAuthenticationFilter on every request.
 */
@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    /**
     * Called by Spring Security during form/basic login (email = username).
     */
    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException(
                        "No user found with email: " + email));
        return UserPrincipal.create(user);
    }

    /**
     * Called by JwtAuthenticationFilter on every authenticated request.
     * Looks up by UUID extracted from the JWT subject claim.
     */
    @Transactional(readOnly = true)
    public UserDetails loadUserById(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "User not found with id: " + userId));
        return UserPrincipal.create(user);
    }
}