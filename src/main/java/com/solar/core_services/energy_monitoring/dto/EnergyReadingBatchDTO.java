package com.solar.core_services.energy_monitoring.dto;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Data Transfer Object for submitting multiple energy readings at once
 * This allows devices to batch readings and send them together, preserving the original timestamps
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EnergyReadingBatchDTO {
    
    private Long installationId;
    private String deviceToken;
    private List<EnergyReadingDTO> readings;
}