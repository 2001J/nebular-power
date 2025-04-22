package com.solar.core_services.energy_monitoring.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SystemOverviewResponse {
    private int totalActiveInstallations;
    private int totalSuspendedInstallations;
    private int totalInstallationsWithTamperAlerts;
    private double totalSystemCapacityKW;
    private double currentSystemGenerationWatts;
    private double todayTotalGenerationKWh;
    private double todayTotalConsumptionKWh;
    private double weekToDateGenerationKWh;
    private double weekToDateConsumptionKWh;
    private double monthToDateGenerationKWh;
    private double monthToDateConsumptionKWh;
    private double yearToDateGenerationKWh;
    private double yearToDateConsumptionKWh;
    private double averageSystemEfficiency;
    private LocalDateTime lastUpdated;
    private List<SolarInstallationDTO> recentlyActiveInstallations;
    private List<SolarInstallationDTO> topProducers;
    
    // New field to hold recent readings from all installations with timestamps preserved
    private List<EnergyReadingDTO> recentInstallationReadings;
    private Map<String, Long> installationsByStatus;
}