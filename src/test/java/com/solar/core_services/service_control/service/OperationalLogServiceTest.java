package com.solar.core_services.service_control.service;

import com.solar.core_services.energy_monitoring.model.SolarInstallation;
import com.solar.core_services.energy_monitoring.repository.SolarInstallationRepository;
import com.solar.core_services.service_control.dto.OperationalLogDTO;
import com.solar.core_services.service_control.model.OperationalLog;
import com.solar.core_services.service_control.repository.OperationalLogRepository;
import com.solar.core_services.service_control.service.impl.OperationalLogServiceImpl;
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
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Test class for OperationalLogService implementation
 * Source file: src/main/java/com/solar/core_services/service_control/service/impl/OperationalLogServiceImpl.java
 */
@ExtendWith(MockitoExtension.class)
public class OperationalLogServiceTest {

    @Mock
    private OperationalLogRepository operationalLogRepository;

    @Mock
    private SolarInstallationRepository installationRepository;

    @InjectMocks
    private OperationalLogServiceImpl operationalLogService;

    private SolarInstallation installation;
    private OperationalLog operationalLog1;
    private OperationalLog operationalLog2;
    private final Long INSTALLATION_ID = 1L;
    private final Long USER_ID = 100L;

    @BeforeEach
    void setUp() {
        // Setup installation
        installation = new SolarInstallation();
        installation.setId(INSTALLATION_ID);
        installation.setName("Test Installation");
        
        // Setup first log entry
        operationalLog1 = new OperationalLog();
        operationalLog1.setId(1L);
        operationalLog1.setInstallation(installation);
        operationalLog1.setOperation(OperationalLog.OperationType.SERVICE_STATUS_CHANGE);
        operationalLog1.setInitiator("admin");
        operationalLog1.setDetails("Changed status to ACTIVE");
        operationalLog1.setSourceSystem("Web Portal");
        operationalLog1.setSourceAction("Status Update");
        operationalLog1.setIpAddress("192.168.1.1");
        operationalLog1.setUserAgent("Mozilla/5.0");
        operationalLog1.setSuccess(true);
        operationalLog1.setTimestamp(LocalDateTime.now());
        
        // Setup second log entry
        operationalLog2 = new OperationalLog();
        operationalLog2.setId(2L);
        operationalLog2.setInstallation(installation);
        operationalLog2.setOperation(OperationalLog.OperationType.COMMAND_SENT);
        operationalLog2.setInitiator("system");
        operationalLog2.setDetails("Sent reboot command");
        operationalLog2.setSourceSystem("Monitoring System");
        operationalLog2.setSourceAction("Automatic Maintenance");
        operationalLog2.setIpAddress("192.168.1.2");
        operationalLog2.setUserAgent(null);
        operationalLog2.setSuccess(false);
        operationalLog2.setErrorDetails("Device not responding");
        operationalLog2.setTimestamp(LocalDateTime.now().minusDays(1));
    }

    @Test
    @DisplayName("Should log an operation successfully")
    void shouldLogOperation() {
        // Arrange
        when(installationRepository.findById(INSTALLATION_ID)).thenReturn(Optional.of(installation));
        when(operationalLogRepository.save(any(OperationalLog.class))).thenReturn(operationalLog1);
        
        // Act
        OperationalLogDTO result = operationalLogService.logOperation(
                INSTALLATION_ID,
                OperationalLog.OperationType.SERVICE_STATUS_CHANGE,
                "admin",
                "Changed status to ACTIVE",
                "Web Portal",
                "Status Update",
                "192.168.1.1",
                "Mozilla/5.0",
                true,
                null
        );
        
        // Assert
        assertNotNull(result);
        assertEquals(INSTALLATION_ID, result.getInstallationId());
        assertEquals(OperationalLog.OperationType.SERVICE_STATUS_CHANGE, result.getOperation());
        assertEquals("admin", result.getInitiator());
        assertTrue(result.isSuccess());
        verify(operationalLogRepository).save(any(OperationalLog.class));
    }
    
    @Test
    @DisplayName("Should get logs by installation")
    void shouldGetLogsByInstallation() {
        // Arrange
        Pageable pageable = PageRequest.of(0, 10);
        List<OperationalLog> logs = Arrays.asList(operationalLog1, operationalLog2);
        Page<OperationalLog> logsPage = new PageImpl<>(logs, pageable, logs.size());
        
        when(operationalLogRepository.findByInstallationIdOrderByTimestampDesc(eq(INSTALLATION_ID), any(Pageable.class)))
                .thenReturn(logsPage);
        
        // Act
        Page<OperationalLogDTO> result = operationalLogService.getLogsByInstallation(INSTALLATION_ID, pageable);
        
        // Assert
        assertNotNull(result);
        assertEquals(2, result.getTotalElements());
        assertEquals(OperationalLog.OperationType.SERVICE_STATUS_CHANGE, result.getContent().get(0).getOperation());
        assertEquals(OperationalLog.OperationType.COMMAND_SENT, result.getContent().get(1).getOperation());
        verify(operationalLogRepository).findByInstallationIdOrderByTimestampDesc(eq(INSTALLATION_ID), any(Pageable.class));
    }
    
