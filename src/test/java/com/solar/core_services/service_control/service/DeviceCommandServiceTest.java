package com.solar.core_services.service_control.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.solar.core_services.energy_monitoring.model.SolarInstallation;
import com.solar.core_services.energy_monitoring.repository.SolarInstallationRepository;
import com.solar.core_services.service_control.dto.BatchCommandRequest;
import com.solar.core_services.service_control.dto.CommandResponseRequest;
import com.solar.core_services.service_control.dto.DeviceCommandDTO;
import com.solar.core_services.service_control.model.DeviceCommand;
import com.solar.core_services.service_control.repository.DeviceCommandRepository;
import com.solar.core_services.service_control.service.impl.DeviceCommandServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Test class for DeviceCommandService implementation
 */
@ExtendWith(MockitoExtension.class)
public class DeviceCommandServiceTest {

    @Mock
    private DeviceCommandRepository commandRepository;

    @Mock
    private SolarInstallationRepository installationRepository;
    
    @Mock
    private ObjectMapper objectMapper;

    @InjectMocks
    private DeviceCommandServiceImpl deviceCommandService;

    private SolarInstallation installation;
    private DeviceCommand pendingCommand;
    private DeviceCommand executedCommand;

    @BeforeEach
    void setUp() {
        installation = new SolarInstallation();
        installation.setId(1L);
        installation.setName("Test Installation");

        pendingCommand = new DeviceCommand();
        pendingCommand.setId(1L);
        pendingCommand.setInstallation(installation);
        pendingCommand.setCommand("REBOOT");
        pendingCommand.setInitiatedBy("admin");
        pendingCommand.setStatus(DeviceCommand.CommandStatus.PENDING);
        pendingCommand.setCorrelationId("corr-123");
        pendingCommand.setSentAt(LocalDateTime.now());

        executedCommand = new DeviceCommand();
        executedCommand.setId(2L);
        executedCommand.setInstallation(installation);
        executedCommand.setCommand("UPDATE_SETTINGS");
        executedCommand.setInitiatedBy("system");
        executedCommand.setStatus(DeviceCommand.CommandStatus.EXECUTED);
        executedCommand.setCorrelationId("corr-456");
        executedCommand.setSentAt(LocalDateTime.now().minusHours(1));
        executedCommand.setProcessedAt(LocalDateTime.now().minusMinutes(30));
    }

    @Test
    @DisplayName("Should send a command to a device")
    void shouldSendCommandToDevice() {
        // Arrange
        Long installationId = 1L;
        String command = "REBOOT";
        Map<String, Object> parameters = new HashMap<>();
        parameters.put("delay", 5);
        String initiatedBy = "admin";

        when(installationRepository.findById(installationId)).thenReturn(Optional.of(installation));
        when(commandRepository.save(any(DeviceCommand.class))).thenAnswer(invocation -> {
            DeviceCommand savedCommand = invocation.getArgument(0);
            savedCommand.setId(1L);
            return savedCommand;
        });

        // Act
        DeviceCommandDTO result = deviceCommandService.sendCommand(installationId, command, parameters, initiatedBy);

        // Assert
        assertNotNull(result);
        assertEquals(command, result.getCommand());
        assertEquals(initiatedBy, result.getInitiatedBy());
        assertEquals(DeviceCommand.CommandStatus.SENT, result.getStatus());

        verify(installationRepository).findById(installationId);
        verify(commandRepository, times(2)).save(any(DeviceCommand.class));
    }

    @Test
    @DisplayName("Should send batch commands to multiple devices")
    void shouldSendBatchCommandsToMultipleDevices() {
        // Arrange
        BatchCommandRequest request = new BatchCommandRequest();
        request.setCommand("REBOOT");
        request.setInstallationIds(Arrays.asList(1L, 2L, 3L));
        request.setParameters(Map.of("delay", 5));
        request.setInitiatedBy("admin");
        request.setConfirmation(true);

        when(installationRepository.findById(anyLong())).thenReturn(Optional.of(installation));
        when(commandRepository.save(any(DeviceCommand.class))).thenAnswer(invocation -> {
            DeviceCommand savedCommand = invocation.getArgument(0);
            savedCommand.setId(1L);
            return savedCommand;
        });

        // Act
        List<DeviceCommandDTO> results = deviceCommandService.sendBatchCommand(request);

        // Assert
        assertNotNull(results);
        assertEquals(3, results.size());
        
        verify(installationRepository, times(3)).findById(anyLong());
        verify(commandRepository, times(6)).save(any(DeviceCommand.class));
    }

    @Test
    @DisplayName("Should process command response")
    void shouldProcessCommandResponse() {
        // Arrange
        CommandResponseRequest response = new CommandResponseRequest();
        response.setCorrelationId("corr-123");
        response.setInstallationId(1L);
        response.setTimestamp(LocalDateTime.now());
        response.setSuccess(true);
        response.setMessage("Command executed successfully");

        when(commandRepository.findByCorrelationId("corr-123")).thenReturn(Optional.of(pendingCommand));
        when(commandRepository.save(any(DeviceCommand.class))).thenReturn(pendingCommand);

        // Act
        DeviceCommandDTO result = deviceCommandService.processCommandResponse(response);

        // Assert
        assertNotNull(result);
        assertEquals(DeviceCommand.CommandStatus.EXECUTED, result.getStatus());
        assertEquals("Command executed successfully", result.getResponseMessage());

        verify(commandRepository).findByCorrelationId("corr-123");
        verify(commandRepository).save(any(DeviceCommand.class));
    }

