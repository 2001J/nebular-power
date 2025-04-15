package com.solar.user_management.dto.user;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
@Schema(description = "Request to update user profile information")
public class UpdateProfileRequest {
    @Schema(description = "User's full name (3-50 characters)")
    @NotBlank(message = "Full name is required")
    @Size(min = 3, max = 50, message = "Full name must be between 3 and 50 characters")
    private String fullName;

    @Schema(description = "User's email address")
    @NotBlank(message = "Email is required")
    @Email(message = "Please provide a valid email address")
    private String email;

    @Schema(description = "User's phone number (E.164 format)")
    @NotBlank(message = "Phone number is required")
    @Pattern(regexp = "^\\+[1-9]\\d{1,14}$", message = "Phone number must be in E.164 format (e.g., +1234567890)")
    private String phoneNumber;

    @Schema(description = "Current password (required for email changes)")
    private String currentPassword;

    @Schema(description = "New password (optional, min 6 characters)")
    @Size(min = 6, message = "New password must be at least 6 characters long")
    private String newPassword;
} 