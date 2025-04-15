package com.solar.core_services.tampering_detection.controller;

import com.solar.core_services.energy_monitoring.model.SolarInstallation;
import com.solar.core_services.energy_monitoring.repository.SolarInstallationRepository;
import com.solar.core_services.tampering_detection.dto.AlertConfigDTO;
import com.solar.core_services.tampering_detection.dto.AlertConfigUpdateDTO;
import com.solar.core_services.tampering_detection.model.AlertConfig;
import com.solar.core_services.tampering_detection.service.AlertConfigService;
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
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/security")
@RequiredArgsConstructor
@Tag(name = "Alert Configurations", description = "APIs for managing tampering detection alert configurations")
@SecurityRequirement(name = "bearerAuth")
public class AlertConfigController {

    private final AlertConfigService alertConfigService;
    private final UserService userService;
    private final SolarInstallationRepository installationRepository;

    @GetMapping("/installations/{installationId}/sensitivity")
    @PreAuthorize("hasAnyRole('ADMIN', 'CUSTOMER')")
    @Operation(
        summary = "Get installation sensitivity",
        description = "Retrieves the alert configuration for a specific solar installation, including sensitivity thresholds for different types of tamper events."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Configuration retrieved successfully", 
                    content = @Content(schema = @Schema(implementation = AlertConfigDTO.class))),
        @ApiResponse(responseCode = "404", description = "Installation not found", content = @Content),
        @ApiResponse(responseCode = "403", description = "Insufficient permissions", content = @Content)
    })
    public ResponseEntity<AlertConfigDTO> getAlertConfigByInstallationId(
            @Parameter(description = "ID of the installation to get configuration for", required = true)
            @PathVariable Long installationId) {
        AlertConfigDTO alertConfigDTO = alertConfigService.getAlertConfigByInstallationId(installationId);
        return ResponseEntity.ok(alertConfigDTO);
    }

    @PutMapping("/installations/{installationId}/sensitivity")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(
        summary = "Update installation sensitivity",
        description = "Updates the alert configuration for a specific solar installation, allowing adjustment of sensitivity thresholds, notification channels, and auto-response settings."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Configuration updated successfully", 
                    content = @Content(schema = @Schema(implementation = AlertConfigDTO.class))),
        @ApiResponse(responseCode = "400", description = "Invalid configuration parameters", content = @Content),
        @ApiResponse(responseCode = "404", description = "Installation not found", content = @Content),
        @ApiResponse(responseCode = "403", description = "Insufficient permissions", content = @Content)
    })
    public ResponseEntity<AlertConfigDTO> updateAlertConfig(
            @Parameter(description = "ID of the installation to update configuration for", required = true)
            @PathVariable Long installationId,
            
            @Parameter(description = "Updated configuration settings", required = true)
            @Valid @RequestBody AlertConfigUpdateDTO updateDTO) {
        AlertConfigDTO alertConfigDTO = alertConfigService.updateAlertConfig(installationId, updateDTO);
        return ResponseEntity.ok(alertConfigDTO);
    }

    @GetMapping("/admin/alert-configs/user/{userId}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(
        summary = "Get user configs",
        description = "Retrieves alert configurations for all installations owned by a specific user."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Configurations retrieved successfully"),
        @ApiResponse(responseCode = "404", description = "User not found", content = @Content),
        @ApiResponse(responseCode = "403", description = "Insufficient permissions", content = @Content)
    })
    public ResponseEntity<List<AlertConfigDTO>> getAlertConfigsByUserId(
            @Parameter(description = "ID of the user to get configurations for", required = true)
            @PathVariable Long userId) {
        User user = userService.getCustomerById(userId);
        List<SolarInstallation> userInstallations = installationRepository.findByUser(user);
        
        if (userInstallations.isEmpty()) {
            return ResponseEntity.ok(List.of());
        }
        
        List<Long> installationIds = userInstallations.stream()
            .map(SolarInstallation::getId)
            .collect(Collectors.toList());
            
        return ResponseEntity.ok(alertConfigService.getAlertConfigsByInstallationIds(installationIds));
    }

    @GetMapping("/admin/alert-configs/level/{alertLevel}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(
        summary = "Get configs by level",
        description = "Retrieves alert configurations filtered by alert level (LOW, MEDIUM, HIGH, CRITICAL)."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Configurations retrieved successfully"),
        @ApiResponse(responseCode = "403", description = "Insufficient permissions", content = @Content)
    })
    public ResponseEntity<List<AlertConfigDTO>> getAlertConfigsByAlertLevel(
            @Parameter(description = "Alert level to filter by (LOW, MEDIUM, HIGH, CRITICAL)", required = true)
            @PathVariable AlertConfig.AlertLevel alertLevel) {
        List<AlertConfigDTO> alertConfigs = alertConfigService.getAlertConfigsByAlertLevel(alertLevel);
        return ResponseEntity.ok(alertConfigs);
    }

    @GetMapping("/admin/alert-configs/auto-response")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(
        summary = "Get auto-response configs",
        description = "Retrieves all alert configurations that have automatic response enabled."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Configurations retrieved successfully"),
        @ApiResponse(responseCode = "403", description = "Insufficient permissions", content = @Content)
    })
    public ResponseEntity<List<AlertConfigDTO>> getAutoResponseEnabledConfigs() {
        List<AlertConfigDTO> alertConfigs = alertConfigService.getAutoResponseEnabledConfigs();
        return ResponseEntity.ok(alertConfigs);
    }

    @PostMapping("/installations/{installationId}/sensitivity/default")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(
        summary = "Create default alert config",
        description = "Creates a default alert configuration for a specific solar installation."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "201", description = "Configuration created successfully", 
                   content = @Content(schema = @Schema(implementation = AlertConfigDTO.class))),
        @ApiResponse(responseCode = "404", description = "Installation not found", content = @Content),
        @ApiResponse(responseCode = "403", description = "Insufficient permissions", content = @Content)
    })
    public ResponseEntity<AlertConfigDTO> createDefaultAlertConfig(
            @Parameter(description = "ID of the installation to create configuration for", required = true)
            @PathVariable Long installationId) {
        AlertConfigDTO alertConfigDTO = alertConfigService.createDefaultAlertConfig(installationId);
        return ResponseEntity.status(201).body(alertConfigDTO);
    }
    
    @GetMapping("/installations/{installationId}/auto-response")
    @PreAuthorize("hasAnyRole('ADMIN', 'CUSTOMER')")
    @Operation(
        summary = "Check auto-response status",
        description = "Checks if auto-response is enabled for a specific installation."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Status retrieved successfully"),
        @ApiResponse(responseCode = "404", description = "Installation not found", content = @Content),
        @ApiResponse(responseCode = "403", description = "Insufficient permissions", content = @Content)
    })
    public ResponseEntity<Boolean> isAutoResponseEnabled(
            @Parameter(description = "ID of the installation to check", required = true)
            @PathVariable Long installationId) {
        boolean isEnabled = alertConfigService.isAutoResponseEnabled(installationId);
        return ResponseEntity.ok(isEnabled);
    }
    
    @GetMapping("/installations/{installationId}/threshold/{eventType}")
    @PreAuthorize("hasAnyRole('ADMIN', 'CUSTOMER')")
    @Operation(
        summary = "Get threshold for event type",
        description = "Gets the threshold value for a specific event type for a given installation."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Threshold retrieved successfully"),
        @ApiResponse(responseCode = "404", description = "Installation not found", content = @Content),
        @ApiResponse(responseCode = "403", description = "Insufficient permissions", content = @Content)
    })
    public ResponseEntity<Double> getThresholdForEventType(
            @Parameter(description = "ID of the installation", required = true)
            @PathVariable Long installationId,
            @Parameter(description = "Type of event (PHYSICAL_MOVEMENT, VOLTAGE_FLUCTUATION, CONNECTION_INTERRUPTION)", required = true)
            @PathVariable String eventType) {
        double threshold = alertConfigService.getThresholdForEventType(installationId, eventType);
        return ResponseEntity.ok(threshold);
    }
    
    @GetMapping("/installations/{installationId}/sampling-rate")
    @PreAuthorize("hasAnyRole('ADMIN', 'CUSTOMER')")
    @Operation(
        summary = "Get sampling rate",
        description = "Gets the sampling rate in seconds for a specific installation."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Sampling rate retrieved successfully"),
        @ApiResponse(responseCode = "404", description = "Installation not found", content = @Content),
        @ApiResponse(responseCode = "403", description = "Insufficient permissions", content = @Content)
    })
    public ResponseEntity<Integer> getSamplingRateSeconds(
            @Parameter(description = "ID of the installation", required = true)
            @PathVariable Long installationId) {
        int samplingRate = alertConfigService.getSamplingRateSeconds(installationId);
        return ResponseEntity.ok(samplingRate);
    }
    
    @GetMapping("/user/alert-configs")
    @PreAuthorize("hasRole('CUSTOMER')")
    @Operation(
        summary = "Get current user alert configs",
        description = "Retrieves alert configurations for all installations owned by the current user."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Configurations retrieved successfully"),
        @ApiResponse(responseCode = "403", description = "Insufficient permissions", content = @Content)
    })
    public ResponseEntity<List<AlertConfigDTO>> getAlertConfigsForCurrentUser() {
        User currentUser = userService.getCurrentUser();
        List<SolarInstallation> userInstallations = installationRepository.findByUser(currentUser);
        
        if (userInstallations.isEmpty()) {
            return ResponseEntity.ok(List.of());
        }
        
        List<Long> installationIds = userInstallations.stream()
            .map(SolarInstallation::getId)
            .collect(Collectors.toList());
            
        return ResponseEntity.ok(alertConfigService.getAlertConfigsByInstallationIds(installationIds));
    }
} 