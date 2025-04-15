package com.solar.core_services.payment_compliance.service.impl;

import com.solar.core_services.payment_compliance.dto.GracePeriodConfigDTO;
import com.solar.core_services.payment_compliance.model.GracePeriodConfig;
import com.solar.core_services.payment_compliance.repository.GracePeriodConfigRepository;
import com.solar.core_services.payment_compliance.service.GracePeriodConfigService;
import com.solar.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class GracePeriodConfigServiceImpl implements GracePeriodConfigService {

    private final GracePeriodConfigRepository gracePeriodConfigRepository;

    @Override
    @Transactional(readOnly = true)
    public GracePeriodConfigDTO getCurrentConfig() {
        GracePeriodConfig config = getActiveGracePeriodConfig();
        return mapToDTO(config);
    }

    @Override
    @Transactional
    public GracePeriodConfigDTO updateConfig(GracePeriodConfigDTO configDTO, String username) {
        GracePeriodConfig config;
        
        if (configDTO.getId() != null) {
            config = gracePeriodConfigRepository.findById(configDTO.getId())
                    .orElseThrow(() -> new ResourceNotFoundException("Grace period config not found with id: " + configDTO.getId()));
            
            config.setNumberOfDays(configDTO.getNumberOfDays());
            config.setReminderFrequency(configDTO.getReminderFrequency());
            config.setAutoSuspendEnabled(configDTO.getAutoSuspendEnabled());
            config.setUpdatedBy(username);
        } else {
            config = new GracePeriodConfig();
            config.setNumberOfDays(configDTO.getNumberOfDays());
            config.setReminderFrequency(configDTO.getReminderFrequency());
            config.setAutoSuspendEnabled(configDTO.getAutoSuspendEnabled());
            config.setCreatedBy(username);
            config.setUpdatedBy(username);
        }
        
        GracePeriodConfig savedConfig = gracePeriodConfigRepository.save(config);
        return mapToDTO(savedConfig);
    }

    @Override
    @Transactional(readOnly = true)
    public GracePeriodConfig getActiveGracePeriodConfig() {
        return gracePeriodConfigRepository.findLatestConfig()
                .orElseGet(() -> {
                    // Create default config if none exists
                    GracePeriodConfig defaultConfig = new GracePeriodConfig();
                    defaultConfig.setNumberOfDays(7);
                    defaultConfig.setReminderFrequency(2);
                    defaultConfig.setAutoSuspendEnabled(true);
                    defaultConfig.setCreatedBy("system");
                    defaultConfig.setUpdatedBy("system");
                    return gracePeriodConfigRepository.save(defaultConfig);
                });
    }

    @Override
    @Transactional(readOnly = true)
    public int getGracePeriodDays() {
        return getActiveGracePeriodConfig().getNumberOfDays();
    }

    @Override
    @Transactional(readOnly = true)
    public int getReminderFrequency() {
        return getActiveGracePeriodConfig().getReminderFrequency();
    }

    @Override
    @Transactional(readOnly = true)
    public boolean isAutoSuspendEnabled() {
        return getActiveGracePeriodConfig().getAutoSuspendEnabled();
    }
    
    private GracePeriodConfigDTO mapToDTO(GracePeriodConfig config) {
        return GracePeriodConfigDTO.builder()
                .id(config.getId())
                .numberOfDays(config.getNumberOfDays())
                .reminderFrequency(config.getReminderFrequency())
                .autoSuspendEnabled(config.getAutoSuspendEnabled())
                .createdAt(config.getCreatedAt())
                .updatedAt(config.getUpdatedAt())
                .createdBy(config.getCreatedBy())
                .updatedBy(config.getUpdatedBy())
                .build();
    }
} 