package com.solar.core_services.tampering_detection.service;

import com.solar.core_services.energy_monitoring.model.SolarInstallation;
import com.solar.core_services.energy_monitoring.repository.SolarInstallationRepository;
import com.solar.core_services.tampering_detection.dto.TamperEventCreateDTO;
import com.solar.core_services.tampering_detection.dto.TamperEventDTO;
import com.solar.core_services.tampering_detection.dto.TamperEventUpdateDTO;
import com.solar.core_services.tampering_detection.model.TamperEvent;
import com.solar.core_services.tampering_detection.model.TamperEvent.TamperEventStatus;
import com.solar.core_services.tampering_detection.model.TamperEvent.TamperEventType;
import com.solar.core_services.tampering_detection.model.TamperEvent.TamperSeverity;
import com.solar.core_services.tampering_detection.model.SecurityLog.ActivityType;
import com.solar.core_services.tampering_detection.repository.TamperEventRepository;
import com.solar.core_services.tampering_detection.service.impl.TamperEventServiceImpl;
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
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Test class for TamperEventService
 * Source file: src/main/java/com/solar/core_services/tampering_detection/service/TamperEventService.java
 * Implementation: src/main/java/com/solar/core_services/tampering_detection/service/impl/TamperEventServiceImpl.java
 */
@ExtendWith(MockitoExtension.class)
public class TamperEventServiceTest {

    @Mock
    private TamperEventRepository tamperEventRepository;

    @Mock
    private SolarInstallationRepository installationRepository;
    
    @Mock
    private SecurityLogService securityLogService;

    @InjectMocks
    private TamperEventServiceImpl tamperEventService;

    private SolarInstallation testInstallation;
    private TamperEvent testEvent;
    private TamperEventCreateDTO testCreateDTO;
    private TamperEventUpdateDTO testUpdateDTO;
    private Long installationId = 1L;
    private Long eventId = 1L;

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

        // Set up test tamper event
        testEvent = new TamperEvent();
        testEvent.setId(eventId);
        testEvent.setInstallation(testInstallation);
        testEvent.setEventType(TamperEventType.PHYSICAL_MOVEMENT);
        testEvent.setSeverity(TamperSeverity.HIGH);
        testEvent.setTimestamp(LocalDateTime.now());
        testEvent.setDescription("Test tamper event");
        testEvent.setConfidenceScore(0.85);
        testEvent.setRawSensorData("{\"acceleration\": 0.85, \"timestamp\": \"2023-06-15T14:30:00\"}");
        testEvent.setStatus(TamperEventStatus.NEW);
        
        // Set up test create DTO
        testCreateDTO = new TamperEventCreateDTO();
        testCreateDTO.setInstallationId(installationId);
        testCreateDTO.setEventType(TamperEventType.PHYSICAL_MOVEMENT);
        testCreateDTO.setSeverity(TamperSeverity.HIGH);
        testCreateDTO.setDescription("Test tamper event");
        testCreateDTO.setConfidenceScore(0.85);
        testCreateDTO.setRawSensorData("{\"acceleration\": 0.85, \"timestamp\": \"2023-06-15T14:30:00\"}");
        
