package com.solar.core_services.energy_monitoring.dto;

import java.time.LocalDateTime;

/**
 * Data Transfer Object for individual energy readings from a solar installation
 * This DTO specifically captures a single timestamp with its associated energy values
 */
public class EnergyReadingDTO {

    private Long id;
    private Long installationId;
    private LocalDateTime timestamp;
    private Double energyProduced;
    private Double energyConsumed;
    
    // The following fields are currently not used in the application
    // but are defined for future expansion of monitoring capabilities
    private Double batteryLevel;
    private Integer voltage;
    private Integer current;
    private Double solarIrradiance;
    private String weatherCondition;

    // Default constructor
    public EnergyReadingDTO() {
    }

    // Constructor with essential fields
    public EnergyReadingDTO(Long installationId, LocalDateTime timestamp, Double energyProduced, Double energyConsumed) {
        this.installationId = installationId;
        this.timestamp = timestamp;
        this.energyProduced = energyProduced;
        this.energyConsumed = energyConsumed;
    }

    // Full constructor
    public EnergyReadingDTO(Long id, Long installationId, LocalDateTime timestamp, Double energyProduced, 
                          Double energyConsumed, Double batteryLevel, Integer voltage, Integer current,
                          Double solarIrradiance, String weatherCondition) {
        this.id = id;
        this.installationId = installationId;
        this.timestamp = timestamp;
        this.energyProduced = energyProduced;
        this.energyConsumed = energyConsumed;
        this.batteryLevel = batteryLevel;
        this.voltage = voltage;
        this.current = current;
        this.solarIrradiance = solarIrradiance;
        this.weatherCondition = weatherCondition;
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getInstallationId() {
        return installationId;
    }

    public void setInstallationId(Long installationId) {
        this.installationId = installationId;
    }

    public LocalDateTime getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(LocalDateTime timestamp) {
        this.timestamp = timestamp;
    }

    public Double getEnergyProduced() {
        return energyProduced;
    }

    public void setEnergyProduced(Double energyProduced) {
        this.energyProduced = energyProduced;
    }

    public Double getEnergyConsumed() {
        return energyConsumed;
    }

    public void setEnergyConsumed(Double energyConsumed) {
        this.energyConsumed = energyConsumed;
    }

    public Double getBatteryLevel() {
        return batteryLevel;
    }

    public void setBatteryLevel(Double batteryLevel) {
        this.batteryLevel = batteryLevel;
    }

    public Integer getVoltage() {
        return voltage;
    }

    public void setVoltage(Integer voltage) {
        this.voltage = voltage;
    }

    public Integer getCurrent() {
        return current;
    }

    public void setCurrent(Integer current) {
        this.current = current;
    }

    public Double getSolarIrradiance() {
        return solarIrradiance;
    }

    public void setSolarIrradiance(Double solarIrradiance) {
        this.solarIrradiance = solarIrradiance;
    }

    public String getWeatherCondition() {
        return weatherCondition;
    }

    public void setWeatherCondition(String weatherCondition) {
        this.weatherCondition = weatherCondition;
    }
}