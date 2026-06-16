package com.ridewave.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

/**
 * JWT Authentication Filter — runs once per request (OncePerRequestFilter).
 *
 * Flow:
 *   1. Extract Bearer token from the Authorization header.
 *   2. Validate the token (signature + expiry) via JwtTokenProvider.
 *   3. Load the UserPrincipal from the database.
 *   4. Set the Authentication in the SecurityContext so that
 *      @PreAuthorize and hasRole() checks work downstream.
 *
 * Stateless: no session is created or consulted.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenProvider tokenProvider;
    private final CustomUserDetailsService userDetailsService;

    @Override
    protected void doFilterInternal(HttpServletRequest  request,
                                    HttpServletResponse response,
                                    FilterChain         chain)
            throws ServletException, IOException {

        try {
            String jwt = extractTokenFromRequest(request);

            if (StringUtils.hasText(jwt) && tokenProvider.validateToken(jwt)) {

                UUID userId = tokenProvider.getUserIdFromToken(jwt);
                UserDetails userDetails = userDetailsService.loadUserById(userId);

                // ── DIAGNOSTIC LOGGING ──────────────────────────────────
                log.info("JWT AUTH: path={} userId={} username={} authorities={}",
                        request.getRequestURI(),
                        userId,
                        userDetails.getUsername(),
                        userDetails.getAuthorities());

                UsernamePasswordAuthenticationToken authentication =
                        new UsernamePasswordAuthenticationToken(
                                userDetails, null, userDetails.getAuthorities());

                authentication.setDetails(
                        new WebAuthenticationDetailsSource().buildDetails(request));

                SecurityContextHolder.getContext().setAuthentication(authentication);

            } else if (StringUtils.hasText(jwt)) {
                log.warn("JWT AUTH: token present but failed validateToken() for path={}",
                        request.getRequestURI());
            } else {
                log.debug("JWT AUTH: no Authorization header for path={}", request.getRequestURI());
            }

        } catch (Exception ex) {
            log.error("JWT AUTH: exception while setting authentication for path={}: {}",
                    request.getRequestURI(), ex.getMessage(), ex);
        }

        chain.doFilter(request, response);
    }

    /**
     * Pulls the raw token string from "Authorization: Bearer <token>".
     * Returns null if the header is absent or malformed.
     */
    private String extractTokenFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        return null;
    }
}