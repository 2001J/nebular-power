package com.solar.core_services.service_control.service;

import com.solar.core_services.service_control.model.DeviceCommand;

/**
 * Service interface for transmitting commands to physical devices.
 * Handles HTTP communication with device controllers.
 */
public interface DeviceTransmissionService {
    
    /**
     * Transmits a command to a device via HTTP.
     * 
     * @param command The command entity containing all command details
     * @return true if transmission was successful, false otherwise
     */
    boolean transmitCommand(DeviceCommand command);
    
    /**
     * Checks if a device is reachable and ready to receive commands.
     * 
     * @param installationId The installation ID to check
     * @return true if device is online and reachable, false otherwise
     */
    boolean isDeviceReachable(Long installationId);
    
    /**
     * Gets the device endpoint URL for an installation.
     * 
     * @param installationId The installation ID
     * @return The HTTP endpoint URL for the device, or null if not configured
     */
    String getDeviceEndpoint(Long installationId);
    
    /**
     * Updates the last heartbeat timestamp for a device.
     * Called when a heartbeat is received from a device.
     * 
     * @param installationId The installation ID
     */
    void updateDeviceHeartbeat(Long installationId);
    
    /**
     * Removes heartbeat tracking for a device.
     * Used when a device is decommissioned or no longer active.
     * 
     * @param installationId The installation ID
     */
    void removeDeviceHeartbeat(Long installationId);
}
