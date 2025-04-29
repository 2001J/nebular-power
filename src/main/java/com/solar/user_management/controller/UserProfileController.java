package com.solar.user_management.controller;

import com.solar.core_services.energy_monitoring.model.SolarInstallation;
import com.solar.core_services.energy_monitoring.repository.SolarInstallationRepository;
import com.solar.user_management.dto.user.PasswordResetConfirmRequest;
import com.solar.user_management.dto.user.PasswordResetRequest;
import com.solar.user_management.dto.user.UpdateProfileRequest;
import com.solar.user_management.dto.user.UserProfileResponse;
import com.solar.user_management.model.User;
import com.solar.user_management.model.UserActivityLog;
import com.solar.user_management.service.UserActivityLogService;
import com.solar.user_management.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;


@RestController
@RequestMapping("/api/profile")
@RequiredArgsConstructor
@Tag(name = "User Profile", description = "User profile management endpoints")
@SecurityRequirement(name = "bearerAuth")
@Slf4j
public class UserProfileController {

    private final UserService userService;
    private final UserActivityLogService activityLogService;
    private final SolarInstallationRepository installationRepository;

    @GetMapping
    @Operation(
            summary = "Get current user profile",
            description = "Retrieves the profile information of the currently authenticated user"
    )
    @ApiResponse(
            responseCode = "200",
            description = "Profile retrieved successfully",
            content = @Content(schema = @Schema(implementation = UserProfileResponse.class))
    )
    public ResponseEntity<UserProfileResponse> getCurrentUserProfile() {
        User user = userService.getCurrentUser();
        log.info("Fetching profile for user ID: {}, Email: {}", user.getId(), user.getEmail());
        log.info("User object details - lastLogin: {}, createdAt: {}", user.getLastLogin(), user.getCreatedAt());
        
        UserProfileResponse profile = UserProfileResponse.fromUser(user);
        log.info("Profile response after conversion - lastLogin: {}, createdAt: {}", profile.getLastLogin(), profile.getCreatedAt());
        
        // Add installation data for customers
        if (user.getRole() == User.UserRole.CUSTOMER) {
            List<SolarInstallation> installations = installationRepository.findByUserId(user.getId());
            if (!installations.isEmpty()) {
                SolarInstallation installation = installations.get(0);
                profile.setInstallationDate(installation.getInstallationDate());
                profile.setInstallationType(installation.getType() != null ? installation.getType().name() : null);
                log.info("Added installation data - date: {}, type: {}", installation.getInstallationDate(), 
                        installation.getType() != null ? installation.getType().name() : null);
            } else {
                log.info("No installation found for user ID: {}", user.getId());
            }
        }
        
        return ResponseEntity.ok(profile);
    }

    @PutMapping
    @Operation(
            summary = "Update user profile",
            description = "Updates the profile information of the currently authenticated user"
    )
    @ApiResponse(responseCode = "200", description = "Profile updated successfully")
    public ResponseEntity<UserProfileResponse> updateProfile(
            @Valid @RequestBody UpdateProfileRequest request,
            HttpServletRequest httpRequest) {
        User user = userService.updateProfile(request);

        activityLogService.logUserActivity(
                user,
                UserActivityLog.ActivityType.PROFILE_UPDATE,
                "Profile updated",
                "User profile information updated",
                httpRequest
        );

        UserProfileResponse profile = UserProfileResponse.fromUser(user);
        
        // Add installation data for customers
        if (user.getRole() == User.UserRole.CUSTOMER) {
            List<SolarInstallation> installations = installationRepository.findByUserId(user.getId());
            if (!installations.isEmpty()) {
                SolarInstallation installation = installations.get(0);
                profile.setInstallationDate(installation.getInstallationDate());
                profile.setInstallationType(installation.getType() != null ? installation.getType().name() : null);
            }
        }
        
        return ResponseEntity.ok(profile);
    }

    @PostMapping("/password/reset-request")
    @Operation(
            summary = "Request password reset",
            description = "Initiates the password reset process by sending a reset link to the user's email"
    )
    @ApiResponse(responseCode = "200", description = "Password reset email sent successfully")
    public ResponseEntity<Void> requestPasswordReset(
            @Valid @RequestBody PasswordResetRequest request) {
        userService.initiatePasswordReset(request.getEmail());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/password/reset-confirm")
    @Operation(
            summary = "Confirm password reset",
            description = "Completes the password reset process using the token received via email"
    )
    @ApiResponse(responseCode = "200", description = "Password reset successful")
    public ResponseEntity<Void> confirmPasswordReset(
            @Valid @RequestBody PasswordResetConfirmRequest request,
            HttpServletRequest httpRequest) {
        User user = userService.completePasswordReset(
                request.getToken(),
                request.getNewPassword(),
                request.getConfirmPassword()
        );

        activityLogService.logUserActivity(
                user,
                UserActivityLog.ActivityType.PASSWORD_CHANGE,
                "Password reset",
                "Password reset completed",
                httpRequest
        );

        return ResponseEntity.ok().build();
    }

    @GetMapping("/activity")
    @Operation(
            summary = "Get user activity logs",
            description = "Retrieves the activity history of the currently authenticated user"
    )
    @ApiResponse(
            responseCode = "200",
            description = "Activity logs retrieved successfully",
            content = @Content(schema = @Schema(implementation = Page.class))
    )
    public ResponseEntity<Page<UserActivityLog>> getUserActivityLogs(
            @Parameter(description = "Pagination parameters")
            Pageable pageable) {
        User user = userService.getCurrentUser();
        return ResponseEntity.ok(activityLogService.getUserActivityLogs(user, pageable));
    }
} 