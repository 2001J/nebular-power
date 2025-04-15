package com.solar.core_services.service_control.controller;

import com.solar.core_services.energy_monitoring.controller.TestSecurityConfig;
import com.solar.core_services.service_control.dto.OperationalLogDTO;
import com.solar.core_services.service_control.model.OperationalLog;
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
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Arrays;
import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(OperationalLogController.class)
@Import(TestSecurityConfig.class)
public class OperationalLogControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private OperationalLogService operationalLogService;

    private OperationalLogDTO sampleLogDTO;
    private List<OperationalLogDTO> sampleLogDTOList;
    private LocalDateTime testTime;

    @BeforeEach
    void setUp() {
        testTime = LocalDateTime.now();
        
        sampleLogDTO = new OperationalLogDTO();
        sampleLogDTO.setId(1L);
        sampleLogDTO.setOperation(OperationalLog.OperationType.COMMAND_SENT);
        sampleLogDTO.setTimestamp(testTime);
        sampleLogDTO.setInitiator("admin");
        sampleLogDTO.setSourceSystem("TEST_SYSTEM");
        sampleLogDTO.setSourceAction("TEST_ACTION");
        sampleLogDTO.setDetails("Test operation log");
        sampleLogDTO.setSuccess(true);
        sampleLogDTO.setInstallationId(1L);
        sampleLogDTO.setInstallationName("Test Installation");

        sampleLogDTOList = Arrays.asList(sampleLogDTO);
    }

    @Test
    @DisplayName("Should get log by ID")
    @WithMockUser(username = "user")
    void shouldGetLogById() throws Exception {
        // Arrange
        when(operationalLogService.getLogById(1L))
                .thenReturn(sampleLogDTO);

        // Act & Assert
        mockMvc.perform(get("/api/service/logs/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.operation").value("COMMAND_SENT"))
                .andExpect(jsonPath("$.initiator").value("admin"))
                .andExpect(jsonPath("$.success").value(true));

        verify(operationalLogService).getLogById(1L);
    }

    @Test
    @DisplayName("Should get logs by installation")
    @WithMockUser(username = "user")
    void shouldGetLogsByInstallation() throws Exception {
        // Arrange
        Page<OperationalLogDTO> logPage = new PageImpl<>(sampleLogDTOList);
        when(operationalLogService.getLogsByInstallation(eq(1L), any(Pageable.class)))
                .thenReturn(logPage);

        // Act & Assert
        mockMvc.perform(get("/api/service/logs/installation/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value(1))
                .andExpect(jsonPath("$.content[0].operation").value("COMMAND_SENT"))
                .andExpect(jsonPath("$.totalElements").value(1));

        verify(operationalLogService).getLogsByInstallation(eq(1L), any(Pageable.class));
    }

    @Test
    @DisplayName("Should get logs by operation type")
    @WithMockUser(username = "user")
    void shouldGetLogsByOperationType() throws Exception {
        // Arrange
        Page<OperationalLogDTO> logPage = new PageImpl<>(sampleLogDTOList);
        when(operationalLogService.getLogsByOperation(eq(OperationalLog.OperationType.COMMAND_SENT), any(Pageable.class)))
                .thenReturn(logPage);

        // Act & Assert
        mockMvc.perform(get("/api/service/logs/operation/COMMAND_SENT"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value(1))
                .andExpect(jsonPath("$.content[0].operation").value("COMMAND_SENT"))
                .andExpect(jsonPath("$.totalElements").value(1));

        verify(operationalLogService).getLogsByOperation(eq(OperationalLog.OperationType.COMMAND_SENT), any(Pageable.class));
    }

    @Test
    @DisplayName("Should get logs by initiator")
    @WithMockUser(username = "user")
    void shouldGetLogsByInitiator() throws Exception {
        // Arrange
        Page<OperationalLogDTO> logPage = new PageImpl<>(sampleLogDTOList);
        when(operationalLogService.getLogsByInitiator(eq("admin"), any(Pageable.class)))
                .thenReturn(logPage);

        // Act & Assert
        mockMvc.perform(get("/api/service/logs/initiator/admin"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value(1))
                .andExpect(jsonPath("$.content[0].initiator").value("admin"))
                .andExpect(jsonPath("$.totalElements").value(1));

        verify(operationalLogService).getLogsByInitiator(eq("admin"), any(Pageable.class));
    }

    @Test
    @DisplayName("Should get logs by time range")
    @WithMockUser(username = "user")
    void shouldGetLogsByTimeRange() throws Exception {
        // Arrange
        LocalDateTime start = testTime.minusDays(1);
        LocalDateTime end = testTime.plusDays(1);
        String startStr = start.format(DateTimeFormatter.ISO_DATE_TIME);
        String endStr = end.format(DateTimeFormatter.ISO_DATE_TIME);
        
        when(operationalLogService.getLogsByTimeRange(any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(sampleLogDTOList);

        // Act & Assert
        mockMvc.perform(get("/api/service/logs/time-range")
                .param("start", startStr)
                .param("end", endStr))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(1))
                .andExpect(jsonPath("$[0].operation").value("COMMAND_SENT"));

        verify(operationalLogService).getLogsByTimeRange(any(LocalDateTime.class), any(LocalDateTime.class));
    }

    @Test
    @DisplayName("Should get logs by user ID")
    @WithMockUser(username = "user")
    void shouldGetLogsByUserId() throws Exception {
        // Arrange
        when(operationalLogService.getLogsByUserId(1L))
                .thenReturn(sampleLogDTOList);

        // Act & Assert
        mockMvc.perform(get("/api/service/logs/user/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(1))
                .andExpect(jsonPath("$[0].operation").value("COMMAND_SENT"));

        verify(operationalLogService).getLogsByUserId(1L);
    }

    @Test
    @DisplayName("Should get logs by source system")
    @WithMockUser(username = "user")
    void shouldGetLogsBySourceSystem() throws Exception {
        // Arrange
        when(operationalLogService.getLogsBySourceSystem("TEST_SYSTEM"))
                .thenReturn(sampleLogDTOList);

        // Act & Assert
        mockMvc.perform(get("/api/service/logs/source-system/TEST_SYSTEM"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(1))
                .andExpect(jsonPath("$[0].sourceSystem").value("TEST_SYSTEM"));

        verify(operationalLogService).getLogsBySourceSystem("TEST_SYSTEM");
    }

    @Test
    @DisplayName("Should get logs by installation and operation")
    @WithMockUser(username = "user")
    void shouldGetLogsByInstallationAndOperation() throws Exception {
        // Arrange
        Page<OperationalLogDTO> logPage = new PageImpl<>(sampleLogDTOList);
        when(operationalLogService.getLogsByInstallationAndOperation(
                eq(1L), eq(OperationalLog.OperationType.COMMAND_SENT), any(Pageable.class)))
                .thenReturn(logPage);

        // Act & Assert
        mockMvc.perform(get("/api/service/logs/installation/1/operation/COMMAND_SENT"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value(1))
                .andExpect(jsonPath("$.content[0].operation").value("COMMAND_SENT"))
                .andExpect(jsonPath("$.content[0].installationId").value(1))
                .andExpect(jsonPath("$.totalElements").value(1));

        verify(operationalLogService).getLogsByInstallationAndOperation(
                eq(1L), eq(OperationalLog.OperationType.COMMAND_SENT), any(Pageable.class));
    }

    @Test
    @DisplayName("Should get operation counts")
    @WithMockUser(username = "user")
    void shouldGetOperationCounts() throws Exception {
        // Arrange
        List<Object[]> countsList = Arrays.asList(
                new Object[] { OperationalLog.OperationType.COMMAND_SENT, 5L },
                new Object[] { OperationalLog.OperationType.COMMAND_RESPONSE, 3L }
        );

        when(operationalLogService.getOperationCounts())
                .thenReturn(countsList);

        // Act & Assert
        mockMvc.perform(get("/api/service/logs/stats/operation-counts"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.COMMAND_SENT").value(5))
                .andExpect(jsonPath("$.COMMAND_RESPONSE").value(3));

        verify(operationalLogService).getOperationCounts();
    }

    @Test
    @DisplayName("Should get success counts")
    @WithMockUser(username = "user")
    void shouldGetSuccessCounts() throws Exception {
        // Arrange
        List<Object[]> countsList = Arrays.asList(
                new Object[] { true, 15L },
                new Object[] { false, 5L }
        );

        when(operationalLogService.getSuccessCounts())
                .thenReturn(countsList);

        // Act & Assert
        mockMvc.perform(get("/api/service/logs/stats/success-counts"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(15))
                .andExpect(jsonPath("$.failure").value(5));

        verify(operationalLogService).getSuccessCounts();
    }
} 