package com.solar.core_services.tampering_detection.service;

import com.solar.core_services.energy_monitoring.model.SolarInstallation;
import com.solar.core_services.energy_monitoring.repository.SolarInstallationRepository;
import com.solar.core_services.tampering_detection.dto.SecurityLogDTO;
import com.solar.core_services.tampering_detection.model.SecurityLog;
import com.solar.core_services.tampering_detection.model.SecurityLog.ActivityType;
import com.solar.core_services.tampering_detection.repository.SecurityLogRepository;
import com.solar.core_services.tampering_detection.service.impl.SecurityLogServiceImpl;
import com.solar.exception.ResourceNotFoundException;
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
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Test class for SecurityLogService
 * Source file: src/main/java/com/solar/core_services/tampering_detection/service/SecurityLogService.java
 * Implementation: src/main/java/com/solar/core_services/tampering_detection/service/impl/SecurityLogServiceImpl.java
 */
@ExtendWith(MockitoExtension.class)
public class SecurityLogServiceTest {

    @Mock
    private SecurityLogRepository securityLogRepository;

    @Mock
    private SolarInstallationRepository installationRepository;

    @InjectMocks
    private SecurityLogServiceImpl securityLogService;

    private SolarInstallation testInstallation;
    private SecurityLog testLog;
    private final Long installationId = 1L;
    private final Long logId = 1L;

    @BeforeEach
    void setUp() {
        // Create test installation
        testInstallation = new SolarInstallation();
        testInstallation.setId(installationId);
        testInstallation.setName("Test Installation");
        testInstallation.setCapacity(5.0);
        testInstallation.setInstalledCapacityKW(5.0);
        testInstallation.setLocation("Test Location");
        testInstallation.setStatus(SolarInstallation.InstallationStatus.ACTIVE);
        testInstallation.setInstallationDate(LocalDateTime.now().minusMonths(1));
        
        // Set up test security log
        testLog = new SecurityLog();
        testLog.setId(logId);
        testLog.setInstallation(testInstallation);
        testLog.setTimestamp(LocalDateTime.now().minusHours(1));
        testLog.setActivityType(ActivityType.SENSOR_READING);
        testLog.setDetails("Routine sensor reading");
        testLog.setIpAddress("192.168.1.100");
        testLog.setLocation("Server Room");
        testLog.setUserId("system");
    }

    @Test
    @DisplayName("Should create security log")
    void shouldCreateSecurityLog() {
        // Arrange
        ActivityType activityType = ActivityType.SENSOR_READING;
        String details = "Routine sensor reading";
        String ipAddress = "192.168.1.100";
        String location = "Server Room";
        String userId = "system";
        
        when(installationRepository.findById(installationId)).thenReturn(Optional.of(testInstallation));
        when(securityLogRepository.save(any(SecurityLog.class))).thenReturn(testLog);
        
        // Act
        SecurityLogDTO result = securityLogService.createSecurityLog(
                installationId, activityType, details, ipAddress, location, userId);
        
        // Assert
        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(logId);
        assertThat(result.getInstallationId()).isEqualTo(installationId);
        assertThat(result.getActivityType()).isEqualTo(activityType.name());
        assertThat(result.getDetails()).isEqualTo(details);
        
        verify(installationRepository).findById(installationId);
        verify(securityLogRepository).save(any(SecurityLog.class));
    }

    @Test
    @DisplayName("Should throw exception when creating security log for non-existent installation")
    void shouldThrowExceptionWhenCreatingSecurityLogForNonExistentInstallation() {
        // Arrange
        ActivityType activityType = ActivityType.SENSOR_READING;
        String details = "Routine sensor reading";
        String ipAddress = "192.168.1.100";
        String location = "Server Room";
        String userId = "system";
        
        when(installationRepository.findById(installationId)).thenReturn(Optional.empty());
        
        // Act & Assert
        assertThrows(ResourceNotFoundException.class, () -> {
            securityLogService.createSecurityLog(
                    installationId, activityType, details, ipAddress, location, userId);
        });
        
        verify(installationRepository).findById(installationId);
        verifyNoInteractions(securityLogRepository);
    }

