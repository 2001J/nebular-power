package com.solar.core_services.energy_monitoring.dto;

import java.util.List;

/**
 * DTO for handling batch submissions of energy readings
 * This supports the new requirement to handle multiple readings with different timestamps
 * in a single request
 */
public class BatchEnergyReadingsRequest {

    private List<EnergyReadingDTO> readings;
    
    // Default constructor
    public BatchEnergyReadingsRequest() {
    }
    
    // Constructor with readings
    public BatchEnergyReadingsRequest(List<EnergyReadingDTO> readings) {
        this.readings = readings;
    }
    
    // Getter and setter
    public List<EnergyReadingDTO> getReadings() {
        return readings;
    }
    
    public void setReadings(List<EnergyReadingDTO> readings) {
        this.readings = readings;
    }
}