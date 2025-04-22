package com.solar.core_services.energy_monitoring.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardResponse {
    private Long installationId;
    private double currentPowerGenerationWatts;
    private double currentPowerConsumptionWatts;
    private double todayGenerationKWh;
    private double todayConsumptionKWh;
    private double weekToDateGenerationKWh;
    private double weekToDateConsumptionKWh;
    private double monthToDateGenerationKWh;
    private double monthToDateConsumptionKWh;
    private double yearToDateGenerationKWh;
    private double yearToDateConsumptionKWh;
    private double lifetimeGenerationKWh;
    private double lifetimeConsumptionKWh;
    private double currentEfficiencyPercentage;
    private LocalDateTime lastUpdated;
    private List<EnergyDataDTO> recentReadings;
    private SolarInstallationDTO installationDetails;
}