    @Test
    @DisplayName("Should get commands by installation")
    void shouldGetCommandsByInstallation() {
        // Arrange
        Long installationId = 1L;
        Pageable pageable = PageRequest.of(0, 10);
        Page<DeviceCommand> commandPage = new PageImpl<>(List.of(pendingCommand, executedCommand));

        when(commandRepository.findByInstallationIdOrderBySentAtDesc(installationId, pageable)).thenReturn(commandPage);

        // Act
        Page<DeviceCommandDTO> results = deviceCommandService.getCommandsByInstallation(installationId, pageable);

        // Assert
        assertNotNull(results);
        assertEquals(2, results.getTotalElements());

        verify(commandRepository).findByInstallationIdOrderBySentAtDesc(installationId, pageable);
    }

    @Test
    @DisplayName("Should get commands by status")
    void shouldGetCommandsByStatus() {
        // Arrange
        DeviceCommand.CommandStatus status = DeviceCommand.CommandStatus.PENDING;
        Pageable pageable = PageRequest.of(0, 10);
        Page<DeviceCommand> commandPage = new PageImpl<>(List.of(pendingCommand));

        when(commandRepository.findByStatusOrderBySentAtDesc(status, pageable)).thenReturn(commandPage);

        // Act
        Page<DeviceCommandDTO> results = deviceCommandService.getCommandsByStatus(status, pageable);

        // Assert
        assertNotNull(results);
        assertEquals(1, results.getTotalElements());
        assertEquals(DeviceCommand.CommandStatus.PENDING, results.getContent().get(0).getStatus());

        verify(commandRepository).findByStatusOrderBySentAtDesc(status, pageable);
    }

    @Test
    @DisplayName("Should get pending commands for an installation")
    void shouldGetPendingCommandsForInstallation() {
        // Arrange
        Long installationId = 1L;
        List<DeviceCommand.CommandStatus> pendingStatuses = Arrays.asList(
                DeviceCommand.CommandStatus.PENDING,
                DeviceCommand.CommandStatus.SENT,
                DeviceCommand.CommandStatus.QUEUED
        );

        when(commandRepository.findByInstallationIdAndStatusInOrderBySentAtAsc(eq(installationId), anyList()))
                .thenReturn(List.of(pendingCommand));

        // Act
        List<DeviceCommandDTO> results = deviceCommandService.getPendingCommands(installationId);

        // Assert
        assertNotNull(results);
        assertEquals(1, results.size());
        assertEquals(DeviceCommand.CommandStatus.PENDING, results.get(0).getStatus());

        verify(commandRepository).findByInstallationIdAndStatusInOrderBySentAtAsc(eq(installationId), anyList());
    }

    @Test
    @DisplayName("Should get command by ID")
    void shouldGetCommandById() {
        // Arrange
        Long commandId = 1L;

        when(commandRepository.findById(commandId)).thenReturn(Optional.of(pendingCommand));

        // Act
        DeviceCommandDTO result = deviceCommandService.getCommandById(commandId);

        // Assert
        assertNotNull(result);
        assertEquals(commandId, result.getId());

        verify(commandRepository).findById(commandId);
    }

    @Test
    @DisplayName("Should get command by correlation ID")
    void shouldGetCommandByCorrelationId() {
        // Arrange
        String correlationId = "corr-123";

        when(commandRepository.findByCorrelationId(correlationId)).thenReturn(Optional.of(pendingCommand));

        // Act
        DeviceCommandDTO result = deviceCommandService.getCommandByCorrelationId(correlationId);

        // Assert
        assertNotNull(result);
        assertEquals(correlationId, result.getCorrelationId());

        verify(commandRepository).findByCorrelationId(correlationId);
    }

    @Test
    @DisplayName("Should cancel a command")
    void shouldCancelCommand() {
        // Arrange
        Long commandId = 1L;
        String cancelledBy = "admin";

        when(commandRepository.findById(commandId)).thenReturn(Optional.of(pendingCommand));
        when(commandRepository.save(any(DeviceCommand.class))).thenReturn(pendingCommand);

        // Act
        DeviceCommandDTO result = deviceCommandService.cancelCommand(commandId, cancelledBy);

        // Assert
        assertNotNull(result);
        assertEquals(DeviceCommand.CommandStatus.CANCELLED, result.getStatus());
        assertTrue(result.getResponseMessage().contains(cancelledBy));

        verify(commandRepository).findById(commandId);
        verify(commandRepository).save(any(DeviceCommand.class));
    }

