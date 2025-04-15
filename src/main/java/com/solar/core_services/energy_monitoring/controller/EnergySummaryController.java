package com.solar.core_services.energy_monitoring.controller;

import com.solar.core_services.energy_monitoring.dto.EnergySummaryDTO;
import com.solar.core_services.energy_monitoring.model.EnergySummary;
import com.solar.core_services.energy_monitoring.service.EnergySummaryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/monitoring/summaries")
@RequiredArgsConstructor
@Tag(name = "Energy Summaries", description = "APIs for energy summary data")
public class EnergySummaryController {

    private final EnergySummaryService summaryService;

    @GetMapping("/{installationId}/daily")
    @PreAuthorize("hasRole('ADMIN') or @securityService.hasAccessToInstallation(#installationId)")
    @Operation(summary = "Get daily summaries", description = "Get daily energy summaries for a specific installation")
    public ResponseEntity<List<EnergySummaryDTO>> getDailySummaries(@PathVariable Long installationId) {
        return ResponseEntity.ok(summaryService.getSummariesByPeriod(installationId, EnergySummary.SummaryPeriod.DAILY));
    }

    @GetMapping("/{installationId}/weekly")
    @PreAuthorize("hasRole('ADMIN') or @securityService.hasAccessToInstallation(#installationId)")
    @Operation(summary = "Get weekly summaries", description = "Get weekly energy summaries for a specific installation")
    public ResponseEntity<List<EnergySummaryDTO>> getWeeklySummaries(@PathVariable Long installationId) {
        return ResponseEntity.ok(summaryService.getSummariesByPeriod(installationId, EnergySummary.SummaryPeriod.WEEKLY));
    }

    @GetMapping("/{installationId}/monthly")
    @PreAuthorize("hasRole('ADMIN') or @securityService.hasAccessToInstallation(#installationId)")
    @Operation(summary = "Get monthly summaries", description = "Get monthly energy summaries for a specific installation")
    public ResponseEntity<List<EnergySummaryDTO>> getMonthlySummaries(@PathVariable Long installationId) {
        return ResponseEntity.ok(summaryService.getSummariesByPeriod(installationId, EnergySummary.SummaryPeriod.MONTHLY));
    }

    @GetMapping("/{installationId}/{period}")
    @PreAuthorize("hasRole('ADMIN') or @securityService.hasAccessToInstallation(#installationId)")
    @Operation(summary = "Get summaries by period and date range", description = "Get energy summaries for a specific installation, period, and date range")
    public ResponseEntity<List<EnergySummaryDTO>> getSummariesByPeriodAndDateRange(
            @PathVariable Long installationId,
            @PathVariable String period,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        
        EnergySummary.SummaryPeriod summaryPeriod = EnergySummary.SummaryPeriod.valueOf(period.toUpperCase());
        return ResponseEntity.ok(summaryService.getSummariesByPeriodAndDateRange(
                installationId, summaryPeriod, startDate, endDate));
    }

    @PostMapping("/{installationId}/generate/daily")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Generate daily summary", description = "Generate a daily energy summary for a specific installation and date")
    public ResponseEntity<EnergySummaryDTO> generateDailySummary(
            @PathVariable Long installationId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(summaryService.generateDailySummary(installationId, date));
    }

    @PostMapping("/{installationId}/generate/weekly")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Generate weekly summary", description = "Generate a weekly energy summary for a specific installation and week start date")
    public ResponseEntity<EnergySummaryDTO> generateWeeklySummary(
            @PathVariable Long installationId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate weekStartDate) {
        return ResponseEntity.ok(summaryService.generateWeeklySummary(installationId, weekStartDate));
    }

    @PostMapping("/{installationId}/generate/monthly")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Generate monthly summary", description = "Generate a monthly energy summary for a specific installation and month start date")
    public ResponseEntity<EnergySummaryDTO> generateMonthlySummary(
            @PathVariable Long installationId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate monthStartDate) {
        return ResponseEntity.ok(summaryService.generateMonthlySummary(installationId, monthStartDate));
    }
} 