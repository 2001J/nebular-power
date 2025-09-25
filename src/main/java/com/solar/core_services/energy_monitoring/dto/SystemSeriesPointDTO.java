package com.solar.core_services.energy_monitoring.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SystemSeriesPointDTO {
    private LocalDateTime bucketStart;
    private double avgGenerationWatts;
    private double avgConsumptionWatts;
    private double generationKWh;
    private double consumptionKWh;
    private Map<String, Double> generationByTypeKWh;
    private Map<String, Double> consumptionByTypeKWh;
    private String powerUnit;   // e.g., "W"
    private String energyUnit;  // e.g., "kWh"
}

