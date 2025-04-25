package com.solar.core_services.tampering_detection.service.impl;

import com.solar.core_services.energy_monitoring.model.SolarInstallation;
import com.solar.core_services.energy_monitoring.repository.SolarInstallationRepository;
import com.solar.core_services.tampering_detection.dto.SecurityLogDTO;
import com.solar.core_services.tampering_detection.model.SecurityLog;
import com.solar.core_services.tampering_detection.repository.SecurityLogRepository;
import com.solar.core_services.tampering_detection.service.SecurityLogService;
import com.solar.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class SecurityLogServiceImpl implements SecurityLogService {

    private final SecurityLogRepository securityLogRepository;
    private final SolarInstallationRepository solarInstallationRepository;

    @Override
    public SecurityLogDTO createSecurityLog(Long installationId, SecurityLog.ActivityType activityType, 
                                          String details, String ipAddress, String location, String userId) {
        log.info("Creating security log for installation ID: {} with activity type: {}", installationId, activityType);
        
        SolarInstallation installation = solarInstallationRepository.findById(installationId)
                .orElseThrow(() -> new ResourceNotFoundException("Solar installation not found with ID: " + installationId));
        
        SecurityLog securityLog = new SecurityLog();
        securityLog.setInstallation(installation);
        securityLog.setTimestamp(LocalDateTime.now());
        securityLog.setActivityType(activityType);
        securityLog.setDetails(details);
        securityLog.setIpAddress(ipAddress);
        securityLog.setLocation(location);
        securityLog.setUserId(userId);
        
        SecurityLog savedLog = securityLogRepository.save(securityLog);
        
        return convertToDTO(savedLog);
    }

    @Override
    public SecurityLogDTO getSecurityLogById(Long id) {
        log.info("Getting security log by ID: {}", id);
        
        SecurityLog securityLog = securityLogRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Security log not found with ID: " + id));
        
        return convertToDTO(securityLog);
    }

    @Override
    public Page<SecurityLogDTO> getSecurityLogsByInstallationId(Long installationId, Pageable pageable) {
        log.info("Getting security logs for installation ID: {}", installationId);
        
        SolarInstallation installation = solarInstallationRepository.findById(installationId)
                .orElseThrow(() -> new ResourceNotFoundException("Solar installation not found with ID: " + installationId));
        
        Page<SecurityLog> securityLogs = securityLogRepository.findByInstallationOrderByTimestampDesc(installation, pageable);
        
        return securityLogs.map(this::convertToDTO);
    }

    @Override
    public Page<SecurityLogDTO> getSecurityLogsByUserId(Long userId, Pageable pageable) {
        log.info("Getting security logs for user ID: {}", userId);
        
        List<SolarInstallation> installations = solarInstallationRepository.findByUserId(userId);
        
        if (installations.isEmpty()) {
            return Page.empty(pageable);
        }
        
        // Use a custom query to get logs for multiple installations
        Page<SecurityLog> securityLogs = securityLogRepository.findByInstallationInOrderByTimestampDesc(
                installations, pageable);
        
        return securityLogs.map(this::convertToDTO);
    }

    @Override
    public Page<SecurityLogDTO> getSecurityLogsByInstallationIds(List<Long> installationIds, Pageable pageable) {
        log.info("Getting security logs for installation IDs: {}", installationIds);
        
        if (installationIds.isEmpty()) {
            return Page.empty(pageable);
        }
        
        List<SolarInstallation> installations = solarInstallationRepository.findAllById(installationIds);
        
        // Use a custom query to get logs for multiple installations
        Page<SecurityLog> securityLogs = securityLogRepository.findByInstallationInOrderByTimestampDesc(
                installations, pageable);
        
        return securityLogs.map(this::convertToDTO);
    }

    @Override
    public List<SecurityLogDTO> getSecurityLogsByInstallationAndActivityType(Long installationId, SecurityLog.ActivityType activityType) {
        log.info("Getting security logs for installation ID: {} with activity type: {}", installationId, activityType);
        
        SolarInstallation installation = solarInstallationRepository.findById(installationId)
                .orElseThrow(() -> new ResourceNotFoundException("Solar installation not found with ID: " + installationId));
        
        List<SecurityLog> securityLogs = securityLogRepository.findByInstallationAndActivityTypeOrderByTimestampDesc(
                installation, activityType);
        
        return securityLogs.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Override
    public List<SecurityLogDTO> getSecurityLogsByInstallationAndTimeRange(Long installationId, LocalDateTime start, LocalDateTime end) {
        log.info("Getting security logs for installation ID: {} between {} and {}", installationId, start, end);
        
        SolarInstallation installation = solarInstallationRepository.findById(installationId)
                .orElseThrow(() -> new ResourceNotFoundException("Solar installation not found with ID: " + installationId));
        
        List<SecurityLog> securityLogs = securityLogRepository.findByInstallationAndTimeRange(installation, start, end);
        
        return securityLogs.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Override
    public Page<SecurityLogDTO> getSecurityLogsByActivityType(SecurityLog.ActivityType activityType, Pageable pageable) {
        log.info("Getting security logs with activity type: {}", activityType);
        
        Page<SecurityLog> securityLogs = securityLogRepository.findByActivityType(activityType, pageable);
        
        return securityLogs.map(this::convertToDTO);
    }

    @Override
    public void logTamperEventCreated(Long installationId, Long tamperEventId, String details, String ipAddress) {
        log.info("Logging tamper event creation for installation ID: {} and tamper event ID: {}", installationId, tamperEventId);
        
        String logDetails = details + " (Tamper Event ID: " + tamperEventId + ")";
        
        createSecurityLog(
                installationId,
                SecurityLog.ActivityType.ALERT_GENERATED,
                logDetails,
                ipAddress,
                null,
                "SYSTEM"
        );
    }

    @Override
    public void logTamperEventStatusChange(Long installationId, Long tamperEventId, String details, String userId) {
        log.info("Logging tamper event status change for installation ID: {} and tamper event ID: {}", installationId, tamperEventId);
        
        String logDetails = details + " (Tamper Event ID: " + tamperEventId + ")";
        
        createSecurityLog(
                installationId,
                SecurityLog.ActivityType.ALERT_ACKNOWLEDGED,
                logDetails,
                null,
                null,
                userId != null ? userId : "SYSTEM"
        );
    }

    @Override
    public void logConfigurationChange(Long installationId, String details, String userId) {
        log.info("Logging configuration change for installation ID: {}", installationId);
        
        createSecurityLog(
                installationId,
                SecurityLog.ActivityType.CONFIGURATION_CHANGE,
                details,
                null,
                null,
                userId
        );
    }

    @Override
    public Page<SecurityLogDTO> getAllSecurityLogs(Pageable pageable) {
        log.info("Getting all security logs with pagination: {}", pageable);
        
        Page<SecurityLog> securityLogs = securityLogRepository.findAllByOrderByTimestampDesc(pageable);
        
        return securityLogs.map(this::convertToDTO);
    }
    
    private SecurityLogDTO convertToDTO(SecurityLog securityLog) {
        SecurityLogDTO dto = new SecurityLogDTO();
        dto.setId(securityLog.getId());
        dto.setInstallationId(securityLog.getInstallation().getId());
        dto.setInstallationLocation(securityLog.getInstallation().getLocation());
        dto.setTimestamp(securityLog.getTimestamp());
        dto.setActivityType(securityLog.getActivityType().name());
        dto.setDetails(securityLog.getDetails());
        dto.setIpAddress(securityLog.getIpAddress());
        dto.setLocation(securityLog.getLocation());
        return dto;
    }
}