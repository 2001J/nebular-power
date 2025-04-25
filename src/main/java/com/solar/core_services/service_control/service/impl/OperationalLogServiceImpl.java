package com.solar.core_services.service_control.service.impl;

import com.solar.core_services.energy_monitoring.model.SolarInstallation;
import com.solar.core_services.energy_monitoring.repository.SolarInstallationRepository;
import com.solar.core_services.service_control.dto.OperationalLogDTO;
import com.solar.core_services.service_control.model.OperationalLog;
import com.solar.core_services.service_control.repository.OperationalLogRepository;
import com.solar.core_services.service_control.service.OperationalLogService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class OperationalLogServiceImpl implements OperationalLogService {

    private final OperationalLogRepository operationalLogRepository;
    private final SolarInstallationRepository installationRepository;

    @Override
    @Transactional
    public OperationalLogDTO logOperation(Long installationId, OperationalLog.OperationType operation, 
                                        String initiator, String details, String sourceSystem, 
                                        String sourceAction, String ipAddress, String userAgent, 
                                        boolean success, String errorDetails) {
        log.info("Logging operation {} for installation {}", operation, installationId);
        
        OperationalLog operationalLog = new OperationalLog();
        
        if (installationId != null) {
            SolarInstallation installation = installationRepository.findById(installationId)
                    .orElse(null);
            operationalLog.setInstallation(installation);
        }
        
        operationalLog.setOperation(operation);
        operationalLog.setInitiator(initiator);
        operationalLog.setDetails(details);
        operationalLog.setSourceSystem(sourceSystem);
        operationalLog.setSourceAction(sourceAction);
        operationalLog.setIpAddress(ipAddress);
        
        // Truncate userAgent if it's too long
        if (userAgent != null && userAgent.length() > 490) {
            userAgent = userAgent.substring(0, 490) + "...";
        }
        operationalLog.setUserAgent(userAgent);
        
        operationalLog.setSuccess(success);
        operationalLog.setErrorDetails(errorDetails);
        
        try {
            operationalLog = operationalLogRepository.save(operationalLog);
            log.info("Operation logged with ID: {}", operationalLog.getId());
            return OperationalLogDTO.fromEntity(operationalLog);
        } catch (Exception e) {
            // If there's still an error (e.g., during migration), log it and return null
            log.error("Error saving operation log: {}", e.getMessage());
            // Create a transient DTO to return even if saving fails
            return OperationalLogDTO.fromEntity(operationalLog);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public Page<OperationalLogDTO> getLogsByInstallation(Long installationId, Pageable pageable) {
        log.info("Getting logs for installation {}", installationId);
        
        Page<OperationalLog> logs = operationalLogRepository.findByInstallationIdOrderByTimestampDesc(installationId, pageable);
        return logs.map(OperationalLogDTO::fromEntity);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<OperationalLogDTO> getLogsByOperation(OperationalLog.OperationType operation, Pageable pageable) {
        log.info("Getting logs for operation {}", operation);
        
        Page<OperationalLog> logs = operationalLogRepository.findByOperationOrderByTimestampDesc(operation, pageable);
        return logs.map(OperationalLogDTO::fromEntity);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<OperationalLogDTO> getLogsByInitiator(String initiator, Pageable pageable) {
        log.info("Getting logs for initiator {}", initiator);
        
        Page<OperationalLog> logs = operationalLogRepository.findByInitiatorOrderByTimestampDesc(initiator, pageable);
        return logs.map(OperationalLogDTO::fromEntity);
    }

    @Override
    @Transactional(readOnly = true)
    public List<OperationalLogDTO> getLogsByTimeRange(LocalDateTime start, LocalDateTime end) {
        log.info("Getting logs between {} and {}", start, end);
        
        List<OperationalLog> logs = operationalLogRepository.findByTimestampBetweenOrderByTimestampDesc(start, end);
        
        return logs.stream()
                .map(OperationalLogDTO::fromEntity)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<OperationalLogDTO> getLogsByUserId(Long userId) {
        log.info("Getting logs for user {}", userId);
        
        List<OperationalLog> logs = operationalLogRepository.findByUserIdOrderByTimestampDesc(userId);
        
        return logs.stream()
                .map(OperationalLogDTO::fromEntity)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<OperationalLogDTO> getLogsBySourceSystem(String sourceSystem) {
        log.info("Getting logs for source system {}", sourceSystem);
        
        List<OperationalLog> logs = operationalLogRepository.findBySourceSystemOrderByTimestampDesc(sourceSystem);
        
        return logs.stream()
                .map(OperationalLogDTO::fromEntity)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public Page<OperationalLogDTO> getLogsByInstallationAndOperation(Long installationId, 
                                                                  OperationalLog.OperationType operation, 
                                                                  Pageable pageable) {
        log.info("Getting logs for installation {} and operation {}", installationId, operation);
        
        Page<OperationalLog> logs = operationalLogRepository.findByInstallationIdAndOperationOrderByTimestampDesc(
                installationId, operation, pageable);
        
        return logs.map(OperationalLogDTO::fromEntity);
    }

    @Override
    @Transactional(readOnly = true)
    public OperationalLogDTO getLogById(Long logId) {
        log.info("Getting log with ID {}", logId);
        
        OperationalLog operationalLog = operationalLogRepository.findById(logId)
                .orElseThrow(() -> new RuntimeException("Operational log not found with ID: " + logId));
        
        return OperationalLogDTO.fromEntity(operationalLog);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Object[]> getOperationCounts() {
        log.info("Getting operation counts");
        return operationalLogRepository.countByOperation();
    }

    @Override
    @Transactional(readOnly = true)
    public List<Object[]> getSuccessCounts() {
        log.info("Getting success counts");
        return operationalLogRepository.countBySuccess();
    }
} 