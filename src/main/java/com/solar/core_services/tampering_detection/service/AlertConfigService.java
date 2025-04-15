package com.solar.core_services.tampering_detection.service;

import com.solar.core_services.tampering_detection.dto.AlertConfigDTO;
import com.solar.core_services.tampering_detection.dto.AlertConfigUpdateDTO;
import com.solar.core_services.tampering_detection.model.AlertConfig;

import java.util.List;

public interface AlertConfigService {
    
    AlertConfigDTO getAlertConfigByInstallationId(Long installationId);
    
    AlertConfigDTO createDefaultAlertConfig(Long installationId);
    
    AlertConfigDTO updateAlertConfig(Long installationId, AlertConfigUpdateDTO updateDTO);
    
    List<AlertConfigDTO> getAlertConfigsByUserId(Long userId);
    
    List<AlertConfigDTO> getAlertConfigsByInstallationIds(List<Long> installationIds);
    
    List<AlertConfigDTO> getAlertConfigsByAlertLevel(AlertConfig.AlertLevel alertLevel);
    
    List<AlertConfigDTO> getAutoResponseEnabledConfigs();
    
    boolean isAutoResponseEnabled(Long installationId);
    
    double getThresholdForEventType(Long installationId, String eventType);
    
    int getSamplingRateSeconds(Long installationId);
} 