package com.solar.core_services.energy_monitoring.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EnergyDataDTO {
    private Long id;
    private Long installationId;
    private double powerGenerationWatts;
    private double powerConsumptionWatts;
    private LocalDateTime timestamp;
    private double dailyYieldKWh;
    private double totalYieldKWh;
    private boolean isSimulated;
} 