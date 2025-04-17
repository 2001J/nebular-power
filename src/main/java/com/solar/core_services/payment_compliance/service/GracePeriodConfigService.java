package com.solar.core_services.payment_compliance.service;

import com.solar.core_services.payment_compliance.dto.GracePeriodConfigDTO;
import com.solar.core_services.payment_compliance.model.GracePeriodConfig;
import java.math.BigDecimal;

public interface GracePeriodConfigService {

    GracePeriodConfigDTO getCurrentConfig();

    GracePeriodConfigDTO updateConfig(GracePeriodConfigDTO configDTO, String username);

    GracePeriodConfig getActiveGracePeriodConfig();

    int getGracePeriodDays();

    int getReminderFrequency();

    boolean isAutoSuspendEnabled();

    boolean isLateFeesEnabled();

    BigDecimal getLateFeeAmount();

    BigDecimal getLateFeePercentage();
}