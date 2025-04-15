package com.solar.core_services.service_control.controller;

import com.solar.core_services.service_control.dto.CommandResponseRequest;
import com.solar.core_services.service_control.dto.DeviceCommandDTO;
import com.solar.core_services.service_control.dto.DeviceHeartbeatRequest;
import com.solar.core_services.service_control.dto.SystemOverviewResponse;
import com.solar.core_services.service_control.service.OperationalLogService;
import com.solar.core_services.service_control.service.SystemIntegrationService;
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
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/service/system")
@RequiredArgsConstructor
@Tag(name = "System Integration", description = "APIs for system integration with devices")
public class SystemIntegrationController {

    private final SystemIntegrationService systemIntegrationService;
    private final OperationalLogService operationalLogService;

    @PostMapping("/device-heartbeat")
    @Operation(
        summary = "Receive device heartbeat",
        description = "Receives heartbeat/status updates from devices to monitor their health and operational status."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Heartbeat processed successfully"),
        @ApiResponse(responseCode = "400", description = "Invalid heartbeat data", content = @Content),
        @ApiResponse(responseCode = "404", description = "Installation not found", content = @Content)
    })
    public ResponseEntity<Void> receiveHeartbeat(
            @Parameter(description = "Heartbeat data from the device", required = true)
            @Valid @RequestBody DeviceHeartbeatRequest heartbeat,
            HttpServletRequest request) {
        
        // Process the heartbeat using the integration service
        systemIntegrationService.processDeviceHeartbeat(heartbeat);
        
        // Log the heartbeat operation
        operationalLogService.logOperation(
                heartbeat.getInstallationId(),
                OperationalLog.OperationType.DEVICE_HEARTBEAT,
                "DEVICE:" + heartbeat.getDeviceId(),
                "Received heartbeat from device " + heartbeat.getDeviceId(),
                "DEVICE",
                "HEARTBEAT",
                request.getRemoteAddr(),
                request.getHeader("User-Agent"),
                true,
                null
        );
        
        return ResponseEntity.ok().build();
    }

    @PostMapping("/command-response")
    @Operation(
        summary = "Receive command response",
        description = "Receives command execution results from devices to track command completion status."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Command response processed successfully", 
                    content = @Content(schema = @Schema(implementation = DeviceCommandDTO.class))),
        @ApiResponse(responseCode = "400", description = "Invalid command response data", content = @Content),
        @ApiResponse(responseCode = "404", description = "Command not found", content = @Content)
    })
    public ResponseEntity<DeviceCommandDTO> receiveCommandResponse(
            @Parameter(description = "Command response data from the device", required = true)
            @Valid @RequestBody CommandResponseRequest response,
            HttpServletRequest request) {
        
        // Process the command response using the integration service
        DeviceCommandDTO commandDTO = systemIntegrationService.processCommandResponse(response);
        
        // Log the command response operation
        operationalLogService.logOperation(
                response.getInstallationId(),
                OperationalLog.OperationType.COMMAND_RESPONSE,
                "DEVICE",
                "Received command response for correlation ID " + response.getCorrelationId() + 
                        ", success: " + response.getSuccess(),
                "DEVICE",
                "COMMAND_RESPONSE",
                request.getRemoteAddr(),
                request.getHeader("User-Agent"),
                response.getSuccess(),
                response.getSuccess() ? null : response.getErrorDetails()
        );
        
        return ResponseEntity.ok(commandDTO);
    }
    
    @GetMapping("/overview")
    @Operation(
        summary = "Get system overview",
        description = "Retrieves a comprehensive overview of the entire system including device statuses, alerts, and performance metrics."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "System overview retrieved successfully", 
                    content = @Content(schema = @Schema(implementation = SystemOverviewResponse.class))),
        @ApiResponse(responseCode = "403", description = "Access denied", content = @Content)
    })
    public ResponseEntity<SystemOverviewResponse> getSystemOverview() {
        SystemOverviewResponse overview = systemIntegrationService.getSystemOverview();
        return ResponseEntity.ok(overview);
    }
    
    @GetMapping("/health-check")
    @Operation(
        summary = "Run system health check",
        description = "Performs a comprehensive health check of the system, identifying issues with devices, connectivity, and services."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Health check completed successfully", 
                    content = @Content(schema = @Schema(implementation = Map.class))),
        @ApiResponse(responseCode = "403", description = "Access denied", content = @Content)
    })
    public ResponseEntity<Map<String, Object>> runHealthCheck() {
        // Run the health check using the integration service
        systemIntegrationService.runSystemHealthCheck();
        
        // Create a result map for the response
        Map<String, Object> healthReport = new HashMap<>();
        healthReport.put("status", "completed");
        healthReport.put("message", "Health check completed successfully");
        
        return ResponseEntity.ok(healthReport);
    }
    
    @GetMapping("/health-report")
    @Operation(
        summary = "Generate system health report",
        description = "Generates a detailed health report of the entire system for administrative review."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Health report generated successfully", 
                    content = @Content(schema = @Schema(implementation = String.class))),
        @ApiResponse(responseCode = "403", description = "Access denied", content = @Content)
    })
    public ResponseEntity<String> generateHealthReport() {
        String report = systemIntegrationService.generateSystemHealthReport();
        return ResponseEntity.ok(report);
    }
    
    @PostMapping("/register-device")
    @Operation(
        summary = "Register a new device",
        description = "Registers a new device in the system for a specific installation."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Device registered successfully", 
                    content = @Content(schema = @Schema(implementation = Map.class))),
        @ApiResponse(responseCode = "400", description = "Invalid device data", content = @Content),
        @ApiResponse(responseCode = "403", description = "Access denied", content = @Content)
    })
    public ResponseEntity<Map<String, Object>> registerDevice(
            @Parameter(description = "Installation ID", required = true) @RequestParam Long installationId,
            @Parameter(description = "Device ID", required = true) @RequestParam String deviceId,
            @Parameter(description = "Device type", required = true) @RequestParam String deviceType) {
        
        boolean success = systemIntegrationService.registerDevice(installationId, deviceId, deviceType);
        
        Map<String, Object> response = new HashMap<>();
        response.put("success", success);
        response.put("message", success ? "Device registered successfully" : "Failed to register device");
        
        return ResponseEntity.ok(response);
    }
    
    @PostMapping("/deregister-device")
    @Operation(
        summary = "Deregister a device",
        description = "Removes a device from the system."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Device deregistered successfully", 
                    content = @Content(schema = @Schema(implementation = Map.class))),
        @ApiResponse(responseCode = "400", description = "Invalid device data", content = @Content),
        @ApiResponse(responseCode = "403", description = "Access denied", content = @Content),
        @ApiResponse(responseCode = "404", description = "Device not found", content = @Content)
    })
    public ResponseEntity<Map<String, Object>> deregisterDevice(
            @Parameter(description = "Installation ID", required = true) @RequestParam Long installationId,
            @Parameter(description = "Device ID", required = true) @RequestParam String deviceId) {
        
        boolean success = systemIntegrationService.deregisterDevice(installationId, deviceId);
        
        Map<String, Object> response = new HashMap<>();
        response.put("success", success);
        response.put("message", success ? "Device deregistered successfully" : "Failed to deregister device");
        
        return ResponseEntity.ok(response);
    }
    
    @GetMapping("/device-status")
    @Operation(
        summary = "Check device status",
        description = "Checks if a device is active in the system."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Device status retrieved successfully", 
                    content = @Content(schema = @Schema(implementation = Map.class))),
        @ApiResponse(responseCode = "400", description = "Invalid device ID", content = @Content),
        @ApiResponse(responseCode = "403", description = "Access denied", content = @Content)
    })
    public ResponseEntity<Map<String, Object>> checkDeviceStatus(
            @Parameter(description = "Device ID", required = true) @RequestParam String deviceId) {
        
        boolean isActive = systemIntegrationService.isDeviceActive(deviceId);
        Long lastCommunication = systemIntegrationService.getLastCommunicationTime(deviceId);
        
        Map<String, Object> response = new HashMap<>();
        response.put("deviceId", deviceId);
        response.put("active", isActive);
        response.put("lastCommunication", lastCommunication);
        
        return ResponseEntity.ok(response);
    }
} 