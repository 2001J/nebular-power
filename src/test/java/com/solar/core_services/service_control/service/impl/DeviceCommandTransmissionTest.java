package com.solar.core_services.service_control.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.solar.core_services.energy_monitoring.model.SolarInstallation;
import com.solar.core_services.energy_monitoring.repository.SolarInstallationRepository;
import com.solar.core_services.service_control.dto.DeviceCommandDTO;
import com.solar.core_services.service_control.model.DeviceCommand;
import com.solar.core_services.service_control.repository.DeviceCommandRepository;
import com.solar.core_services.service_control.service.CommandValidationService;
import com.solar.core_services.service_control.service.DeviceTransmissionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Integration test for device command transmission functionality.
 */
@ExtendWith(MockitoExtension.class)
class DeviceCommandTransmissionTest {

    @Mock
    private DeviceCommandRepository deviceCommandRepository;

    @Mock
    private SolarInstallationRepository installationRepository;

    @Mock
    private ObjectMapper objectMapper;

    @Mock
    private DeviceTransmissionService transmissionService;

    @Mock
    private CommandValidationService validationService;

    @InjectMocks
    private DeviceCommandServiceImpl deviceCommandService;

    private SolarInstallation testInstallation;
    private DeviceCommand testCommand;

    @BeforeEach
    void setUp() {
        testInstallation = new SolarInstallation();
        testInstallation.setId(1L);
        testInstallation.setName("Test Installation");

        testCommand = new DeviceCommand();
        testCommand.setId(100L);
        testCommand.setInstallation(testInstallation);
        testCommand.setCommand("REBOOT_DEVICE");
        testCommand.setStatus(DeviceCommand.CommandStatus.PENDING);
        testCommand.setCorrelationId("test-correlation-id");
    }

    @Test
    void testSendCommand_Success() throws Exception {
        // Given
        Long installationId = 1L;
        String command = "REBOOT_DEVICE";
        Map<String, Object> parameters = new HashMap<>();
        parameters.put("force", true);
        String initiatedBy = "admin";

        when(installationRepository.findById(installationId)).thenReturn(Optional.of(testInstallation));
        when(objectMapper.writeValueAsString(any())).thenReturn("{\"force\":true}");
        when(deviceCommandRepository.save(any(DeviceCommand.class))).thenReturn(testCommand);
        when(transmissionService.transmitCommand(any(DeviceCommand.class))).thenReturn(true);

        // When
        DeviceCommandDTO result = deviceCommandService.sendCommand(installationId, command, parameters, initiatedBy);

        // Then
        assertNotNull(result);
        verify(validationService).validateCommand(command, parameters);
        verify(transmissionService).transmitCommand(any(DeviceCommand.class));
        verify(deviceCommandRepository, times(2)).save(any(DeviceCommand.class)); // Once for initial save, once after transmission
    }

    @Test
    void testSendCommand_TransmissionFailure() throws Exception {
        // Given
        Long installationId = 1L;
        String command = "REQUEST_DIAGNOSTICS";
        Map<String, Object> parameters = new HashMap<>();
        String initiatedBy = "admin";

        DeviceCommand failedCommand = new DeviceCommand();
        failedCommand.setId(100L);
        failedCommand.setInstallation(testInstallation);
        failedCommand.setCommand(command);
        failedCommand.setStatus(DeviceCommand.CommandStatus.FAILED);
        failedCommand.setResponseMessage("Failed to transmit command to device");

        when(installationRepository.findById(installationId)).thenReturn(Optional.of(testInstallation));
        when(objectMapper.writeValueAsString(any())).thenReturn("{}");
        when(deviceCommandRepository.save(any(DeviceCommand.class)))
                .thenReturn(testCommand)
                .thenReturn(failedCommand);
        when(transmissionService.transmitCommand(any(DeviceCommand.class))).thenReturn(false);

        // When
        DeviceCommandDTO result = deviceCommandService.sendCommand(installationId, command, parameters, initiatedBy);

        // Then
        assertNotNull(result);
        verify(transmissionService).transmitCommand(any(DeviceCommand.class));
        verify(deviceCommandRepository, times(2)).save(any(DeviceCommand.class)); // Initial save, then status update
    }

    @Test
    void testSendCommand_ValidationFailure() {
        // Given
        Long installationId = 1L;
        String command = "INVALID_COMMAND";
        Map<String, Object> parameters = new HashMap<>();
        String initiatedBy = "admin";

        when(installationRepository.findById(installationId)).thenReturn(Optional.of(testInstallation));
        doThrow(new IllegalArgumentException("Unsupported command type"))
                .when(validationService).validateCommand(command, parameters);

        // When & Then
        RuntimeException exception = assertThrows(RuntimeException.class, () ->
                deviceCommandService.sendCommand(installationId, command, parameters, initiatedBy)
        );

        assertTrue(exception.getMessage().contains("Invalid command or parameters"));
        verify(transmissionService, never()).transmitCommand(any());
    }

    @Test
    void testRetryCommand_Success() {
        // Given
        Long commandId = 100L;
        String retriedBy = "admin";

        testCommand.setStatus(DeviceCommand.CommandStatus.FAILED);
        testCommand.setRetryCount(0);

        when(deviceCommandRepository.findById(commandId)).thenReturn(Optional.of(testCommand));
        when(deviceCommandRepository.save(any(DeviceCommand.class))).thenReturn(testCommand);
        when(transmissionService.transmitCommand(any(DeviceCommand.class))).thenReturn(true);

        // When
        DeviceCommandDTO result = deviceCommandService.retryCommand(commandId, retriedBy);

        // Then
        assertNotNull(result);
        verify(transmissionService).transmitCommand(any(DeviceCommand.class));
        verify(deviceCommandRepository, times(2)).save(argThat(cmd ->
                cmd.getRetryCount() == 1 && cmd.getLastRetryAt() != null
        ));
    }

    @Test
    void testRetryCommand_NotFailedStatus() {
        // Given
        Long commandId = 100L;
        String retriedBy = "admin";

        testCommand.setStatus(DeviceCommand.CommandStatus.EXECUTED);

        when(deviceCommandRepository.findById(commandId)).thenReturn(Optional.of(testCommand));

        // When & Then
        RuntimeException exception = assertThrows(RuntimeException.class, () ->
                deviceCommandService.retryCommand(commandId, retriedBy)
        );

        assertTrue(exception.getMessage().contains("Only failed commands can be retried"));
        verify(transmissionService, never()).transmitCommand(any());
    }
}