    @Test
    @DisplayName("Should retry a failed command")
    void shouldRetryFailedCommand() {
        // Arrange
        Long commandId = 1L;
        String retriedBy = "admin";
        
        DeviceCommand failedCommand = new DeviceCommand();
        failedCommand.setId(commandId);
        failedCommand.setInstallation(installation);
        failedCommand.setCommand("REBOOT");
        failedCommand.setStatus(DeviceCommand.CommandStatus.FAILED);
        failedCommand.setRetryCount(0);

        when(commandRepository.findById(commandId)).thenReturn(Optional.of(failedCommand));
        when(commandRepository.save(any(DeviceCommand.class))).thenReturn(failedCommand);

        // Act
        DeviceCommandDTO result = deviceCommandService.retryCommand(commandId, retriedBy);

        // Assert
        assertNotNull(result);
        assertEquals(DeviceCommand.CommandStatus.SENT, result.getStatus());
        assertTrue(result.getResponseMessage().contains(retriedBy));

        verify(commandRepository).findById(commandId);
        verify(commandRepository, times(2)).save(any(DeviceCommand.class));
    }

    @Test
    @DisplayName("Should process expired commands")
    void shouldProcessExpiredCommands() {
        // Arrange
        List<DeviceCommand.CommandStatus> activeStatuses = Arrays.asList(
                DeviceCommand.CommandStatus.PENDING,
                DeviceCommand.CommandStatus.SENT,
                DeviceCommand.CommandStatus.QUEUED
        );
        
        when(commandRepository.findByStatusInAndExpiresAtBefore(anyList(), any(LocalDateTime.class)))
                .thenReturn(List.of(pendingCommand));

        // Act
        deviceCommandService.processExpiredCommands();

        // Assert
        verify(commandRepository).findByStatusInAndExpiresAtBefore(anyList(), any(LocalDateTime.class));
        verify(commandRepository).save(any(DeviceCommand.class));
    }

    @Test
    @DisplayName("Should process command retries")
    void shouldProcessCommandRetries() {
        // Arrange
        when(commandRepository.findCommandsForRetry(anyInt(), any(LocalDateTime.class)))
                .thenReturn(List.of(pendingCommand));

        // Act
        deviceCommandService.processCommandRetries();

        // Assert
        verify(commandRepository).findCommandsForRetry(anyInt(), any(LocalDateTime.class));
        verify(commandRepository, times(2)).save(any(DeviceCommand.class));
    }

    @Test
    @DisplayName("Should get command status counts")
    void shouldGetCommandStatusCounts() {
        // Arrange
        List<Object[]> countsByStatus = Arrays.asList(
                new Object[] { DeviceCommand.CommandStatus.PENDING, 5L },
                new Object[] { DeviceCommand.CommandStatus.EXECUTED, 10L },
                new Object[] { DeviceCommand.CommandStatus.FAILED, 2L }
        );

        when(commandRepository.countByStatus()).thenReturn(countsByStatus);

        // Act
        List<Object[]> result = deviceCommandService.getCommandStatusCounts();

        // Assert
        assertNotNull(result);
        assertEquals(3, result.size());
        assertEquals(DeviceCommand.CommandStatus.PENDING, result.get(0)[0]);
        assertEquals(5L, result.get(0)[1]);

        verify(commandRepository).countByStatus();
    }

    @Test
    @DisplayName("Should throw exception when installation not found")
    void shouldThrowExceptionWhenInstallationNotFound() {
        // Arrange
        Long installationId = 999L;
        String command = "REBOOT";
        Map<String, Object> parameters = new HashMap<>();
        String initiatedBy = "admin";

        when(installationRepository.findById(installationId)).thenReturn(Optional.empty());

        // Act & Assert
        Exception exception = assertThrows(RuntimeException.class, () -> {
            deviceCommandService.sendCommand(installationId, command, parameters, initiatedBy);
        });
        
        assertTrue(exception.getMessage().contains("Installation not found"));
        verify(installationRepository).findById(installationId);
    }

    @Test
    @DisplayName("Should throw exception when command not found by ID")
    void shouldThrowExceptionWhenCommandNotFoundById() {
        // Arrange
        Long commandId = 999L;

        when(commandRepository.findById(commandId)).thenReturn(Optional.empty());

        // Act & Assert
        Exception exception = assertThrows(RuntimeException.class, () -> {
            deviceCommandService.getCommandById(commandId);
        });
        
        assertTrue(exception.getMessage().contains("Command not found"));
        verify(commandRepository).findById(commandId);
    }

    @Test
    @DisplayName("Should throw exception when command not found by correlation ID")
    void shouldThrowExceptionWhenCommandNotFoundByCorrelationId() {
        // Arrange
        String correlationId = "non-existent";

        when(commandRepository.findByCorrelationId(correlationId)).thenReturn(Optional.empty());

        // Act & Assert
        Exception exception = assertThrows(RuntimeException.class, () -> {
            deviceCommandService.getCommandByCorrelationId(correlationId);
        });
        
        assertTrue(exception.getMessage().contains("Command not found"));
        verify(commandRepository).findByCorrelationId(correlationId);
    }
} 