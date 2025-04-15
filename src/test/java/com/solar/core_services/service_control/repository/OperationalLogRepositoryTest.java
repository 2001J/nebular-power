package com.solar.core_services.service_control.repository;

import com.solar.core_services.energy_monitoring.model.SolarInstallation;
import com.solar.core_services.energy_monitoring.repository.SolarInstallationRepository;
import com.solar.core_services.service_control.model.OperationalLog;
import com.solar.core_services.service_control.model.OperationalLog.OperationType;
import com.solar.user_management.model.User;
import com.solar.user_management.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Test class for OperationalLogRepository
 */
@DataJpaTest
@ActiveProfiles("test")
public class OperationalLogRepositoryTest {

    @Autowired
    private OperationalLogRepository operationalLogRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private SolarInstallationRepository installationRepository;

    private SolarInstallation installation1;
    private SolarInstallation installation2;
    private OperationalLog log1, log2, log3;
    private User user;

    @BeforeEach
    void setUp() {
        // Clear previous test data
        operationalLogRepository.deleteAll();

        // Create test user
        user = new User();
        user.setEmail("test@example.com");
        user.setFullName("Test User");
        user.setPassword("password");
        user.setPhoneNumber("+12345678901");
        user.setRole(User.UserRole.ADMIN);
        userRepository.save(user);

        // Create test installations
        installation1 = new SolarInstallation();
        installation1.setName("Test Installation 1");
        installation1.setCapacity(5.0);
        installation1.setLocation("Test Location 1");
        installation1.setInstallationDate(LocalDateTime.now().minusMonths(3));
        installation1.setUser(user);
        installation1 = installationRepository.save(installation1);

        installation2 = new SolarInstallation();
        installation2.setName("Test Installation 2");
        installation2.setCapacity(3.0);
        installation2.setLocation("Test Location 2");
        installation2.setInstallationDate(LocalDateTime.now().minusMonths(1));
        installation2.setUser(user);
        installation2 = installationRepository.save(installation2);

        // Create test logs
        log1 = new OperationalLog();
        log1.setInstallation(installation1);
        log1.setOperation(OperationType.SERVICE_STATUS_CHANGE);
        log1.setInitiator("SYSTEM");
        log1.setDetails("Service activated");
        log1.setSourceSystem("MONITORING");
        log1.setSourceAction("STATUS_CHECK");
        log1.setSuccess(true);
        log1.setTimestamp(LocalDateTime.now().minusDays(5));
        operationalLogRepository.save(log1);

        log2 = new OperationalLog();
        log2.setInstallation(installation1);
        log2.setOperation(OperationType.COMMAND_SENT);
        log2.setInitiator("USER");
        log2.setDetails("Reboot command sent");
        log2.setSourceSystem("ADMIN_PORTAL");
        log2.setSourceAction("DEVICE_CONTROL");
        log2.setSuccess(true);
        log2.setTimestamp(LocalDateTime.now().minusDays(3));
        operationalLogRepository.save(log2);

        log3 = new OperationalLog();
        log3.setInstallation(installation2);
        log3.setOperation(OperationType.DEVICE_HEARTBEAT);
        log3.setInitiator("DEVICE");
        log3.setDetails("Regular heartbeat");
        log3.setSourceSystem("DEVICE");
        log3.setSourceAction("SCHEDULED_HEARTBEAT");
        log3.setSuccess(true);
        log3.setTimestamp(LocalDateTime.now().minusDays(1));
        operationalLogRepository.save(log3);
    }

    @Test
    @DisplayName("Should find logs by installation")
    void shouldFindLogsByInstallation() {
        List<OperationalLog> logs = operationalLogRepository.findByInstallationOrderByTimestampDesc(installation1);
        
        assertThat(logs).hasSize(2);
        assertThat(logs.get(0).getOperation()).isEqualTo(OperationType.COMMAND_SENT);
        assertThat(logs.get(1).getOperation()).isEqualTo(OperationType.SERVICE_STATUS_CHANGE);
    }

    @Test
    @DisplayName("Should find logs by installation with pagination")
    void shouldFindLogsByInstallationWithPagination() {
        Page<OperationalLog> logs = operationalLogRepository.findByInstallationOrderByTimestampDesc(
            installation1, PageRequest.of(0, 10));
        
        assertThat(logs.getContent()).hasSize(2);
        assertThat(logs.getContent().get(0).getOperation()).isEqualTo(OperationType.COMMAND_SENT);
    }

