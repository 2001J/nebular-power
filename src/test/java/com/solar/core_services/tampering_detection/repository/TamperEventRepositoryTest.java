package com.solar.core_services.tampering_detection.repository;

import com.solar.core_services.energy_monitoring.model.SolarInstallation;
import com.solar.core_services.energy_monitoring.model.SolarInstallation.InstallationStatus;
import com.solar.core_services.energy_monitoring.repository.SolarInstallationRepository;
import com.solar.core_services.tampering_detection.model.TamperEvent;
import com.solar.core_services.tampering_detection.model.TamperEvent.TamperEventStatus;
import com.solar.core_services.tampering_detection.model.TamperEvent.TamperEventType;
import com.solar.core_services.tampering_detection.model.TamperEvent.TamperSeverity;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Test class for TamperEventRepository
 * Source file: src/main/java/com/solar/core_services/tampering_detection/repository/TamperEventRepository.java
 */
@DataJpaTest
@ActiveProfiles("test")
public class TamperEventRepositoryTest {

    @Autowired
    private TamperEventRepository tamperEventRepository;

    @Autowired
    private SolarInstallationRepository installationRepository;

    private SolarInstallation testInstallation1;
    private SolarInstallation testInstallation2;
    private TamperEvent testEvent1;
    private TamperEvent testEvent2;
    private TamperEvent testEvent3;
    private TamperEvent testEvent4;

    @BeforeEach
    void setUp() {
        // Clear any existing data
        tamperEventRepository.deleteAll();
        
        // Create test installations
        testInstallation1 = new SolarInstallation();
        testInstallation1.setName("Test Installation 1");
        testInstallation1.setCapacity(5.0);
        testInstallation1.setInstalledCapacityKW(5.0);
        testInstallation1.setLocation("Location 1");
        testInstallation1.setStatus(SolarInstallation.InstallationStatus.ACTIVE);
        testInstallation1.setInstallationDate(LocalDateTime.now().minusMonths(3));
        testInstallation1 = installationRepository.save(testInstallation1);

        testInstallation2 = new SolarInstallation();
        testInstallation2.setName("Test Installation 2");
        testInstallation2.setCapacity(7.5);
        testInstallation2.setInstalledCapacityKW(7.5);
        testInstallation2.setLocation("Location 2");
        testInstallation2.setStatus(SolarInstallation.InstallationStatus.ACTIVE);
        testInstallation2.setInstallationDate(LocalDateTime.now().minusMonths(2));
        testInstallation2 = installationRepository.save(testInstallation2);

        // Create test tamper events
        LocalDateTime now = LocalDateTime.now();
        
        testEvent1 = new TamperEvent();
        testEvent1.setInstallation(testInstallation1);
        testEvent1.setEventType(TamperEventType.PHYSICAL_MOVEMENT);
        testEvent1.setTimestamp(now.minusDays(5));
        testEvent1.setSeverity(TamperSeverity.HIGH);
        testEvent1.setDescription("Significant physical movement detected");
        testEvent1.setResolved(false);
        testEvent1.setConfidenceScore(0.85);
        testEvent1.setRawSensorData("{\"acceleration\": 0.85, \"timestamp\": \"" + now.minusDays(5) + "\"}");
        testEvent1.setStatus(TamperEventStatus.NEW);
        testEvent1 = tamperEventRepository.save(testEvent1);

        testEvent2 = new TamperEvent();
        testEvent2.setInstallation(testInstallation1);
        testEvent2.setEventType(TamperEventType.VOLTAGE_FLUCTUATION);
        testEvent2.setTimestamp(now.minusDays(3));
        testEvent2.setSeverity(TamperSeverity.MEDIUM);
        testEvent2.setDescription("Unusual voltage fluctuation detected");
        testEvent2.setResolved(true);
        testEvent2.setResolvedAt(now.minusDays(2));
        testEvent2.setResolvedBy("admin");
        testEvent2.setConfidenceScore(0.75);
        testEvent2.setRawSensorData("{\"voltage\": 220.5, \"normal_voltage\": 240, \"timestamp\": \"" + now.minusDays(3) + "\"}");
        testEvent2.setStatus(TamperEventStatus.RESOLVED);
        testEvent2 = tamperEventRepository.save(testEvent2);

        testEvent3 = new TamperEvent();
        testEvent3.setInstallation(testInstallation2);
        testEvent3.setEventType(TamperEventType.CONNECTION_TAMPERING);
        testEvent3.setTimestamp(now.minusDays(1));
        testEvent3.setSeverity(TamperSeverity.CRITICAL);
        testEvent3.setDescription("Connection tampering detected");
        testEvent3.setResolved(false);
        testEvent3.setConfidenceScore(0.95);
        testEvent3.setRawSensorData("{\"connection_status\": \"interrupted\", \"timestamp\": \"" + now.minusDays(1) + "\"}");
        testEvent3.setStatus(TamperEventStatus.ACKNOWLEDGED);
        testEvent3 = tamperEventRepository.save(testEvent3);

        testEvent4 = new TamperEvent();
        testEvent4.setInstallation(testInstallation2);
        testEvent4.setEventType(TamperEventType.PANEL_ACCESS);
        testEvent4.setTimestamp(now.minusHours(12));
        testEvent4.setSeverity(TamperSeverity.HIGH);
        testEvent4.setDescription("Unauthorized panel access detected");
        testEvent4.setResolved(false);
        testEvent4.setConfidenceScore(0.88);
        testEvent4.setRawSensorData("{\"access_sensor\": \"triggered\", \"timestamp\": \"" + now.minusHours(12) + "\"}");
        testEvent4.setStatus(TamperEventStatus.INVESTIGATING);
        testEvent4 = tamperEventRepository.save(testEvent4);
    }

