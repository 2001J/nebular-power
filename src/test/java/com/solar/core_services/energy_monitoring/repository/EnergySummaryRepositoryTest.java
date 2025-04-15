package com.solar.core_services.energy_monitoring.repository;

import com.solar.core_services.energy_monitoring.model.EnergySummary;
import com.solar.core_services.energy_monitoring.model.SolarInstallation;
import com.solar.user_management.model.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Test class for EnergySummaryRepository
 * Source file: src/main/java/com/solar/core_services/energy_monitoring/repository/EnergySummaryRepository.java
 */
@DataJpaTest
public class EnergySummaryRepositoryTest {

    @Autowired
    private TestEntityManager entityManager;

    @Autowired
    private EnergySummaryRepository summaryRepository;

    private SolarInstallation installation;
    private EnergySummary dailySummary1;
    private EnergySummary dailySummary2;
    private EnergySummary dailySummary3;
    private EnergySummary weeklySummary1;
    private EnergySummary weeklySummary2;
    private LocalDate today = LocalDate.now();

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

        // Create daily energy summaries
        dailySummary1 = new EnergySummary();
        dailySummary1.setInstallation(installation);
        dailySummary1.setDate(today.minusDays(2));
        dailySummary1.setPeriod(EnergySummary.SummaryPeriod.DAILY);
        dailySummary1.setTotalGenerationKWh(20.0);
        dailySummary1.setTotalConsumptionKWh(15.0);
        dailySummary1.setPeakGenerationWatts(2000.0);
        dailySummary1.setPeakConsumptionWatts(1500.0);
        dailySummary1.setEfficiencyPercentage(80.0);
        dailySummary1.setReadingsCount(24);
        dailySummary1.setPeriodStart(today.minusDays(2));
        dailySummary1.setPeriodEnd(today.minusDays(2));
        entityManager.persist(dailySummary1);

        dailySummary2 = new EnergySummary();
        dailySummary2.setInstallation(installation);
        dailySummary2.setDate(today.minusDays(1));
        dailySummary2.setPeriod(EnergySummary.SummaryPeriod.DAILY);
        dailySummary2.setTotalGenerationKWh(22.0);
        dailySummary2.setTotalConsumptionKWh(16.0);
        dailySummary2.setPeakGenerationWatts(2200.0);
        dailySummary2.setPeakConsumptionWatts(1600.0);
        dailySummary2.setEfficiencyPercentage(82.0);
        dailySummary2.setReadingsCount(24);
        dailySummary2.setPeriodStart(today.minusDays(1));
        dailySummary2.setPeriodEnd(today.minusDays(1));
        entityManager.persist(dailySummary2);

        dailySummary3 = new EnergySummary();
        dailySummary3.setInstallation(installation);
        dailySummary3.setDate(today);
        dailySummary3.setPeriod(EnergySummary.SummaryPeriod.DAILY);
        dailySummary3.setTotalGenerationKWh(25.0);
        dailySummary3.setTotalConsumptionKWh(18.0);
        dailySummary3.setPeakGenerationWatts(2500.0);
        dailySummary3.setPeakConsumptionWatts(1800.0);
        dailySummary3.setEfficiencyPercentage(85.0);
        dailySummary3.setReadingsCount(24);
        dailySummary3.setPeriodStart(today);
        dailySummary3.setPeriodEnd(today);
        entityManager.persist(dailySummary3);

        // Create weekly energy summaries
        weeklySummary1 = new EnergySummary();
        weeklySummary1.setInstallation(installation);
        weeklySummary1.setDate(today.minusDays(7));
        weeklySummary1.setPeriod(EnergySummary.SummaryPeriod.WEEKLY);
        weeklySummary1.setTotalGenerationKWh(140.0);
        weeklySummary1.setTotalConsumptionKWh(100.0);
        weeklySummary1.setPeakGenerationWatts(3000.0);
        weeklySummary1.setPeakConsumptionWatts(2500.0);
        weeklySummary1.setEfficiencyPercentage(78.0);
        weeklySummary1.setReadingsCount(168);
        weeklySummary1.setPeriodStart(today.minusDays(13));
        weeklySummary1.setPeriodEnd(today.minusDays(7));
        entityManager.persist(weeklySummary1);

        weeklySummary2 = new EnergySummary();
        weeklySummary2.setInstallation(installation);
        weeklySummary2.setDate(today);
        weeklySummary2.setPeriod(EnergySummary.SummaryPeriod.WEEKLY);
        weeklySummary2.setTotalGenerationKWh(150.0);
        weeklySummary2.setTotalConsumptionKWh(110.0);
        weeklySummary2.setPeakGenerationWatts(3200.0);
        weeklySummary2.setPeakConsumptionWatts(2600.0);
        weeklySummary2.setEfficiencyPercentage(80.0);
        weeklySummary2.setReadingsCount(168);
        weeklySummary2.setPeriodStart(today.minusDays(6));
        weeklySummary2.setPeriodEnd(today);
        entityManager.persist(weeklySummary2);