    @Test
    @DisplayName("Should find logs by installation ID with pagination")
    void shouldFindLogsByInstallationIdWithPagination() {
        Page<OperationalLog> logs = operationalLogRepository.findByInstallationIdOrderByTimestampDesc(
            installation1.getId(), PageRequest.of(0, 10));
        
        assertThat(logs.getContent()).hasSize(2);
        assertThat(logs.getContent().get(0).getOperation()).isEqualTo(OperationType.COMMAND_SENT);
    }

    @Test
    @DisplayName("Should find logs by operation type")
    void shouldFindLogsByOperationType() {
        Page<OperationalLog> logs = operationalLogRepository.findByOperationOrderByTimestampDesc(
            OperationType.COMMAND_SENT, PageRequest.of(0, 10));
        
        assertThat(logs.getContent()).hasSize(1);
        assertThat(logs.getContent().get(0).getInitiator()).isEqualTo("USER");
    }

    @Test
    @DisplayName("Should find logs by initiator")
    void shouldFindLogsByInitiator() {
        Page<OperationalLog> logs = operationalLogRepository.findByInitiatorOrderByTimestampDesc(
            "SYSTEM", PageRequest.of(0, 10));
        
        assertThat(logs.getContent()).hasSize(1);
        assertThat(logs.getContent().get(0).getOperation()).isEqualTo(OperationType.SERVICE_STATUS_CHANGE);
    }

    @Test
    @DisplayName("Should find logs by time range")
    void shouldFindLogsByTimeRange() {
        LocalDateTime start = LocalDateTime.now().minusDays(4);
        LocalDateTime end = LocalDateTime.now().minusDays(2);
        
        List<OperationalLog> logs = operationalLogRepository.findByTimestampBetweenOrderByTimestampDesc(start, end);
        
        assertThat(logs).hasSize(1);
        assertThat(logs.get(0).getOperation()).isEqualTo(OperationType.COMMAND_SENT);
    }

    @Test
    @DisplayName("Should find logs by user ID")
    void shouldFindLogsByUserId() {
        List<OperationalLog> logs = operationalLogRepository.findByUserIdOrderByTimestampDesc(user.getId());
        
        assertThat(logs).hasSize(3);
    }

    @Test
    @DisplayName("Should find logs by source system")
    void shouldFindLogsBySourceSystem() {
        List<OperationalLog> logs = operationalLogRepository.findBySourceSystemOrderByTimestampDesc("ADMIN_PORTAL");
        
        assertThat(logs).hasSize(1);
        assertThat(logs.get(0).getOperation()).isEqualTo(OperationType.COMMAND_SENT);
    }

    @Test
    @DisplayName("Should find logs by operation type and installation")
    void shouldFindLogsByOperationTypeAndInstallation() {
        Page<OperationalLog> logs = operationalLogRepository.findByInstallationAndOperationOrderByTimestampDesc(
            installation1, OperationType.SERVICE_STATUS_CHANGE, PageRequest.of(0, 10));
        
        assertThat(logs.getContent()).hasSize(1);
        assertThat(logs.getContent().get(0).getDetails()).isEqualTo("Service activated");
    }

    @Test
    @DisplayName("Should find logs by operation type and installation ID")
    void shouldFindLogsByOperationTypeAndInstallationId() {
        Page<OperationalLog> logs = operationalLogRepository.findByInstallationIdAndOperationOrderByTimestampDesc(
            installation1.getId(), OperationType.COMMAND_SENT, PageRequest.of(0, 10));
        
        assertThat(logs.getContent()).hasSize(1);
        assertThat(logs.getContent().get(0).getSourceSystem()).isEqualTo("ADMIN_PORTAL");
    }

    @Test
    @DisplayName("Should count logs by operation")
    void shouldCountLogsByOperation() {
        List<Object[]> counts = operationalLogRepository.countByOperation();
        
        assertThat(counts).isNotEmpty();
        assertThat(counts.size()).isGreaterThanOrEqualTo(3); // We have 3 different operation types
    }

    @Test
    @DisplayName("Should count logs by success")
    void shouldCountLogsBySuccess() {
        List<Object[]> counts = operationalLogRepository.countBySuccess();
        
        assertThat(counts).isNotEmpty();
        // All our test logs are successful
        assertThat(counts.size()).isGreaterThanOrEqualTo(1);
    }
} 