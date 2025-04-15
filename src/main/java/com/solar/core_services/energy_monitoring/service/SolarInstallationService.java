package com.solar.core_services.energy_monitoring.service;

import com.solar.core_services.energy_monitoring.dto.DeviceStatusRequest;
import com.solar.core_services.energy_monitoring.dto.SolarInstallationDTO;
import com.solar.core_services.energy_monitoring.dto.SystemOverviewResponse;

import java.util.List;

public interface SolarInstallationService {
    /**
     * Get all installations for a specific customer
     * @param customerId The ID of the customer
     * @return A list of solar installation DTOs
     */
    List<SolarInstallationDTO> getInstallationsByCustomer(Long customerId);
    
    /**
     * Get a specific installation by ID
     * @param installationId The ID of the installation
     * @return The solar installation DTO
     */
    SolarInstallationDTO getInstallationById(Long installationId);
    
    /**
     * Create a new solar installation
     * @param installationDTO The solar installation data
     * @return The created solar installation DTO
     */
    SolarInstallationDTO createInstallation(SolarInstallationDTO installationDTO);
    
    /**
     * Update an existing solar installation
     * @param installationId The ID of the installation to update
     * @param installationDTO The updated solar installation data
     * @return The updated solar installation DTO
     */
    SolarInstallationDTO updateInstallation(Long installationId, SolarInstallationDTO installationDTO);
    
    /**
     * Update device status based on incoming request
     * @param request The device status request
     * @return The updated solar installation DTO
     */
    SolarInstallationDTO updateDeviceStatus(DeviceStatusRequest request);
    
    /**
     * Get system-wide overview of all installations
     * @return System overview response with aggregated data
     */
    SystemOverviewResponse getSystemOverview();
    
    /**
     * Get all installations with tamper alerts
     * @return A list of solar installation DTOs with tamper alerts
     */
    List<SolarInstallationDTO> getInstallationsWithTamperAlerts();
    
    /**
     * Verify if a device token is valid for a specific installation
     * @param installationId The ID of the installation
     * @param deviceToken The device token to verify
     * @return True if the token is valid, false otherwise
     */
    boolean verifyDeviceToken(Long installationId, String deviceToken);
} 