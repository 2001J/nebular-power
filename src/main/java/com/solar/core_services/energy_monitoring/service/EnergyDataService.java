package com.solar.core_services.energy_monitoring.service;

import com.solar.core_services.energy_monitoring.dto.DashboardResponse;
import com.solar.core_services.energy_monitoring.dto.EnergyDataDTO;
import com.solar.core_services.energy_monitoring.dto.EnergyDataRequest;
import com.solar.core_services.energy_monitoring.dto.EnergyReadingBatchDTO;
import com.solar.core_services.energy_monitoring.model.EnergyData;

import java.time.LocalDateTime;
import java.util.List;

public interface EnergyDataService {
    /**
     * Process and store incoming energy data from a device
     * @param request The energy data request from the device
     * @return The stored energy data
     */
    EnergyDataDTO processEnergyData(EnergyDataRequest request);
    
    /**
     * Process and store a batch of energy readings with their original timestamps
     * @param batchRequest The batch of readings from the device
     * @return List of processed and stored energy data
     */
    List<EnergyDataDTO> processEnergyDataBatch(EnergyReadingBatchDTO batchRequest);
    
    /**
     * Get recent energy readings for a specific installation
     * @param installationId The ID of the installation
     * @param limit The maximum number of readings to return
     * @return A list of energy data DTOs
     */
    List<EnergyDataDTO> getRecentReadings(Long installationId, int limit);
    
    /**
     * Get energy readings for a specific installation within a date range
     * @param installationId The ID of the installation
     * @param startDate The start date of the range
     * @param endDate The end date of the range
     * @return A list of energy data DTOs
     */
    List<EnergyDataDTO> getReadingsInDateRange(Long installationId, LocalDateTime startDate, LocalDateTime endDate);
    
    /**
     * Get dashboard data for a specific customer
     * @param customerId The ID of the customer
     * @return Dashboard response with current and historical data
     */
    DashboardResponse getDashboardData(Long customerId);
    
    /**
     * Get dashboard data for a specific installation
     * @param installationId The ID of the installation
     * @return Dashboard response with current and historical data
     */
    DashboardResponse getInstallationDashboard(Long installationId);
    
    /**
     * Calculate derived metrics from raw energy data
     * @param energyData The raw energy data
     * @return The energy data with calculated metrics
     */
    EnergyData calculateDerivedMetrics(EnergyData energyData);
}