    @Test
    @DisplayName("Should get security log by ID")
    void shouldGetSecurityLogById() {
        // Arrange
        when(securityLogRepository.findById(logId)).thenReturn(Optional.of(testLog));
        
        // Act
        SecurityLogDTO result = securityLogService.getSecurityLogById(logId);
        
        // Assert
        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(logId);
        assertThat(result.getInstallationId()).isEqualTo(installationId);
        
        verify(securityLogRepository).findById(logId);
    }

    @Test
    @DisplayName("Should throw exception when getting non-existent security log")
    void shouldThrowExceptionWhenGettingNonExistentSecurityLog() {
        // Arrange
        when(securityLogRepository.findById(logId)).thenReturn(Optional.empty());
        
        // Act & Assert
        assertThrows(ResourceNotFoundException.class, () -> {
            securityLogService.getSecurityLogById(logId);
        });
        
        verify(securityLogRepository).findById(logId);
    }

    @Test
    @DisplayName("Should get security logs by installation ID with pagination")
    void shouldGetSecurityLogsByInstallationIdWithPagination() {
        // Arrange
        Pageable pageable = PageRequest.of(0, 10);
        when(installationRepository.findById(installationId)).thenReturn(Optional.of(testInstallation));
        
        Page<SecurityLog> logsPage = new PageImpl<>(List.of(testLog), pageable, 1);
        when(securityLogRepository.findByInstallationOrderByTimestampDesc(testInstallation, pageable)).thenReturn(logsPage);
        
        // Act
        Page<SecurityLogDTO> result = securityLogService.getSecurityLogsByInstallationId(installationId, pageable);
        
        // Assert
        assertThat(result).isNotNull();
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getId()).isEqualTo(logId);
        
