package com.solar.core_services.energy_monitoring.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Data Transfer Object for top producing installations with detailed metrics
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TopProducerDTO {
    private Long id;
    private String name;
    private Long userId;
    private String username;
    private String location;
    private double installedCapacityKW;
    
    // Energy production metrics
    private double currentPowerGenerationWatts;
    private double todayGenerationKWh;
    private double efficiencyPercentage;
    private double utilizationRate;
}