    @Test
    @DisplayName("Should find unresolved tamper events by installation")
    void shouldFindUnresolvedTamperEventsByInstallation() {
        // Test findByInstallationAndResolvedFalseOrderByTimestampDesc
        List<TamperEvent> events = tamperEventRepository.findByInstallationAndResolvedFalseOrderByTimestampDesc(testInstallation1);
        
        assertThat(events).isNotNull();
        assertThat(events).hasSize(1);
        assertThat(events.get(0).getId()).isEqualTo(testEvent1.getId());
    }

    @Test
    @DisplayName("Should find tamper events by installation with pagination")
    void shouldFindTamperEventsByInstallationWithPagination() {
        // Test findByInstallationOrderByTimestampDesc
        Page<TamperEvent> eventsPage = tamperEventRepository.findByInstallationOrderByTimestampDesc(
                testInstallation1, PageRequest.of(0, 10));
        
        assertThat(eventsPage).isNotNull();
        assertThat(eventsPage.getContent()).hasSize(2);
        assertThat(eventsPage.getContent().get(0).getId()).isEqualTo(testEvent2.getId());
        assertThat(eventsPage.getContent().get(1).getId()).isEqualTo(testEvent1.getId());
    }

    @Test
    @DisplayName("Should find tamper events by multiple installations with pagination")
    void shouldFindTamperEventsByMultipleInstallationsWithPagination() {
        // Test findByInstallationInOrderByTimestampDesc
        List<SolarInstallation> installations = Arrays.asList(testInstallation1, testInstallation2);
        Page<TamperEvent> eventsPage = tamperEventRepository.findByInstallationInOrderByTimestampDesc(
                installations, PageRequest.of(0, 10));
        
        assertThat(eventsPage).isNotNull();
        assertThat(eventsPage.getContent()).hasSize(4);
        // Events should be ordered by timestamp desc
        assertThat(eventsPage.getContent().get(0).getId()).isEqualTo(testEvent4.getId());
        assertThat(eventsPage.getContent().get(1).getId()).isEqualTo(testEvent3.getId());
        assertThat(eventsPage.getContent().get(2).getId()).isEqualTo(testEvent2.getId());
        assertThat(eventsPage.getContent().get(3).getId()).isEqualTo(testEvent1.getId());
    }

    @Test
    @DisplayName("Should find all unresolved tamper events")
    void shouldFindAllUnresolvedTamperEvents() {
        // Test findByResolvedFalseOrderByTimestampDesc
        List<TamperEvent> events = tamperEventRepository.findByResolvedFalseOrderByTimestampDesc();
        
        assertThat(events).isNotNull();
        assertThat(events).hasSize(3);
        assertThat(events.get(0).getId()).isEqualTo(testEvent4.getId());
        assertThat(events.get(1).getId()).isEqualTo(testEvent3.getId());
        assertThat(events.get(2).getId()).isEqualTo(testEvent1.getId());
    }

    @Test
    @DisplayName("Should find unresolved tamper events by severity with pagination")
    void shouldFindUnresolvedTamperEventsBySeverityWithPagination() {
        // Test findByResolvedFalseAndSeverityInOrderBySeverityDescTimestampDesc
        List<TamperSeverity> severities = Arrays.asList(TamperSeverity.HIGH, TamperSeverity.CRITICAL);
        Page<TamperEvent> eventsPage = tamperEventRepository.findByResolvedFalseAndSeverityInOrderBySeverityDescTimestampDesc(
                severities, PageRequest.of(0, 10));
        
        assertThat(eventsPage).isNotNull();
        assertThat(eventsPage.getContent()).hasSize(3);
        // Should be ordered by severity desc, then timestamp desc
        assertThat(eventsPage.getContent().get(0).getSeverity()).isEqualTo(TamperSeverity.HIGH);
        assertThat(eventsPage.getContent().get(1).getSeverity()).isEqualTo(TamperSeverity.HIGH);
        assertThat(eventsPage.getContent().get(2).getSeverity()).isEqualTo(TamperSeverity.CRITICAL);
    }

    @Test
    @DisplayName("Should find tamper events by installation and time range")
    void shouldFindTamperEventsByInstallationAndTimeRange() {
        // Test findByInstallationAndTimeRange
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime start = now.minusDays(6);
        LocalDateTime end = now.minusDays(2);
        
        List<TamperEvent> events = tamperEventRepository.findByInstallationAndTimeRange(
                testInstallation1, start, end);
        
        assertThat(events).isNotNull();
        assertThat(events).hasSize(2);
        assertThat(events.get(0).getId()).isEqualTo(testEvent2.getId());
        assertThat(events.get(1).getId()).isEqualTo(testEvent1.getId());
    }

    @Test
    @DisplayName("Should count unresolved tamper events by installation")
    void shouldCountUnresolvedTamperEventsByInstallation() {
        // Test countUnresolvedByInstallation
        long count = tamperEventRepository.countUnresolvedByInstallation(testInstallation1);
        
        assertThat(count).isEqualTo(1);
        
        count = tamperEventRepository.countUnresolvedByInstallation(testInstallation2);
        
        assertThat(count).isEqualTo(2);
    }

    @Test
    @DisplayName("Should find tamper events by status with pagination")
    void shouldFindTamperEventsByStatusWithPagination() {
        // Test findByStatus
        Page<TamperEvent> eventsPage = tamperEventRepository.findByStatus(
                TamperEventStatus.ACKNOWLEDGED, PageRequest.of(0, 10));
        
        assertThat(eventsPage).isNotNull();
        assertThat(eventsPage.getContent()).hasSize(1);
        assertThat(eventsPage.getContent().get(0).getId()).isEqualTo(testEvent3.getId());
    }
} 