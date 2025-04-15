package com.solar.core_services.energy_monitoring.repository;

import com.solar.core_services.energy_monitoring.model.EnergyData;
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
 * Test class for EnergyDataRepository
 * Source file: src/main/java/com/solar/core_services/energy_monitoring/repository/EnergyDataRepository.java
 */
@DataJpaTest
public class EnergyDataRepositoryTest {

    @Autowired
    private TestEntityManager entityManager;

    @Autowired
    private EnergyDataRepository energyDataRepository;

    private SolarInstallation installation;
    private EnergyData energyData1;
    private EnergyData energyData2;
    private EnergyData energyData3;
    private final LocalDateTime now = LocalDateTime.now();

    @BeforeEach
    public void setup() {
        // Create a user
        User user = new User();
        user.setEmail("test@example.com");
        user.setPassword("password");
        user.setFullName("Test User");
        user.setPhoneNumber("+12345678901");
        user.setRole(User.UserRole.CUSTOMER);
        user.setEnabled(true);
        entityManager.persist(user);

        // Create a solar installation
        installation = new SolarInstallation();
        installation.setName("Test Installation");
        installation.setCapacity(5.0);
        installation.setInstalledCapacityKW(5.0);
        installation.setLocation("Test Location");
        installation.setInstallationDate(LocalDateTime.now().minusDays(30));
        installation.setStatus(SolarInstallation.InstallationStatus.ACTIVE);
        installation.setUser(user);
        entityManager.persist(installation);

        // Create energy data entries
        energyData1 = new EnergyData();
        energyData1.setInstallation(installation);
        energyData1.setPowerGenerationWatts(1000.0);
        energyData1.setPowerConsumptionWatts(800.0);
        energyData1.setTimestamp(now.minusHours(2));
        energyData1.setDailyYieldKWh(5.0);
        energyData1.setTotalYieldKWh(100.0);
        energyData1.setSimulated(true);
        entityManager.persist(energyData1);

        energyData2 = new EnergyData();
        energyData2.setInstallation(installation);
        energyData2.setPowerGenerationWatts(1200.0);
        energyData2.setPowerConsumptionWatts(900.0);
        energyData2.setTimestamp(now.minusHours(1));
        energyData2.setDailyYieldKWh(6.0);
        energyData2.setTotalYieldKWh(101.0);
        energyData2.setSimulated(true);
        entityManager.persist(energyData2);

        energyData3 = new EnergyData();
        energyData3.setInstallation(installation);
        energyData3.setPowerGenerationWatts(1300.0);
        energyData3.setPowerConsumptionWatts(950.0);
        energyData3.setTimestamp(now);
        energyData3.setDailyYieldKWh(7.0);
        energyData3.setTotalYieldKWh(102.0);
        energyData3.setSimulated(true);
        entityManager.persist(energyData3);

        entityManager.flush();
    }

    @Test
    public void testFindByInstallationOrderByTimestampDesc() {
        // When
        List<EnergyData> result = energyDataRepository.findByInstallationOrderByTimestampDesc(installation);

        // Then
        assertThat(result).isNotEmpty();
        assertThat(result).hasSize(3);
        assertThat(result.get(0).getTimestamp()).isEqualTo(now);
        assertThat(result.get(1).getTimestamp()).isEqualTo(now.minusHours(1));
        assertThat(result.get(2).getTimestamp()).isEqualTo(now.minusHours(2));
    }

    @Test
    public void testFindByInstallationAndTimestampBetweenOrderByTimestampDesc() {
        // When
        List<EnergyData> result = energyDataRepository.findByInstallationAndTimestampBetweenOrderByTimestampDesc(
                installation, now.minusHours(1).minusMinutes(30), now.plusHours(1));

        // Then
        assertThat(result).isNotEmpty();
        assertThat(result).hasSize(2);
        assertThat(result.get(0).getTimestamp()).isEqualTo(now);
        assertThat(result.get(1).getTimestamp()).isEqualTo(now.minusHours(1));
    }

    @Test
    public void testSumPowerGenerationForPeriod() {
        // When
        Double result = energyDataRepository.sumPowerGenerationForPeriod(
                installation, now.minusHours(3), now.plusHours(1));

        // Then
        assertThat(result).isNotNull();
        assertThat(result).isEqualTo(3500.0); // 1000 + 1200 + 1300
    }

    @Test
    public void testSumPowerConsumptionForPeriod() {
        // When
        Double result = energyDataRepository.sumPowerConsumptionForPeriod(
                installation, now.minusHours(3), now.plusHours(1));

        // Then
        assertThat(result).isNotNull();
        assertThat(result).isEqualTo(2650.0); // 800 + 900 + 950
    }

    @Test
    public void testFindByInstallationOrderByTimestampDesc_EmptyResult() {
        // Create a new installation that has no energy data
        SolarInstallation newInstallation = new SolarInstallation();
        newInstallation.setName("New Installation");
        newInstallation.setCapacity(3.0);
        newInstallation.setInstalledCapacityKW(3.0);
        newInstallation.setLocation("New Location");
        newInstallation.setInstallationDate(LocalDateTime.now().minusDays(10));
        newInstallation.setStatus(SolarInstallation.InstallationStatus.ACTIVE);
        newInstallation.setUser(installation.getUser());
        entityManager.persist(newInstallation);
        entityManager.flush();

        // When
        List<EnergyData> result = energyDataRepository.findByInstallationOrderByTimestampDesc(newInstallation);

        // Then
        assertThat(result).isEmpty();
    }

    @Test
    public void testFindByInstallationAndTimestampBetweenOrderByTimestampDesc_NoDataInRange() {
        // When
        List<EnergyData> result = energyDataRepository.findByInstallationAndTimestampBetweenOrderByTimestampDesc(
                installation, now.plusHours(1), now.plusHours(2));

        // Then
        assertThat(result).isEmpty();
    }

    @Test
    public void testSumPowerGenerationForPeriod_NoDataInRange() {
        // When
        Double result = energyDataRepository.sumPowerGenerationForPeriod(
                installation, now.plusHours(1), now.plusHours(2));

        // Then
        assertThat(result).isNull();
    }

    @Test
    public void testSumPowerConsumptionForPeriod_NoDataInRange() {
        // When
        Double result = energyDataRepository.sumPowerConsumptionForPeriod(
                installation, now.plusHours(1), now.plusHours(2));

        // Then
        assertThat(result).isNull();
    }
} 