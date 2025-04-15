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
    public String generateSystemHealthReport() {
        log.info("Generating system health report");
        
        StringBuilder report = new StringBuilder();
        report.append("System Health Report - ").append(LocalDateTime.now()).append("\n\n");
        
        // Add installation statistics
        report.append("Installation Statistics:\n");
        report.append("Total Installations: ").append(installationRepository.count()).append("\n");
        
        // Replace countByStatus() with a manual count
        List<SolarInstallation> installations = installationRepository.findAll();
        
        // Count installations by status
        Map<String, Long> installationsByStatus = installations.stream()
                .collect(Collectors.groupingBy(
                        installation -> installation.getStatus().name(),
                        Collectors.counting()
                ));
        
        for (Map.Entry<String, Long> entry : installationsByStatus.entrySet()) {
            report.append("  ").append(entry.getKey()).append(": ").append(entry.getValue()).append("\n");
        }
        
        // Add device statistics
        report.append("\nDevice Statistics:\n");
        report.append("Total Devices: ").append(deviceStatusMap.size()).append("\n");
        
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
        
        report.append("  Active Devices: ").append(activeDevices).append("\n");
        report.append("  Inactive Devices: ").append(inactiveDevices).append("\n");
        report.append("  Low Battery Devices: ").append(lowBatteryDevices).append("\n");
        report.append("  Poor Connectivity Devices: ").append(poorConnectivityDevices).append("\n");
        report.append("  Outdated Firmware Devices: ").append(outdatedFirmwareDevices).append("\n");
        
        log.info("System health report generated");
        return report.toString();
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