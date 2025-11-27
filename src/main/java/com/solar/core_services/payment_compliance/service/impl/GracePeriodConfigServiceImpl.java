package com.solar.core_services.payment_compliance.service.impl;

import com.solar.core_services.payment_compliance.dto.GracePeriodConfigDTO;
import com.solar.core_services.payment_compliance.model.GracePeriodConfig;
import com.solar.core_services.payment_compliance.repository.GracePeriodConfigRepository;
import com.solar.core_services.payment_compliance.service.GracePeriodConfigService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

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
        // Always fetch the latest config, regardless of whether ID is provided
        GracePeriodConfig config = getActiveGracePeriodConfig();

        // Update the existing config
        if (configDTO.getNumberOfDays() == null || configDTO.getNumberOfDays() < 1) {
            throw new IllegalArgumentException("Grace period must be at least 1 day");
        }
        if (configDTO.getReminderFrequency() == null || configDTO.getReminderFrequency() < 1) {
            throw new IllegalArgumentException("Reminder frequency must be at least 1 day");
        }

        config.setNumberOfDays(configDTO.getNumberOfDays());
        config.setReminderFrequency(configDTO.getReminderFrequency());
        config.setAutoSuspendEnabled(Boolean.TRUE.equals(configDTO.getAutoSuspendEnabled()));

        // Update late fee settings with validation
        if (Boolean.TRUE.equals(configDTO.getLateFeesEnabled())) {
            BigDecimal percentage = configDTO.getLateFeePercentage();
            BigDecimal fixedAmount = configDTO.getLateFeeFixedAmount();

            boolean hasPercentage = percentage != null && percentage.compareTo(BigDecimal.ZERO) > 0;
            boolean hasFixedAmount = fixedAmount != null && fixedAmount.compareTo(BigDecimal.ZERO) > 0;

            if (!hasPercentage && !hasFixedAmount) {
                throw new IllegalArgumentException("Provide at least a percentage or fixed amount when late fees are enabled");
            }

            config.setLateFeesEnabled(true);
            config.setLateFeePercentage(hasPercentage ? percentage : BigDecimal.ZERO);
            config.setLateFeeFixedAmount(hasFixedAmount ? fixedAmount : BigDecimal.ZERO);
        } else {
            config.setLateFeesEnabled(false);
            config.setLateFeePercentage(BigDecimal.ZERO);
            config.setLateFeeFixedAmount(BigDecimal.ZERO);
        }

        config.setUpdatedBy(username);

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

    @Override
    @Transactional(readOnly = true)
    public boolean isLateFeesEnabled() {
        return getActiveGracePeriodConfig().getLateFeesEnabled();
    }

    @Override
    @Transactional(readOnly = true)
    public BigDecimal getLateFeeAmount() {
        return getActiveGracePeriodConfig().getLateFeeFixedAmount();
    }

    @Override
    @Transactional(readOnly = true)
    public BigDecimal getLateFeePercentage() {
        return getActiveGracePeriodConfig().getLateFeePercentage();
    }

    private GracePeriodConfigDTO mapToDTO(GracePeriodConfig config) {
        return GracePeriodConfigDTO.builder()
                .id(config.getId())
                .numberOfDays(config.getNumberOfDays())
                .reminderFrequency(config.getReminderFrequency())
                .autoSuspendEnabled(config.getAutoSuspendEnabled())
                .lateFeesEnabled(config.getLateFeesEnabled())
                .lateFeePercentage(config.getLateFeePercentage())
                .lateFeeFixedAmount(config.getLateFeeFixedAmount())
                .createdAt(config.getCreatedAt())
                .updatedAt(config.getUpdatedAt())
                .createdBy(config.getCreatedBy())
                .updatedBy(config.getUpdatedBy())
                .build();
    }
}
