package com.solar.core_services.tampering_detection.repository;

import com.solar.core_services.energy_monitoring.model.SolarInstallation;
import com.solar.core_services.energy_monitoring.model.SolarInstallation.InstallationStatus;
import com.solar.core_services.energy_monitoring.repository.SolarInstallationRepository;
import com.solar.core_services.tampering_detection.model.SecurityLog;
import com.solar.core_services.tampering_detection.model.SecurityLog.ActivityType;
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
 * Test class for SecurityLogRepository
 * Source file: src/main/java/com/solar/core_services/tampering_detection/repository/SecurityLogRepository.java
 */
@DataJpaTest
@ActiveProfiles("test")
public class SecurityLogRepositoryTest {

    @Autowired
    private SecurityLogRepository securityLogRepository;

    @Autowired
    private SolarInstallationRepository installationRepository;

    private SolarInstallation testInstallation1;
    private SolarInstallation testInstallation2;
    private SecurityLog testLog1;
    private SecurityLog testLog2;
    private SecurityLog testLog3;
    private SecurityLog testLog4;
    private SecurityLog testLog5;

    @BeforeEach
    void setUp() {
        // Clear any existing data
        securityLogRepository.deleteAll();
        
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

        // Create test security logs
        LocalDateTime now = LocalDateTime.now();
        
        testLog1 = new SecurityLog();
        testLog1.setInstallation(testInstallation1);
        testLog1.setTimestamp(now.minusDays(5));
        testLog1.setActivityType(ActivityType.SENSOR_READING);
        testLog1.setDetails("Routine sensor reading");
        testLog1.setIpAddress("192.168.1.100");
        testLog1.setLocation("Server Room");
        testLog1.setUserId("system");
        testLog1 = securityLogRepository.save(testLog1);

        testLog2 = new SecurityLog();
        testLog2.setInstallation(testInstallation1);
        testLog2.setTimestamp(now.minusDays(3));
        testLog2.setActivityType(ActivityType.ALERT_GENERATED);
        testLog2.setDetails("Physical movement alert generated");
        testLog2.setIpAddress("192.168.1.100");
        testLog2.setLocation("Server Room");
        testLog2.setUserId("system");
        testLog2 = securityLogRepository.save(testLog2);

        testLog3 = new SecurityLog();
        testLog3.setInstallation(testInstallation1);
        testLog3.setTimestamp(now.minusDays(2));
        testLog3.setActivityType(ActivityType.ALERT_ACKNOWLEDGED);
        testLog3.setDetails("Alert acknowledged by admin");
        testLog3.setIpAddress("192.168.1.200");
        testLog3.setLocation("Admin Office");
        testLog3.setUserId("admin");
        testLog3 = securityLogRepository.save(testLog3);

        testLog4 = new SecurityLog();
        testLog4.setInstallation(testInstallation2);
        testLog4.setTimestamp(now.minusDays(1));
        testLog4.setActivityType(ActivityType.CONFIGURATION_CHANGE);
        testLog4.setDetails("Alert sensitivity threshold updated");
        testLog4.setIpAddress("192.168.1.200");
        testLog4.setLocation("Admin Office");
        testLog4.setUserId("admin");
        testLog4 = securityLogRepository.save(testLog4);

        testLog5 = new SecurityLog();
        testLog5.setInstallation(testInstallation2);
        testLog5.setTimestamp(now.minusHours(6));
        testLog5.setActivityType(ActivityType.SYSTEM_DIAGNOSTIC);
        testLog5.setDetails("Scheduled system diagnostic");
        testLog5.setIpAddress("192.168.1.100");
        testLog5.setLocation("Server Room");
        testLog5.setUserId("system");
        testLog5 = securityLogRepository.save(testLog5);
    }

    @Test
    @DisplayName("Should find security logs by installation with pagination")
    void shouldFindSecurityLogsByInstallationWithPagination() {
        // Test findByInstallationOrderByTimestampDesc
        Page<SecurityLog> logsPage = securityLogRepository.findByInstallationOrderByTimestampDesc(
                testInstallation1, PageRequest.of(0, 10));
        
        assertThat(logsPage).isNotNull();
        assertThat(logsPage.getContent()).hasSize(3);
        assertThat(logsPage.getContent().get(0).getId()).isEqualTo(testLog3.getId());
        assertThat(logsPage.getContent().get(1).getId()).isEqualTo(testLog2.getId());
        assertThat(logsPage.getContent().get(2).getId()).isEqualTo(testLog1.getId());
    }

