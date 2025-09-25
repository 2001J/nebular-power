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
public class EnergyChartPointDTO {
    private LocalDateTime bucketStart;
    private double avgGenerationWatts;
    private double avgConsumptionWatts;
    private double generationKWh;
    private double consumptionKWh;
}