    @Test
    @DisplayName("Should get logs by operation type")
    void shouldGetLogsByOperation() {
        // Arrange
        Pageable pageable = PageRequest.of(0, 10);
        List<OperationalLog> logs = Collections.singletonList(operationalLog1);
        Page<OperationalLog> logsPage = new PageImpl<>(logs, pageable, logs.size());
        
        when(operationalLogRepository.findByOperationOrderByTimestampDesc(
                eq(OperationalLog.OperationType.SERVICE_STATUS_CHANGE), any(Pageable.class)))
                .thenReturn(logsPage);
        
        // Act
        Page<OperationalLogDTO> result = operationalLogService.getLogsByOperation(
                OperationalLog.OperationType.SERVICE_STATUS_CHANGE, pageable);
        
        // Assert
        assertNotNull(result);
        assertEquals(1, result.getTotalElements());
        assertEquals(OperationalLog.OperationType.SERVICE_STATUS_CHANGE, result.getContent().get(0).getOperation());
        verify(operationalLogRepository).findByOperationOrderByTimestampDesc(
                eq(OperationalLog.OperationType.SERVICE_STATUS_CHANGE), any(Pageable.class));
    }
    
    @Test
    @DisplayName("Should get logs by initiator")
    void shouldGetLogsByInitiator() {
        // Arrange
        Pageable pageable = PageRequest.of(0, 10);
        List<OperationalLog> logs = Collections.singletonList(operationalLog1);
        Page<OperationalLog> logsPage = new PageImpl<>(logs, pageable, logs.size());
        
        when(operationalLogRepository.findByInitiatorOrderByTimestampDesc(eq("admin"), any(Pageable.class)))
                .thenReturn(logsPage);
        
        // Act
        Page<OperationalLogDTO> result = operationalLogService.getLogsByInitiator("admin", pageable);
        
        // Assert
        assertNotNull(result);
        assertEquals(1, result.getTotalElements());
        assertEquals("admin", result.getContent().get(0).getInitiator());
        verify(operationalLogRepository).findByInitiatorOrderByTimestampDesc(eq("admin"), any(Pageable.class));
    }
    
    @Test
    @DisplayName("Should get logs by time range")
    void shouldGetLogsByTimeRange() {
        // Arrange
        LocalDateTime start = LocalDateTime.now().minusDays(2);
        LocalDateTime end = LocalDateTime.now();
        List<OperationalLog> logs = Arrays.asList(operationalLog1, operationalLog2);
        
        when(operationalLogRepository.findByTimestampBetweenOrderByTimestampDesc(start, end))
                .thenReturn(logs);
        
        // Act
        List<OperationalLogDTO> result = operationalLogService.getLogsByTimeRange(start, end);
        
        // Assert
        assertNotNull(result);
        assertEquals(2, result.size());
        assertTrue(result.stream().anyMatch(log -> log.getOperation() == OperationalLog.OperationType.SERVICE_STATUS_CHANGE));
        assertTrue(result.stream().anyMatch(log -> log.getOperation() == OperationalLog.OperationType.COMMAND_SENT));
        verify(operationalLogRepository).findByTimestampBetweenOrderByTimestampDesc(start, end);
    }
    
    @Test
    @DisplayName("Should get logs by user ID")
    void shouldGetLogsByUserId() {
        // Arrange
        List<OperationalLog> logs = Arrays.asList(operationalLog1, operationalLog2);
        
        when(operationalLogRepository.findByUserIdOrderByTimestampDesc(USER_ID))
                .thenReturn(logs);
        
        // Act
        List<OperationalLogDTO> result = operationalLogService.getLogsByUserId(USER_ID);
        
        // Assert
        assertNotNull(result);
        assertEquals(2, result.size());
        verify(operationalLogRepository).findByUserIdOrderByTimestampDesc(USER_ID);
    }
    
    @Test
    @DisplayName("Should get logs by source system")
    void shouldGetLogsBySourceSystem() {
        // Arrange
        String sourceSystem = "Web Portal";
        List<OperationalLog> logs = Collections.singletonList(operationalLog1);
        
        when(operationalLogRepository.findBySourceSystemOrderByTimestampDesc(sourceSystem))
                .thenReturn(logs);
        
        // Act
        List<OperationalLogDTO> result = operationalLogService.getLogsBySourceSystem(sourceSystem);
        
        // Assert
        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals(sourceSystem, result.get(0).getSourceSystem());
        verify(operationalLogRepository).findBySourceSystemOrderByTimestampDesc(sourceSystem);
    }
    
