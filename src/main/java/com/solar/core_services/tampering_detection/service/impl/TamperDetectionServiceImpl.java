package com.solar.core_services.tampering_detection.service.impl;

import com.solar.core_services.energy_monitoring.model.SolarInstallation;
import com.solar.core_services.energy_monitoring.repository.SolarInstallationRepository;
import com.solar.exception.ResourceNotFoundException;
import com.solar.core_services.tampering_detection.dto.AlertConfigDTO;
import com.solar.core_services.tampering_detection.dto.AlertConfigUpdateDTO;
import com.solar.core_services.tampering_detection.dto.TamperEventCreateDTO;
import com.solar.core_services.tampering_detection.dto.TamperEventDTO;
import com.solar.core_services.tampering_detection.model.AlertConfig;
import com.solar.core_services.tampering_detection.model.MonitoringStatus;
import com.solar.core_services.tampering_detection.model.SecurityLog;
import com.solar.core_services.tampering_detection.model.TamperEvent;
import com.solar.core_services.tampering_detection.repository.MonitoringStatusRepository;
import com.solar.core_services.tampering_detection.service.AlertConfigService;
import com.solar.core_services.tampering_detection.service.SecurityLogService;
import com.solar.core_services.tampering_detection.service.TamperDetectionService;
import com.solar.core_services.tampering_detection.service.TamperEventService;
import com.solar.core_services.tampering_detection.service.TamperResponseService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
@Slf4j
public class TamperDetectionServiceImpl implements TamperDetectionService {

    private final SolarInstallationRepository solarInstallationRepository;
    private final TamperEventService tamperEventService;
    private final AlertConfigService alertConfigService;
    private final SecurityLogService securityLogService;
    private final TamperResponseService tamperResponseService;
    private final MonitoringStatusRepository monitoringStatusRepository;
    
    // Map to store the last known values for each installation to detect changes
    private final Map<Long, Map<String, Object>> lastKnownValues = new ConcurrentHashMap<>();

    @Override
    @Transactional
    public void startMonitoring(Long installationId) {
        log.info("Starting monitoring for installation ID: {}", installationId);
        
        // Verify the installation exists
        SolarInstallation installation = solarInstallationRepository.findById(installationId)
                .orElseThrow(() -> new ResourceNotFoundException("Solar installation not found with ID: " + installationId));
        
        // Initialize the last known values map for this installation if it doesn't exist
        lastKnownValues.putIfAbsent(installationId, new HashMap<>());
        
        // Set monitoring status to true in the database
        MonitoringStatus status = monitoringStatusRepository.findByInstallationId(installationId)
                .orElse(new MonitoringStatus());
        
        status.setInstallation(installation);
        status.setMonitoring(true);
        monitoringStatusRepository.save(status);
        
        // Log the monitoring start
        securityLogService.createSecurityLog(
                installationId,
                SecurityLog.ActivityType.SYSTEM_DIAGNOSTIC,
                "Tamper detection monitoring started",
                null,
                null,
                "SYSTEM"
        );
        
        // Ensure there's an alert config for this installation
        alertConfigService.createDefaultAlertConfig(installationId);
    }

    @Override
    @Transactional
    public void stopMonitoring(Long installationId) {
        log.info("Stopping monitoring for installation ID: {}", installationId);
        
        // Verify the installation exists
        SolarInstallation installation = solarInstallationRepository.findById(installationId)
                .orElseThrow(() -> new ResourceNotFoundException("Solar installation not found with ID: " + installationId));
        
        // Set monitoring status to false in the database
        MonitoringStatus status = monitoringStatusRepository.findByInstallationId(installationId)
                .orElse(new MonitoringStatus());
        
        status.setInstallation(installation);
        status.setMonitoring(false);
        monitoringStatusRepository.save(status);
        
        // Log the monitoring stop
        securityLogService.createSecurityLog(
                installationId,
                SecurityLog.ActivityType.SYSTEM_DIAGNOSTIC,
                "Tamper detection monitoring stopped",
                null,
                null,
                "SYSTEM"
        );
    }

    @Override
    public boolean isMonitoring(Long installationId) {
        return monitoringStatusRepository.findByInstallationId(installationId)
                .map(MonitoringStatus::isMonitoring)
                .orElse(false);
    }

