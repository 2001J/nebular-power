package com.solar.user_management.controller;

import com.solar.core_services.energy_monitoring.model.SolarInstallation;
import com.solar.core_services.energy_monitoring.repository.SolarInstallationRepository;
import com.solar.user_management.dto.auth.SignupRequest;
import com.solar.user_management.dto.customer.CustomerUpdateRequest;
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
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/customers")
@CrossOrigin(origins = "*", maxAge = 3600)
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
@Tag(name = "Customer Management", description = "APIs for managing customer accounts")
@SecurityRequirement(name = "bearerAuth")
public class CustomerController {

    private final UserService userService;
    private final UserActivityLogService activityLogService;
    private final SolarInstallationRepository installationRepository;

    @PostMapping
    @Operation(
            summary = "Register new customer",
            description = "Creates a new customer account with solar installation details"
    )
    @ApiResponse(
            responseCode = "201",
            description = "Customer registered successfully",
            content = @Content(schema = @Schema(implementation = UserProfileResponse.class))
    )
    public ResponseEntity<UserProfileResponse> registerCustomer(
            @Valid @RequestBody SignupRequest signupRequest,
            HttpServletRequest request) {
        User user = userService.registerCustomer(signupRequest);

        activityLogService.logUserActivity(
                userService.getCurrentUser(),
                UserActivityLog.ActivityType.SYSTEM_ACCESS,
                "Customer registered",
                "New customer account created: " + user.getEmail(),
                request
        );

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(UserProfileResponse.fromUser(user));
    }

    @GetMapping
    @Operation(
            summary = "Get all customers",
            description = "Retrieves a list of all customer accounts"
    )
    @ApiResponse(
            responseCode = "200",
            description = "Customers retrieved successfully",
            content = @Content(schema = @Schema(implementation = UserProfileResponse.class))
    )
    public ResponseEntity<List<UserProfileResponse>> getAllCustomers() {
        List<UserProfileResponse> customers = userService.getAllCustomers().stream()
                .map(user -> {
                    UserProfileResponse profile = UserProfileResponse.fromUser(user);
                    
                    // Fetch installations for this customer if they are a CUSTOMER
                    if (user.getRole() == User.UserRole.CUSTOMER) {
                        List<SolarInstallation> installations = installationRepository.findByUserId(user.getId());
                        if (!installations.isEmpty()) {
                            SolarInstallation installation = installations.get(0);
                            profile.setInstallationDate(installation.getInstallationDate());
                            // Convert enum to string when setting in UserProfileResponse
                            profile.setInstallationType(installation.getType() != null ? installation.getType().name() : null);
                        }
                    }
                    
                    return profile;
                })
                .collect(Collectors.toList());
        return ResponseEntity.ok(customers);
    }

    @GetMapping("/search")
    @Operation(
            summary = "Search customers",
            description = "Search customers by name, email, or status"
    )
    @ApiResponse(
            responseCode = "200",
            description = "Search results retrieved successfully",
            content = @Content(schema = @Schema(implementation = Page.class))
    )
    public ResponseEntity<List<UserProfileResponse>> searchCustomers(
            @Parameter(description = "Search query")
            @RequestParam String query) {
        List<UserProfileResponse> customers = userService.searchCustomers(query).stream()
                .map(user -> {
                    UserProfileResponse profile = UserProfileResponse.fromUser(user);
                    
                    // Fetch installations for this customer if they are a CUSTOMER
                    if (user.getRole() == User.UserRole.CUSTOMER) {
                        List<SolarInstallation> installations = installationRepository.findByUserId(user.getId());
                        if (!installations.isEmpty()) {
                            SolarInstallation installation = installations.get(0);
                            profile.setInstallationDate(installation.getInstallationDate());
                            // Convert enum to string when setting in UserProfileResponse
                            profile.setInstallationType(installation.getType() != null ? installation.getType().name() : null);
                        }
                    }
                    
                    return profile;
                })
                .collect(Collectors.toList());
        return ResponseEntity.ok(customers);
    }

    @GetMapping("/{id}")
    @Operation(
            summary = "Get customer by ID",
            description = "Retrieves a specific customer's details"
    )
    @ApiResponse(
            responseCode = "200",
            description = "Customer retrieved successfully",
            content = @Content(schema = @Schema(implementation = UserProfileResponse.class))
    )
    public ResponseEntity<UserProfileResponse> getCustomer(
            @Parameter(description = "Customer ID")
            @PathVariable Long id) {
        User user = userService.getCustomerById(id);
        UserProfileResponse profile = UserProfileResponse.fromUser(user);
        
        // Fetch installations for this customer
        if (user.getRole() == User.UserRole.CUSTOMER) {
            List<SolarInstallation> installations = installationRepository.findByUserId(user.getId());
            if (!installations.isEmpty()) {
                SolarInstallation installation = installations.get(0);
                profile.setInstallationDate(installation.getInstallationDate());
                // Convert enum to string when setting in UserProfileResponse
                profile.setInstallationType(installation.getType() != null ? installation.getType().name() : null);
            }
        }
        
        return ResponseEntity.ok(profile);
    }

