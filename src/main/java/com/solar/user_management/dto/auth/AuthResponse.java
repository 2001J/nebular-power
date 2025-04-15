package com.solar.user_management.dto.auth;

import com.solar.user_management.model.User;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthResponse {
    private String accessToken;
    private String tokenType;
    private Long id;
    private String email;
    private String fullName;
    private String role;
    private boolean passwordChangeRequired;
    private LocalDateTime lastLogin;

    public static AuthResponse fromUserAndToken(String accessToken, User user) {
        return AuthResponse.builder()
                .accessToken(accessToken)
                .tokenType("Bearer")
                .id(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .role(user.getRole().name())
                .passwordChangeRequired(user.isPasswordChangeRequired())
                .lastLogin(user.getLastLogin())
                .build();
    }

    // Constructor for backward compatibility
    public AuthResponse(String accessToken, String email, String role, boolean passwordChangeRequired) {
        this.accessToken = accessToken;
        this.tokenType = "Bearer";
        this.email = email;
        this.role = role;
        this.passwordChangeRequired = passwordChangeRequired;
    }
} 