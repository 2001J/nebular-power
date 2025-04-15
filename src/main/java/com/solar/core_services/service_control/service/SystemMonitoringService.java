package com.solar.core_services.service_control.service;

import com.solar.core_services.service_control.dto.DeviceHeartbeatRequest;
import com.solar.core_services.service_control.dto.SystemOverviewResponse;

public interface SystemMonitoringService {
    
    /**
     * Process a device heartbeat
     */
    void processHeartbeat(DeviceHeartbeatRequest heartbeat);
    
    /**
     * Get system-wide overview
     */
    SystemOverviewResponse getSystemOverview();
    
    /**
     * Check for unresponsive devices
     */
    void checkUnresponsiveDevices();
    
    /**
     * Check for devices with low battery
     */
    void checkLowBatteryDevices();
    
    /**
     * Check for devices with poor connectivity
     */
    void checkPoorConnectivityDevices();
    
    /**
     * Check for devices with outdated firmware
     */
    void checkOutdatedFirmwareDevices();
    
    /**
     * Generate system health report
     */
    String generateSystemHealthReport();
} 