package com.solar.core_services.tampering_detection.service.impl;

import com.solar.core_services.energy_monitoring.model.SolarInstallation;
import com.solar.core_services.energy_monitoring.repository.SolarInstallationRepository;
import com.solar.core_services.tampering_detection.dto.AlertConfigDTO;
import com.solar.core_services.tampering_detection.dto.AlertConfigUpdateDTO;
import com.solar.core_services.tampering_detection.model.AlertConfig;
import com.solar.core_services.tampering_detection.model.TamperEvent;
import com.solar.core_services.tampering_detection.repository.AlertConfigRepository;
import com.solar.core_services.tampering_detection.service.AlertConfigService;
import com.solar.core_services.tampering_detection.service.SecurityLogService;
import com.solar.exception.ResourceNotFoundException;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AlertConfigServiceImpl implements AlertConfigService {

    private final AlertConfigRepository alertConfigRepository;
    private final SolarInstallationRepository solarInstallationRepository;
    private final SecurityLogService securityLogService;

    @Override
    public AlertConfigDTO getAlertConfigByInstallationId(Long installationId) {
        log.info("Getting alert config for installation ID: {}", installationId);
        
        SolarInstallation installation = solarInstallationRepository.findById(installationId)
                .orElseThrow(() -> new ResourceNotFoundException("Solar installation not found with ID: " + installationId));
        
        AlertConfig alertConfig = alertConfigRepository.findByInstallation(installation)
                .orElseGet(() -> createDefaultAlertConfigEntity(installation));
        
        return convertToDTO(alertConfig);
    }

    @Override
    @Transactional
    public AlertConfigDTO createDefaultAlertConfig(Long installationId) {
        log.info("Creating default alert config for installation ID: {}", installationId);
        
        SolarInstallation installation = solarInstallationRepository.findById(installationId)
                .orElseThrow(() -> new ResourceNotFoundException("Solar installation not found with ID: " + installationId));
        
        // Check if config already exists
        if (alertConfigRepository.findByInstallation(installation).isPresent()) {
            log.info("Alert config already exists for installation ID: {}", installationId);
            return getAlertConfigByInstallationId(installationId);
        }
        
        AlertConfig alertConfig = createDefaultAlertConfigEntity(installation);
        AlertConfig savedConfig = alertConfigRepository.save(alertConfig);
        
        // Log the configuration creation
        securityLogService.logConfigurationChange(
                installation.getId(),
                "Default alert configuration created",
                "SYSTEM"
        );
        
        return convertToDTO(savedConfig);
    }

    @Override
    @Transactional
    public AlertConfigDTO updateAlertConfig(Long installationId, AlertConfigUpdateDTO updateDTO) {
        log.info("Updating alert config for installation ID: {}", installationId);
        
        SolarInstallation installation = solarInstallationRepository.findById(installationId)
                .orElseThrow(() -> new ResourceNotFoundException("Solar installation not found with ID: " + installationId));
        
        AlertConfig alertConfig = alertConfigRepository.findByInstallation(installation)
                .orElseGet(() -> createDefaultAlertConfigEntity(installation));
        
        // Update the config
        alertConfig.setAlertLevel(updateDTO.getAlertLevel());
        alertConfig.setNotificationChannels(updateDTO.getNotificationChannels());
        alertConfig.setAutoResponseEnabled(updateDTO.getAutoResponseEnabled());
        alertConfig.setPhysicalMovementThreshold(updateDTO.getPhysicalMovementThreshold());
        alertConfig.setVoltageFluctuationThreshold(updateDTO.getVoltageFluctuationThreshold());
        alertConfig.setConnectionInterruptionThreshold(updateDTO.getConnectionInterruptionThreshold());
        alertConfig.setSamplingRateSeconds(updateDTO.getSamplingRateSeconds());
        
        AlertConfig savedConfig = alertConfigRepository.save(alertConfig);
        
        // Log the configuration update
        securityLogService.logConfigurationChange(
                installation.getId(),
                "Alert configuration updated: Alert level=" + updateDTO.getAlertLevel() + 
                ", Auto response=" + updateDTO.getAutoResponseEnabled(),
                "SYSTEM"
        );
        
        return convertToDTO(savedConfig);
    }

    @Override
    public List<AlertConfigDTO> getAlertConfigsByUserId(Long userId) {
        log.info("Getting alert configs for user ID: {}", userId);
        
        List<SolarInstallation> installations = solarInstallationRepository.findByUserId(userId);
        
        return installations.stream()
            .map(installation -> {
                AlertConfig alertConfig = alertConfigRepository.findByInstallation(installation)
                    .orElseGet(() -> createDefaultAlertConfigEntity(installation));
                return convertToDTO(alertConfig);
            })
            .collect(Collectors.toList());
    }

    @Override
    public List<AlertConfigDTO> getAlertConfigsByInstallationIds(List<Long> installationIds) {
        log.info("Getting alert configs for installation IDs: {}", installationIds);
        
        if (installationIds.isEmpty()) {
            return List.of();
        }
        
        List<SolarInstallation> installations = solarInstallationRepository.findAllById(installationIds);
        
        return installations.stream()
            .map(installation -> {
                AlertConfig alertConfig = alertConfigRepository.findByInstallation(installation)
                    .orElseGet(() -> createDefaultAlertConfigEntity(installation));
                return convertToDTO(alertConfig);
            })
            .collect(Collectors.toList());
    }

    @Override
    public List<AlertConfigDTO> getAlertConfigsByAlertLevel(AlertConfig.AlertLevel alertLevel) {
        log.info("Getting alert configs with alert level: {}", alertLevel);
        
        List<AlertConfig> alertConfigs = alertConfigRepository.findByAlertLevel(alertLevel);
        
        return alertConfigs.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Override
    public List<AlertConfigDTO> getAutoResponseEnabledConfigs() {
        log.info("Getting alert configs with auto response enabled");
        
        List<AlertConfig> alertConfigs = alertConfigRepository.findByAutoResponseEnabled();
        
        return alertConfigs.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Override
    public boolean isAutoResponseEnabled(Long installationId) {
        log.info("Checking if auto response is enabled for installation ID: {}", installationId);
        
        SolarInstallation installation = solarInstallationRepository.findById(installationId)
                .orElseThrow(() -> new ResourceNotFoundException("Solar installation not found with ID: " + installationId));
        
        return alertConfigRepository.findByInstallation(installation)
                .map(AlertConfig::isAutoResponseEnabled)
                .orElse(true); // Default to true if no config exists
    }

    @Override
    public double getThresholdForEventType(Long installationId, String eventType) {
        log.info("Getting threshold for installation ID: {} and event type: {}", installationId, eventType);
        
        SolarInstallation installation = solarInstallationRepository.findById(installationId)
                .orElseThrow(() -> new ResourceNotFoundException("Solar installation not found with ID: " + installationId));
        
        AlertConfig alertConfig = alertConfigRepository.findByInstallation(installation)
                .orElseGet(() -> createDefaultAlertConfigEntity(installation));
        
        // Return the appropriate threshold based on the event type
        if (eventType.equals(TamperEvent.TamperEventType.PHYSICAL_MOVEMENT.name())) {
            return alertConfig.getPhysicalMovementThreshold();
        } else if (eventType.equals(TamperEvent.TamperEventType.VOLTAGE_FLUCTUATION.name())) {
            return alertConfig.getVoltageFluctuationThreshold();
        } else if (eventType.equals(TamperEvent.TamperEventType.CONNECTION_TAMPERING.name())) {
            return alertConfig.getConnectionInterruptionThreshold();
        } else {
            // Default threshold for other event types
            return 0.5;
        }
    }

    @Override
    public int getSamplingRateSeconds(Long installationId) {
        log.info("Getting sampling rate for installation ID: {}", installationId);
        
        SolarInstallation installation = solarInstallationRepository.findById(installationId)
                .orElseThrow(() -> new ResourceNotFoundException("Solar installation not found with ID: " + installationId));
        
        return alertConfigRepository.findByInstallation(installation)
                .map(AlertConfig::getSamplingRateSeconds)
                .orElse(60); // Default to 60 seconds if no config exists
    }
    
    private AlertConfig createDefaultAlertConfigEntity(SolarInstallation installation) {
        AlertConfig alertConfig = new AlertConfig();
        alertConfig.setInstallation(installation);
        alertConfig.setAlertLevel(AlertConfig.AlertLevel.MEDIUM);
        
        Set<AlertConfig.NotificationChannel> channels = new HashSet<>();
        channels.add(AlertConfig.NotificationChannel.EMAIL);
        channels.add(AlertConfig.NotificationChannel.IN_APP);
        alertConfig.setNotificationChannels(channels);
        
        alertConfig.setAutoResponseEnabled(true);
        alertConfig.setPhysicalMovementThreshold(0.75);
        alertConfig.setVoltageFluctuationThreshold(0.5);
        alertConfig.setConnectionInterruptionThreshold(0.8);
        alertConfig.setSamplingRateSeconds(60);
        alertConfig.setCreatedAt(LocalDateTime.now());
        alertConfig.setUpdatedAt(LocalDateTime.now());
        
        return alertConfig;
    }
    
    private AlertConfigDTO convertToDTO(AlertConfig alertConfig) {
        AlertConfigDTO dto = new AlertConfigDTO();
        dto.setId(alertConfig.getId());
        dto.setInstallationId(alertConfig.getInstallation().getId());
        dto.setAlertLevel(alertConfig.getAlertLevel().name());
        dto.setNotificationChannels(alertConfig.getNotificationChannels());
        dto.setAutoResponseEnabled(alertConfig.isAutoResponseEnabled());
        dto.setPhysicalMovementThreshold(alertConfig.getPhysicalMovementThreshold());
        dto.setVoltageFluctuationThreshold(alertConfig.getVoltageFluctuationThreshold());
        dto.setConnectionInterruptionThreshold(alertConfig.getConnectionInterruptionThreshold());
        dto.setSamplingRateSeconds(alertConfig.getSamplingRateSeconds());
        dto.setUpdatedAt(alertConfig.getUpdatedAt());
        return dto;
    }
} 