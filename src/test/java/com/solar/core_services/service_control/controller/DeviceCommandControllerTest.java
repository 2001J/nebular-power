package com.solar.core_services.service_control.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.solar.core_services.energy_monitoring.controller.TestSecurityConfig;
import com.solar.core_services.service_control.dto.BatchCommandRequest;
import com.solar.core_services.service_control.dto.DeviceCommandDTO;
import com.solar.core_services.service_control.dto.OperationalLogDTO;
import com.solar.core_services.service_control.model.DeviceCommand;
import com.solar.core_services.service_control.model.OperationalLog;
import com.solar.core_services.service_control.service.DeviceCommandService;
import com.solar.core_services.service_control.service.OperationalLogService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.*;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(DeviceCommandController.class)
@Import(TestSecurityConfig.class)
public class DeviceCommandControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private DeviceCommandService deviceCommandService;

    @MockBean
    private OperationalLogService operationalLogService;

    private DeviceCommandDTO sampleCommandDTO;
    private List<DeviceCommandDTO> sampleCommandDTOList;

    @BeforeEach
    void setUp() {
        sampleCommandDTO = new DeviceCommandDTO();
        sampleCommandDTO.setId(1L);
        sampleCommandDTO.setCommand("REBOOT");
        sampleCommandDTO.setStatus(DeviceCommand.CommandStatus.SENT);
        sampleCommandDTO.setCorrelationId("corr-123");
        sampleCommandDTO.setInitiatedBy("admin");
        sampleCommandDTO.setSentAt(LocalDateTime.now());
        sampleCommandDTO.setInstallationId(1L);
        sampleCommandDTO.setInstallationName("Test Installation");

        sampleCommandDTOList = List.of(sampleCommandDTO);
    }

    @Test
    @DisplayName("Should send command to device")
    @WithMockUser(username = "admin")
    void shouldSendCommandToDevice() throws Exception {
        // Arrange
        Map<String, Object> parameters = new HashMap<>();
        parameters.put("delay", 5);

        when(deviceCommandService.sendCommand(eq(1L), eq("REBOOT"), any(), eq("admin")))
                .thenReturn(sampleCommandDTO);
        when(operationalLogService.logOperation(anyLong(), any(), anyString(), anyString(), anyString(), anyString(), anyString(), isNull(), anyBoolean(), any()))
                .thenReturn(new OperationalLogDTO());

        // Act & Assert
        mockMvc.perform(post("/api/service/commands/1")
                .with(csrf())
                .param("command", "REBOOT")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(parameters)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.command").value("REBOOT"))
                .andExpect(jsonPath("$.status").value("SENT"))
                .andExpect(jsonPath("$.correlationId").value("corr-123"));

        verify(deviceCommandService).sendCommand(eq(1L), eq("REBOOT"), any(), eq("admin"));
        verify(operationalLogService).logOperation(anyLong(), eq(OperationalLog.OperationType.COMMAND_SENT), anyString(), contains("REBOOT"), anyString(), anyString(), anyString(), isNull(), eq(true), isNull());
    }

    @Test
    @DisplayName("Should send batch command")
    @WithMockUser(username = "admin")
    void shouldSendBatchCommand() throws Exception {
        // Arrange
        BatchCommandRequest request = new BatchCommandRequest();
        request.setCommand("REBOOT");
        request.setInstallationIds(Arrays.asList(1L, 2L, 3L));
        request.setParameters(Map.of("delay", 5));
        request.setConfirmation(true);

        when(deviceCommandService.sendBatchCommand(any(BatchCommandRequest.class)))
                .thenReturn(sampleCommandDTOList);

        // Act & Assert
        mockMvc.perform(post("/api/service/commands/batch")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(1))
                .andExpect(jsonPath("$[0].command").value("REBOOT"))
                .andExpect(jsonPath("$[0].status").value("SENT"));

        verify(deviceCommandService).sendBatchCommand(any(BatchCommandRequest.class));
        verify(operationalLogService).logOperation(isNull(), eq(OperationalLog.OperationType.COMMAND_SENT), anyString(), contains("batch command"), anyString(), anyString(), anyString(), isNull(), eq(true), isNull());
    }

    @Test
    @DisplayName("Should get commands by installation")
    @WithMockUser(username = "user")
    void shouldGetCommandsByInstallation() throws Exception {
        // Arrange
        Page<DeviceCommandDTO> commandPage = new PageImpl<>(sampleCommandDTOList);
        when(deviceCommandService.getCommandsByInstallation(eq(1L), any(Pageable.class)))
                .thenReturn(commandPage);

        // Act & Assert
        mockMvc.perform(get("/api/service/commands/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value(1))
                .andExpect(jsonPath("$.content[0].command").value("REBOOT"))
                .andExpect(jsonPath("$.totalElements").value(1));

        verify(deviceCommandService).getCommandsByInstallation(eq(1L), any(Pageable.class));
    }

    @Test
    @DisplayName("Should get commands by status")
    @WithMockUser(username = "user")
    void shouldGetCommandsByStatus() throws Exception {
        // Arrange
        Page<DeviceCommandDTO> commandPage = new PageImpl<>(sampleCommandDTOList);
        when(deviceCommandService.getCommandsByStatus(eq(DeviceCommand.CommandStatus.SENT), any(Pageable.class)))
                .thenReturn(commandPage);

        // Act & Assert
        mockMvc.perform(get("/api/service/commands/status/SENT"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value(1))
                .andExpect(jsonPath("$.content[0].status").value("SENT"))
                .andExpect(jsonPath("$.totalElements").value(1));

        verify(deviceCommandService).getCommandsByStatus(eq(DeviceCommand.CommandStatus.SENT), any(Pageable.class));
    }

    @Test
    @DisplayName("Should get pending commands for installation")
    @WithMockUser(username = "user")
    void shouldGetPendingCommandsForInstallation() throws Exception {
        // Arrange
        when(deviceCommandService.getPendingCommands(1L))
                .thenReturn(sampleCommandDTOList);

        // Act & Assert
        mockMvc.perform(get("/api/service/commands/1/pending"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(1))
                .andExpect(jsonPath("$[0].command").value("REBOOT"));

        verify(deviceCommandService).getPendingCommands(1L);
    }

    @Test
    @DisplayName("Should get command by ID")
    @WithMockUser(username = "user")
    void shouldGetCommandById() throws Exception {
        // Arrange
        when(deviceCommandService.getCommandById(1L))
                .thenReturn(sampleCommandDTO);

        // Act & Assert
        mockMvc.perform(get("/api/service/commands/id/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.command").value("REBOOT"));

        verify(deviceCommandService).getCommandById(1L);
    }

    @Test
    @DisplayName("Should get command by correlation ID")
    @WithMockUser(username = "user")
    void shouldGetCommandByCorrelationId() throws Exception {
        // Arrange
        when(deviceCommandService.getCommandByCorrelationId("corr-123"))
                .thenReturn(sampleCommandDTO);

        // Act & Assert
        mockMvc.perform(get("/api/service/commands/correlation/corr-123"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.correlationId").value("corr-123"));

        verify(deviceCommandService).getCommandByCorrelationId("corr-123");
    }

    @Test
    @DisplayName("Should cancel command")
    @WithMockUser(username = "admin")
    void shouldCancelCommand() throws Exception {
        // Arrange
        DeviceCommandDTO cancelledCommand = new DeviceCommandDTO();
        cancelledCommand.setId(1L);
        cancelledCommand.setStatus(DeviceCommand.CommandStatus.CANCELLED);
        cancelledCommand.setResponseMessage("Cancelled by admin");

        when(deviceCommandService.cancelCommand(eq(1L), anyString()))
                .thenReturn(cancelledCommand);

        // Act & Assert
        mockMvc.perform(post("/api/service/commands/1/cancel")
                .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.status").value("CANCELLED"));

        verify(deviceCommandService).cancelCommand(eq(1L), anyString());
        verify(operationalLogService).logOperation(isNull(), eq(OperationalLog.OperationType.COMMAND_CANCELLED), anyString(), anyString(), anyString(), anyString(), anyString(), isNull(), eq(true), isNull());
    }

    @Test
    @DisplayName("Should retry command")
    @WithMockUser(username = "admin")
    void shouldRetryCommand() throws Exception {
        // Arrange
        DeviceCommandDTO retriedCommand = new DeviceCommandDTO();
        retriedCommand.setId(1L);
        retriedCommand.setStatus(DeviceCommand.CommandStatus.SENT);
        retriedCommand.setResponseMessage("Retried by admin");

        when(deviceCommandService.retryCommand(eq(1L), anyString()))
                .thenReturn(retriedCommand);

        // Act & Assert
        mockMvc.perform(post("/api/service/commands/1/retry")
                .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.status").value("SENT"));

        verify(deviceCommandService).retryCommand(eq(1L), anyString());
        verify(operationalLogService).logOperation(isNull(), eq(OperationalLog.OperationType.COMMAND_RETRIED), anyString(), anyString(), anyString(), anyString(), anyString(), isNull(), eq(true), isNull());
    }

    @Test
    @DisplayName("Should get command status counts")
    @WithMockUser(username = "user")
    void shouldGetCommandStatusCounts() throws Exception {
        // Arrange
        List<Object[]> countsList = Arrays.asList(
                new Object[] { DeviceCommand.CommandStatus.SENT, 5L },
                new Object[] { DeviceCommand.CommandStatus.EXECUTED, 10L }
        );

        when(deviceCommandService.getCommandStatusCounts())
                .thenReturn(countsList);

        // Act & Assert
        mockMvc.perform(get("/api/service/commands/stats/status-counts"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.SENT").value(5))
                .andExpect(jsonPath("$.EXECUTED").value(10));

        verify(deviceCommandService).getCommandStatusCounts();
    }
} 