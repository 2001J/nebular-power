package com.solar.core_services.service_control.service.impl;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.solar.core_services.energy_monitoring.model.SolarInstallation;
import com.solar.core_services.energy_monitoring.repository.SolarInstallationRepository;
import com.solar.core_services.service_control.config.CommandSchedulerConfig;
import com.solar.core_services.service_control.dto.BatchCommandRequest;
import com.solar.core_services.service_control.dto.CommandResponseRequest;
import com.solar.core_services.service_control.dto.DeviceCommandDTO;
import com.solar.core_services.service_control.model.DeviceCommand;
import com.solar.core_services.service_control.repository.DeviceCommandRepository;
import com.solar.core_services.service_control.service.CommandValidationService;
import com.solar.core_services.service_control.service.DeviceCommandService;
import com.solar.core_services.service_control.service.DeviceTransmissionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class DeviceCommandServiceImpl implements DeviceCommandService {

    private final DeviceCommandRepository deviceCommandRepository;
    private final SolarInstallationRepository installationRepository;
    private final ObjectMapper objectMapper;
    private final DeviceTransmissionService transmissionService;
    private final CommandValidationService validationService;
    private final CommandSchedulerConfig schedulerConfig;

    @Override
    @Transactional(propagation = org.springframework.transaction.annotation.Propagation.REQUIRES_NEW)
    public DeviceCommandDTO sendCommand(Long installationId, String command, Map<String, Object> parameters, String initiatedBy) {
        log.info("Sending command {} to installation {}", command, installationId);
        
        SolarInstallation installation = installationRepository.findById(installationId)
                .orElseThrow(() -> new RuntimeException("Installation not found with ID: " + installationId));
        
        // Validate command type and parameters
        try {
            validationService.validateCommand(command, parameters);
        } catch (IllegalArgumentException e) {
            log.error("Command validation failed: {}", e.getMessage());
            throw new RuntimeException("Invalid command or parameters: " + e.getMessage(), e);
        }
        
        DeviceCommand deviceCommand = new DeviceCommand();
        deviceCommand.setInstallation(installation);
        deviceCommand.setCommand(command);
        deviceCommand.setInitiatedBy(initiatedBy);
        deviceCommand.setStatus(DeviceCommand.CommandStatus.PENDING);
        deviceCommand.setCorrelationId(UUID.randomUUID().toString());
        
        if (parameters != null) {
            try {
                deviceCommand.setParameters(objectMapper.writeValueAsString(parameters));
            } catch (JsonProcessingException e) {
                log.error("Error serializing parameters", e);
                throw new RuntimeException("Error processing command parameters", e);
            }
        }
        
        deviceCommand = deviceCommandRepository.save(deviceCommand);
        log.info("Command saved with ID: {}", deviceCommand.getId());
        
        // Transmit command to device via HTTP
        boolean transmitted = transmissionService.transmitCommand(deviceCommand);
        
        if (transmitted) {
            deviceCommand.setStatus(DeviceCommand.CommandStatus.SENT);
            log.info("Command successfully transmitted to device");
        } else {
            deviceCommand.setStatus(DeviceCommand.CommandStatus.FAILED);
            deviceCommand.setResponseMessage("Failed to transmit command to device");
            log.error("Failed to transmit command to device");
        }
        
        deviceCommand = deviceCommandRepository.save(deviceCommand);
        
        return DeviceCommandDTO.fromEntity(deviceCommand);
    }

    @Override
    @Transactional
    public List<DeviceCommandDTO> sendBatchCommand(BatchCommandRequest request) {
        log.info("Sending batch command {} to {} installations", request.getCommand(), request.getInstallationIds().size());
        
        if (!request.getConfirmation()) {
            throw new RuntimeException("Batch command requires confirmation");
        }
        
        List<DeviceCommandDTO> results = new ArrayList<>();
        
        for (Long installationId : request.getInstallationIds()) {
            try {
                DeviceCommandDTO result = sendCommand(
                        installationId, 
                        request.getCommand(), 
                        request.getParameters(), 
                        request.getInitiatedBy());
                results.add(result);
            } catch (Exception e) {
                log.error("Error sending command to installation {}: {}", installationId, e.getMessage());
                // Continue with other installations even if one fails
            }
        }
        
        return results;
    }

    @Override
    @Transactional
    public DeviceCommandDTO processCommandResponse(CommandResponseRequest response) {
        log.info("Processing command response for correlation ID: {}", response.getCorrelationId());
        
        DeviceCommand command = deviceCommandRepository.findByCorrelationId(response.getCorrelationId())
                .orElseThrow(() -> new RuntimeException("Command not found with correlation ID: " + response.getCorrelationId()));
        
        // Verify the installation ID matches
        if (!command.getInstallation().getId().equals(response.getInstallationId())) {
            throw new RuntimeException("Installation ID mismatch in command response");
        }
        
        command.setProcessedAt(LocalDateTime.now());
        
        if (response.getSuccess()) {
            command.setStatus(DeviceCommand.CommandStatus.EXECUTED);
            command.setResponseMessage(response.getMessage());
            // Store the result as JSON if present
            if (response.getResult() != null && !response.getResult().isEmpty()) {
                try {
                    command.setResult(new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(response.getResult()));
                } catch (Exception e) {
                    log.error("Failed to serialize result to JSON", e);
                }
            }
        } else {
            command.setStatus(DeviceCommand.CommandStatus.FAILED);
            command.setResponseMessage(response.getErrorDetails() != null ? 
                    response.getErrorDetails() : response.getMessage());
        }
        
        command = deviceCommandRepository.save(command);
        log.info("Command status updated to: {}", command.getStatus());
        
        return DeviceCommandDTO.fromEntity(command);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<DeviceCommandDTO> getCommandsByInstallation(Long installationId, Pageable pageable) {
        log.info("Getting commands for installation {}", installationId);
        
        Page<DeviceCommand> commands = deviceCommandRepository.findByInstallationIdOrderBySentAtDesc(installationId, pageable);
        return commands.map(DeviceCommandDTO::fromEntity);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<DeviceCommandDTO> getCommandsByStatus(DeviceCommand.CommandStatus status, Pageable pageable) {
        log.info("Getting commands with status {}", status);
        
        Page<DeviceCommand> commands = deviceCommandRepository.findByStatusOrderBySentAtDesc(status, pageable);
        return commands.map(DeviceCommandDTO::fromEntity);
    }

    @Override
    @Transactional(readOnly = true)
    public List<DeviceCommandDTO> getPendingCommands(Long installationId) {
        log.info("Getting pending commands for installation {}", installationId);
        
        List<DeviceCommand.CommandStatus> pendingStatuses = Arrays.asList(
                DeviceCommand.CommandStatus.PENDING,
                DeviceCommand.CommandStatus.SENT,
                DeviceCommand.CommandStatus.QUEUED
        );
        
        List<DeviceCommand> commands = deviceCommandRepository.findByInstallationIdAndStatusInOrderBySentAtAsc(
                installationId, pendingStatuses);
        
        return commands.stream()
                .map(DeviceCommandDTO::fromEntity)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public DeviceCommandDTO getCommandById(Long commandId) {
        log.info("Getting command with ID {}", commandId);
        
        DeviceCommand command = deviceCommandRepository.findById(commandId)
                .orElseThrow(() -> new RuntimeException("Command not found with ID: " + commandId));
        
        return DeviceCommandDTO.fromEntity(command);
    }

    @Override
    @Transactional(readOnly = true)
    public DeviceCommandDTO getCommandByCorrelationId(String correlationId) {
        log.info("Getting command with correlation ID {}", correlationId);
        
        DeviceCommand command = deviceCommandRepository.findByCorrelationId(correlationId)
                .orElseThrow(() -> new RuntimeException("Command not found with correlation ID: " + correlationId));
        
        return DeviceCommandDTO.fromEntity(command);
    }

    @Override
    @Transactional
    public DeviceCommandDTO cancelCommand(Long commandId, String cancelledBy) {
        log.info("Cancelling command with ID {}", commandId);
        
        DeviceCommand command = deviceCommandRepository.findById(commandId)
                .orElseThrow(() -> new RuntimeException("Command not found with ID: " + commandId));
        
        // Only allow cancellation of commands that haven't been executed yet
        if (command.getStatus() == DeviceCommand.CommandStatus.EXECUTED) {
            throw new RuntimeException("Cannot cancel a command that has already been executed");
        }
        
        command.setStatus(DeviceCommand.CommandStatus.CANCELLED);
        command.setResponseMessage("Cancelled by " + cancelledBy);
        command = deviceCommandRepository.save(command);
        
        return DeviceCommandDTO.fromEntity(command);
    }

    @Override
    @Transactional
    public DeviceCommandDTO retryCommand(Long commandId, String retriedBy) {
        log.info("Retrying command with ID {}", commandId);
        
        DeviceCommand command = deviceCommandRepository.findById(commandId)
                .orElseThrow(() -> new RuntimeException("Command not found with ID: " + commandId));
        
        // Only allow retry of failed commands
        if (command.getStatus() != DeviceCommand.CommandStatus.FAILED) {
            throw new RuntimeException("Only failed commands can be retried");
        }
        
        command.setStatus(DeviceCommand.CommandStatus.PENDING);
        command.setRetryCount(command.getRetryCount() + 1);
        command.setLastRetryAt(LocalDateTime.now());
        command.setResponseMessage("Retried by " + retriedBy);
        command = deviceCommandRepository.save(command);
        
        // Transmit command to device via HTTP
        boolean transmitted = transmissionService.transmitCommand(command);
        
        if (transmitted) {
            command.setStatus(DeviceCommand.CommandStatus.SENT);
            log.info("Command successfully retransmitted to device");
        } else {
            command.setStatus(DeviceCommand.CommandStatus.FAILED);
            command.setResponseMessage("Failed to retransmit command to device (retry by " + retriedBy + ")");
            log.error("Failed to retransmit command to device");
        }
        
        command = deviceCommandRepository.save(command);
        
        return DeviceCommandDTO.fromEntity(command);
    }

    @Override
    @Transactional
    public void processExpiredCommands() {
        log.info("Processing expired commands");
        
        // Include DELIVERED status in expiration check as commands that were delivered
        // but never executed should also expire
        List<DeviceCommand.CommandStatus> activeStatuses = Arrays.asList(
                DeviceCommand.CommandStatus.PENDING,
                DeviceCommand.CommandStatus.SENT,
                DeviceCommand.CommandStatus.DELIVERED,
                DeviceCommand.CommandStatus.QUEUED
        );
        
        List<DeviceCommand> expiredCommands = deviceCommandRepository.findByStatusInAndExpiresAtBefore(
                activeStatuses, LocalDateTime.now());
        
        log.info("Found {} expired commands", expiredCommands.size());
        
        for (DeviceCommand command : expiredCommands) {
            command.setStatus(DeviceCommand.CommandStatus.EXPIRED);
            command.setResponseMessage("Command expired after " + schedulerConfig.getExpiration().getHours() + " hours");
            deviceCommandRepository.save(command);
            log.debug("Expired command {} (Installation: {}, Command: {})", 
                command.getId(), command.getInstallation().getId(), command.getCommand());
        }
    }

    @Override
    @Transactional
    public void processCommandRetries() {
        log.info("Processing command retries");
        
        // Use configured retry parameters
        int maxRetries = schedulerConfig.getRetry().getMaxAttempts();
        int delayMinutes = schedulerConfig.getRetry().getDelayMinutes();
        LocalDateTime retryAfter = LocalDateTime.now().minusMinutes(delayMinutes);
        
        List<DeviceCommand> commandsToRetry = deviceCommandRepository.findCommandsForRetry(maxRetries, retryAfter);
        
        log.info("Found {} commands to retry (max attempts: {}, delay: {} minutes)", 
            commandsToRetry.size(), maxRetries, delayMinutes);
        
        for (DeviceCommand command : commandsToRetry) {
            int attemptNumber = command.getRetryCount() + 1;
            command.setStatus(DeviceCommand.CommandStatus.PENDING);
            command.setRetryCount(attemptNumber);
            command.setLastRetryAt(LocalDateTime.now());
            command.setResponseMessage("Automatically retried (attempt " + attemptNumber + "/" + maxRetries + ")");
            deviceCommandRepository.save(command);
            
            // Transmit command to device via HTTP
            boolean transmitted = transmissionService.transmitCommand(command);
            
            if (transmitted) {
                command.setStatus(DeviceCommand.CommandStatus.SENT);
                log.info("Command {} successfully retransmitted automatically (attempt {}/{})", 
                    command.getId(), attemptNumber, maxRetries);
            } else {
                command.setStatus(DeviceCommand.CommandStatus.FAILED);
                String failureMessage = attemptNumber >= maxRetries 
                    ? "Automatic retry failed - maximum attempts (" + maxRetries + ") reached"
                    : "Automatic retry failed (attempt " + attemptNumber + "/" + maxRetries + ")";
                command.setResponseMessage(failureMessage);
                log.error("Failed to retransmit command {} automatically (attempt {}/{})", 
                    command.getId(), attemptNumber, maxRetries);
            }
            
            deviceCommandRepository.save(command);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public List<Object[]> getCommandStatusCounts() {
        log.info("Getting command status counts");
        return deviceCommandRepository.countByStatus();
    }
} 