    @Test
    @DisplayName("Should find security logs by multiple installations with pagination")
    void shouldFindSecurityLogsByMultipleInstallationsWithPagination() {
        // Test findByInstallationInOrderByTimestampDesc
        List<SolarInstallation> installations = Arrays.asList(testInstallation1, testInstallation2);
        Page<SecurityLog> logsPage = securityLogRepository.findByInstallationInOrderByTimestampDesc(
                installations, PageRequest.of(0, 10));
        
        assertThat(logsPage).isNotNull();
        assertThat(logsPage.getContent()).hasSize(5);
        // Logs should be ordered by timestamp desc
        assertThat(logsPage.getContent().get(0).getId()).isEqualTo(testLog5.getId());
        assertThat(logsPage.getContent().get(1).getId()).isEqualTo(testLog4.getId());
        assertThat(logsPage.getContent().get(2).getId()).isEqualTo(testLog3.getId());
        assertThat(logsPage.getContent().get(3).getId()).isEqualTo(testLog2.getId());
        assertThat(logsPage.getContent().get(4).getId()).isEqualTo(testLog1.getId());
    }

    @Test
    @DisplayName("Should find security logs by installation and activity type")
    void shouldFindSecurityLogsByInstallationAndActivityType() {
        // Test findByInstallationAndActivityTypeOrderByTimestampDesc
        List<SecurityLog> logs = securityLogRepository.findByInstallationAndActivityTypeOrderByTimestampDesc(
                testInstallation1, ActivityType.ALERT_GENERATED);
        
        assertThat(logs).isNotNull();
        assertThat(logs).hasSize(1);
        assertThat(logs.get(0).getId()).isEqualTo(testLog2.getId());
    }

    @Test
    @DisplayName("Should find security logs by installation and time range")
    void shouldFindSecurityLogsByInstallationAndTimeRange() {
        // Test findByInstallationAndTimeRange
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime start = now.minusDays(4);
        LocalDateTime end = now.minusDays(1);
        
        List<SecurityLog> logs = securityLogRepository.findByInstallationAndTimeRange(
                testInstallation1, start, end);
        
        assertThat(logs).isNotNull();
        assertThat(logs).hasSize(2);
        assertThat(logs.get(0).getId()).isEqualTo(testLog3.getId());
        assertThat(logs.get(1).getId()).isEqualTo(testLog2.getId());
    }

    @Test
    @DisplayName("Should find security logs by activity type with pagination")
    void shouldFindSecurityLogsByActivityTypeWithPagination() {
        // Test findByActivityType
        Page<SecurityLog> logsPage = securityLogRepository.findByActivityType(
                ActivityType.SYSTEM_DIAGNOSTIC, PageRequest.of(0, 10));
        
        assertThat(logsPage).isNotNull();
        assertThat(logsPage.getContent()).hasSize(1);
        assertThat(logsPage.getContent().get(0).getId()).isEqualTo(testLog5.getId());
    }

    @Test
    @DisplayName("Should save and retrieve security log")
    void shouldSaveAndRetrieveSecurityLog() {
        // Create a new security log
        LocalDateTime now = LocalDateTime.now();
        
        SecurityLog newLog = new SecurityLog();
        newLog.setInstallation(testInstallation1);
        newLog.setTimestamp(now);
        newLog.setActivityType(ActivityType.REMOTE_ACCESS);
        newLog.setDetails("Remote access by maintenance staff");
        newLog.setIpAddress("203.0.113.45");
        newLog.setLocation("Remote");
        newLog.setUserId("maintenance");
        
        SecurityLog savedLog = securityLogRepository.save(newLog);
        
        assertThat(savedLog).isNotNull();
        assertThat(savedLog.getId()).isNotNull();
        
        // Retrieve the saved log
        SecurityLog retrievedLog = securityLogRepository.findById(savedLog.getId()).orElse(null);
        
        assertThat(retrievedLog).isNotNull();
        assertThat(retrievedLog.getActivityType()).isEqualTo(ActivityType.REMOTE_ACCESS);
        assertThat(retrievedLog.getDetails()).isEqualTo("Remote access by maintenance staff");
        assertThat(retrievedLog.getUserId()).isEqualTo("maintenance");
    }
} 