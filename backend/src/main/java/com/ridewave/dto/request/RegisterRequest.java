package com.ridewave.dto.request;

import com.ridewave.model.enums.UserRole;
import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class RegisterRequest {

    @NotBlank(message = "Full name is required")
    @Size(min = 2, max = 100, message = "Full name must be between 2 and 100 characters")
    private String fullName;

    @NotBlank(message = "Email is required")
    @Email(message = "Email must be a valid email address")
    @Size(max = 255)
    private String email;

    @NotBlank(message = "Phone number is required")
    @Pattern(regexp = "^\\+?[0-9]{10,15}$",
            message = "Phone must be 10–15 digits, optionally starting with +")
    private String phone;

    @NotBlank(message = "Password is required")
    @Size(min = 8, max = 72, message = "Password must be between 8 and 72 characters")
    @Pattern(regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&]).+$",
            message = "Password must contain uppercase, lowercase, digit, and special character")
    private String password;

    @NotNull(message = "Role is required")
    private UserRole role;    // DRIVER or PASSENGER (ADMIN is seeded only)

    /**
     * Must be true. Validated with @AssertTrue rather than just storing
     * the boolean — this makes "termsAccepted=false" a hard validation
     * failure at the controller boundary, before any service code runs.
     * The frontend checkbox is a UX convenience only; this is the actual
     * enforcement point. A request with termsAccepted omitted or false
     * is rejected with a 400 before a User row is ever created.
     */
    @AssertTrue(message = "You must accept the Terms of Service and Privacy Policy to register")
    private boolean termsAccepted;
}