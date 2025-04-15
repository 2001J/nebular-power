package com.solar.core_services.tampering_detection.service;

import com.solar.core_services.tampering_detection.dto.SecurityLogDTO;
import com.solar.core_services.tampering_detection.model.SecurityLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.List;

public interface SecurityLogService {
    
    SecurityLogDTO createSecurityLog(Long installationId, SecurityLog.ActivityType activityType, 
                                    String details, String ipAddress, String location, String userId);
    
    SecurityLogDTO getSecurityLogById(Long id);
    
    Page<SecurityLogDTO> getSecurityLogsByInstallationId(Long installationId, Pageable pageable);
    
    Page<SecurityLogDTO> getSecurityLogsByUserId(Long userId, Pageable pageable);
    
    Page<SecurityLogDTO> getSecurityLogsByInstallationIds(List<Long> installationIds, Pageable pageable);
    
    List<SecurityLogDTO> getSecurityLogsByInstallationAndActivityType(Long installationId, SecurityLog.ActivityType activityType);
    
    List<SecurityLogDTO> getSecurityLogsByInstallationAndTimeRange(Long installationId, LocalDateTime start, LocalDateTime end);
    
    Page<SecurityLogDTO> getSecurityLogsByActivityType(SecurityLog.ActivityType activityType, Pageable pageable);
    
    void logTamperEventCreated(Long installationId, Long tamperEventId, String details, String ipAddress);
    
    void logTamperEventStatusChange(Long installationId, Long tamperEventId, String details, String userId);
    
    void logConfigurationChange(Long installationId, String details, String userId);
} 