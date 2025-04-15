package com.solar.core_services.tampering_detection.repository;

import com.solar.core_services.energy_monitoring.model.SolarInstallation;
import com.solar.core_services.energy_monitoring.model.SolarInstallation.InstallationStatus;
import com.solar.core_services.energy_monitoring.repository.SolarInstallationRepository;
import com.solar.core_services.tampering_detection.model.TamperEvent;
import com.solar.core_services.tampering_detection.model.TamperEvent.TamperEventStatus;
import com.solar.core_services.tampering_detection.model.TamperEvent.TamperEventType;
import com.solar.core_services.tampering_detection.model.TamperEvent.TamperSeverity;
import com.solar.core_services.tampering_detection.model.TamperResponse;
import com.solar.core_services.tampering_detection.model.TamperResponse.ResponseType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Test class for TamperResponseRepository
 * Source file: src/main/java/com/solar/core_services/tampering_detection/repository/TamperResponseRepository.java
 */
@DataJpaTest
@ActiveProfiles("test")
public class TamperResponseRepositoryTest {

    @Autowired
    private TamperResponseRepository tamperResponseRepository;

    @Autowired
    private TamperEventRepository tamperEventRepository;

    @Autowired
    private SolarInstallationRepository installationRepository;

    private SolarInstallation testInstallation1;
    private SolarInstallation testInstallation2;
    private TamperEvent testEvent1;
    private TamperEvent testEvent2;
    private TamperResponse testResponse1;
    private TamperResponse testResponse2;
    private TamperResponse testResponse3;
    private TamperResponse testResponse4;

    @BeforeEach
    void setUp() {
        // Clear any existing data
        tamperResponseRepository.deleteAll();
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
        testEvent2.setInstallation(testInstallation2);
        testEvent2.setEventType(TamperEventType.CONNECTION_TAMPERING);
        testEvent2.setTimestamp(now.minusDays(3));
        testEvent2.setSeverity(TamperSeverity.CRITICAL);
        testEvent2.setDescription("Connection tampering detected");
        testEvent2.setResolved(false);
        testEvent2.setConfidenceScore(0.95);
        testEvent2.setRawSensorData("{\"connection_status\": \"interrupted\", \"timestamp\": \"" + now.minusDays(3) + "\"}");
        testEvent2.setStatus(TamperEventStatus.ACKNOWLEDGED);
        testEvent2 = tamperEventRepository.save(testEvent2);

        // Create test tamper responses
        testResponse1 = new TamperResponse();
        testResponse1.setTamperEvent(testEvent1);
        testResponse1.setResponseType(ResponseType.NOTIFICATION_SENT);
        testResponse1.setExecutedAt(now.minusDays(5).plusMinutes(5));
        testResponse1.setSuccess(true);
        testResponse1.setExecutedBy("system");
        testResponse1.setResponseDetails("Email notification sent to admin@example.com");
        testResponse1 = tamperResponseRepository.save(testResponse1);

        testResponse2 = new TamperResponse();
        testResponse2.setTamperEvent(testEvent1);
        testResponse2.setResponseType(ResponseType.EVIDENCE_COLLECTION);
        testResponse2.setExecutedAt(now.minusDays(5).plusMinutes(10));
        testResponse2.setSuccess(true);
        testResponse2.setExecutedBy("system");
        testResponse2.setResponseDetails("Collected sensor data and system logs");
        testResponse2 = tamperResponseRepository.save(testResponse2);

        testResponse3 = new TamperResponse();
        testResponse3.setTamperEvent(testEvent2);
        testResponse3.setResponseType(ResponseType.NOTIFICATION_SENT);
        testResponse3.setExecutedAt(now.minusDays(3).plusMinutes(2));
        testResponse3.setSuccess(true);
        testResponse3.setExecutedBy("system");
        testResponse3.setResponseDetails("SMS notification sent to +1234567890");
        testResponse3 = tamperResponseRepository.save(testResponse3);

        testResponse4 = new TamperResponse();
        testResponse4.setTamperEvent(testEvent2);
        testResponse4.setResponseType(ResponseType.SYSTEM_LOCKDOWN);
        testResponse4.setExecutedAt(now.minusDays(3).plusMinutes(5));
        testResponse4.setSuccess(false);
        testResponse4.setFailureReason("Unable to establish connection with control system");
        testResponse4.setExecutedBy("system");
        testResponse4.setResponseDetails("Attempted to initiate system lockdown");
        testResponse4 = tamperResponseRepository.save(testResponse4);
    }

