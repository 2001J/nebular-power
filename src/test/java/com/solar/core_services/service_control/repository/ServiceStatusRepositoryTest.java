package com.solar.core_services.service_control.repository;

import com.solar.core_services.energy_monitoring.model.SolarInstallation;
import com.solar.core_services.energy_monitoring.repository.SolarInstallationRepository;
import com.solar.core_services.service_control.model.ServiceStatus;
import com.solar.core_services.service_control.model.ServiceStatus.ServiceState;
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
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Test class for ServiceStatusRepository
 */
@DataJpaTest
@ActiveProfiles("test")
public class ServiceStatusRepositoryTest {

    @Autowired
    private ServiceStatusRepository serviceStatusRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private SolarInstallationRepository installationRepository;

    private SolarInstallation installation1;
    private SolarInstallation installation2;
    private ServiceStatus status1, status2, status3, status4;
    private User user;

    @BeforeEach
    void setUp() {
        // Clear previous test data
        serviceStatusRepository.deleteAll();

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

        // Create test service statuses
        status1 = new ServiceStatus();
        status1.setInstallation(installation1);
        status1.setStatus(ServiceState.ACTIVE);
        status1.setUpdatedBy("SYSTEM");
        status1.setUpdatedAt(LocalDateTime.now().minusDays(10));
        status1.setStatusReason("Initial activation");
        status1.setActive(false);
        serviceStatusRepository.save(status1);

        status2 = new ServiceStatus();
        status2.setInstallation(installation1);
        status2.setStatus(ServiceState.SUSPENDED_MAINTENANCE);
        status2.setUpdatedBy("ADMIN");
        status2.setUpdatedAt(LocalDateTime.now().minusDays(5));
        status2.setStatusReason("Scheduled maintenance");
        status2.setScheduledChange(ServiceState.ACTIVE);
        status2.setScheduledTime(LocalDateTime.now().plusDays(2));
        status2.setActive(false);
        serviceStatusRepository.save(status2);

        status3 = new ServiceStatus();
        status3.setInstallation(installation1);
        status3.setStatus(ServiceState.ACTIVE);
        status3.setUpdatedBy("SYSTEM");
        status3.setUpdatedAt(LocalDateTime.now().minusDays(2));
        status3.setStatusReason("Maintenance completed");
        status3.setActive(true);
        serviceStatusRepository.save(status3);

        status4 = new ServiceStatus();
        status4.setInstallation(installation2);
        status4.setStatus(ServiceState.SUSPENDED_PAYMENT);
        status4.setUpdatedBy("SYSTEM");
        status4.setUpdatedAt(LocalDateTime.now().minusDays(1));
        status4.setStatusReason("Payment overdue");
        status4.setActive(true);
        serviceStatusRepository.save(status4);
    }

    @Test
    @DisplayName("Should find active service status by installation")
    void shouldFindActiveServiceStatusByInstallation() {
        Optional<ServiceStatus> statusOpt = serviceStatusRepository.findByInstallationAndActiveTrue(installation1);
        
        assertThat(statusOpt).isPresent();
        ServiceStatus status = statusOpt.get();
        assertThat(status.getStatus()).isEqualTo(ServiceState.ACTIVE);
        assertThat(status.getStatusReason()).isEqualTo("Maintenance completed");
    }

    @Test
    @DisplayName("Should find active service status by installation ID")
    void shouldFindActiveServiceStatusByInstallationId() {
        Optional<ServiceStatus> statusOpt = serviceStatusRepository.findActiveByInstallationId(installation1.getId());
        
        assertThat(statusOpt).isPresent();
        ServiceStatus status = statusOpt.get();
        assertThat(status.getStatus()).isEqualTo(ServiceState.ACTIVE);
        assertThat(status.getStatusReason()).isEqualTo("Maintenance completed");
    }

    @Test
    @DisplayName("Should find all statuses for installation")
    void shouldFindAllStatusesForInstallation() {
        List<ServiceStatus> statuses = serviceStatusRepository.findByInstallationOrderByUpdatedAtDesc(installation1);
        
        assertThat(statuses).hasSize(3);
        assertThat(statuses.get(0).getUpdatedAt()).isAfter(statuses.get(1).getUpdatedAt());
    }

    @Test
    @DisplayName("Should find all statuses for installation with pagination")
    void shouldFindAllStatusesForInstallationWithPagination() {
        Page<ServiceStatus> statuses = serviceStatusRepository.findByInstallationOrderByUpdatedAtDesc(
            installation1, PageRequest.of(0, 10));
        
        assertThat(statuses.getContent()).hasSize(3);
        assertThat(statuses.getContent().get(0).getUpdatedAt()).isAfter(statuses.getContent().get(1).getUpdatedAt());
    }

    @Test
    @DisplayName("Should find all statuses for installation by ID with pagination")
    void shouldFindAllStatusesForInstallationByIdWithPagination() {
        Page<ServiceStatus> statuses = serviceStatusRepository.findByInstallationIdOrderByUpdatedAtDesc(
            installation1.getId(), PageRequest.of(0, 10));
        
        assertThat(statuses.getContent()).hasSize(3);
        assertThat(statuses.getContent().get(0).getUpdatedAt()).isAfter(statuses.getContent().get(1).getUpdatedAt());
    }

    @Test
    @DisplayName("Should find active statuses by status type")
    void shouldFindActiveStatusesByStatusType() {
        Page<ServiceStatus> statuses = serviceStatusRepository.findByStatusAndActiveTrue(
            ServiceState.SUSPENDED_PAYMENT, PageRequest.of(0, 10));
        
        assertThat(statuses.getContent()).hasSize(1);
        assertThat(statuses.getContent().get(0).getInstallation().getId()).isEqualTo(installation2.getId());
    }

    @Test
    @DisplayName("Should find statuses with scheduled changes")
    void shouldFindStatusesWithScheduledChanges() {
        LocalDateTime cutoff = LocalDateTime.now().plusDays(5);
        List<ServiceStatus> statuses = serviceStatusRepository.findByScheduledChangeIsNotNullAndScheduledTimeBefore(cutoff);
        
        assertThat(statuses).hasSize(1);
        assertThat(statuses.get(0).getScheduledChange()).isEqualTo(ServiceState.ACTIVE);
    }

    @Test
    @DisplayName("Should find active statuses by user ID")
    void shouldFindActiveStatusesByUserId() {
        List<ServiceStatus> statuses = serviceStatusRepository.findActiveByUserId(user.getId());
        
        assertThat(statuses).hasSize(2);
    }

    @Test
    @DisplayName("Should count statuses by status type")
    void shouldCountStatusesByStatusType() {
        List<Object[]> counts = serviceStatusRepository.countByStatus();
        
        assertThat(counts).isNotEmpty();
        assertThat(counts.size()).isGreaterThanOrEqualTo(2); // We have at least 2 different statuses
    }
} 