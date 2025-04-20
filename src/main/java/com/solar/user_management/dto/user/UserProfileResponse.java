package com.solar.user_management.dto.user;

import com.solar.user_management.model.User;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Schema(description = "User profile information response")
public class UserProfileResponse {
    @Schema(description = "User's unique identifier")
    private Long id;

    @Schema(description = "User's email address")
    private String email;

    @Schema(description = "User's full name")
    private String fullName;

    @Schema(description = "User's phone number")
    private String phoneNumber;

    @Schema(description = "User's role (ADMIN or CUSTOMER)")
    private User.UserRole role;

    @Schema(description = "User's account status")
    private User.AccountStatus status;

    @Schema(description = "Whether the user's email is verified")
    private boolean emailVerified;

    @Schema(description = "Last login timestamp")
    private LocalDateTime lastLogin;

    @Schema(description = "Account creation timestamp")
    private LocalDateTime createdAt;
    
    @Schema(description = "Installation date if user has a solar installation")
    private LocalDateTime installationDate;
    
    @Schema(description = "Type of solar installation (Residential or Commercial)")
    private String installationType;

    public static UserProfileResponse fromUser(User user) {
        UserProfileResponse response = new UserProfileResponse();
        response.setId(user.getId());
        response.setEmail(user.getEmail());
        response.setFullName(user.getFullName());
        response.setPhoneNumber(user.getPhoneNumber());
        response.setRole(user.getRole());
        response.setStatus(user.getAccountStatus());
        response.setEmailVerified(user.isEmailVerified());
        response.setLastLogin(user.getLastLogin());
        response.setCreatedAt(user.getCreatedAt());
        return response;
    }
}