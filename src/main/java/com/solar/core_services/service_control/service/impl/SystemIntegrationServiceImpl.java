package com.solar.core_services.service_control.service.impl;

import com.solar.core_services.service_control.dto.CommandResponseRequest;
import com.solar.core_services.service_control.dto.DeviceCommandDTO;
import com.solar.core_services.service_control.dto.DeviceHeartbeatRequest;
import com.solar.core_services.service_control.dto.SystemOverviewResponse;
import com.solar.core_services.service_control.model.OperationalLog;
import com.solar.core_services.service_control.service.DeviceCommandService;
import com.solar.core_services.service_control.service.OperationalLogService;
import com.solar.core_services.service_control.service.SystemIntegrationService;
import com.solar.core_services.service_control.service.SystemMonitoringService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Implementation of the SystemIntegrationService interface
 * Handles device communication, system monitoring, and health checks
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class SystemIntegrationServiceImpl implements SystemIntegrationService {

    private final SystemMonitoringService systemMonitoringService;
    private final DeviceCommandService deviceCommandService;
    private final OperationalLogService operationalLogService;
    
    // In-memory cache for device registration and last communication time
    private final Map<String, DeviceRegistration> deviceRegistry = new ConcurrentHashMap<>();
    
    @Override
    @Transactional
    public void processDeviceHeartbeat(DeviceHeartbeatRequest heartbeat) {
        log.info("Processing heartbeat from device: {}, installation: {}", 
                heartbeat.getDeviceId(), heartbeat.getInstallationId());
        
        // Update device registry with last communication time
        updateDeviceLastCommunication(heartbeat.getDeviceId());
        
        // Delegate to system monitoring service
        systemMonitoringService.processHeartbeat(heartbeat);
        
        log.debug("Heartbeat processed successfully for device: {}", heartbeat.getDeviceId());
    }

    @Override
    @Transactional
    public DeviceCommandDTO processCommandResponse(CommandResponseRequest response) {
        log.info("Processing command response from installation: {}, correlation: {}", 
                response.getInstallationId(), response.getCorrelationId());
        
        // We don't have deviceId in CommandResponseRequest, so we'll use correlationId for logging
        String correlationId = response.getCorrelationId();
        
        // Delegate to device command service
        DeviceCommandDTO commandDTO = deviceCommandService.processCommandResponse(response);
        
        log.debug("Command response processed successfully for correlation ID: {}", correlationId);
        return commandDTO;
    }

    @Override
    @Transactional(readOnly = true)
    public SystemOverviewResponse getSystemOverview() {
        log.info("Retrieving system overview");
        return systemMonitoringService.getSystemOverview();
    }

    @Override
    @Transactional
    public void runSystemHealthCheck() {
        log.info("Running system health check");
        
        // Delegate to system monitoring service for various health checks
        systemMonitoringService.checkUnresponsiveDevices();
        systemMonitoringService.checkLowBatteryDevices();
        systemMonitoringService.checkPoorConnectivityDevices();
        systemMonitoringService.checkOutdatedFirmwareDevices();
        
        log.info("System health check completed");
    }

    @Override
    @Transactional(readOnly = true)
    public String generateSystemHealthReport() {
        log.info("Generating system health report");
        return systemMonitoringService.generateSystemHealthReport();
    }

    @Override
    @Transactional
    public boolean registerDevice(Long installationId, String deviceId, String deviceType) {
        log.info("Registering device: {}, type: {}, installation: {}", deviceId, deviceType, installationId);
        
        try {
            // Create device registration entry
            DeviceRegistration registration = new DeviceRegistration(
                    installationId,
                    deviceId,
                    deviceType,
                    Instant.now().toEpochMilli(),
                    true
            );
            
            // Add to registry
            deviceRegistry.put(deviceId, registration);
            
            // Log the operation
            operationalLogService.logOperation(
                    installationId,
                    OperationalLog.OperationType.DEVICE_CONFIGURATION,
                    "SYSTEM",
                    "Device registered: " + deviceId + ", type: " + deviceType,
                    "SYSTEM",
                    "DEVICE_REGISTRATION",
                    "internal",
                    "SystemIntegrationService",
                    true,
                    null
            );
            
            log.info("Device registered successfully: {}", deviceId);
            return true;
        } catch (Exception e) {
            log.error("Error registering device: {}", deviceId, e);
            return false;
        }
    }

    @Override
    @Transactional
    public boolean deregisterDevice(Long installationId, String deviceId) {
        log.info("Deregistering device: {}, installation: {}", deviceId, installationId);
        
        try {
            // Check if device exists in registry
            if (!deviceRegistry.containsKey(deviceId)) {
                log.warn("Device not found in registry: {}", deviceId);
                return false;
            }
            
            // Remove from registry
            DeviceRegistration registration = deviceRegistry.remove(deviceId);
            
            // Log the operation
            operationalLogService.logOperation(
                    installationId,
                    OperationalLog.OperationType.DEVICE_CONFIGURATION,
                    "SYSTEM",
                    "Device deregistered: " + deviceId,
                    "SYSTEM",
                    "DEVICE_DEREGISTRATION",
                    "internal",
                    "SystemIntegrationService",
                    true,
                    null
            );
            
            log.info("Device deregistered successfully: {}", deviceId);
            return true;
        } catch (Exception e) {
            log.error("Error deregistering device: {}", deviceId, e);
            return false;
        }
    }

    @Override
    @Transactional(readOnly = true)
    public boolean isDeviceActive(String deviceId) {
        DeviceRegistration registration = deviceRegistry.get(deviceId);
        return registration != null && registration.isActive();
    }

    @Override
    @Transactional(readOnly = true)
    public Long getLastCommunicationTime(String deviceId) {
        DeviceRegistration registration = deviceRegistry.get(deviceId);
        return registration != null ? registration.getLastCommunicationTime() : null;
    }
    
    /**
     * Update the last communication time for a device
     * @param deviceId The device ID
     */
    private void updateDeviceLastCommunication(String deviceId) {
        DeviceRegistration registration = deviceRegistry.get(deviceId);
        if (registration != null) {
            registration.setLastCommunicationTime(Instant.now().toEpochMilli());
        } else {
            log.warn("Received communication from unregistered device: {}", deviceId);
        }
    }
    
    /**
     * Inner class to represent device registration information
     */
    private static class DeviceRegistration {
        private final Long installationId;
        private final String deviceId;
        private final String deviceType;
        private Long lastCommunicationTime;
        private boolean active;
        
        public DeviceRegistration(Long installationId, String deviceId, String deviceType, 
                                 Long lastCommunicationTime, boolean active) {
            this.installationId = installationId;
            this.deviceId = deviceId;
            this.deviceType = deviceType;
            this.lastCommunicationTime = lastCommunicationTime;
            this.active = active;
        }
        
        public Long getInstallationId() {
            return installationId;
        }
        
        public String getDeviceId() {
            return deviceId;
        }
        
        public String getDeviceType() {
            return deviceType;
        }
        
        public Long getLastCommunicationTime() {
            return lastCommunicationTime;
        }
        
        public void setLastCommunicationTime(Long lastCommunicationTime) {
            this.lastCommunicationTime = lastCommunicationTime;
        }
        
        public boolean isActive() {
            return active;
        }
        
        public void setActive(boolean active) {
            this.active = active;
        }
    }
} 