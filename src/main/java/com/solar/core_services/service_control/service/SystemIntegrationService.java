package com.solar.core_services.service_control.service;

import com.solar.core_services.service_control.dto.CommandResponseRequest;
import com.solar.core_services.service_control.dto.DeviceCommandDTO;
import com.solar.core_services.service_control.dto.DeviceHeartbeatRequest;
import com.solar.core_services.service_control.dto.SystemOverviewResponse;

import java.util.Map;

/**
 * Service interface for system integration operations
 * Handles device communication, system monitoring, and health checks
 */
public interface SystemIntegrationService {
    
    /**
     * Process device heartbeat data
     * @param heartbeat The heartbeat data from the device
     */
    void processDeviceHeartbeat(DeviceHeartbeatRequest heartbeat);
    
    /**
     * Process command response from a device
     * @param response The command response data
     * @return The updated device command information
     */
    DeviceCommandDTO processCommandResponse(CommandResponseRequest response);
    
    /**
     * Get a comprehensive overview of the system
     * @return System overview data
     */
    SystemOverviewResponse getSystemOverview();
    
    /**
     * Run health checks on the system
     * Checks for unresponsive devices, low battery, poor connectivity, and outdated firmware
     */
    void runSystemHealthCheck();
    
    /**
     * Generate a detailed health report of the system
     * @return The health report as a structured JSON map
     */
    Map<String, Object> generateSystemHealthReport();
    
    /**
     * Register a new device in the system
     * @param installationId The installation ID
     * @param deviceId The device ID
     * @param deviceType The type of device
     * @return True if registration was successful
     */
    boolean registerDevice(Long installationId, String deviceId, String deviceType);
    
    /**
     * Deregister a device from the system
     * @param installationId The installation ID
     * @param deviceId The device ID
     * @return True if deregistration was successful
     */
    boolean deregisterDevice(Long installationId, String deviceId);
    
    /**
     * Check if a device is registered and active
     * @param deviceId The device ID to check
     * @return True if the device is registered and active
     */
    boolean isDeviceActive(String deviceId);
    
    /**
     * Get the last communication time for a device
     * @param deviceId The device ID
     * @return The timestamp of the last communication, or null if never communicated
     */
    Long getLastCommunicationTime(String deviceId);
} 