    @Test
    @DisplayName("Should find tamper responses by tamper event")
    void shouldFindTamperResponsesByTamperEvent() {
        // Test findByTamperEventOrderByExecutedAtDesc
        List<TamperResponse> responses = tamperResponseRepository.findByTamperEventOrderByExecutedAtDesc(testEvent1);
        
        assertThat(responses).isNotNull();
        assertThat(responses).hasSize(2);
        assertThat(responses.get(0).getId()).isEqualTo(testResponse2.getId());
        assertThat(responses.get(1).getId()).isEqualTo(testResponse1.getId());
    }

    @Test
    @DisplayName("Should find tamper responses by installation ID with pagination")
    void shouldFindTamperResponsesByInstallationIdWithPagination() {
        // Test findByInstallationId
        Page<TamperResponse> responsesPage = tamperResponseRepository.findByInstallationId(
                testInstallation1.getId(), PageRequest.of(0, 10));
        
        assertThat(responsesPage).isNotNull();
        assertThat(responsesPage.getContent()).hasSize(2);
        assertThat(responsesPage.getContent().get(0).getId()).isEqualTo(testResponse2.getId());
        assertThat(responsesPage.getContent().get(1).getId()).isEqualTo(testResponse1.getId());
    }

    @Test
    @DisplayName("Should find tamper responses by tamper event ID and response type")
    void shouldFindTamperResponsesByTamperEventIdAndResponseType() {
        // Test findByTamperEventIdAndResponseType
        List<TamperResponse> responses = tamperResponseRepository.findByTamperEventIdAndResponseType(
                testEvent1.getId(), ResponseType.NOTIFICATION_SENT);
        
        assertThat(responses).isNotNull();
        assertThat(responses).hasSize(1);
        assertThat(responses.get(0).getId()).isEqualTo(testResponse1.getId());
        
        responses = tamperResponseRepository.findByTamperEventIdAndResponseType(
                testEvent2.getId(), ResponseType.NOTIFICATION_SENT);
        
        assertThat(responses).isNotNull();
        assertThat(responses).hasSize(1);
        assertThat(responses.get(0).getId()).isEqualTo(testResponse3.getId());
    }

    @Test
    @DisplayName("Should find tamper responses by time range")
    void shouldFindTamperResponsesByTimeRange() {
        // Test findByTimeRange
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime start = now.minusDays(4);
        LocalDateTime end = now.minusDays(2);
        
        List<TamperResponse> responses = tamperResponseRepository.findByTimeRange(start, end);
        
        assertThat(responses).isNotNull();
        assertThat(responses).hasSize(2);
        assertThat(responses.get(0).getId()).isEqualTo(testResponse4.getId());
        assertThat(responses.get(1).getId()).isEqualTo(testResponse3.getId());
    }

    @Test
    @DisplayName("Should count successful responses by tamper event ID")
    void shouldCountSuccessfulResponsesByTamperEventId() {
        // Test countSuccessfulResponsesByTamperEventId
        long count = tamperResponseRepository.countSuccessfulResponsesByTamperEventId(testEvent1.getId());
        
        assertThat(count).isEqualTo(2);
        
        count = tamperResponseRepository.countSuccessfulResponsesByTamperEventId(testEvent2.getId());
        
        assertThat(count).isEqualTo(1);
    }

    @Test
    @DisplayName("Should save and retrieve tamper response")
    void shouldSaveAndRetrieveTamperResponse() {
        // Create a new tamper response
        LocalDateTime now = LocalDateTime.now();
        
        TamperResponse newResponse = new TamperResponse();
        newResponse.setTamperEvent(testEvent1);
        newResponse.setResponseType(ResponseType.ADMIN_ALERT);
        newResponse.setExecutedAt(now);
        newResponse.setSuccess(true);
        newResponse.setExecutedBy("admin");
        newResponse.setResponseDetails("Manual admin alert triggered");
        
        TamperResponse savedResponse = tamperResponseRepository.save(newResponse);
        
        assertThat(savedResponse).isNotNull();
        assertThat(savedResponse.getId()).isNotNull();
        
        // Retrieve the saved response
        TamperResponse retrievedResponse = tamperResponseRepository.findById(savedResponse.getId()).orElse(null);
        
        assertThat(retrievedResponse).isNotNull();
        assertThat(retrievedResponse.getResponseType()).isEqualTo(ResponseType.ADMIN_ALERT);
        assertThat(retrievedResponse.isSuccess()).isTrue();
        assertThat(retrievedResponse.getExecutedBy()).isEqualTo("admin");
    }
} 