    @Override
    @Transactional
    public TamperEventDTO processPhysicalMovementData(Long installationId, double movementValue, String rawData) {
        log.info("Processing physical movement data for installation ID: {}: {}", installationId, movementValue);
        
        // Check if monitoring is enabled for this installation
        if (!isMonitoring(installationId)) {
            log.info("Monitoring is disabled for installation ID: {}", installationId);
            return null;
        }
        
        // Get the threshold for physical movement
        double threshold = alertConfigService.getThresholdForEventType(
                installationId, TamperEvent.TamperEventType.PHYSICAL_MOVEMENT.name());
        
        // Store the last known value
        Map<String, Object> values = lastKnownValues.get(installationId);
        Double lastMovementValue = (Double) values.getOrDefault("movement", 0.0);
        values.put("movement", movementValue);
        
        // Check if the movement exceeds the threshold
        if (movementValue > threshold) {
            // Calculate confidence score based on how much it exceeds the threshold
            double confidenceScore = Math.min(1.0, movementValue / (threshold * 2));
            
            // Create a tamper event
            String description = "Physical movement detected: " + movementValue + 
                    " (threshold: " + threshold + ", previous: " + lastMovementValue + ")";
            
            return detectTampering(
                    installationId,
                    TamperEvent.TamperEventType.PHYSICAL_MOVEMENT,
                    confidenceScore,
                    description,
                    rawData
            );
        }
        
        return null;
    }

    @Override
    @Transactional
    public TamperEventDTO processVoltageFluctuationData(Long installationId, double voltageValue, String rawData) {
        log.info("Processing voltage fluctuation data for installation ID: {}: {}", installationId, voltageValue);
        
        // Check if monitoring is enabled for this installation
        if (!isMonitoring(installationId)) {
            log.info("Monitoring is disabled for installation ID: {}", installationId);
            return null;
        }
        
        // Get the threshold for voltage fluctuation
        double threshold = alertConfigService.getThresholdForEventType(
                installationId, TamperEvent.TamperEventType.VOLTAGE_FLUCTUATION.name());
        
        // Store the last known value
        Map<String, Object> values = lastKnownValues.get(installationId);
        Double lastVoltageValue = (Double) values.getOrDefault("voltage", 0.0);
        values.put("voltage", voltageValue);
        
        // Calculate the fluctuation as the absolute difference from the last value
        double fluctuation = Math.abs(voltageValue - lastVoltageValue);
        
        // Check if the fluctuation exceeds the threshold
        if (fluctuation > threshold) {
            // Calculate confidence score based on how much it exceeds the threshold
            double confidenceScore = Math.min(1.0, fluctuation / (threshold * 2));
            
            // Create a tamper event
            String description = "Voltage fluctuation detected: " + fluctuation + 
                    " (threshold: " + threshold + ", current: " + voltageValue + 
                    ", previous: " + lastVoltageValue + ")";
            
            return detectTampering(
                    installationId,
                    TamperEvent.TamperEventType.VOLTAGE_FLUCTUATION,
                    confidenceScore,
                    description,
                    rawData
            );
        }
        
        return null;
    }

    @Override
    @Transactional
    public TamperEventDTO processConnectionInterruptionData(Long installationId, boolean connected, String rawData) {
        log.info("Processing connection data for installation ID: {}: connected={}", installationId, connected);
        
        // Check if monitoring is enabled for this installation
        if (!isMonitoring(installationId)) {
            log.info("Monitoring is disabled for installation ID: {}", installationId);
            return null;
        }
        
        // Store the last known value
        Map<String, Object> values = lastKnownValues.get(installationId);
        Boolean lastConnected = (Boolean) values.getOrDefault("connected", true);
        values.put("connected", connected);
        
        // Check if the connection status changed from connected to disconnected
        if (lastConnected && !connected) {
            // Create a tamper event with high confidence
            String description = "Connection interruption detected: Device was connected and is now disconnected";
            
            return detectTampering(
                    installationId,
                    TamperEvent.TamperEventType.CONNECTION_TAMPERING,
                    0.9, // High confidence for connection interruption
                    description,
                    rawData
            );
        }
        
        return null;
    }

    @Override
    @Transactional
    public TamperEventDTO processLocationChangeData(Long installationId, String newLocation, String previousLocation, String rawData) {
        log.info("Processing location data for installation ID: {}: new={}, previous={}", 
                installationId, newLocation, previousLocation);
        
        // Check if monitoring is enabled for this installation
        if (!isMonitoring(installationId)) {
            log.info("Monitoring is disabled for installation ID: {}", installationId);
            return null;
        }
        
        // Store the last known value
        Map<String, Object> values = lastKnownValues.get(installationId);
        values.put("location", newLocation);
        
        // Check if the location changed significantly
        if (previousLocation != null && !previousLocation.equals(newLocation)) {
            // Create a tamper event with high confidence
            String description = "Location change detected: from " + previousLocation + " to " + newLocation;
            
            return detectTampering(
                    installationId,
                    TamperEvent.TamperEventType.LOCATION_CHANGE,
                    0.95, // Very high confidence for location change
                    description,
                    rawData
            );
        }
        
        return null;
    }

