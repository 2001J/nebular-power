package com.solar.core_services.tampering_detection.controller;

import com.solar.core_services.tampering_detection.dto.TamperEventDTO;
import com.solar.core_services.tampering_detection.model.TamperEvent;
import com.solar.core_services.tampering_detection.service.TamperDetectionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/security/detection")
@RequiredArgsConstructor
@Tag(name = "Tamper Detection", description = "APIs for managing tamper detection monitoring and simulation")
@SecurityRequirement(name = "bearerAuth")
public class TamperDetectionController {

    private final TamperDetectionService tamperDetectionService;

    @PostMapping("/installations/{installationId}/start")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(
        summary = "Start monitoring",
        description = "Starts tamper detection monitoring for a specific solar installation."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Monitoring started successfully"),
        @ApiResponse(responseCode = "404", description = "Installation not found", content = @Content),
        @ApiResponse(responseCode = "403", description = "Insufficient permissions", content = @Content)
    })
    public ResponseEntity<Void> startMonitoring(
            @Parameter(description = "ID of the installation to start monitoring", required = true)
            @PathVariable Long installationId) {
        tamperDetectionService.startMonitoring(installationId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/installations/{installationId}/stop")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(
        summary = "Stop monitoring",
        description = "Stops tamper detection monitoring for a specific solar installation."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Monitoring stopped successfully"),
        @ApiResponse(responseCode = "404", description = "Installation not found", content = @Content),
        @ApiResponse(responseCode = "403", description = "Insufficient permissions", content = @Content)
    })
    public ResponseEntity<Void> stopMonitoring(
            @Parameter(description = "ID of the installation to stop monitoring", required = true)
            @PathVariable Long installationId) {
        tamperDetectionService.stopMonitoring(installationId);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/installations/{installationId}/status")
    @PreAuthorize("hasAnyRole('ADMIN', 'CUSTOMER')")
    @Operation(
        summary = "Check monitoring status",
        description = "Checks if tamper detection monitoring is active for a specific solar installation."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Status retrieved successfully"),
        @ApiResponse(responseCode = "404", description = "Installation not found", content = @Content),
        @ApiResponse(responseCode = "403", description = "Insufficient permissions", content = @Content)
    })
    public ResponseEntity<Boolean> isMonitoring(
            @Parameter(description = "ID of the installation to check monitoring status", required = true)
            @PathVariable Long installationId) {
        boolean isMonitoring = tamperDetectionService.isMonitoring(installationId);
        return ResponseEntity.ok(isMonitoring);
    }

    @PostMapping("/installations/{installationId}/diagnostics")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(
        summary = "Run diagnostics",
        description = "Runs diagnostic tests on the tamper detection system for a specific installation."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Diagnostics completed successfully"),
        @ApiResponse(responseCode = "404", description = "Installation not found", content = @Content),
        @ApiResponse(responseCode = "403", description = "Insufficient permissions", content = @Content)
    })
    public ResponseEntity<Void> runDiagnostics(
            @Parameter(description = "ID of the installation to run diagnostics on", required = true)
            @PathVariable Long installationId) {
        tamperDetectionService.runDiagnostics(installationId);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/installations/{installationId}/sensitivity/{eventType}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(
        summary = "Adjust sensitivity",
        description = "Adjusts the sensitivity threshold for a specific type of tamper event detection."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Sensitivity adjusted successfully"),
        @ApiResponse(responseCode = "404", description = "Installation not found", content = @Content),
        @ApiResponse(responseCode = "400", description = "Invalid event type or threshold value", content = @Content),
        @ApiResponse(responseCode = "403", description = "Insufficient permissions", content = @Content)
    })
    public ResponseEntity<Void> adjustSensitivity(
            @Parameter(description = "ID of the installation to adjust sensitivity for", required = true)
            @PathVariable Long installationId,
            
            @Parameter(description = "Type of tamper event (e.g., PHYSICAL_MOVEMENT, VOLTAGE_FLUCTUATION)", required = true)
            @PathVariable String eventType,
            
            @Parameter(description = "New threshold value (0.0-1.0, where higher values require stronger signals to trigger)", required = true)
            @RequestParam double threshold) {
        tamperDetectionService.adjustSensitivity(installationId, eventType, threshold);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/installations/{installationId}/simulate/movement")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(
        summary = "Simulate physical movement",
        description = "Simulates physical movement detection for testing the tamper detection system."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Simulation processed successfully", 
                    content = @Content(schema = @Schema(implementation = TamperEventDTO.class))),
        @ApiResponse(responseCode = "404", description = "Installation not found", content = @Content),
        @ApiResponse(responseCode = "403", description = "Insufficient permissions", content = @Content)
    })
    public ResponseEntity<TamperEventDTO> simulateMovement(
            @Parameter(description = "ID of the installation to simulate movement for", required = true)
            @PathVariable Long installationId,
            
            @Parameter(description = "Simulated movement value (e.g., acceleration in g)", required = true)
            @RequestParam double movementValue,
            
            @Parameter(description = "Optional raw sensor data in JSON format")
            @RequestParam(required = false) String rawData) {
        TamperEventDTO tamperEventDTO = tamperDetectionService.processPhysicalMovementData(
                installationId, movementValue, rawData);
        return ResponseEntity.ok(tamperEventDTO);
    }

    @PostMapping("/installations/{installationId}/simulate/voltage")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(
        summary = "Simulate voltage fluctuation",
        description = "Simulates voltage fluctuation detection for testing the tamper detection system."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Simulation processed successfully", 
                    content = @Content(schema = @Schema(implementation = TamperEventDTO.class))),
        @ApiResponse(responseCode = "404", description = "Installation not found", content = @Content),
        @ApiResponse(responseCode = "403", description = "Insufficient permissions", content = @Content)
    })
    public ResponseEntity<TamperEventDTO> simulateVoltageFluctuation(
            @Parameter(description = "ID of the installation to simulate voltage fluctuation for", required = true)
            @PathVariable Long installationId,
            
            @Parameter(description = "Simulated voltage value (in volts)", required = true)
            @RequestParam double voltageValue,
            
            @Parameter(description = "Optional raw sensor data in JSON format")
            @RequestParam(required = false) String rawData) {
        TamperEventDTO tamperEventDTO = tamperDetectionService.processVoltageFluctuationData(
                installationId, voltageValue, rawData);
        return ResponseEntity.ok(tamperEventDTO);
    }

    @PostMapping("/installations/{installationId}/simulate/connection")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(
        summary = "Simulate connection interruption",
        description = "Simulates connection interruption detection for testing the tamper detection system."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Simulation processed successfully", 
                    content = @Content(schema = @Schema(implementation = TamperEventDTO.class))),
        @ApiResponse(responseCode = "404", description = "Installation not found", content = @Content),
        @ApiResponse(responseCode = "403", description = "Insufficient permissions", content = @Content)
    })
    public ResponseEntity<TamperEventDTO> simulateConnectionInterruption(
            @Parameter(description = "ID of the installation to simulate connection interruption for", required = true)
            @PathVariable Long installationId,
            
            @Parameter(description = "Connection status (true = connected, false = disconnected)", required = true)
            @RequestParam boolean connected,
            
            @Parameter(description = "Optional raw sensor data in JSON format")
            @RequestParam(required = false) String rawData) {
        TamperEventDTO tamperEventDTO = tamperDetectionService.processConnectionInterruptionData(
                installationId, connected, rawData);
        return ResponseEntity.ok(tamperEventDTO);
    }

    @PostMapping("/installations/{installationId}/simulate/location")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(
        summary = "Simulate location change",
        description = "Simulates location change detection for testing the tamper detection system."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Simulation processed successfully", 
                    content = @Content(schema = @Schema(implementation = TamperEventDTO.class))),
        @ApiResponse(responseCode = "404", description = "Installation not found", content = @Content),
        @ApiResponse(responseCode = "403", description = "Insufficient permissions", content = @Content)
    })
    public ResponseEntity<TamperEventDTO> simulateLocationChange(
            @Parameter(description = "ID of the installation to simulate location change for", required = true)
            @PathVariable Long installationId,
            
            @Parameter(description = "New location coordinates or description", required = true)
            @RequestParam String newLocation,
            
            @Parameter(description = "Previous location coordinates or description", required = true)
            @RequestParam String previousLocation,
            
            @Parameter(description = "Optional raw sensor data in JSON format")
            @RequestParam(required = false) String rawData) {
        TamperEventDTO tamperEventDTO = tamperDetectionService.processLocationChangeData(
                installationId, newLocation, previousLocation, rawData);
        return ResponseEntity.ok(tamperEventDTO);
    }

    @PostMapping("/installations/{installationId}/simulate/tamper")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(
        summary = "Simulate generic tampering",
        description = "Simulates a generic tampering event for testing the tamper detection system."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Simulation processed successfully", 
                    content = @Content(schema = @Schema(implementation = TamperEventDTO.class))),
        @ApiResponse(responseCode = "404", description = "Installation not found", content = @Content),
        @ApiResponse(responseCode = "403", description = "Insufficient permissions", content = @Content)
    })
    public ResponseEntity<TamperEventDTO> simulateTampering(
            @Parameter(description = "ID of the installation to simulate tampering for", required = true)
            @PathVariable Long installationId,
            
            @Parameter(description = "Type of tamper event to simulate", required = true)
            @RequestParam TamperEvent.TamperEventType eventType,
            
            @Parameter(description = "Confidence score for the tamper detection (0.0-1.0)", required = true)
            @RequestParam double confidenceScore,
            
            @Parameter(description = "Description of the simulated tampering event", required = true)
            @RequestParam String description,
            
            @Parameter(description = "Optional raw sensor data in JSON format")
            @RequestParam(required = false) String rawData) {
        TamperEventDTO tamperEventDTO = tamperDetectionService.detectTampering(
                installationId, eventType, confidenceScore, description, rawData);
        return ResponseEntity.ok(tamperEventDTO);
    }
} 