        entityManager.flush();
    }

    @Test
    public void testFindByInstallationAndPeriodOrderByDateDesc() {
        // When
        List<EnergySummary> result = summaryRepository.findByInstallationAndPeriodOrderByDateDesc(
                installation, EnergySummary.SummaryPeriod.DAILY);

        // Then
        assertThat(result).isNotEmpty();
        assertThat(result).hasSize(3);
        assertThat(result.get(0).getDate()).isEqualTo(today);
        assertThat(result.get(1).getDate()).isEqualTo(today.minusDays(1));
        assertThat(result.get(2).getDate()).isEqualTo(today.minusDays(2));
    }

    @Test
    public void testFindByInstallationAndPeriodAndDateBetweenOrderByDateDesc() {
        // When
        List<EnergySummary> result = summaryRepository.findByInstallationAndPeriodAndDateBetweenOrderByDateDesc(
                installation, EnergySummary.SummaryPeriod.DAILY, today.minusDays(1), today);

        // Then
        assertThat(result).isNotEmpty();
        assertThat(result).hasSize(2);
        assertThat(result.get(0).getDate()).isEqualTo(today);
        assertThat(result.get(1).getDate()).isEqualTo(today.minusDays(1));
    }

    @Test
    public void testFindByInstallationAndPeriodAndDate() {
        // When
        Optional<EnergySummary> result = summaryRepository.findByInstallationAndPeriodAndDate(
                installation, EnergySummary.SummaryPeriod.DAILY, today);

        // Then
        assertThat(result).isPresent();
        assertThat(result.get()).isEqualTo(dailySummary3);
    }

    @Test
    public void testSumTotalGenerationForPeriod() {
        // When
        Double result = summaryRepository.sumTotalGenerationForPeriod(
                installation, EnergySummary.SummaryPeriod.DAILY, today.minusDays(2), today);

        // Then
        assertThat(result).isNotNull();
        assertThat(result).isEqualTo(67.0); // 20.0 + 22.0 + 25.0
    }

    @Test
    public void testSumTotalConsumptionForPeriod() {
        // When
        Double result = summaryRepository.sumTotalConsumptionForPeriod(
                installation, EnergySummary.SummaryPeriod.DAILY, today.minusDays(2), today);

        // Then
        assertThat(result).isNotNull();
        assertThat(result).isEqualTo(49.0); // 15.0 + 16.0 + 18.0
    }

    @Test
    public void testAvgEfficiencyForPeriod() {
        // When
        Double result = summaryRepository.avgEfficiencyForPeriod(
                installation, EnergySummary.SummaryPeriod.DAILY, today.minusDays(2), today);

        // Then
        assertThat(result).isNotNull();
        assertThat(result).isEqualTo(82.33333333333333); // (80.0 + 82.0 + 85.0) / 3
    }

    @Test
    public void testFindByInstallationAndPeriodOrderByDateDesc_DifferentPeriod() {
        // When
        List<EnergySummary> result = summaryRepository.findByInstallationAndPeriodOrderByDateDesc(
                installation, EnergySummary.SummaryPeriod.WEEKLY);

        // Then
        assertThat(result).isNotEmpty();
        assertThat(result).hasSize(2);
        assertThat(result.get(0).getDate()).isEqualTo(today);
        assertThat(result.get(1).getDate()).isEqualTo(today.minusDays(7));
    }

    @Test
    public void testFindByInstallationAndPeriodAndDateBetweenOrderByDateDesc_NoDataInRange() {
        // When
        List<EnergySummary> result = summaryRepository.findByInstallationAndPeriodAndDateBetweenOrderByDateDesc(
                installation, EnergySummary.SummaryPeriod.DAILY, today.plusDays(1), today.plusDays(2));

        // Then
        assertThat(result).isEmpty();
    }

    @Test
    public void testFindByInstallationAndPeriodAndDate_NotFound() {
        // When
        Optional<EnergySummary> result = summaryRepository.findByInstallationAndPeriodAndDate(
                installation, EnergySummary.SummaryPeriod.DAILY, today.plusDays(1));

        // Then
        assertThat(result).isEmpty();
    }

    @Test
    public void testSumTotalGenerationForPeriod_NoDataInRange() {
        // When
        Double result = summaryRepository.sumTotalGenerationForPeriod(
                installation, EnergySummary.SummaryPeriod.DAILY, today.plusDays(1), today.plusDays(2));

        // Then
        assertThat(result).isNull();
    }

    @Test
    public void testSumTotalConsumptionForPeriod_NoDataInRange() {
        // When
        Double result = summaryRepository.sumTotalConsumptionForPeriod(
                installation, EnergySummary.SummaryPeriod.DAILY, today.plusDays(1), today.plusDays(2));

        // Then
        assertThat(result).isNull();
    }

    @Test
    public void testAvgEfficiencyForPeriod_NoDataInRange() {
        // When
        Double result = summaryRepository.avgEfficiencyForPeriod(
                installation, EnergySummary.SummaryPeriod.DAILY, today.plusDays(1), today.plusDays(2));

        // Then
        assertThat(result).isNull();
    }
} 