    @PutMapping("/{id}")
    @Operation(
            summary = "Update customer",
            description = "Updates a customer's account information"
    )
    @ApiResponse(responseCode = "200", description = "Customer updated successfully")
    public ResponseEntity<Void> updateCustomer(
            @Parameter(description = "Customer ID")
            @PathVariable Long id,
            @Valid @RequestBody CustomerUpdateRequest updateRequest,
            HttpServletRequest request) {
        User user = userService.getCustomerById(id);
        user.setFullName(updateRequest.getFullName());
        user.setEmail(updateRequest.getEmail());
        user.setPhoneNumber(updateRequest.getPhoneNumber());
        if (updateRequest.getPassword() != null && !updateRequest.getPassword().isEmpty()) {
            user.setPassword(updateRequest.getPassword());
        }
        userService.updateCustomer(user);

        activityLogService.logUserActivity(
                userService.getCurrentUser(),
                UserActivityLog.ActivityType.PROFILE_UPDATE,
                "Customer updated",
                "Customer account updated: " + user.getEmail(),
                request
        );

        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}")
    @Operation(
            summary = "Deactivate customer",
            description = "Deactivates a customer's account"
    )
    @ApiResponse(responseCode = "204", description = "Customer deactivated successfully")
    public ResponseEntity<Void> deactivateCustomer(
            @Parameter(description = "Customer ID")
            @PathVariable Long id,
            HttpServletRequest request) {
        User user = userService.getCustomerById(id);
        userService.deactivateCustomer(id);

        activityLogService.logUserActivity(
                userService.getCurrentUser(),
                UserActivityLog.ActivityType.ACCOUNT_STATUS_CHANGE,
                "Customer deactivated",
                "Customer account deactivated: " + user.getEmail(),
                request
        );

        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/reactivate")
    @Operation(
            summary = "Reactivate customer",
            description = "Reactivates a previously deactivated customer account"
    )
    @ApiResponse(responseCode = "200", description = "Customer reactivated successfully")
    public ResponseEntity<Void> reactivateCustomer(
            @Parameter(description = "Customer ID")
            @PathVariable Long id,
            HttpServletRequest request) {
        User user = userService.getCustomerById(id);
        userService.reactivateCustomer(id);

        activityLogService.logUserActivity(
                userService.getCurrentUser(),
                UserActivityLog.ActivityType.ACCOUNT_STATUS_CHANGE,
                "Customer reactivated",
                "Customer account reactivated: " + user.getEmail(),
                request
        );

        return ResponseEntity.ok().build();
    }

    @PostMapping("/{id}/reset-password")
    @Operation(
            summary = "Reset customer password",
            description = "Resets a customer's password and sends them a temporary password"
    )
    @ApiResponse(responseCode = "200", description = "Password reset successful")
    public ResponseEntity<Void> resetCustomerPassword(
            @Parameter(description = "Customer ID")
            @PathVariable Long id,
            HttpServletRequest request) {
        User user = userService.getCustomerById(id);
        userService.resetCustomerPassword(id);

        activityLogService.logUserActivity(
                userService.getCurrentUser(),
                UserActivityLog.ActivityType.PASSWORD_CHANGE,
                "Password reset",
                "Customer password reset: " + user.getEmail(),
                request
        );

        return ResponseEntity.ok().build();
    }

    @GetMapping("/{id}/activity")
    @Operation(
            summary = "Get customer activity logs",
            description = "Retrieves the activity history for a specific customer"
    )
    @ApiResponse(
            responseCode = "200",
            description = "Activity logs retrieved successfully",
            content = @Content(schema = @Schema(implementation = Page.class))
    )
    public ResponseEntity<Page<UserActivityLog>> getCustomerActivityLogs(
            @Parameter(description = "Customer ID")
            @PathVariable Long id,
            @Parameter(description = "Pagination parameters")
            Pageable pageable) {
        User user = userService.getCustomerById(id);
        return ResponseEntity.ok(activityLogService.getUserActivityLogs(user, pageable));
    }
}