    @Override
    @Transactional
    public TamperEventDTO detectTampering(Long installationId, TamperEvent.TamperEventType eventType, 
                                        double confidenceScore, String description, String rawData) {
        log.info("Detecting tampering for installation ID: {}, event type: {}, confidence: {}", 
                installationId, eventType, confidenceScore);
        
        // Create the tamper event DTO
        TamperEventCreateDTO createDTO = new TamperEventCreateDTO();
        createDTO.setInstallationId(installationId);
        createDTO.setEventType(eventType);
        createDTO.setConfidenceScore(confidenceScore);
        createDTO.setDescription(description);
        createDTO.setRawSensorData(rawData);
        
        // Determine severity based on confidence score and event type
        TamperEvent.TamperSeverity severity;
        if (confidenceScore >= 0.9) {
            severity = TamperEvent.TamperSeverity.CRITICAL;
        } else if (confidenceScore >= 0.7) {
            severity = TamperEvent.TamperSeverity.HIGH;
        } else if (confidenceScore >= 0.5) {
            severity = TamperEvent.TamperSeverity.MEDIUM;
        } else {
            severity = TamperEvent.TamperSeverity.LOW;
        }
        createDTO.setSeverity(severity);
        
        // Create the tamper event
        TamperEventDTO tamperEventDTO = tamperEventService.createTamperEvent(createDTO);
        
        // If the event was created (not filtered as false positive)
        if (tamperEventDTO != null) {
            // Execute automatic response
            executeAutomaticResponse(tamperEventDTO.getId());
        }
        
        return tamperEventDTO;
    }

    @Override
    public void runDiagnostics(Long installationId) {
        log.info("Running diagnostics for installation ID: {}", installationId);
        
        // Verify the installation exists
        solarInstallationRepository.findById(installationId)
                .orElseThrow(() -> new ResourceNotFoundException("Solar installation not found with ID: " + installationId));
        
        // Log the diagnostic run
        securityLogService.createSecurityLog(
                installationId,
                SecurityLog.ActivityType.SYSTEM_DIAGNOSTIC,
                "Tamper detection diagnostics executed",
                null,
                null,
                "SYSTEM"
        );
        
        // In a real implementation, this would perform actual diagnostics on the sensors
        // For now, we'll just log that it was done
    }

    @Override
    @Transactional
    public void adjustSensitivity(Long installationId, String eventType, double newThreshold) {
        log.info("Adjusting sensitivity for installation ID: {}, event type: {}, new threshold: {}", 
                installationId, eventType, newThreshold);
        
        // Get the current alert config
        AlertConfigDTO currentConfig = alertConfigService.getAlertConfigByInstallationId(installationId);
        
        // Create an update DTO with the current values
        AlertConfigUpdateDTO updateDTO = new AlertConfigUpdateDTO();
        
        try {
            // Safely convert the String alertLevel to enum
            updateDTO.setAlertLevel(AlertConfig.AlertLevel.valueOf(currentConfig.getAlertLevel()));
        } catch (IllegalArgumentException e) {
            // If the stored alertLevel is invalid, default to MEDIUM
            log.warn("Invalid alert level value '{}' found for installation {}, defaulting to MEDIUM", 
                    currentConfig.getAlertLevel(), installationId);
            updateDTO.setAlertLevel(AlertConfig.AlertLevel.MEDIUM);
        }
        
        updateDTO.setNotificationChannels(currentConfig.getNotificationChannels());
        updateDTO.setAutoResponseEnabled(currentConfig.isAutoResponseEnabled());
        updateDTO.setPhysicalMovementThreshold(currentConfig.getPhysicalMovementThreshold());
        updateDTO.setVoltageFluctuationThreshold(currentConfig.getVoltageFluctuationThreshold());
        updateDTO.setConnectionInterruptionThreshold(currentConfig.getConnectionInterruptionThreshold());
        updateDTO.setSamplingRateSeconds(currentConfig.getSamplingRateSeconds());
        
        // Update the specific threshold based on the event type
        if (eventType.equals(TamperEvent.TamperEventType.PHYSICAL_MOVEMENT.name())) {
            updateDTO.setPhysicalMovementThreshold(newThreshold);
        } else if (eventType.equals(TamperEvent.TamperEventType.VOLTAGE_FLUCTUATION.name())) {
            updateDTO.setVoltageFluctuationThreshold(newThreshold);
        } else if (eventType.equals(TamperEvent.TamperEventType.CONNECTION_TAMPERING.name())) {
            updateDTO.setConnectionInterruptionThreshold(newThreshold);
        }
        
        // Update the alert config
        alertConfigService.updateAlertConfig(installationId, updateDTO);
        
        // Log the sensitivity adjustment
        securityLogService.createSecurityLog(
                installationId,
                SecurityLog.ActivityType.SENSITIVITY_CHANGE,
                "Tamper detection sensitivity adjusted for " + eventType + " to " + newThreshold,
                null,
                null,
                "SYSTEM"
        );
    }
    
    @Async
    private void executeAutomaticResponse(Long tamperEventId) {
        tamperResponseService.executeAutomaticResponse(tamperEventId);
    }
} 