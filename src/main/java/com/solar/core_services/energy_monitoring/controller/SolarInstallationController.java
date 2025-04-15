package com.solar.core_services.energy_monitoring.controller;

import com.solar.core_services.energy_monitoring.dto.DeviceStatusRequest;
import com.solar.core_services.energy_monitoring.dto.SolarInstallationDTO;
import com.solar.core_services.energy_monitoring.dto.SystemOverviewResponse;
import com.solar.core_services.energy_monitoring.service.SolarInstallationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/monitoring/installations")
@RequiredArgsConstructor
@Tag(name = "Solar Installations", description = "APIs for managing solar installations")
public class SolarInstallationController {

    private final SolarInstallationService installationService;

    @GetMapping("/customer/{customerId}")
    @PreAuthorize("hasRole('ADMIN') or @securityService.isCurrentUser(#customerId)")
    @Operation(summary = "Get customer installations", description = "Get all installations for a specific customer")
    public ResponseEntity<List<SolarInstallationDTO>> getCustomerInstallations(@PathVariable Long customerId) {
        return ResponseEntity.ok(installationService.getInstallationsByCustomer(customerId));
    }

    @GetMapping("/{installationId}")
    @PreAuthorize("hasRole('ADMIN') or @securityService.hasAccessToInstallation(#installationId)")
    @Operation(summary = "Get installation details", description = "Get details for a specific installation")
    public ResponseEntity<SolarInstallationDTO> getInstallationDetails(@PathVariable Long installationId) {
        return ResponseEntity.ok(installationService.getInstallationById(installationId));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Create installation", description = "Create a new solar installation")
    public ResponseEntity<SolarInstallationDTO> createInstallation(@Valid @RequestBody SolarInstallationDTO installationDTO) {
        return ResponseEntity.ok(installationService.createInstallation(installationDTO));
    }

    @PutMapping("/{installationId}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Update installation", description = "Update an existing solar installation")
    public ResponseEntity<SolarInstallationDTO> updateInstallation(
            @PathVariable Long installationId,
            @Valid @RequestBody SolarInstallationDTO installationDTO) {
        return ResponseEntity.ok(installationService.updateInstallation(installationId, installationDTO));
    }

    @PostMapping("/device-status")
    @Operation(summary = "Update device status", description = "Update device status information")
    public ResponseEntity<SolarInstallationDTO> updateDeviceStatus(@Valid @RequestBody DeviceStatusRequest request) {
        return ResponseEntity.ok(installationService.updateDeviceStatus(request));
    }

    @GetMapping("/overview")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Get system overview", description = "Get system-wide overview of all installations")
    public ResponseEntity<SystemOverviewResponse> getSystemOverview() {
        return ResponseEntity.ok(installationService.getSystemOverview());
    }

    @GetMapping("/tamper-alerts")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Get tamper alerts", description = "Get all installations with tamper alerts")
    public ResponseEntity<List<SolarInstallationDTO>> getTamperAlerts() {
        return ResponseEntity.ok(installationService.getInstallationsWithTamperAlerts());
    }
}