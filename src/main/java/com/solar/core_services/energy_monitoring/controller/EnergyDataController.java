package com.solar.core_services.energy_monitoring.controller;

import com.solar.core_services.energy_monitoring.dto.DashboardResponse;
import com.solar.core_services.energy_monitoring.dto.EnergyDataDTO;
import com.solar.core_services.energy_monitoring.dto.EnergyDataRequest;
import com.solar.core_services.energy_monitoring.dto.EnergyReadingBatchDTO;
import com.solar.core_services.energy_monitoring.service.EnergyDataService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/monitoring")
@RequiredArgsConstructor
@Tag(name = "Energy Monitoring", description = "APIs for energy data monitoring")
public class EnergyDataController {

    private final EnergyDataService energyDataService;

    @PostMapping("/readings")
    @Operation(summary = "Submit energy reading data", description = "Endpoint for devices to submit energy readings")
    public ResponseEntity<EnergyDataDTO> submitEnergyReading(@Valid @RequestBody EnergyDataRequest request) {
        return ResponseEntity.ok(energyDataService.processEnergyData(request));
    }

    @PostMapping("/readings/batch")
    @Operation(summary = "Submit batch of energy readings", description = "Endpoint for devices to submit multiple timestamped readings at once")
    public ResponseEntity<List<EnergyDataDTO>> submitEnergyReadingBatch(@Valid @RequestBody EnergyReadingBatchDTO batchRequest) {
        return ResponseEntity.ok(energyDataService.processEnergyDataBatch(batchRequest));
    }

    @GetMapping("/dashboard/customer/{customerId}")
    @PreAuthorize("hasRole('ADMIN') or @securityService.isCurrentUser(#customerId)")
    @Operation(summary = "Get customer dashboard data", description = "Get current energy stats for a specific customer")
    public ResponseEntity<DashboardResponse> getCustomerDashboard(@PathVariable Long customerId) {
        return ResponseEntity.ok(energyDataService.getDashboardData(customerId));
    }

    @GetMapping("/dashboard/installation/{installationId}")
    @PreAuthorize("hasRole('ADMIN') or @securityService.hasAccessToInstallation(#installationId)")
    @Operation(summary = "Get installation dashboard data", description = "Get current energy stats for a specific installation")
    public ResponseEntity<DashboardResponse> getInstallationDashboard(@PathVariable Long installationId) {
        return ResponseEntity.ok(energyDataService.getInstallationDashboard(installationId));
    }

    @GetMapping("/readings/recent/{installationId}")
    @PreAuthorize("hasRole('ADMIN') or @securityService.hasAccessToInstallation(#installationId)")
    @Operation(summary = "Get recent readings", description = "Get recent energy readings for a specific installation")
    public ResponseEntity<List<EnergyDataDTO>> getRecentReadings(
            @PathVariable Long installationId,
            @RequestParam(defaultValue = "10") int limit) {
        return ResponseEntity.ok(energyDataService.getRecentReadings(installationId, limit));
    }

    @GetMapping("/readings/history/{installationId}")
    @PreAuthorize("hasRole('ADMIN') or @securityService.hasAccessToInstallation(#installationId)")
    @Operation(summary = "Get historical readings", description = "Get energy readings for a specific installation within a date range")
    public ResponseEntity<List<EnergyDataDTO>> getReadingsHistory(
            @PathVariable Long installationId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate) {
        return ResponseEntity.ok(energyDataService.getReadingsInDateRange(installationId, startDate, endDate));
    }
}