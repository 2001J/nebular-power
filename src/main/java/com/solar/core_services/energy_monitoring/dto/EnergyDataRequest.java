package com.solar.core_services.energy_monitoring.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EnergyDataRequest {
    @NotNull(message = "Installation ID is required")
    private Long installationId;
    
    @NotNull(message = "Device authentication token is required")
    private String deviceToken;
    
    @PositiveOrZero(message = "Power generation must be zero or positive")
    private double powerGenerationWatts;
    
    @PositiveOrZero(message = "Power consumption must be zero or positive")
    private double powerConsumptionWatts;
    
    @Builder.Default
    private LocalDateTime timestamp = LocalDateTime.now();
    
    @PositiveOrZero(message = "Daily yield must be zero or positive")
    private double dailyYieldKWh;
    
    @PositiveOrZero(message = "Total yield must be zero or positive")
    private double totalYieldKWh;
    
    @Positive(message = "Battery level must be positive")
    private double batteryLevel;
    
    @PositiveOrZero(message = "Voltage must be zero or positive")
    private double voltage;
} 