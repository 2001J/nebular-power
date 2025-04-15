package com.solar.core_services.payment_compliance.service;

import com.solar.core_services.payment_compliance.dto.GracePeriodConfigDTO;
import com.solar.core_services.payment_compliance.model.GracePeriodConfig;

public interface GracePeriodConfigService {
    
    GracePeriodConfigDTO getCurrentConfig();
    
    GracePeriodConfigDTO updateConfig(GracePeriodConfigDTO configDTO, String username);
    
    GracePeriodConfig getActiveGracePeriodConfig();
    
    int getGracePeriodDays();
    
    int getReminderFrequency();
    
    boolean isAutoSuspendEnabled();
} 