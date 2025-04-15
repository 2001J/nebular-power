package com.solar.core_services.energy_monitoring.repository;

import com.solar.core_services.energy_monitoring.model.SolarInstallation;
import com.solar.user_management.model.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Test class for SolarInstallationRepository
 * Source file: src/main/java/com/solar/core_services/energy_monitoring/repository/SolarInstallationRepository.java
 */
@DataJpaTest
public class SolarInstallationRepositoryTest {

    @Autowired
    private TestEntityManager entityManager;

    @Autowired
    private SolarInstallationRepository installationRepository;

    private User user1;
    private User user2;
    private SolarInstallation installation1;
    private SolarInstallation installation2;
    private SolarInstallation installation3;

    @BeforeEach
    public void setup() {
        // Create users
        user1 = new User();
        user1.setEmail("user1@example.com");
        user1.setPassword("password");
        user1.setFullName("User One");
        user1.setPhoneNumber("+12345678901");
        user1.setRole(User.UserRole.CUSTOMER);
        user1.setEnabled(true);
        entityManager.persist(user1);

        user2 = new User();
        user2.setEmail("user2@example.com");
        user2.setPassword("password");
        user2.setFullName("User Two");
        user2.setPhoneNumber("+19876543210");
        user2.setRole(User.UserRole.CUSTOMER);
        user2.setEnabled(true);
        entityManager.persist(user2);

        // Create installations
        installation1 = new SolarInstallation();
        installation1.setName("Installation 1");
        installation1.setCapacity(5.0);
        installation1.setInstalledCapacityKW(5.0);
        installation1.setLocation("Location 1");
        installation1.setInstallationDate(LocalDateTime.now().minusDays(30));
        installation1.setStatus(SolarInstallation.InstallationStatus.ACTIVE);
        installation1.setUser(user1);
        installation1.setTamperDetected(false);
        entityManager.persist(installation1);

        installation2 = new SolarInstallation();
        installation2.setName("Installation 2");
        installation2.setCapacity(3.0);
        installation2.setInstalledCapacityKW(3.0);
        installation2.setLocation("Location 2");
        installation2.setInstallationDate(LocalDateTime.now().minusDays(20));
        installation2.setStatus(SolarInstallation.InstallationStatus.ACTIVE);
        installation2.setUser(user1);
        installation2.setTamperDetected(true);
        entityManager.persist(installation2);

        installation3 = new SolarInstallation();
        installation3.setName("Installation 3");
        installation3.setCapacity(4.0);
        installation3.setInstalledCapacityKW(4.0);
        installation3.setLocation("Location 3");
        installation3.setInstallationDate(LocalDateTime.now().minusDays(10));
        installation3.setStatus(SolarInstallation.InstallationStatus.MAINTENANCE);
        installation3.setUser(user2);
        installation3.setTamperDetected(false);
        entityManager.persist(installation3);

        entityManager.flush();
    }

    @Test
    public void testFindByUser() {
        // When
        List<SolarInstallation> result = installationRepository.findByUser(user1);

        // Then
        assertThat(result).isNotEmpty();
        assertThat(result).hasSize(2);
        assertThat(result).contains(installation1, installation2);
    }

    @Test
    public void testFindByTamperDetectedTrue() {
        // When
        List<SolarInstallation> result = installationRepository.findByTamperDetectedTrue();

        // Then
        assertThat(result).isNotEmpty();
        assertThat(result).hasSize(1);
        assertThat(result.get(0)).isEqualTo(installation2);
    }

    @Test
    public void testFindByUserId() {
        // When
        List<SolarInstallation> result = installationRepository.findByUserId(user1.getId());

        // Then
        assertThat(result).isNotEmpty();
        assertThat(result).hasSize(2);
        assertThat(result).contains(installation1, installation2);
    }

    @Test
    public void testFindByUser_NoInstallations() {
        // Create a user with no installations
        User newUser = new User();
        newUser.setEmail("newuser@example.com");
        newUser.setPassword("password");
        newUser.setFullName("New User");
        newUser.setPhoneNumber("+11122334455");
        newUser.setRole(User.UserRole.CUSTOMER);
        newUser.setEnabled(true);
        entityManager.persist(newUser);
        entityManager.flush();

        // When
        List<SolarInstallation> result = installationRepository.findByUser(newUser);

        // Then
        assertThat(result).isEmpty();
    }

    @Test
    public void testFindByTamperDetectedTrue_NoTamperDetected() {
        // Update all installations to have tamperDetected = false
        installation2.setTamperDetected(false);
        entityManager.persist(installation2);
        entityManager.flush();

        // When
        List<SolarInstallation> result = installationRepository.findByTamperDetectedTrue();

        // Then
        assertThat(result).isEmpty();
    }

    @Test
    public void testFindByUserId_NonExistentUser() {
        // When
        List<SolarInstallation> result = installationRepository.findByUserId(999L);

        // Then
        assertThat(result).isEmpty();
    }
} 