        verify(installationRepository).findById(installationId);
        verify(securityLogRepository).findByInstallationOrderByTimestampDesc(testInstallation, pageable);
    }

    @Test
    @DisplayName("Should get security logs by user ID with pagination")
    void shouldGetSecurityLogsByUserIdWithPagination() {
        // Arrange
        Long userId = 1L;
        Pageable pageable = PageRequest.of(0, 10);
        List<SolarInstallation> userInstallations = List.of(testInstallation);
        when(installationRepository.findByUserId(userId)).thenReturn(userInstallations);
        
        Page<SecurityLog> logsPage = new PageImpl<>(List.of(testLog), pageable, 1);
        when(securityLogRepository.findByInstallationInOrderByTimestampDesc(userInstallations, pageable)).thenReturn(logsPage);
        
        // Act
        Page<SecurityLogDTO> result = securityLogService.getSecurityLogsByUserId(userId, pageable);
        
        // Assert
        assertThat(result).isNotNull();
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getId()).isEqualTo(logId);
        
        verify(installationRepository).findByUserId(userId);
        verify(securityLogRepository).findByInstallationInOrderByTimestampDesc(userInstallations, pageable);
    }

    @Test
    @DisplayName("Should get security logs by installation IDs with pagination")
    void shouldGetSecurityLogsByInstallationIdsWithPagination() {
        // Arrange
        List<Long> installationIds = List.of(installationId);
        Pageable pageable = PageRequest.of(0, 10);
        when(installationRepository.findAllById(installationIds)).thenReturn(List.of(testInstallation));
        
        Page<SecurityLog> logsPage = new PageImpl<>(List.of(testLog), pageable, 1);
        when(securityLogRepository.findByInstallationInOrderByTimestampDesc(List.of(testInstallation), pageable)).thenReturn(logsPage);
        
        // Act
        Page<SecurityLogDTO> result = securityLogService.getSecurityLogsByInstallationIds(installationIds, pageable);
        
        // Assert
        assertThat(result).isNotNull();
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getId()).isEqualTo(logId);
        
        verify(installationRepository).findAllById(installationIds);
        verify(securityLogRepository).findByInstallationInOrderByTimestampDesc(List.of(testInstallation), pageable);
    }

    @Test
    @DisplayName("Should get security logs by installation and activity type")
    void shouldGetSecurityLogsByInstallationAndActivityType() {
        // Arrange
        ActivityType activityType = ActivityType.SENSOR_READING;
        when(installationRepository.findById(installationId)).thenReturn(Optional.of(testInstallation));
        when(securityLogRepository.findByInstallationAndActivityTypeOrderByTimestampDesc(testInstallation, activityType))
                .thenReturn(List.of(testLog));
        
        // Act
        List<SecurityLogDTO> result = securityLogService.getSecurityLogsByInstallationAndActivityType(
                installationId, activityType);
        
        // Assert
        assertThat(result).isNotNull();
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getId()).isEqualTo(logId);
        
        verify(installationRepository).findById(installationId);
        verify(securityLogRepository).findByInstallationAndActivityTypeOrderByTimestampDesc(testInstallation, activityType);
    }

    @Test
    @DisplayName("Should get security logs by installation and time range")
    void shouldGetSecurityLogsByInstallationAndTimeRange() {
        // Arrange
        LocalDateTime start = LocalDateTime.now().minusDays(1);
        LocalDateTime end = LocalDateTime.now();
        
        when(installationRepository.findById(installationId)).thenReturn(Optional.of(testInstallation));
        when(securityLogRepository.findByInstallationAndTimeRange(testInstallation, start, end))
                .thenReturn(List.of(testLog));
        
        // Act
        List<SecurityLogDTO> result = securityLogService.getSecurityLogsByInstallationAndTimeRange(
                installationId, start, end);
        
        // Assert
        assertThat(result).isNotNull();
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getId()).isEqualTo(logId);
        
        verify(installationRepository).findById(installationId);
        verify(securityLogRepository).findByInstallationAndTimeRange(testInstallation, start, end);
    }

    @Test
    @DisplayName("Should get security logs by activity type with pagination")
    void shouldGetSecurityLogsByActivityTypeWithPagination() {
        // Arrange
        ActivityType activityType = ActivityType.SENSOR_READING;
        Pageable pageable = PageRequest.of(0, 10);
        
        Page<SecurityLog> logsPage = new PageImpl<>(List.of(testLog), pageable, 1);
        when(securityLogRepository.findByActivityType(activityType, pageable)).thenReturn(logsPage);
        
        // Act
        Page<SecurityLogDTO> result = securityLogService.getSecurityLogsByActivityType(activityType, pageable);
        
        // Assert
        assertThat(result).isNotNull();
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getId()).isEqualTo(logId);
        
        verify(securityLogRepository).findByActivityType(activityType, pageable);
    }

    @Test
    @DisplayName("Should log tamper event created")
    void shouldLogTamperEventCreated() {
        // Arrange
        Long tamperEventId = 1L;
        String details = "Tamper event created: Physical movement detected";
        String ipAddress = "192.168.1.100";
        
        when(installationRepository.findById(installationId)).thenReturn(Optional.of(testInstallation));
        when(securityLogRepository.save(any(SecurityLog.class))).thenReturn(testLog);
        
        // Act
        securityLogService.logTamperEventCreated(installationId, tamperEventId, details, ipAddress);
        
        // Assert
        verify(installationRepository).findById(installationId);
        verify(securityLogRepository).save(any(SecurityLog.class));
    }

    @Test
    @DisplayName("Should log tamper event status change")
    void shouldLogTamperEventStatusChange() {
        // Arrange
        Long tamperEventId = 1L;
        String details = "Tamper event status changed to ACKNOWLEDGED";
        String userId = "admin";
        
        when(installationRepository.findById(installationId)).thenReturn(Optional.of(testInstallation));
        when(securityLogRepository.save(any(SecurityLog.class))).thenReturn(testLog);
        
        // Act
        securityLogService.logTamperEventStatusChange(installationId, tamperEventId, details, userId);
        
        // Assert
        verify(installationRepository).findById(installationId);
        verify(securityLogRepository).save(any(SecurityLog.class));
    }

    @Test
    @DisplayName("Should log configuration change")
    void shouldLogConfigurationChange() {
        // Arrange
        String details = "Alert sensitivity threshold updated";
        String userId = "admin";
        
        when(installationRepository.findById(installationId)).thenReturn(Optional.of(testInstallation));
        when(securityLogRepository.save(any(SecurityLog.class))).thenReturn(testLog);
        
        // Act
        securityLogService.logConfigurationChange(installationId, details, userId);
        
        // Assert
        verify(installationRepository).findById(installationId);
        verify(securityLogRepository).save(any(SecurityLog.class));
    }
} 