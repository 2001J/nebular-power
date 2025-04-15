package com.solar.core_services.service_control.service;

import com.solar.core_services.service_control.dto.ControlActionDTO;
import com.solar.core_services.service_control.model.ControlAction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.List;

public interface ControlActionService {
    
    /**
     * Record a control action
     */
    ControlActionDTO recordAction(Long installationId, ControlAction.ActionType actionType, 
                                 String executedBy, boolean success, String failureReason, 
                                 String actionDetails, String sourceSystem, String sourceEvent);
    
    /**
     * Get control actions for an installation
     */
    Page<ControlActionDTO> getActionsByInstallation(Long installationId, Pageable pageable);
    
    /**
     * Get control actions by action type
     */
    Page<ControlActionDTO> getActionsByType(ControlAction.ActionType actionType, Pageable pageable);
    
    /**
     * Get control actions by success status
     */
    Page<ControlActionDTO> getActionsBySuccess(boolean success, Pageable pageable);
    
    /**
     * Get control actions within a time range
     */
    List<ControlActionDTO> getActionsByTimeRange(LocalDateTime start, LocalDateTime end);
    
    /**
     * Get control actions for a user's installations
     */
    List<ControlActionDTO> getActionsByUserId(Long userId);
    
    /**
     * Get control actions by source system
     */
    List<ControlActionDTO> getActionsBySourceSystem(String sourceSystem);
    
    /**
     * Get control action by ID
     */
    ControlActionDTO getActionById(Long actionId);
    
    /**
     * Get action type counts
     */
    List<Object[]> getActionTypeCounts();
    
    /**
     * Get success vs failure counts
     */
    List<Object[]> getSuccessCounts();
} 