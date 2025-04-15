package com.solar.user_management.dto.user;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
@Schema(description = "Request to confirm password reset")
public class PasswordResetConfirmRequest {
    @Schema(description = "Password reset token received via email")
    @NotBlank(message = "Token is required")
    private String token;

    @Schema(description = "New password (min 6 characters)")
    @NotBlank(message = "New password is required")
    @Size(min = 6, message = "Password must be at least 6 characters long")
    private String newPassword;

    @Schema(description = "Confirm new password")
    @NotBlank(message = "Password confirmation is required")
    private String confirmPassword;
} 