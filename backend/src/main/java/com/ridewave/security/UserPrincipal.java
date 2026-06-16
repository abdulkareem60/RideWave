package com.ridewave.security;

import com.ridewave.model.User;
import com.ridewave.model.enums.UserRole;
import com.ridewave.model.enums.UserStatus;
import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

@Getter
public class UserPrincipal implements UserDetails {

    private final UUID       id;
    private final String     email;
    private final String     password;
    private final UserRole   role;
    private final UserStatus status;
    private final Collection<? extends GrantedAuthority> authorities;

    private UserPrincipal(UUID id, String email, String password,
                          UserRole role, UserStatus status,
                          Collection<? extends GrantedAuthority> authorities) {
        this.id          = id;
        this.email       = email;
        this.password    = password;
        this.role        = role;
        this.status      = status;
        this.authorities = authorities;
    }

    public static UserPrincipal create(User user) {
        List<GrantedAuthority> authorities = List.of(
                new SimpleGrantedAuthority("ROLE_" + user.getRole().name())
        );
        return new UserPrincipal(
                user.getUserId(),
                user.getEmail(),
                user.getPasswordHash(),
                user.getRole(),
                user.getStatus(),
                authorities
        );
    }

    @Override public String  getUsername()             { return email; }
    @Override public String  getPassword()             { return password; }
    @Override public boolean isAccountNonExpired()     { return true; }
    @Override public boolean isCredentialsNonExpired() { return true; }
    @Override public boolean isAccountNonLocked()      { return true; }
    @Override public boolean isEnabled()               { return true; }
}