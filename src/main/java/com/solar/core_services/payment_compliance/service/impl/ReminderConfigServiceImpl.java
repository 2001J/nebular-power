package com.solar.core_services.payment_compliance.service.impl;

import com.solar.core_services.payment_compliance.dto.ReminderConfigDTO;
import com.solar.core_services.payment_compliance.model.ReminderConfig;
import com.solar.core_services.payment_compliance.repository.ReminderConfigRepository;
import com.solar.core_services.payment_compliance.service.ReminderConfigService;
import com.solar.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ReminderConfigServiceImpl implements ReminderConfigService {

    private final ReminderConfigRepository reminderConfigRepository;

    @Override
    @Transactional(readOnly = true)
    public ReminderConfigDTO getCurrentConfig() {
        ReminderConfig config = getActiveReminderConfig();
        return mapToDTO(config);
    }

    @Override
    @Transactional
    public ReminderConfigDTO updateConfig(ReminderConfigDTO configDTO, String username) {
        // Validate configuration
        if (configDTO.getFirstReminderDays() >= configDTO.getSecondReminderDays() || 
            configDTO.getSecondReminderDays() >= configDTO.getFinalReminderDays()) {
            throw new IllegalArgumentException("Reminder days must be in ascending order: first < second < final");
        }
        
        ReminderConfig config;
        
        if (configDTO.getId() != null) {
            config = reminderConfigRepository.findById(configDTO.getId())
                    .orElseThrow(() -> new ResourceNotFoundException("Reminder config not found with id: " + configDTO.getId()));
            
            updateConfigFields(config, configDTO);
            config.setUpdatedBy(username);
        } else {
            config = new ReminderConfig();
            updateConfigFields(config, configDTO);
            config.setCreatedBy(username);
            config.setUpdatedBy(username);
        }
        
        ReminderConfig savedConfig = reminderConfigRepository.save(config);
        return mapToDTO(savedConfig);
    }

    private void updateConfigFields(ReminderConfig config, ReminderConfigDTO configDTO) {
        config.setAutoSendReminders(configDTO.getAutoSendReminders() != null ? configDTO.getAutoSendReminders() : true);
        config.setFirstReminderDays(configDTO.getFirstReminderDays() != null ? configDTO.getFirstReminderDays() : 1);
        config.setSecondReminderDays(configDTO.getSecondReminderDays() != null ? configDTO.getSecondReminderDays() : 3);
        config.setFinalReminderDays(configDTO.getFinalReminderDays() != null ? configDTO.getFinalReminderDays() : 7);
        config.setReminderMethod(configDTO.getReminderMethod() != null ? configDTO.getReminderMethod() : "EMAIL");
    }

    @Override
    @Transactional(readOnly = true)
    public ReminderConfig getActiveReminderConfig() {
        return reminderConfigRepository.findLatestConfig()
                .orElseGet(() -> {
                    // Create default config if none exists
                    ReminderConfig defaultConfig = new ReminderConfig();
                    defaultConfig.setAutoSendReminders(true);
                    defaultConfig.setFirstReminderDays(1);
                    defaultConfig.setSecondReminderDays(3);
                    defaultConfig.setFinalReminderDays(7);
                    defaultConfig.setReminderMethod("EMAIL");
                    defaultConfig.setCreatedBy("system");
                    defaultConfig.setUpdatedBy("system");
                    return reminderConfigRepository.save(defaultConfig);
                });
    }

    @Override
    @Transactional(readOnly = true)
    public int getFirstReminderDays() {
        return getActiveReminderConfig().getFirstReminderDays();
    }

    @Override
    @Transactional(readOnly = true)
    public int getSecondReminderDays() {
        return getActiveReminderConfig().getSecondReminderDays();
    }

    @Override
    @Transactional(readOnly = true)
    public int getFinalReminderDays() {
        return getActiveReminderConfig().getFinalReminderDays();
    }

    @Override
    @Transactional(readOnly = true)
    public String getReminderMethod() {
        return getActiveReminderConfig().getReminderMethod();
    }

    @Override
    @Transactional(readOnly = true)
    public boolean isAutoSendRemindersEnabled() {
        return getActiveReminderConfig().getAutoSendReminders();
    }
    
    private ReminderConfigDTO mapToDTO(ReminderConfig config) {
        return ReminderConfigDTO.builder()
                .id(config.getId())
                .autoSendReminders(config.getAutoSendReminders())
                .firstReminderDays(config.getFirstReminderDays())
                .secondReminderDays(config.getSecondReminderDays())
                .finalReminderDays(config.getFinalReminderDays())
                .reminderMethod(config.getReminderMethod())
                .createdAt(config.getCreatedAt())
                .updatedAt(config.getUpdatedAt())
                .createdBy(config.getCreatedBy())
                .updatedBy(config.getUpdatedBy())
                .build();
    }
} 