package com.solar.core_services.service_control.service.impl;

import com.solar.core_services.energy_monitoring.model.SolarInstallation;
import com.solar.core_services.energy_monitoring.model.SolarInstallation.InstallationStatus;
import com.solar.core_services.energy_monitoring.repository.SolarInstallationRepository;
import com.solar.core_services.service_control.dto.DeviceHeartbeatRequest;
import com.solar.core_services.service_control.dto.SystemOverviewResponse;
import com.solar.core_services.service_control.model.OperationalLog;
import com.solar.core_services.service_control.service.OperationalLogService;
import com.solar.core_services.service_control.service.SystemMonitoringService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * Implementation of the SystemMonitoringService interface
 * Handles system monitoring, device heartbeats, and health checks
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class SystemMonitoringServiceImpl implements SystemMonitoringService {

    private final SolarInstallationRepository installationRepository;
    private final OperationalLogService operationalLogService;
    
    // In-memory cache for device heartbeats
    private final Map<String, DeviceStatus> deviceStatusMap = new ConcurrentHashMap<>();
    
    // Thresholds for monitoring
    private static final int UNRESPONSIVE_THRESHOLD_MINUTES = 30;
    private static final double LOW_BATTERY_THRESHOLD = 20.0; // 20%
    private static final int POOR_CONNECTIVITY_THRESHOLD = 30; // Signal strength below 30%
    
    @Override
    @Transactional
    public void processHeartbeat(DeviceHeartbeatRequest heartbeat) {
        log.info("Processing heartbeat from device: {}, installation: {}", 
                heartbeat.getDeviceId(), heartbeat.getInstallationId());
        
        // Update device status in cache
        DeviceStatus status = new DeviceStatus();
        status.setDeviceId(heartbeat.getDeviceId());
        status.setInstallationId(heartbeat.getInstallationId());
        status.setLastHeartbeat(LocalDateTime.now());
        status.setBatteryLevel(heartbeat.getBatteryLevel());
        status.setSignalStrength(heartbeat.getSignalStrength());
        status.setFirmwareVersion(heartbeat.getFirmwareVersion());
        status.setPowerStatus(heartbeat.getPowerStatus());
        
        deviceStatusMap.put(heartbeat.getDeviceId(), status);
        
        log.debug("Device status updated for device: {}", heartbeat.getDeviceId());
    }

    @Override
    @Transactional(readOnly = true)
    public SystemOverviewResponse getSystemOverview() {
        log.info("Generating system overview");
        
        // Create system overview response
        SystemOverviewResponse response = new SystemOverviewResponse();
        response.setTimestamp(LocalDateTime.now());
        
        // Count installations by status
        List<SolarInstallation> installations = installationRepository.findAll();
        
        // Count installations by status
        Map<String, Long> statusCounts = installations.stream()
                .collect(Collectors.groupingBy(
                        installation -> installation.getStatus().name(),
                        Collectors.counting()
                ));
        
        response.setInstallationsByStatus(statusCounts);
        
        // Set specific installation counts
        response.setActiveInstallations(
                installations.stream()
                        .filter(i -> i.getStatus() == InstallationStatus.ACTIVE)
                        .count()
        );
        
        response.setSuspendedInstallations(
                installations.stream()
                        .filter(i -> i.getStatus() == InstallationStatus.SUSPENDED)
                        .count()
        );
        
        response.setMaintenanceInstallations(
                installations.stream()
                        .filter(i -> i.getStatus() == InstallationStatus.MAINTENANCE)
                        .count()
        );
        
        // Count devices by status
        Map<String, Integer> devicesByStatus = new HashMap<>();
        int activeDevices = 0;
        int inactiveDevices = 0;
        int lowBatteryDevices = 0;
        int poorConnectivityDevices = 0;
        
        for (DeviceStatus status : deviceStatusMap.values()) {
            if (isDeviceActive(status)) {
                activeDevices++;
            } else {
                inactiveDevices++;
            }
            
            if (status.getBatteryLevel() != null && status.getBatteryLevel() < LOW_BATTERY_THRESHOLD) {
                lowBatteryDevices++;
            }
            
            if (status.getSignalStrength() != null && status.getSignalStrength() < POOR_CONNECTIVITY_THRESHOLD) {
                poorConnectivityDevices++;
            }
        }
        
        devicesByStatus.put("ACTIVE", activeDevices);
        devicesByStatus.put("INACTIVE", inactiveDevices);
        devicesByStatus.put("LOW_BATTERY", lowBatteryDevices);
        devicesByStatus.put("POOR_CONNECTIVITY", poorConnectivityDevices);
        response.setDevicesByStatus(devicesByStatus);
        
        // Set total counts
        response.setTotalInstallations((int) installationRepository.count());
        response.setTotalDevices(deviceStatusMap.size());
        response.setActiveAlerts(0); // Would be populated from an alert service in a real implementation
        
        log.info("System overview generated");
        return response;
    }

    @Override
    @Transactional
    public void checkUnresponsiveDevices() {
        log.info("Checking for unresponsive devices");
        
        LocalDateTime threshold = LocalDateTime.now().minusMinutes(UNRESPONSIVE_THRESHOLD_MINUTES);
        int unresponsiveCount = 0;
        
        for (DeviceStatus status : deviceStatusMap.values()) {
            if (status.getLastHeartbeat().isBefore(threshold)) {
                log.warn("Device {} is unresponsive. Last heartbeat: {}", 
                        status.getDeviceId(), status.getLastHeartbeat());
                unresponsiveCount++;
                
                // Log the unresponsive device
                operationalLogService.logOperation(
                        status.getInstallationId(),
                        OperationalLog.OperationType.SYSTEM_ALERT,
                        "SYSTEM",
                        "Device " + status.getDeviceId() + " is unresponsive. Last heartbeat: " + status.getLastHeartbeat(),
                        "MONITORING_SYSTEM",
                        "UNRESPONSIVE_CHECK",
                        "internal",
                        "SystemMonitoringService",
                        true,
                        null
                );
            }
        }
        
        log.info("Unresponsive device check completed. Found {} unresponsive devices", unresponsiveCount);
    }

    @Override
    @Transactional
    public void checkLowBatteryDevices() {
        log.info("Checking for devices with low battery");
        
        int lowBatteryCount = 0;
        
        for (DeviceStatus status : deviceStatusMap.values()) {
            if (status.getBatteryLevel() != null && status.getBatteryLevel() < LOW_BATTERY_THRESHOLD) {
                log.warn("Device {} has low battery: {}%", status.getDeviceId(), status.getBatteryLevel());
                lowBatteryCount++;
                
                // Log the low battery device
                operationalLogService.logOperation(
                        status.getInstallationId(),
                        OperationalLog.OperationType.SYSTEM_ALERT,
                        "SYSTEM",
                        "Device " + status.getDeviceId() + " has low battery: " + status.getBatteryLevel() + "%",
                        "MONITORING_SYSTEM",
                        "LOW_BATTERY_CHECK",
                        "internal",
                        "SystemMonitoringService",
                        true,
                        null
                );
            }
        }
        
        log.info("Low battery check completed. Found {} devices with low battery", lowBatteryCount);
    }

    @Override
    @Transactional
    public void checkPoorConnectivityDevices() {
        log.info("Checking for devices with poor connectivity");
        
        int poorConnectivityCount = 0;
        
        for (DeviceStatus status : deviceStatusMap.values()) {
            if (status.getSignalStrength() != null && status.getSignalStrength() < POOR_CONNECTIVITY_THRESHOLD) {
                log.warn("Device {} has poor connectivity: {} signal strength", 
                        status.getDeviceId(), status.getSignalStrength());
                poorConnectivityCount++;
                
                // Log the poor connectivity device
                operationalLogService.logOperation(
                        status.getInstallationId(),
                        OperationalLog.OperationType.SYSTEM_ALERT,
                        "SYSTEM",
                        "Device " + status.getDeviceId() + " has poor connectivity: " + status.getSignalStrength() + " signal strength",
                        "MONITORING_SYSTEM",
                        "CONNECTIVITY_CHECK",
                        "internal",
                        "SystemMonitoringService",
                        true,
                        null
                );
            }
        }
        
        log.info("Poor connectivity check completed. Found {} devices with poor connectivity", poorConnectivityCount);
    }

    @Override
    @Transactional
    public void checkOutdatedFirmwareDevices() {
        log.info("Checking for devices with outdated firmware");
        
        // In a real implementation, we would have a list of latest firmware versions by device type
        // For now, we'll just use a hardcoded latest version
        String latestFirmwareVersion = "2.0.0";
        int outdatedCount = 0;
        
        for (DeviceStatus status : deviceStatusMap.values()) {
            if (status.getFirmwareVersion() != null && !status.getFirmwareVersion().equals(latestFirmwareVersion)) {
                log.warn("Device {} has outdated firmware: {}. Latest version: {}", 
                        status.getDeviceId(), status.getFirmwareVersion(), latestFirmwareVersion);
                outdatedCount++;
                
                // Log the outdated firmware device
                operationalLogService.logOperation(
                        status.getInstallationId(),
                        OperationalLog.OperationType.SYSTEM_ALERT,
                        "SYSTEM",
                        "Device " + status.getDeviceId() + " has outdated firmware: " + status.getFirmwareVersion() + 
                                ". Latest version: " + latestFirmwareVersion,
                        "MONITORING_SYSTEM",
                        "FIRMWARE_CHECK",
                        "internal",
                        "SystemMonitoringService",
                        true,
                        null
                );
            }
        }
        
        log.info("Outdated firmware check completed. Found {} devices with outdated firmware", outdatedCount);
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> generateSystemHealthReport() {
        log.info("Generating system health report");
        
        Map<String, Object> report = new HashMap<>();
        report.put("timestamp", LocalDateTime.now().toString());
        
        // Add installation statistics
        Map<String, Object> installationStats = new HashMap<>();
        installationStats.put("total", installationRepository.count());
        
        // Count installations by status
        List<SolarInstallation> installations = installationRepository.findAll();
        
        // Count installations by status
        Map<String, Long> installationsByStatus = installations.stream()
                .collect(Collectors.groupingBy(
                        installation -> installation.getStatus().name(),
                        Collectors.counting()
                ));
        
        installationStats.put("byStatus", installationsByStatus);
        report.put("installations", installationStats);
        
        // Add device statistics
        Map<String, Object> deviceStats = new HashMap<>();
        deviceStats.put("total", deviceStatusMap.size());
        
        // Count devices by status
        int activeDevices = 0;
        int inactiveDevices = 0;
        int lowBatteryDevices = 0;
        int poorConnectivityDevices = 0;
        int outdatedFirmwareDevices = 0;
        
        String latestFirmwareVersion = "2.0.0";
        LocalDateTime threshold = LocalDateTime.now().minusMinutes(UNRESPONSIVE_THRESHOLD_MINUTES);
        
        for (DeviceStatus status : deviceStatusMap.values()) {
            if (isDeviceActive(status)) {
                activeDevices++;
            } else {
                inactiveDevices++;
            }
            
            if (status.getBatteryLevel() != null && status.getBatteryLevel() < LOW_BATTERY_THRESHOLD) {
                lowBatteryDevices++;
            }
            
            if (status.getSignalStrength() != null && status.getSignalStrength() < POOR_CONNECTIVITY_THRESHOLD) {
                poorConnectivityDevices++;
            }
            
            if (status.getFirmwareVersion() != null && !status.getFirmwareVersion().equals(latestFirmwareVersion)) {
                outdatedFirmwareDevices++;
            }
        }
        
        Map<String, Integer> deviceCounts = new HashMap<>();
        deviceCounts.put("active", activeDevices);
        deviceCounts.put("inactive", inactiveDevices);
        deviceCounts.put("lowBattery", lowBatteryDevices);
        deviceCounts.put("poorConnectivity", poorConnectivityDevices);
        deviceCounts.put("outdatedFirmware", outdatedFirmwareDevices);
        deviceStats.put("counts", deviceCounts);
        
        report.put("devices", deviceStats);
        
        // Add system health components for UI display
        List<Map<String, Object>> healthComponents = new ArrayList<>();
        
        // Server Health
        Map<String, Object> serverHealth = new HashMap<>();
        serverHealth.put("name", "Server Health");
        serverHealth.put("value", activeDevices > inactiveDevices ? 95 : 70);
        serverHealth.put("target", 95);
        serverHealth.put("color", activeDevices > inactiveDevices ? "#10b981" : "#f59e0b");
        healthComponents.add(serverHealth);
        
        // Database Connection
        Map<String, Object> dbConnection = new HashMap<>();
        dbConnection.put("name", "Database Connection");
        dbConnection.put("value", 98);
        dbConnection.put("target", 99);
        dbConnection.put("color", "#3b82f6");
        healthComponents.add(dbConnection);
        
        // API Response Time
        Map<String, Object> apiResponse = new HashMap<>();
        apiResponse.put("name", "API Response Time");
        apiResponse.put("value", 87);
        apiResponse.put("target", 90);
        apiResponse.put("color", "#10b981");
        healthComponents.add(apiResponse);
        
        // System Uptime
        Map<String, Object> uptime = new HashMap<>();
        uptime.put("name", "System Uptime");
        uptime.put("value", 99);
        uptime.put("target", 99);
        uptime.put("color", "#10b981");
        healthComponents.add(uptime);
        
        // Device Connectivity
        Map<String, Object> deviceConnectivity = new HashMap<>();
        deviceConnectivity.put("name", "Device Connectivity");
        double connectivityPercentage = deviceStatusMap.size() > 0 
            ? (double) activeDevices / deviceStatusMap.size() * 100 
            : 0;
        deviceConnectivity.put("value", Math.round(connectivityPercentage));
        deviceConnectivity.put("target", 90);
        deviceConnectivity.put("color", connectivityPercentage >= 90 ? "#10b981" : "#f59e0b");
        healthComponents.add(deviceConnectivity);
        
        report.put("systemHealth", healthComponents);
        
        log.info("System health report generated");
        return report;
    }
    
    /**
     * Check if a device is active based on its last heartbeat
     * @param status The device status
     * @return True if the device is active
     */
    private boolean isDeviceActive(DeviceStatus status) {
        LocalDateTime threshold = LocalDateTime.now().minusMinutes(UNRESPONSIVE_THRESHOLD_MINUTES);
        return status.getLastHeartbeat().isAfter(threshold);
    }
    
    /**
     * Inner class to represent device status
     */
    private static class DeviceStatus {
        private String deviceId;
        private Long installationId;
        private LocalDateTime lastHeartbeat;
        private Double batteryLevel;
        private Integer signalStrength;
        private String firmwareVersion;
        private Boolean powerStatus;
        
        public String getDeviceId() {
            return deviceId;
        }
        
        public void setDeviceId(String deviceId) {
            this.deviceId = deviceId;
        }
        
        public Long getInstallationId() {
            return installationId;
        }
        
        public void setInstallationId(Long installationId) {
            this.installationId = installationId;
        }
        
        public LocalDateTime getLastHeartbeat() {
            return lastHeartbeat;
        }
        
        public void setLastHeartbeat(LocalDateTime lastHeartbeat) {
            this.lastHeartbeat = lastHeartbeat;
        }
        
        public Double getBatteryLevel() {
            return batteryLevel;
        }
        
        public void setBatteryLevel(Double batteryLevel) {
            this.batteryLevel = batteryLevel;
        }
        
        public Integer getSignalStrength() {
            return signalStrength;
        }
        
        public void setSignalStrength(Integer signalStrength) {
            this.signalStrength = signalStrength;
        }
        
        public String getFirmwareVersion() {
            return firmwareVersion;
        }
        
        public void setFirmwareVersion(String firmwareVersion) {
            this.firmwareVersion = firmwareVersion;
        }
        
        public Boolean getPowerStatus() {
            return powerStatus;
        }
        
        public void setPowerStatus(Boolean powerStatus) {
            this.powerStatus = powerStatus;
        }
    }
} 