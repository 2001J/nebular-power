package com.solar.core_services.payment_compliance.service;

import com.solar.core_services.payment_compliance.dto.ReminderConfigDTO;
import com.solar.core_services.payment_compliance.model.ReminderConfig;

public interface ReminderConfigService {
    
    ReminderConfigDTO getCurrentConfig();
    
    ReminderConfigDTO updateConfig(ReminderConfigDTO configDTO, String username);
    
    ReminderConfig getActiveReminderConfig();
    
    int getFirstReminderDays();
    
    int getSecondReminderDays();
    
    int getFinalReminderDays();
    
    String getReminderMethod();
    
    boolean isAutoSendRemindersEnabled();
} 