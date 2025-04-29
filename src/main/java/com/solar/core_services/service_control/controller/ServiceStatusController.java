package com.solar.core_services.service_control.controller;

import com.solar.core_services.service_control.dto.ServiceStatusDTO;
import com.solar.core_services.service_control.dto.ServiceStatusUpdateRequest;
import com.solar.core_services.service_control.dto.MaintenanceRequest;
import com.solar.core_services.service_control.model.ServiceStatus;
import com.solar.core_services.service_control.service.ServiceStatusService;
import com.solar.core_services.service_control.service.OperationalLogService;
import com.solar.core_services.service_control.model.OperationalLog;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/service/status")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Service Status", description = "APIs for managing service status operations")
public class ServiceStatusController {

    private final ServiceStatusService serviceStatusService;
    private final OperationalLogService operationalLogService;

    @GetMapping("/{installationId}")
    @Operation(
        summary = "Get current service status",
        description = "Retrieves the current service status for a specific installation."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Service status retrieved successfully", 
                    content = @Content(schema = @Schema(implementation = ServiceStatusDTO.class))),
        @ApiResponse(responseCode = "404", description = "Installation not found", content = @Content)
    })
    public ResponseEntity<ServiceStatusDTO> getCurrentStatus(
            @Parameter(description = "Installation ID", required = true)
            @PathVariable Long installationId) {
        
        ServiceStatusDTO status = serviceStatusService.getCurrentStatus(installationId);
        return ResponseEntity.ok(status);
    }

    @GetMapping("/{installationId}/history")
    @Operation(
        summary = "Get service status history",
        description = "Retrieves the history of service status changes for a specific installation."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Service status history retrieved successfully"),
        @ApiResponse(responseCode = "404", description = "Installation not found", content = @Content)
    })
    public ResponseEntity<Page<ServiceStatusDTO>> getStatusHistory(
            @Parameter(description = "Installation ID", required = true)
            @PathVariable Long installationId,
            @PageableDefault(size = 20) Pageable pageable) {
        
        Page<ServiceStatusDTO> statusHistory = serviceStatusService.getStatusHistory(installationId, pageable);
        return ResponseEntity.ok(statusHistory);
    }

    @PutMapping("/{installationId}")
    @Operation(
        summary = "Update service status",
        description = "Updates the service status for a specific installation."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Service status updated successfully", 
                    content = @Content(schema = @Schema(implementation = ServiceStatusDTO.class))),
        @ApiResponse(responseCode = "400", description = "Invalid status update request", content = @Content),
        @ApiResponse(responseCode = "404", description = "Installation not found", content = @Content)
    })
    public ResponseEntity<ServiceStatusDTO> updateServiceStatus(
            @Parameter(description = "Installation ID", required = true)
            @PathVariable Long installationId,
            @Parameter(description = "Service status update details", required = true)
            @Valid @RequestBody ServiceStatusUpdateRequest request,
            Authentication authentication,
            HttpServletRequest httpRequest) {
        
        String username = authentication.getName();
        ServiceStatusDTO updatedStatus = serviceStatusService.updateServiceStatus(installationId, request, username);
        
        // Log the operation with error handling
        try {
            operationalLogService.logOperation(
                    installationId,
                    OperationalLog.OperationType.SERVICE_STATUS_UPDATE,
                    username,
                    "Updated service status to " + request.getStatus() + " with reason: " + request.getStatusReason(),
                    "SERVICE_CONTROL",
                    "STATUS_UPDATE",
                    httpRequest.getRemoteAddr(),
                    httpRequest.getHeader("User-Agent"),
                    true,
                    null
            );
        } catch (Exception e) {
            // Log the error but don't prevent the operation from succeeding
            log.error("Failed to log operation: {}", e.getMessage());
        }
        
        return ResponseEntity.ok(updatedStatus);
    }

    @PostMapping("/{installationId}/suspend/payment")
    @Operation(
        summary = "Suspend service for payment issues",
        description = "Suspends service for a specific installation due to payment issues."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Service suspended successfully", 
                    content = @Content(schema = @Schema(implementation = ServiceStatusDTO.class))),
        @ApiResponse(responseCode = "404", description = "Installation not found", content = @Content)
    })
    public ResponseEntity<ServiceStatusDTO> suspendServiceForPayment(
            @Parameter(description = "Installation ID", required = true)
            @PathVariable Long installationId,
            @Parameter(description = "Reason for suspension", required = true)
            @RequestParam String reason,
            Authentication authentication,
            HttpServletRequest httpRequest) {
        
        String username = authentication.getName();
        ServiceStatusDTO updatedStatus = serviceStatusService.suspendServiceForPayment(installationId, reason, username);
        
        // Log the operation with error handling
        try {
            operationalLogService.logOperation(
                    installationId,
                    OperationalLog.OperationType.SERVICE_SUSPENSION,
                    username,
                    "Suspended service for payment issues. Reason: " + reason,
                    "SERVICE_CONTROL",
                    "PAYMENT_SUSPENSION",
                    httpRequest.getRemoteAddr(),
                    httpRequest.getHeader("User-Agent"),
                    true,
                    null
            );
        } catch (Exception e) {
            // Log the error but don't prevent the operation from succeeding
            log.error("Failed to log operation: {}", e.getMessage());
        }
        
        return ResponseEntity.ok(updatedStatus);
    }

    @PostMapping("/{installationId}/suspend/security")
    @Operation(
        summary = "Suspend service for security issues",
        description = "Suspends service for a specific installation due to security concerns."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Service suspended successfully", 
                    content = @Content(schema = @Schema(implementation = ServiceStatusDTO.class))),
        @ApiResponse(responseCode = "404", description = "Installation not found", content = @Content)
    })
    public ResponseEntity<ServiceStatusDTO> suspendServiceForSecurity(
            @Parameter(description = "Installation ID", required = true)
            @PathVariable Long installationId,
            @Parameter(description = "Reason for suspension", required = true)
            @RequestParam String reason,
            Authentication authentication,
            HttpServletRequest httpRequest) {
        
        String username = authentication.getName();
        ServiceStatusDTO updatedStatus = serviceStatusService.suspendServiceForSecurity(installationId, reason, username);
        
        // Log the operation with error handling
        try {
            operationalLogService.logOperation(
                    installationId,
                    OperationalLog.OperationType.SERVICE_SUSPENSION,
                    username,
                    "Suspended service for security issues. Reason: " + reason,
                    "SERVICE_CONTROL",
                    "SECURITY_SUSPENSION",
                    httpRequest.getRemoteAddr(),
                    httpRequest.getHeader("User-Agent"),
                    true,
                    null
            );
        } catch (Exception e) {
            // Log the error but don't prevent the operation from succeeding
            log.error("Failed to log operation: {}", e.getMessage());
        }
        
        return ResponseEntity.ok(updatedStatus);
    }

    @PostMapping("/{installationId}/suspend/maintenance")
    @Operation(
        summary = "Suspend service for maintenance",
        description = "Suspends service for a specific installation due to scheduled maintenance."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Service suspended successfully", 
                    content = @Content(schema = @Schema(implementation = ServiceStatusDTO.class))),
        @ApiResponse(responseCode = "404", description = "Installation not found", content = @Content)
    })
    public ResponseEntity<ServiceStatusDTO> suspendServiceForMaintenance(
            @Parameter(description = "Installation ID", required = true)
            @PathVariable Long installationId,
            @Parameter(description = "Maintenance request details", required = true)
            @Valid @RequestBody MaintenanceRequest request,
            Authentication authentication,
            HttpServletRequest httpRequest) {
        
        String username = authentication.getName();
        ServiceStatusDTO updatedStatus = serviceStatusService.suspendServiceForMaintenance(
                installationId, request.getReason(), username);
        
        // Log the operation with error handling
        try {
            operationalLogService.logOperation(
                    installationId,
                    OperationalLog.OperationType.SERVICE_SUSPENSION,
                    username,
                    "Suspended service for maintenance. Reason: " + request.getReason() + 
                            ", Scheduled: " + request.getStartTime() + " to " + request.getEndTime(),
                    "SERVICE_CONTROL",
                    "MAINTENANCE_SUSPENSION",
                    httpRequest.getRemoteAddr(),
                    httpRequest.getHeader("User-Agent"),
                    true,
                    null
            );
        } catch (Exception e) {
            // Log the error but don't prevent the operation from succeeding
            log.error("Failed to log operation: {}", e.getMessage());
        }
        
        return ResponseEntity.ok(updatedStatus);
    }

    @PostMapping("/{installationId}/restore")
    @Operation(
        summary = "Restore service",
        description = "Restores service for a specific installation after suspension."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Service restored successfully", 
                    content = @Content(schema = @Schema(implementation = ServiceStatusDTO.class))),
        @ApiResponse(responseCode = "404", description = "Installation not found", content = @Content)
    })
    public ResponseEntity<ServiceStatusDTO> restoreService(
            @Parameter(description = "Installation ID", required = true)
            @PathVariable Long installationId,
            @Parameter(description = "Reason for restoration", required = true)
            @RequestParam String reason,
            Authentication authentication,
            HttpServletRequest httpRequest) {
        
        String username = authentication.getName();
        ServiceStatusDTO updatedStatus = serviceStatusService.restoreService(installationId, reason, username);
        
        // Log the operation with error handling
        try {
            operationalLogService.logOperation(
                    installationId,
                    OperationalLog.OperationType.SERVICE_RESTORATION,
                    username,
                    "Restored service. Reason: " + reason,
                    "SERVICE_CONTROL",
                    "SERVICE_RESTORATION",
                    httpRequest.getRemoteAddr(),
                    httpRequest.getHeader("User-Agent"),
                    true,
                    null
            );
        } catch (Exception e) {
            // Log the error but don't prevent the operation from succeeding
            log.error("Failed to log operation: {}", e.getMessage());
        }
        
        return ResponseEntity.ok(updatedStatus);
    }

    @PostMapping("/{installationId}/schedule")
    @Operation(
        summary = "Schedule status change",
        description = "Schedules a future service status change for a specific installation."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Status change scheduled successfully", 
                    content = @Content(schema = @Schema(implementation = ServiceStatusDTO.class))),
        @ApiResponse(responseCode = "400", description = "Invalid schedule request", content = @Content),
        @ApiResponse(responseCode = "404", description = "Installation not found", content = @Content)
    })
    public ResponseEntity<ServiceStatusDTO> scheduleStatusChange(
            @Parameter(description = "Installation ID", required = true)
            @PathVariable Long installationId,
            @Parameter(description = "Target service state", required = true)
            @RequestParam ServiceStatus.ServiceState targetStatus,
            @Parameter(description = "Reason for status change", required = true)
            @RequestParam String reason,
            @Parameter(description = "Scheduled time for the change", required = true)
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime scheduledTime,
            Authentication authentication,
            HttpServletRequest httpRequest) {
        
        String username = authentication.getName();
        ServiceStatusDTO scheduledStatus = serviceStatusService.scheduleStatusChange(
                installationId, targetStatus, reason, scheduledTime, username);
        
        // Log the operation with error handling
        try {
            operationalLogService.logOperation(
                    installationId,
                    OperationalLog.OperationType.STATUS_CHANGE_SCHEDULED,
                    username,
                    "Scheduled status change to " + targetStatus + " at " + scheduledTime + ". Reason: " + reason,
                    "SERVICE_CONTROL",
                    "SCHEDULE_STATUS_CHANGE",
                    httpRequest.getRemoteAddr(),
                    httpRequest.getHeader("User-Agent"),
                    true,
                    null
            );
        } catch (Exception e) {
            // Log the error but don't prevent the operation from succeeding
            log.error("Failed to log operation: {}", e.getMessage());
        }
        
        return ResponseEntity.ok(scheduledStatus);
    }

    @DeleteMapping("/{installationId}/schedule")
    @Operation(
        summary = "Cancel scheduled status change",
        description = "Cancels a previously scheduled service status change for a specific installation."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Scheduled change cancelled successfully"),
        @ApiResponse(responseCode = "404", description = "Installation not found or no scheduled change", content = @Content)
    })
    public ResponseEntity<ServiceStatusDTO> cancelScheduledChange(
            @Parameter(description = "Installation ID", required = true)
            @PathVariable Long installationId,
            Authentication authentication,
            HttpServletRequest httpRequest) {
        
        String username = authentication.getName();
        ServiceStatusDTO updatedStatus = serviceStatusService.cancelScheduledChange(installationId, username);
        
        // Log the operation with error handling
        try {
            operationalLogService.logOperation(
                    installationId,
                    OperationalLog.OperationType.SCHEDULED_CHANGE_CANCELLED,
                    username,
                    "Cancelled scheduled status change",
                    "SERVICE_CONTROL",
                    "CANCEL_SCHEDULED_CHANGE",
                    httpRequest.getRemoteAddr(),
                    httpRequest.getHeader("User-Agent"),
                    true,
                    null
            );
        } catch (Exception e) {
            // Log the error but don't prevent the operation from succeeding
            log.error("Failed to log operation: {}", e.getMessage());
        }
        
        return ResponseEntity.ok(updatedStatus);
    }

    @GetMapping("/user/{userId}")
    @Operation(
        summary = "Get statuses by user ID",
        description = "Retrieves service statuses for all installations associated with a specific user."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Service statuses retrieved successfully"),
        @ApiResponse(responseCode = "404", description = "User not found", content = @Content)
    })
    public ResponseEntity<List<ServiceStatusDTO>> getStatusesByUserId(
            @Parameter(description = "User ID", required = true)
            @PathVariable Long userId) {
        
        List<ServiceStatusDTO> statuses = serviceStatusService.getStatusesByUserId(userId);
        return ResponseEntity.ok(statuses);
    }

    @GetMapping("/by-state")
    @Operation(
        summary = "Get installations by status",
        description = "Retrieves all installations with a specific service status."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Installations retrieved successfully")
    })
    public ResponseEntity<Page<ServiceStatusDTO>> getInstallationsByStatus(
            @Parameter(description = "Service state to filter by", required = true)
            @RequestParam ServiceStatus.ServiceState status,
            @PageableDefault(size = 20) Pageable pageable) {
        
        Page<ServiceStatusDTO> installations = serviceStatusService.getInstallationsByStatus(status, pageable);
        return ResponseEntity.ok(installations);
    }

    @PostMapping("/batch")
    @Operation(
        summary = "Get statuses for multiple installations",
        description = "Retrieves service statuses for multiple installations in a single request."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Service statuses retrieved successfully")
    })
    public ResponseEntity<List<ServiceStatusDTO>> getBatchStatuses(
            @Parameter(description = "List of installation IDs to retrieve statuses for", required = true)
            @RequestBody List<Long> installationIds) {
        
        log.info("Getting service statuses for {} installations", installationIds.size());
        
        List<ServiceStatusDTO> statuses = serviceStatusService.getBatchStatuses(installationIds);
        
        return ResponseEntity.ok(statuses);
    }

    @PostMapping("/installations/{installationId}/start")
    @Operation(
        summary = "Start service",
        description = "Starts the service for a specific installation."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Service started successfully", 
                    content = @Content(schema = @Schema(implementation = ServiceStatusDTO.class))),
        @ApiResponse(responseCode = "404", description = "Installation not found", content = @Content)
    })
    public ResponseEntity<ServiceStatusDTO> startService(
            @Parameter(description = "Installation ID", required = true)
            @PathVariable Long installationId,
            Authentication authentication,
            HttpServletRequest httpRequest) {
        
        String username = authentication.getName();
        ServiceStatusDTO updatedStatus = serviceStatusService.startService(installationId, username);
        
        // Log the operation with error handling
        try {
            operationalLogService.logOperation(
                    installationId,
                    OperationalLog.OperationType.SERVICE_STARTED,
                    username,
                    "Started service for installation #" + installationId,
                    "SERVICE_CONTROL",
                    "START_SERVICE",
                    httpRequest.getRemoteAddr(),
                    httpRequest.getHeader("User-Agent"),
                    true,
                    null
            );
        } catch (Exception e) {
            // Log the error but don't prevent the operation from succeeding
            log.error("Failed to log operation: {}", e.getMessage());
        }
        
        return ResponseEntity.ok(updatedStatus);
    }

    @PostMapping("/installations/{installationId}/stop")
    @Operation(
        summary = "Stop service",
        description = "Stops the service for a specific installation."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Service stopped successfully", 
                    content = @Content(schema = @Schema(implementation = ServiceStatusDTO.class))),
        @ApiResponse(responseCode = "404", description = "Installation not found", content = @Content)
    })
    public ResponseEntity<ServiceStatusDTO> stopService(
            @Parameter(description = "Installation ID", required = true)
            @PathVariable Long installationId,
            Authentication authentication,
            HttpServletRequest httpRequest) {
        
        String username = authentication.getName();
        ServiceStatusDTO updatedStatus = serviceStatusService.stopService(installationId, username);
        
        // Log the operation with error handling
        try {
            operationalLogService.logOperation(
                    installationId,
                    OperationalLog.OperationType.SERVICE_STOPPED,
                    username,
                    "Stopped service for installation #" + installationId,
                    "SERVICE_CONTROL",
                    "STOP_SERVICE",
                    httpRequest.getRemoteAddr(),
                    httpRequest.getHeader("User-Agent"),
                    true,
                    null
            );
        } catch (Exception e) {
            // Log the error but don't prevent the operation from succeeding
            log.error("Failed to log operation: {}", e.getMessage());
        }
        
        return ResponseEntity.ok(updatedStatus);
    }

    @PostMapping("/installations/{installationId}/restart")
    @Operation(
        summary = "Restart service",
        description = "Restarts the service for a specific installation."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Service restarted successfully", 
                    content = @Content(schema = @Schema(implementation = ServiceStatusDTO.class))),
        @ApiResponse(responseCode = "404", description = "Installation not found", content = @Content)
    })
    public ResponseEntity<ServiceStatusDTO> restartService(
            @Parameter(description = "Installation ID", required = true)
            @PathVariable Long installationId,
            Authentication authentication,
            HttpServletRequest httpRequest) {
        
        String username = authentication.getName();
        ServiceStatusDTO updatedStatus = serviceStatusService.restartService(installationId, username);
        
        // Log the operation with error handling
        try {
            operationalLogService.logOperation(
                    installationId,
                    OperationalLog.OperationType.SERVICE_RESTARTED,
                    username,
                    "Restarted service for installation #" + installationId,
                    "SERVICE_CONTROL",
                    "RESTART_SERVICE",
                    httpRequest.getRemoteAddr(),
                    httpRequest.getHeader("User-Agent"),
                    true,
                    null
            );
        } catch (Exception e) {
            // Log the error but don't prevent the operation from succeeding
            log.error("Failed to log operation: {}", e.getMessage());
        }
        
        return ResponseEntity.ok(updatedStatus);
    }
} 