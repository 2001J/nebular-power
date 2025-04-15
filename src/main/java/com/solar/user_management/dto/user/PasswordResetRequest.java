package com.solar.user_management.dto.user;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
@Schema(description = "Request to initiate password reset")
public class PasswordResetRequest {
    @Schema(description = "Email address of the account")
    @NotBlank(message = "Email is required")
    @Email(message = "Please provide a valid email address")
    private String email;
} 