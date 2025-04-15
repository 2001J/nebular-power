package com.solar.core_services.tampering_detection.controller;

import com.solar.core_services.energy_monitoring.model.SolarInstallation;
import com.solar.core_services.energy_monitoring.repository.SolarInstallationRepository;
import com.solar.core_services.tampering_detection.dto.SecurityLogDTO;
import com.solar.core_services.tampering_detection.model.SecurityLog;
import com.solar.core_services.tampering_detection.service.SecurityLogService;
import com.solar.user_management.model.User;
import com.solar.user_management.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/security")
@RequiredArgsConstructor
@Tag(name = "Security Logs", description = "APIs for accessing security audit logs")
@SecurityRequirement(name = "bearerAuth")
public class SecurityLogController {

    private final SecurityLogService securityLogService;
    private final UserService userService;
    private final SolarInstallationRepository installationRepository;

    @GetMapping("/admin/installations/{installationId}/audit")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(
        summary = "Get installation logs",
        description = "Retrieves security audit logs for a specific solar installation with pagination support."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Logs retrieved successfully"),
        @ApiResponse(responseCode = "404", description = "Installation not found", content = @Content),
        @ApiResponse(responseCode = "403", description = "Insufficient permissions", content = @Content)
    })
    public ResponseEntity<Page<SecurityLogDTO>> getSecurityLogsByInstallationId(
            @Parameter(description = "ID of the installation to get logs for", required = true)
            @PathVariable Long installationId,
            
            @Parameter(description = "Pagination parameters (page, size, sort)")
            Pageable pageable) {
        Page<SecurityLogDTO> securityLogs = securityLogService.getSecurityLogsByInstallationId(installationId, pageable);
        return ResponseEntity.ok(securityLogs);
    }

    @GetMapping("/admin/installations/{installationId}/audit/activity-type")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(
        summary = "Get logs by activity type",
        description = "Retrieves security audit logs for a specific installation filtered by activity type."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Logs retrieved successfully"),
        @ApiResponse(responseCode = "404", description = "Installation not found", content = @Content),
        @ApiResponse(responseCode = "403", description = "Insufficient permissions", content = @Content)
    })
    public ResponseEntity<List<SecurityLogDTO>> getSecurityLogsByInstallationAndActivityType(
            @Parameter(description = "ID of the installation to get logs for", required = true)
            @PathVariable Long installationId,
            
            @Parameter(description = "Type of activity to filter logs by (e.g., ALERT_GENERATED, SYSTEM_DIAGNOSTIC)", required = true)
            @RequestParam SecurityLog.ActivityType activityType) {
        List<SecurityLogDTO> securityLogs = securityLogService.getSecurityLogsByInstallationAndActivityType(
                installationId, activityType);
        return ResponseEntity.ok(securityLogs);
    }

    @GetMapping("/admin/installations/{installationId}/audit/time-range")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(
        summary = "Get logs by time range",
        description = "Retrieves security audit logs for a specific installation within a specified time range."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Logs retrieved successfully"),
        @ApiResponse(responseCode = "404", description = "Installation not found", content = @Content),
        @ApiResponse(responseCode = "400", description = "Invalid time range parameters", content = @Content),
        @ApiResponse(responseCode = "403", description = "Insufficient permissions", content = @Content)
    })
    public ResponseEntity<List<SecurityLogDTO>> getSecurityLogsByInstallationAndTimeRange(
            @Parameter(description = "ID of the installation to get logs for", required = true)
            @PathVariable Long installationId,
            
            @Parameter(description = "Start date-time of the range (ISO format)", required = true)
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
            
            @Parameter(description = "End date-time of the range (ISO format)", required = true)
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end) {
        List<SecurityLogDTO> securityLogs = securityLogService.getSecurityLogsByInstallationAndTimeRange(
                installationId, start, end);
        return ResponseEntity.ok(securityLogs);
    }

    @GetMapping("/admin/audit")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(
        summary = "Get logs by activity type",
        description = "Retrieves all security audit logs filtered by activity type with pagination support."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Logs retrieved successfully"),
        @ApiResponse(responseCode = "403", description = "Insufficient permissions", content = @Content)
    })
    public ResponseEntity<Page<SecurityLogDTO>> getSecurityLogsByActivityType(
            @Parameter(description = "Type of activity to filter logs by (e.g., ALERT_GENERATED, SYSTEM_DIAGNOSTIC)")
            @RequestParam(required = false) SecurityLog.ActivityType activityType,
            
            @Parameter(description = "Pagination parameters (page, size, sort)")
            Pageable pageable) {
        Page<SecurityLogDTO> securityLogs;
        if (activityType != null) {
            securityLogs = securityLogService.getSecurityLogsByActivityType(activityType, pageable);
        } else {
            // In a real implementation, we would have a method to get all security logs
            // For now, we'll use the activity type method with a default type
            securityLogs = securityLogService.getSecurityLogsByActivityType(
                    SecurityLog.ActivityType.ALERT_GENERATED, pageable);
        }
        return ResponseEntity.ok(securityLogs);
    }

    @GetMapping("/audit")
    @PreAuthorize("hasRole('CUSTOMER')")
    @Operation(
        summary = "Get current user logs",
        description = "Retrieves security audit logs for all installations owned by the currently authenticated user."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Logs retrieved successfully"),
        @ApiResponse(responseCode = "403", description = "Insufficient permissions", content = @Content)
    })
    public ResponseEntity<Page<SecurityLogDTO>> getSecurityLogsByCurrentUser(
            @Parameter(description = "Pagination parameters (page, size, sort)")
            Pageable pageable) {
        User currentUser = userService.getCurrentUser();
        List<SolarInstallation> userInstallations = installationRepository.findByUser(currentUser);
        
        if (userInstallations.isEmpty()) {
            return ResponseEntity.ok(Page.empty(pageable));
        }
        
        List<Long> installationIds = userInstallations.stream()
            .map(SolarInstallation::getId)
            .collect(Collectors.toList());
            
        return ResponseEntity.ok(securityLogService.getSecurityLogsByInstallationIds(installationIds, pageable));
    }
} 