    @Test
    @DisplayName("Should get logs by installation and operation")
    void shouldGetLogsByInstallationAndOperation() {
        // Arrange
        Pageable pageable = PageRequest.of(0, 10);
        List<OperationalLog> logs = Collections.singletonList(operationalLog1);
        Page<OperationalLog> logsPage = new PageImpl<>(logs, pageable, logs.size());
        
        when(operationalLogRepository.findByInstallationIdAndOperationOrderByTimestampDesc(
                eq(INSTALLATION_ID), eq(OperationalLog.OperationType.SERVICE_STATUS_CHANGE), any(Pageable.class)))
                .thenReturn(logsPage);
        
        // Act
        Page<OperationalLogDTO> result = operationalLogService.getLogsByInstallationAndOperation(
                INSTALLATION_ID, OperationalLog.OperationType.SERVICE_STATUS_CHANGE, pageable);
        
        // Assert
        assertNotNull(result);
        assertEquals(1, result.getTotalElements());
        assertEquals(INSTALLATION_ID, result.getContent().get(0).getInstallationId());
        assertEquals(OperationalLog.OperationType.SERVICE_STATUS_CHANGE, result.getContent().get(0).getOperation());
        verify(operationalLogRepository).findByInstallationIdAndOperationOrderByTimestampDesc(
                eq(INSTALLATION_ID), eq(OperationalLog.OperationType.SERVICE_STATUS_CHANGE), any(Pageable.class));
    }
    
    @Test
    @DisplayName("Should get log by ID")
    void shouldGetLogById() {
        // Arrange
        Long logId = 1L;
        
        when(operationalLogRepository.findById(logId)).thenReturn(Optional.of(operationalLog1));
        
        // Act
        OperationalLogDTO result = operationalLogService.getLogById(logId);
        
        // Assert
        assertNotNull(result);
        assertEquals(logId, result.getId());
        assertEquals(OperationalLog.OperationType.SERVICE_STATUS_CHANGE, result.getOperation());
        assertEquals("admin", result.getInitiator());
        verify(operationalLogRepository).findById(logId);
    }
    
    @Test
    @DisplayName("Should get operation counts")
    void shouldGetOperationCounts() {
        // Arrange
        List<Object[]> counts = Arrays.asList(
                new Object[]{OperationalLog.OperationType.SERVICE_STATUS_CHANGE, 5L},
                new Object[]{OperationalLog.OperationType.COMMAND_SENT, 3L}
        );
        
        when(operationalLogRepository.countByOperation()).thenReturn(counts);
        
        // Act
        List<Object[]> result = operationalLogService.getOperationCounts();
        
        // Assert
        assertNotNull(result);
        assertEquals(2, result.size());
        assertEquals(OperationalLog.OperationType.SERVICE_STATUS_CHANGE, result.get(0)[0]);
        assertEquals(5L, result.get(0)[1]);
        verify(operationalLogRepository).countByOperation();
    }
    
    @Test
    @DisplayName("Should get success counts")
    void shouldGetSuccessCounts() {
        // Arrange
        List<Object[]> counts = Arrays.asList(
                new Object[]{true, 8L},
                new Object[]{false, 2L}
        );
        
        when(operationalLogRepository.countBySuccess()).thenReturn(counts);
        
        // Act
        List<Object[]> result = operationalLogService.getSuccessCounts();
        
        // Assert
        assertNotNull(result);
        assertEquals(2, result.size());
        assertEquals(true, result.get(0)[0]);
        assertEquals(8L, result.get(0)[1]);
        verify(operationalLogRepository).countBySuccess();
    }
    
    @Test
    @DisplayName("Should handle null installation when logging operation")
    void shouldHandleNullInstallationWhenLoggingOperation() {
        // Arrange
        when(operationalLogRepository.save(any(OperationalLog.class))).thenAnswer(invocation -> {
            OperationalLog log = invocation.getArgument(0);
            log.setId(3L);
            // Ensure the installation is null to test the behavior correctly
            log.setInstallation(null);
            return log;
        });
        
        // Act
        OperationalLogDTO result = operationalLogService.logOperation(
                null,  // Null installationId
                OperationalLog.OperationType.SYSTEM_ALERT,
                "system",
                "System-wide alert",
                "Monitoring System",
                "Alert Generation",
                "192.168.1.3",
                null,
                true,
                null
        );
        
        // Assert
        assertNotNull(result);
        assertEquals(3L, result.getId());
        assertNull(result.getInstallationId());
        assertEquals(OperationalLog.OperationType.SYSTEM_ALERT, result.getOperation());
        verify(operationalLogRepository).save(any(OperationalLog.class));
        // Don't verify installationRepository call since installationId is null
        verify(installationRepository, never()).findById(any());
    }
} 