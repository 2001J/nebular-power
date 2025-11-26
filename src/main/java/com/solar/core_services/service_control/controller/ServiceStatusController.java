package com.solar.core_services.service_control.controller;

import com.solar.core_services.service_control.dto.MaintenanceRequest;
import com.solar.core_services.service_control.dto.ServiceStatusDTO;
import com.solar.core_services.service_control.dto.ServiceStatusUpdateRequest;
import com.solar.core_services.service_control.exception.InvalidServiceStateException;
import com.solar.core_services.service_control.exception.ServiceStatusNotFoundException;
import com.solar.core_services.service_control.model.OperationalLog;
import com.solar.core_services.service_control.model.ServiceStatus;
import com.solar.core_services.service_control.service.OperationalLogService;
import com.solar.core_services.service_control.service.ServiceStatusService;
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
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.function.Supplier;

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
        
        return handleServiceStatusOperation(
                installationId,
                () -> serviceStatusService.getCurrentStatus(installationId),
                HttpStatus.NOT_FOUND,
                "Get current status"
        );
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
        return handleServiceStatusOperation(
                installationId,
                () -> {
                    ServiceStatusDTO updatedStatus = serviceStatusService.updateServiceStatus(installationId, request, username);

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
                        log.error("Failed to log operation: {}", e.getMessage());
                    }

                    return updatedStatus;
                },
                HttpStatus.BAD_REQUEST,
                "Update service status"
        );
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
        return handleServiceStatusOperation(
                installationId,
                () -> {
                    ServiceStatusDTO updatedStatus = serviceStatusService.suspendServiceForPayment(installationId, reason, username);

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
                        log.error("Failed to log operation: {}", e.getMessage());
                    }

                    return updatedStatus;
                },
                HttpStatus.CONFLICT,
                "Suspend service for payment"
        );
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
        return handleServiceStatusOperation(
                installationId,
                () -> {
                    ServiceStatusDTO updatedStatus = serviceStatusService.suspendServiceForSecurity(installationId, reason, username);

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
                        log.error("Failed to log operation: {}", e.getMessage());
                    }

                    return updatedStatus;
                },
                HttpStatus.CONFLICT,
                "Suspend service for security"
        );
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
    return handleServiceStatusOperation(
        installationId,
        () -> {
            ServiceStatusDTO updatedStatus = serviceStatusService.suspendServiceForMaintenance(
                installationId, request.getReason(), username);

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
            log.error("Failed to log operation: {}", e.getMessage());
            }

            return updatedStatus;
        },
        HttpStatus.CONFLICT,
        "Suspend service for maintenance"
    );
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
        return handleServiceStatusOperation(
                installationId,
                () -> {
                    ServiceStatusDTO updatedStatus = serviceStatusService.restoreService(installationId, reason, username);

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
                        log.error("Failed to log operation: {}", e.getMessage());
                    }

                    return updatedStatus;
                },
                HttpStatus.CONFLICT,
                "Restore service"
        );
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

    /**
     * @deprecated This endpoint directly updates the backend status without sending a command to the device.
     * Use /installations/{id}/schedule or wait for device to report its own status.
     */
    @Deprecated(since = "2.0", forRemoval = true)
    @PostMapping("/installations/{installationId}/start")
    @Operation(
        summary = "[DEPRECATED] Start service",
        description = "⚠️ DEPRECATED: This endpoint directly updates backend status without controlling the device. " +
                     "Use /installations/{id}/schedule to schedule activation or wait for device to come online and report status.",
        deprecated = true
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "501", description = "Not Implemented - Use schedule endpoint instead", content = @Content),
        @ApiResponse(responseCode = "404", description = "Installation not found", content = @Content)
    })
    public ResponseEntity<ServiceStatusDTO> startService(
            @Parameter(description = "Installation ID", required = true)
            @PathVariable Long installationId,
            Authentication authentication,
            HttpServletRequest httpRequest) {
        
        String username = authentication.getName();
        try {
            serviceStatusService.startService(installationId, username);
        } catch (UnsupportedOperationException e) {
            // Expected - this method is deprecated
        }
        
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED).build();
    }

    /**
     * @deprecated This endpoint directly updates the backend status without sending a command to the device.
     * Use /installations/{id}/suspend with a proper suspension reason.
     */
    @Deprecated(since = "2.0", forRemoval = true)
    @PostMapping("/installations/{installationId}/stop")
    @Operation(
        summary = "[DEPRECATED] Stop service",
        description = "⚠️ DEPRECATED: This endpoint directly updates backend status without controlling the device. " +
                     "Use /installations/{id}/suspend with a proper reason (PAYMENT, SECURITY, or MAINTENANCE).",
        deprecated = true
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "501", description = "Not Implemented - Use suspend endpoint instead", content = @Content),
        @ApiResponse(responseCode = "404", description = "Installation not found", content = @Content)
    })
    public ResponseEntity<ServiceStatusDTO> stopService(
            @Parameter(description = "Installation ID", required = true)
            @PathVariable Long installationId,
            Authentication authentication,
            HttpServletRequest httpRequest) {
        
        String username = authentication.getName();
        try {
            serviceStatusService.stopService(installationId, username);
        } catch (UnsupportedOperationException e) {
            // Expected - this method is deprecated
        }
        
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED).build();
    }

    @PostMapping("/installations/{installationId}/restart")
    @Operation(
        summary = "Restart service",
        description = "Initiates a service restart for a specific installation. " +
                     "This temporarily sets status to TRANSITIONING, then schedules restoration to ACTIVE. " +
                     "In a full implementation, this should send a restart command to the device."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Service restart initiated", 
                    content = @Content(schema = @Schema(implementation = ServiceStatusDTO.class))),
        @ApiResponse(responseCode = "404", description = "Installation not found", content = @Content),
        @ApiResponse(responseCode = "400", description = "Service not in restartable state", content = @Content)
    })
    public ResponseEntity<ServiceStatusDTO> restartService(
            @Parameter(description = "Installation ID", required = true)
            @PathVariable Long installationId,
            Authentication authentication,
            HttpServletRequest httpRequest) {
        
        String username = authentication.getName();
        return handleServiceStatusOperation(
                installationId,
                () -> {
                    ServiceStatusDTO updatedStatus = serviceStatusService.restartService(installationId, username);

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
                        log.error("Failed to log operation: {}", e.getMessage());
                    }

                    return updatedStatus;
                },
                HttpStatus.CONFLICT,
                "Restart service"
        );
    }

    @PostMapping("/device-report")
    @Operation(
        summary = "Receive device status report",
        description = "Endpoint for Pi devices to report their current status to the backend. " +
                     "This enables bi-directional communication and keeps the backend synchronized with device state."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Device status report received successfully"),
        @ApiResponse(responseCode = "400", description = "Invalid status report data", content = @Content),
        @ApiResponse(responseCode = "404", description = "Installation not found", content = @Content)
    })
    public ResponseEntity<Void> receiveDeviceStatusReport(
            @Parameter(description = "Device status report", required = true)
            @Valid @RequestBody com.solar.core_services.service_control.dto.DeviceStatusReportDTO statusReport) {
        
        log.info("Received device status report for installation {}: status={}, reason={}", 
                statusReport.getInstallationId(), 
                statusReport.getStatus(), 
                statusReport.getReason());
        
        try {
            // Process the device status report
            serviceStatusService.processDeviceStatusReport(statusReport);
            
            // Log successful report reception
            log.debug("Successfully processed status report from installation {}", 
                     statusReport.getInstallationId());
            
            return ResponseEntity.ok().build();
            
        } catch (Exception e) {
            log.error("Error processing device status report for installation {}: {}", 
                     statusReport.getInstallationId(), 
                     e.getMessage(), 
                     e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    private ResponseEntity<ServiceStatusDTO> handleServiceStatusOperation(
            Long installationId,
            Supplier<ServiceStatusDTO> operation,
            HttpStatus statusOnNotFound,
            String actionDescription) {

        try {
            ServiceStatusDTO result = operation.get();
            return ResponseEntity.ok(result);
        } catch (ServiceStatusNotFoundException e) {
            log.warn("{} failed for installation {}: {}", actionDescription, installationId, e.getMessage());
            throw new ResponseStatusException(statusOnNotFound, e.getMessage(), e);
        } catch (InvalidServiceStateException e) {
            log.warn("{} rejected for installation {}: {}", actionDescription, installationId, e.getMessage());
            throw new ResponseStatusException(HttpStatus.CONFLICT, e.getMessage(), e);
        } catch (IllegalArgumentException e) {
            log.warn("{} invalid input for installation {}: {}", actionDescription, installationId, e.getMessage());
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage(), e);
        } catch (RuntimeException e) {
            log.error("{} failed for installation {}: {}", actionDescription, installationId, e.getMessage(), e);
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, e.getMessage(), e);
        }
    }
} 