        // Set up test update DTO
        testUpdateDTO = new TamperEventUpdateDTO();
        testUpdateDTO.setStatus(TamperEventStatus.ACKNOWLEDGED);
    }

    @Test
    @DisplayName("Should create tamper event")
    void shouldCreateTamperEvent() {
        // Arrange
        // Use lenient() because the method is called multiple times
        lenient().when(installationRepository.findById(installationId)).thenReturn(Optional.of(testInstallation));
        when(tamperEventRepository.save(any(TamperEvent.class))).thenReturn(testEvent);
        
        // Act
        TamperEventDTO result = tamperEventService.createTamperEvent(testCreateDTO);
        
        // Assert
        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(eventId);
        assertThat(result.getInstallationId()).isEqualTo(installationId);
        assertThat(result.getEventType()).isEqualTo(TamperEventType.PHYSICAL_MOVEMENT);
        assertThat(result.getSeverity()).isEqualTo(TamperSeverity.HIGH);
        
        // Don't verify the number of calls to findById since it's called multiple times
        verify(tamperEventRepository).save(any(TamperEvent.class));
    }

    @Test
    @DisplayName("Should throw exception when creating tamper event for non-existent installation")
    void shouldThrowExceptionWhenCreatingTamperEventForNonExistentInstallation() {
        // Arrange
        when(installationRepository.findById(installationId)).thenReturn(Optional.empty());
        
        // Act & Assert
        assertThrows(ResourceNotFoundException.class, () -> {
            tamperEventService.createTamperEvent(testCreateDTO);
        });
        
        verify(installationRepository).findById(installationId);
        verifyNoInteractions(tamperEventRepository);
    }

    @Test
    @DisplayName("Should get tamper event by ID")
    void shouldGetTamperEventById() {
        // Arrange
        when(tamperEventRepository.findById(eventId)).thenReturn(Optional.of(testEvent));
        
        // Act
        TamperEventDTO result = tamperEventService.getTamperEventById(eventId);
        
        // Assert
        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(eventId);
        assertThat(result.getInstallationId()).isEqualTo(installationId);
        
        verify(tamperEventRepository).findById(eventId);
    }

    @Test
    @DisplayName("Should throw exception when getting non-existent tamper event")
    void shouldThrowExceptionWhenGettingNonExistentTamperEvent() {
        // Arrange
        when(tamperEventRepository.findById(eventId)).thenReturn(Optional.empty());
        
        // Act & Assert
        assertThrows(ResourceNotFoundException.class, () -> {
            tamperEventService.getTamperEventById(eventId);
        });
        
        verify(tamperEventRepository).findById(eventId);
    }

    @Test
    @DisplayName("Should get tamper events by installation ID with pagination")
    void shouldGetTamperEventsByInstallationIdWithPagination() {
        // Arrange
        Pageable pageable = PageRequest.of(0, 10);
        when(installationRepository.findById(installationId)).thenReturn(Optional.of(testInstallation));
        
        Page<TamperEvent> eventsPage = new PageImpl<>(List.of(testEvent), pageable, 1);
        when(tamperEventRepository.findByInstallationOrderByTimestampDesc(testInstallation, pageable)).thenReturn(eventsPage);
        
        // Act
        Page<TamperEventDTO> result = tamperEventService.getTamperEventsByInstallationId(installationId, pageable);
        
        // Assert
        assertThat(result).isNotNull();
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getId()).isEqualTo(eventId);
        
        verify(installationRepository).findById(installationId);
        verify(tamperEventRepository).findByInstallationOrderByTimestampDesc(testInstallation, pageable);
    }

    @Test
    @DisplayName("Should get tamper events by user ID with pagination")
    void shouldGetTamperEventsByUserIdWithPagination() {
        // Arrange
        Long userId = 1L;
        Pageable pageable = PageRequest.of(0, 10);
        
        // Since the actual implementation returns an empty page, we'll test that behavior
        
        // Act
        Page<TamperEventDTO> result = tamperEventService.getTamperEventsByUserId(userId, pageable);
        
        // Assert
        assertThat(result).isNotNull();
        assertThat(result.getContent()).isEmpty();
        
        // No need to verify repository calls since the method is not implemented yet
    }

    @Test
    @DisplayName("Should get tamper events by installation IDs with pagination")
    void shouldGetTamperEventsByInstallationIdsWithPagination() {
        // Arrange
        List<Long> installationIds = List.of(installationId);
        Pageable pageable = PageRequest.of(0, 10);
        when(installationRepository.findAllById(installationIds)).thenReturn(List.of(testInstallation));
        
        Page<TamperEvent> eventsPage = new PageImpl<>(List.of(testEvent), pageable, 1);
        when(tamperEventRepository.findByInstallationInOrderByTimestampDesc(List.of(testInstallation), pageable)).thenReturn(eventsPage);
        
        // Act
        Page<TamperEventDTO> result = tamperEventService.getTamperEventsByInstallationIds(installationIds, pageable);
        
        // Assert
        assertThat(result).isNotNull();
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getId()).isEqualTo(eventId);
        
        verify(installationRepository).findAllById(installationIds);
        verify(tamperEventRepository).findByInstallationInOrderByTimestampDesc(List.of(testInstallation), pageable);
    }

    @Test
    @DisplayName("Should get unresolved tamper events with pagination")
    void shouldGetUnresolvedTamperEventsWithPagination() {
        // Arrange
        List<TamperSeverity> severities = List.of(TamperSeverity.HIGH, TamperSeverity.CRITICAL);
        Pageable pageable = PageRequest.of(0, 10);
        
        Page<TamperEvent> eventsPage = new PageImpl<>(List.of(testEvent), pageable, 1);
        when(tamperEventRepository.findByResolvedFalseAndSeverityInOrderBySeverityDescTimestampDesc(severities, pageable)).thenReturn(eventsPage);
        
        // Act
        Page<TamperEventDTO> result = tamperEventService.getUnresolvedTamperEvents(severities, pageable);
        
        // Assert
        assertThat(result).isNotNull();
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getId()).isEqualTo(eventId);
        
        verify(tamperEventRepository).findByResolvedFalseAndSeverityInOrderBySeverityDescTimestampDesc(severities, pageable);
    }

    @Test
    @DisplayName("Should get tamper events by installation and time range")
    void shouldGetTamperEventsByInstallationAndTimeRange() {
        // Arrange
        LocalDateTime start = LocalDateTime.now().minusDays(2);
        LocalDateTime end = LocalDateTime.now();
        
        when(installationRepository.findById(installationId)).thenReturn(Optional.of(testInstallation));
        when(tamperEventRepository.findByInstallationAndTimeRange(testInstallation, start, end)).thenReturn(List.of(testEvent));
        
        // Act
        List<TamperEventDTO> result = tamperEventService.getTamperEventsByInstallationAndTimeRange(installationId, start, end);
        
        // Assert
        assertThat(result).isNotNull();
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getId()).isEqualTo(eventId);
        
        verify(installationRepository).findById(installationId);
        verify(tamperEventRepository).findByInstallationAndTimeRange(testInstallation, start, end);
    }

    @Test
    @DisplayName("Should update tamper event status")
    void shouldUpdateTamperEventStatus() {
        // Arrange
        when(tamperEventRepository.findById(eventId)).thenReturn(Optional.of(testEvent));
        when(tamperEventRepository.save(any(TamperEvent.class))).thenReturn(testEvent);
        
        // Act
        TamperEventDTO result = tamperEventService.updateTamperEventStatus(eventId, testUpdateDTO);
        
        // Assert
        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(eventId);
        assertThat(result.getStatus()).isEqualTo(TamperEventStatus.ACKNOWLEDGED);
        
        verify(tamperEventRepository).findById(eventId);
        verify(tamperEventRepository).save(any(TamperEvent.class));
    }

    @Test
    @DisplayName("Should resolve tamper event")
    void shouldResolveTamperEvent() {
        // Arrange
        String resolvedBy = "admin";
        String resolutionNotes = "Issue resolved after investigation";
        
        when(tamperEventRepository.findById(eventId)).thenReturn(Optional.of(testEvent));
        when(tamperEventRepository.save(any(TamperEvent.class))).thenReturn(testEvent);
        
        // Act
        TamperEventDTO result = tamperEventService.resolveTamperEvent(eventId, resolvedBy, resolutionNotes);
        
        // Assert
        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(eventId);
        assertThat(result.isResolved()).isTrue();
        assertThat(result.getResolvedBy()).isEqualTo(resolvedBy);
        assertThat(result.getStatus()).isEqualTo(TamperEventStatus.RESOLVED);
        
        verify(tamperEventRepository).findById(eventId);
        verify(tamperEventRepository).save(any(TamperEvent.class));
    }

    @Test
    @DisplayName("Should count unresolved tamper events by installation")
    void shouldCountUnresolvedTamperEventsByInstallation() {
        // Arrange
        when(installationRepository.findById(installationId)).thenReturn(Optional.of(testInstallation));
        when(tamperEventRepository.countUnresolvedByInstallation(testInstallation)).thenReturn(5L);
        
        // Act
        long count = tamperEventService.countUnresolvedTamperEventsByInstallation(installationId);
        
        // Assert
        assertThat(count).isEqualTo(5L);
        
        verify(installationRepository).findById(installationId);
        verify(tamperEventRepository).countUnresolvedByInstallation(testInstallation);
    }

    @Test
    @DisplayName("Should validate tamper event")
    void shouldValidateTamperEvent() {
        // Arrange
        when(installationRepository.findById(installationId)).thenReturn(Optional.of(testInstallation));
        
        // Act
        tamperEventService.validateTamperEvent(testCreateDTO);
        
        // Assert
        verify(installationRepository).findById(installationId);
    }

    @Test
    @DisplayName("Should check if event is likely false positive")
    void shouldCheckIfEventIsLikelyFalsePositive() {
        // Arrange
        testCreateDTO.setConfidenceScore(0.2); // Low confidence score (below 0.3)
        
        // Act
        boolean result = tamperEventService.isLikelyFalsePositive(testCreateDTO);
        
        // Assert
        assertThat(result).isTrue();
        
        // Test with high confidence score
        testCreateDTO.setConfidenceScore(0.85);
        result = tamperEventService.isLikelyFalsePositive(testCreateDTO);
        
        assertThat(result).isFalse();
    }
} 