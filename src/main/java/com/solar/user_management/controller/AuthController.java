package com.solar.user_management.controller;

import com.solar.user_management.dto.auth.AuthResponse;
import com.solar.user_management.dto.auth.LoginRequest;
import com.solar.user_management.dto.auth.PasswordChangeRequest;
import com.solar.user_management.model.User;
import com.solar.user_management.model.UserActivityLog;
import com.solar.user_management.service.UserActivityLogService;
import com.solar.user_management.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*", maxAge = 3600)
@RequiredArgsConstructor
@Tag(name = "Authentication", description = "Authentication API")
public class AuthController {

    private final UserService userService;
    private final UserActivityLogService activityLogService;

    @PostMapping("/login")
    @Operation(
            summary = "Authenticate user",
            description = "Authenticates a user and returns a JWT token. The response includes a 'passwordChangeRequired' flag that indicates if the user needs to change their password before accessing the system."
    )
    @ApiResponse(responseCode = "200", description = "Authentication successful")
    @ApiResponse(responseCode = "401", description = "Authentication failed")
    public ResponseEntity<AuthResponse> authenticateUser(@Valid @RequestBody LoginRequest loginRequest) {
        return ResponseEntity.ok(userService.authenticateUser(loginRequest));
    }

    @GetMapping("/check-email")
    @Operation(
            summary = "Check email availability",
            description = "Checks if an email is available for registration"
    )
    @ApiResponse(responseCode = "200", description = "Email availability status")
    public ResponseEntity<Boolean> checkEmailAvailability(@RequestParam String email) {
        return ResponseEntity.ok(!userService.existsByEmail(email));
    }

    @PostMapping("/change-initial-password")
    @Operation(
            summary = "Change initial password",
            description = "Changes the initial password after email verification"
    )
    @ApiResponse(responseCode = "200", description = "Password changed successfully")
    @ApiResponse(responseCode = "400", description = "Invalid request")
    public ResponseEntity<Map<String, String>> changeInitialPassword(@Valid @RequestBody PasswordChangeRequest request) {
        userService.changeInitialPassword(request.getEmail(), request.getNewPassword(), request.getConfirmPassword());

        Map<String, String> response = new HashMap<>();
        response.put("message", "Password changed successfully. You can now log in.");
        return ResponseEntity.ok(response);
    }

    @GetMapping("/verify-email/{token}")
    @Operation(
            summary = "Verify email address",
            description = "Verifies the user's email address using the token received via email"
    )
    @ApiResponse(
            responseCode = "200",
            description = "Email verified successfully with redirection information if password change is required"
    )
    public ResponseEntity<Map<String, Object>> verifyEmail(
            @Parameter(description = "Email verification token")
            @PathVariable String token,
            HttpServletRequest request) {
        User user = userService.verifyEmail(token);

        activityLogService.logUserActivity(
                user,
                UserActivityLog.ActivityType.PROFILE_UPDATE,
                "Email verified",
                "Email address verification completed",
                request
        );

        Map<String, Object> response = new HashMap<>();
        response.put("message", "Email verified successfully");

        // If password change is required, include redirect information
        if (user.isPasswordChangeRequired()) {
            response.put("redirectRequired", true);
            response.put("redirectUrl", "/change-password");
            response.put("email", user.getEmail());
        }

        return ResponseEntity.ok(response);
    }

    @PostMapping("/resend-verification")
    @Operation(
            summary = "Resend verification email",
            description = "Resends the email verification link to the user's email address"
    )
    @ApiResponse(responseCode = "200", description = "Verification email sent successfully")
    public ResponseEntity<Map<String, String>> resendVerificationEmail(@RequestParam String email, HttpServletRequest request) {
        User user = userService.findByEmail(email);

        // Check if the email is already verified
        if (user.isEmailVerified()) {
            Map<String, String> response = new HashMap<>();
            response.put("message", "Email is already verified. You can now log in.");
            return ResponseEntity.ok(response);
        }

        userService.resendVerificationEmail(user);

        activityLogService.logUserActivity(
                user,
                UserActivityLog.ActivityType.PROFILE_UPDATE,
                "Verification email resent",
                "Email verification link resent",
                request
        );

        Map<String, String> response = new HashMap<>();
        response.put("message", "Verification email has been sent. Please check your inbox.");
        return ResponseEntity.ok(response);
    }

    @PostMapping("/change-password")
    @Operation(
            summary = "Change user password",
            description = "Changes the password for the currently authenticated user"
    )
    @ApiResponse(responseCode = "200", description = "Password changed successfully")
    @ApiResponse(responseCode = "400", description = "Invalid request or incorrect current password")
    public ResponseEntity<Map<String, String>> changePassword(
            @Valid @RequestBody PasswordChangeRequest request,
            @RequestParam String currentPassword,
            HttpServletRequest httpRequest) {
        
        User user = userService.getCurrentUser();
        
        try {
            userService.changePassword(user, currentPassword, request.getNewPassword());
            
            activityLogService.logUserActivity(
                    user,
                    UserActivityLog.ActivityType.PASSWORD_CHANGE,
                    "Password changed",
                    "User password changed successfully",
                    httpRequest
            );
            
            Map<String, String> response = new HashMap<>();
            response.put("message", "Password changed successfully");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, String> response = new HashMap<>();
            response.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }
} 