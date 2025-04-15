package com.solar.core_services.energy_monitoring.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EnergyHistoryRequest {
    @NotNull(message = "Device ID is required")
    private Long deviceId;
    
    private LocalDateTime startDate;
    
    private LocalDateTime endDate;
    
    private String aggregation; // hourly, daily, weekly, monthly
    
    private Integer limit;
} 