package com.solar.core_services.tampering_detection.controller;

import com.solar.core_services.energy_monitoring.model.SolarInstallation;
import com.solar.core_services.energy_monitoring.repository.SolarInstallationRepository;
import com.solar.core_services.tampering_detection.dto.SecurityLogDTO;
import com.solar.core_services.tampering_detection.model.SecurityLog;
import com.solar.core_services.tampering_detection.repository.SecurityLogRepository;
import com.solar.core_services.tampering_detection.service.SecurityLogService;
import com.solar.exception.ResourceNotFoundException;
import com.solar.user_management.model.User;
import com.solar.user_management.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
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
@Slf4j
@Tag(name = "Security Logs", description = "APIs for accessing security audit logs")
@SecurityRequirement(name = "bearerAuth")
public class SecurityLogController {

    private final SecurityLogService securityLogService;
    private final UserService userService;
    private final SolarInstallationRepository solarInstallationRepository;
    private final SecurityLogRepository securityLogRepository;

    @GetMapping("/admin/installations/{installationId}/audit")
    @PreAuthorize("hasAnyRole('ADMIN', 'ROLE_ADMIN')") // Support both formats
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
        try {
            // Fix for the sort parameter issue
            SolarInstallation installation = solarInstallationRepository.findById(installationId)
                .orElseThrow(() -> new ResourceNotFoundException("Solar installation not found with ID: " + installationId));
            
            // Create a safe pageable object with proper sort
            Pageable safePageable = PageRequest.of(
                pageable.getPageNumber(),
                pageable.getPageSize(),
                pageable.getSortOr(Sort.by(Sort.Direction.DESC, "timestamp"))
            );
            
            // Get logs with the safe pageable
            Page<SecurityLog> securityLogs = securityLogRepository.findByInstallationOrderByTimestampDesc(
                installation, safePageable);
            
            // Convert to DTOs
            Page<SecurityLogDTO> securityLogDTOs = securityLogs.map(securityLog -> {
                SecurityLogDTO dto = new SecurityLogDTO();
                dto.setId(securityLog.getId());
                dto.setInstallationId(securityLog.getInstallation().getId());
                dto.setInstallationLocation(securityLog.getInstallation().getLocation());
                dto.setTimestamp(securityLog.getTimestamp());
                dto.setActivityType(securityLog.getActivityType().name());
                dto.setDetails(securityLog.getDetails());
                dto.setIpAddress(securityLog.getIpAddress());
                dto.setLocation(securityLog.getLocation());
                return dto;
            });
            
            return ResponseEntity.ok(securityLogDTOs);
        } catch (Exception e) {
            log.error("Error retrieving security logs for installation {}: {}", installationId, e.getMessage());
            throw e;
        }
    }

    @GetMapping("/admin/installations/{installationId}/audit/activity-type")
    @PreAuthorize("hasAnyRole('ADMIN', 'ROLE_ADMIN')") // Support both formats
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
            
            @Parameter(description = "Type of activity to filter logs by", required = true)
            @RequestParam String activityType) {
        // Convert string to enum if needed
        SecurityLog.ActivityType activityTypeEnum;
        try {
            activityTypeEnum = SecurityLog.ActivityType.valueOf(activityType);
        } catch (IllegalArgumentException e) {
            // Default to ALERT_GENERATED if the string doesn't match any enum value
            activityTypeEnum = SecurityLog.ActivityType.ALERT_GENERATED;
        }
        
        List<SecurityLogDTO> securityLogs = securityLogService.getSecurityLogsByInstallationAndActivityType(
                installationId, activityTypeEnum);
        return ResponseEntity.ok(securityLogs);
    }

    @GetMapping("/admin/installations/{installationId}/audit/time-range")
    @PreAuthorize("hasAnyRole('ADMIN', 'ROLE_ADMIN')") // Support both formats
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
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startTime,
            
            @Parameter(description = "End date-time of the range (ISO format)", required = true)
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endTime) {
        List<SecurityLogDTO> securityLogs = securityLogService.getSecurityLogsByInstallationAndTimeRange(
                installationId, startTime, endTime);
        return ResponseEntity.ok(securityLogs);
    }

    @GetMapping("/admin/audit")
    @PreAuthorize("hasAnyRole('ADMIN', 'ROLE_ADMIN')") // Support both formats
    @Operation(
        summary = "Get all admin security logs",
        description = "Retrieves all security audit logs with optional filtering by activity type and pagination support."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Logs retrieved successfully"),
        @ApiResponse(responseCode = "403", description = "Insufficient permissions", content = @Content)
    })
    public ResponseEntity<Page<SecurityLogDTO>> getAdminSecurityLogs(
            @Parameter(description = "Type of activity to filter logs by")
            @RequestParam(required = false) String activityType,
            
            @Parameter(description = "Pagination parameters (page, size, sort)")
            Pageable pageable) {
        try {
            // Fix for the sort parameter issue
            // Create a safe pageable object with proper sort
            Pageable safePageable = PageRequest.of(
                pageable.getPageNumber(),
                pageable.getPageSize(),
                pageable.getSortOr(Sort.by(Sort.Direction.DESC, "timestamp"))
            );
            
            Page<SecurityLogDTO> securityLogs;
            
            if (activityType != null && !activityType.isEmpty()) {
                // Convert string to enum if needed
                SecurityLog.ActivityType activityTypeEnum;
                try {
                    activityTypeEnum = SecurityLog.ActivityType.valueOf(activityType);
                    securityLogs = securityLogService.getSecurityLogsByActivityType(activityTypeEnum, safePageable);
                } catch (IllegalArgumentException e) {
                    // If the activity type is invalid, return all logs
                    securityLogs = securityLogService.getAllSecurityLogs(safePageable);
                }
            } else {
                // Call a method to get all security logs without filtering by activity type
                securityLogs = securityLogService.getAllSecurityLogs(safePageable);
            }
            return ResponseEntity.ok(securityLogs);
        } catch (Exception e) {
            log.error("Error retrieving admin security logs: {}", e.getMessage());
            throw e;
        }
    }

    @GetMapping("/audit")
    @PreAuthorize("isAuthenticated()") // Allow any authenticated user
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
        List<SolarInstallation> userInstallations = solarInstallationRepository.findByUser(currentUser);
        
        if (userInstallations.isEmpty()) {
            return ResponseEntity.ok(Page.empty(pageable));
        }
        
        List<Long> installationIds = userInstallations.stream()
            .map(SolarInstallation::getId)
            .collect(Collectors.toList());
            
        return ResponseEntity.ok(securityLogService.getSecurityLogsByInstallationIds(installationIds, pageable));
    }
}