package com.solar.core_services.service_control.service;

import com.solar.core_services.service_control.dto.OperationalLogDTO;
import com.solar.core_services.service_control.model.OperationalLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.List;

public interface OperationalLogService {
    
    /**
     * Log an operational event
     */
    OperationalLogDTO logOperation(Long installationId, OperationalLog.OperationType operation, 
                                  String initiator, String details, String sourceSystem, 
                                  String sourceAction, String ipAddress, String userAgent, 
                                  boolean success, String errorDetails);
    
    /**
     * Get logs for an installation
     */
    Page<OperationalLogDTO> getLogsByInstallation(Long installationId, Pageable pageable);
    
    /**
     * Get logs by operation type
     */
    Page<OperationalLogDTO> getLogsByOperation(OperationalLog.OperationType operation, Pageable pageable);
    
    /**
     * Get logs by initiator
     */
    Page<OperationalLogDTO> getLogsByInitiator(String initiator, Pageable pageable);
    
    /**
     * Get logs within a time range
     */
    List<OperationalLogDTO> getLogsByTimeRange(LocalDateTime start, LocalDateTime end);
    
    /**
     * Get logs for a user's installations
     */
    List<OperationalLogDTO> getLogsByUserId(Long userId);
    
    /**
     * Get logs by source system
     */
    List<OperationalLogDTO> getLogsBySourceSystem(String sourceSystem);
    
    /**
     * Get logs by operation type and installation
     */
    Page<OperationalLogDTO> getLogsByInstallationAndOperation(Long installationId, 
                                                            OperationalLog.OperationType operation, 
                                                            Pageable pageable);
    
    /**
     * Get log by ID
     */
    OperationalLogDTO getLogById(Long logId);
    
    /**
     * Get operation type counts
     */
    List<Object[]> getOperationCounts();
    
    /**
     * Get success vs failure counts
     */
    List<Object[]> getSuccessCounts();
} 