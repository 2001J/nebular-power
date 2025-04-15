package com.solar.core_services.service_control.service;

import com.solar.core_services.service_control.dto.BatchCommandRequest;
import com.solar.core_services.service_control.dto.CommandResponseRequest;
import com.solar.core_services.service_control.dto.DeviceCommandDTO;
import com.solar.core_services.service_control.model.DeviceCommand;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Map;

public interface DeviceCommandService {
    
    /**
     * Send a command to a device
     */
    DeviceCommandDTO sendCommand(Long installationId, String command, Map<String, Object> parameters, 
                               String initiatedBy);
    
    /**
     * Send a batch of commands to multiple devices
     */
    List<DeviceCommandDTO> sendBatchCommand(BatchCommandRequest request);
    
    /**
     * Process a command response from a device
     */
    DeviceCommandDTO processCommandResponse(CommandResponseRequest response);
    
    /**
     * Get commands for an installation
     */
    Page<DeviceCommandDTO> getCommandsByInstallation(Long installationId, Pageable pageable);
    
    /**
     * Get commands by status
     */
    Page<DeviceCommandDTO> getCommandsByStatus(DeviceCommand.CommandStatus status, Pageable pageable);
    
    /**
     * Get pending commands for an installation
     */
    List<DeviceCommandDTO> getPendingCommands(Long installationId);
    
    /**
     * Get command by ID
     */
    DeviceCommandDTO getCommandById(Long commandId);
    
    /**
     * Get command by correlation ID
     */
    DeviceCommandDTO getCommandByCorrelationId(String correlationId);
    
    /**
     * Cancel a command
     */
    DeviceCommandDTO cancelCommand(Long commandId, String cancelledBy);
    
    /**
     * Retry a failed command
     */
    DeviceCommandDTO retryCommand(Long commandId, String retriedBy);
    
    /**
     * Process expired commands
     */
    void processExpiredCommands();
    
    /**
     * Process commands that need retry
     */
    void processCommandRetries();
    
    /**
     * Get command status counts
     */
    List<Object[]> getCommandStatusCounts();
} 