package com.solar.user_management.dto.customer;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Value;

@Value
public class CustomerUpdateRequest {
    @NotBlank(message = "Full name is required")
    @Size(min = 3, max = 50, message = "Full name must be between 3 and 50 characters")
    String fullName;

    @NotBlank(message = "Email is required")
    @Email(message = "Please provide a valid email address")
    String email;

    @NotBlank(message = "Phone number is required")
    @Pattern(regexp = "^\\+[1-9]\\d{1,14}$", message = "Phone number must be in E.164 format (e.g., +1234567890)")
    String phoneNumber;

    @Size(min = 6, message = "Password must be at least 6 characters long")
    String password; // Optional, only if changing password
} 