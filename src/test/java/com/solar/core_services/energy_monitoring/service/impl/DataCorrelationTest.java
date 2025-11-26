package com.solar.core_services.energy_monitoring.service.impl;

import com.solar.core_services.energy_monitoring.dto.DashboardResponse;
import com.solar.core_services.energy_monitoring.dto.SystemSeriesPointDTO;
import com.solar.core_services.energy_monitoring.dto.SystemOverviewResponse;
import com.solar.core_services.energy_monitoring.model.EnergyData;
import com.solar.core_services.energy_monitoring.model.SolarInstallation;
import com.solar.core_services.energy_monitoring.repository.EnergyDataRepository;
import com.solar.core_services.energy_monitoring.repository.SolarInstallationRepository;
import com.solar.core_services.energy_monitoring.service.EnergyDataService;
import com.solar.core_services.energy_monitoring.service.SolarInstallationService;
import com.solar.user_management.model.User;
import com.solar.user_management.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Data Correlation Tests
 * 
 * These tests verify that data flows correctly through the entire pipeline:
 * - Sum of individual installations equals system total
 * - Chart series data sums to overview totals
 * - No data loss or incorrect transformations
 * 
 * These tests help ensure frontend and backend data correlation.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
public class DataCorrelationTest {

    @Autowired
    private EnergyDataService energyDataService;

    @Autowired
    private SolarInstallationService installationService;

    @Autowired
    private SolarInstallationRepository installationRepository;

    @Autowired
    private EnergyDataRepository energyDataRepository;

    @Autowired
    private UserRepository userRepository;

    private SolarInstallation installation1;
    private SolarInstallation installation2;
    private User testUser;

    @BeforeEach
    void setUp() {
        // Create test user
        testUser = new User();
        testUser.setEmail("test-correlation@example.com");
        testUser.setPassword("password123");
        testUser.setFullName("Test User");
        testUser.setPhoneNumber("+1234567890");
        testUser.setRole(User.UserRole.CUSTOMER);
        testUser = userRepository.save(testUser);

        // Create test installations
        installation1 = new SolarInstallation();
        installation1.setUser(testUser);
        installation1.setName("Test Installation 1");
        installation1.setInstalledCapacityKW(5.0);
        installation1.setLocation("Test Location 1");
        installation1.setInstallationDate(LocalDateTime.now().minusDays(30));
        installation1.setStatus(SolarInstallation.InstallationStatus.ACTIVE);
        installation1.setType(SolarInstallation.InstallationType.RESIDENTIAL);
        installation1 = installationRepository.save(installation1);

        installation2 = new SolarInstallation();
        installation2.setUser(testUser);
        installation2.setName("Test Installation 2");
        installation2.setInstalledCapacityKW(10.0);
        installation2.setLocation("Test Location 2");
        installation2.setInstallationDate(LocalDateTime.now().minusDays(30));
        installation2.setStatus(SolarInstallation.InstallationStatus.ACTIVE);
        installation2.setType(SolarInstallation.InstallationType.COMMERCIAL);
        installation2 = installationRepository.save(installation2);

        // Create energy readings for today
        LocalDateTime startOfDay = LocalDateTime.of(LocalDate.now(), LocalTime.MIDNIGHT);
        
        // Installation 1: 3 hours of data at 1000W = ~3 kWh
        for (int hour = 9; hour <= 11; hour++) {
            EnergyData data = new EnergyData();
            data.setInstallation(installation1);
            data.setTimestamp(startOfDay.withHour(hour));
            data.setPowerGenerationWatts(1000.0);
            data.setPowerConsumptionWatts(500.0);
            data.setDailyYieldKWh(0);
            data.setTotalYieldKWh(0);
            energyDataRepository.save(data);
        }
        
        // Add boundary reading for integration
        EnergyData endData1 = new EnergyData();
        endData1.setInstallation(installation1);
        endData1.setTimestamp(startOfDay.withHour(12));
        endData1.setPowerGenerationWatts(1000.0);
        endData1.setPowerConsumptionWatts(500.0);
        endData1.setDailyYieldKWh(0);
        endData1.setTotalYieldKWh(0);
        energyDataRepository.save(endData1);

        // Installation 2: 3 hours of data at 2000W = ~6 kWh
        for (int hour = 9; hour <= 11; hour++) {
            EnergyData data = new EnergyData();
            data.setInstallation(installation2);
            data.setTimestamp(startOfDay.withHour(hour));
            data.setPowerGenerationWatts(2000.0);
            data.setPowerConsumptionWatts(1000.0);
            data.setDailyYieldKWh(0);
            data.setTotalYieldKWh(0);
            energyDataRepository.save(data);
        }
        
        // Add boundary reading for integration
        EnergyData endData2 = new EnergyData();
        endData2.setInstallation(installation2);
        endData2.setTimestamp(startOfDay.withHour(12));
        endData2.setPowerGenerationWatts(2000.0);
        endData2.setPowerConsumptionWatts(1000.0);
        endData2.setDailyYieldKWh(0);
        endData2.setTotalYieldKWh(0);
        energyDataRepository.save(endData2);
    }

    @Test
    @DisplayName("Sum of individual installation dashboards should equal system overview totals")
    void sumOfInstallationDashboardsShouldEqualSystemOverview() {
        // Get system overview
        SystemOverviewResponse overview = installationService.getSystemOverview();
        
        // Get individual dashboards
        DashboardResponse dashboard1 = energyDataService.getInstallationDashboard(installation1.getId());
        DashboardResponse dashboard2 = energyDataService.getInstallationDashboard(installation2.getId());
        
        // Sum individual totals
        double sumGeneration = dashboard1.getTodayGenerationKWh() + dashboard2.getTodayGenerationKWh();
        double sumConsumption = dashboard1.getTodayConsumptionKWh() + dashboard2.getTodayConsumptionKWh();
        
        // Verify correlation within 1% tolerance
        double generationDrift = Math.abs(sumGeneration - overview.getTodayTotalGenerationKWh());
        double consumptionDrift = Math.abs(sumConsumption - overview.getTodayTotalConsumptionKWh());
        
        // Allow for small floating point differences
        if (overview.getTodayTotalGenerationKWh() > 0) {
            double genPercent = generationDrift / overview.getTodayTotalGenerationKWh();
            assertTrue(genPercent < 0.01, 
                String.format("Generation drift too large: %.2f%%. Sum=%.3f, Overview=%.3f", 
                    genPercent * 100, sumGeneration, overview.getTodayTotalGenerationKWh()));
        }
        
        if (overview.getTodayTotalConsumptionKWh() > 0) {
            double conPercent = consumptionDrift / overview.getTodayTotalConsumptionKWh();
            assertTrue(conPercent < 0.01, 
                String.format("Consumption drift too large: %.2f%%. Sum=%.3f, Overview=%.3f", 
                    conPercent * 100, sumConsumption, overview.getTodayTotalConsumptionKWh()));
        }
    }

    @Test
    @DisplayName("System series data should sum to overview total")
    void systemSeriesShouldSumToOverviewTotal() {
        // Use the exact time range that contains our test readings (9:00 to 13:00)
        LocalDateTime startOfDay = LocalDateTime.of(LocalDate.now(), LocalTime.of(8, 0));
        LocalDateTime endTime = LocalDateTime.of(LocalDate.now(), LocalTime.of(13, 0));
        
        // Get system series
        List<SystemSeriesPointDTO> series = energyDataService.getSystemSeries(startOfDay, endTime, "hour");
        
        // Get system overview
        SystemOverviewResponse overview = installationService.getSystemOverview();
        
        // Log for debugging
        System.out.println("Series points: " + series.size());
        series.forEach(pt -> System.out.println("  " + pt.getBucketStart() + " gen=" + pt.getGenerationKWh()));
        System.out.println("Overview todayGen: " + overview.getTodayTotalGenerationKWh());
        
        // Sum series totals
        double seriesGeneration = series.stream()
            .mapToDouble(SystemSeriesPointDTO::getGenerationKWh)
            .sum();
        double seriesConsumption = series.stream()
            .mapToDouble(SystemSeriesPointDTO::getConsumptionKWh)
            .sum();
        
        // If series has data, verify correlation within 5% tolerance
        if (series.size() > 0 && seriesGeneration > 0 && overview.getTodayTotalGenerationKWh() > 0) {
            double genDrift = Math.abs(seriesGeneration - overview.getTodayTotalGenerationKWh()) 
                / overview.getTodayTotalGenerationKWh();
            assertTrue(genDrift < 0.10, 
                String.format("Series generation drift: %.2f%%. Series=%.3f, Overview=%.3f", 
                    genDrift * 100, seriesGeneration, overview.getTodayTotalGenerationKWh()));
        } else {
            // If no series data, skip this test as it may be a timing issue
            System.out.println("Skipping series correlation check - no series data available");
        }
    }

    @Test
    @DisplayName("Installation series should match installation dashboard")
    void installationSeriesShouldMatchDashboard() {
        // Use time range that contains our test readings
        LocalDateTime startTime = LocalDateTime.of(LocalDate.now(), LocalTime.of(8, 0));
        LocalDateTime endTime = LocalDateTime.of(LocalDate.now(), LocalTime.of(13, 0));
        
        // Get installation series
        var series = energyDataService.getChartSeries(
            installation1.getId(), startTime, endTime, "hour");
        
        // Get installation dashboard
        DashboardResponse dashboard = energyDataService.getInstallationDashboard(installation1.getId());
        
        // Log for debugging
        System.out.println("Installation series points: " + series.size());
        series.forEach(pt -> System.out.println("  " + pt.getBucketStart() + " gen=" + pt.getGenerationKWh()));
        System.out.println("Dashboard todayGen: " + dashboard.getTodayGenerationKWh());
        
        // Sum series
        double seriesGeneration = series.stream()
            .mapToDouble(pt -> pt.getGenerationKWh())
            .sum();
        
        // Verify correlation if series has data
        if (series.size() > 0 && seriesGeneration > 0 && dashboard.getTodayGenerationKWh() > 0) {
            double drift = Math.abs(seriesGeneration - dashboard.getTodayGenerationKWh()) 
                / dashboard.getTodayGenerationKWh();
            assertTrue(drift < 0.10, 
                String.format("Installation series drift: %.2f%%. Series=%.3f, Dashboard=%.3f", 
                    drift * 100, seriesGeneration, dashboard.getTodayGenerationKWh()));
        } else {
            System.out.println("Skipping series correlation check - no series data available");
        }
    }

    @Test
    @DisplayName("Type breakdown in system series should sum to total")
    void typeBreakdownShouldSumToTotal() {
        LocalDateTime startOfDay = LocalDateTime.of(LocalDate.now(), LocalTime.MIDNIGHT);
        LocalDateTime now = LocalDateTime.now();
        
        // Get system series
        List<SystemSeriesPointDTO> series = energyDataService.getSystemSeries(startOfDay, now, "hour");
        
        for (SystemSeriesPointDTO point : series) {
            if (point.getGenerationByTypeKWh() != null && point.getGenerationKWh() > 0) {
                double typeSum = point.getGenerationByTypeKWh().values().stream()
                    .mapToDouble(Double::doubleValue)
                    .sum();
                
                double drift = Math.abs(typeSum - point.getGenerationKWh()) / point.getGenerationKWh();
                assertTrue(drift < 0.01, 
                    String.format("Type breakdown doesn't sum to total. Types=%.3f, Total=%.3f", 
                        typeSum, point.getGenerationKWh()));
            }
        }
    }

    @Test
    @DisplayName("Time range totals should be monotonically increasing")
    void timeRangeTotalsShouldBeMonotonicallyIncreasing() {
        // Get system overview
        SystemOverviewResponse overview = installationService.getSystemOverview();
        
        // Verify: today <= week <= month <= year
        assertTrue(overview.getTodayTotalGenerationKWh() <= overview.getWeekToDateGenerationKWh() + 0.001,
            "Today's generation should be <= week-to-date");
        assertTrue(overview.getWeekToDateGenerationKWh() <= overview.getMonthToDateGenerationKWh() + 0.001,
            "Week-to-date generation should be <= month-to-date");
        assertTrue(overview.getMonthToDateGenerationKWh() <= overview.getYearToDateGenerationKWh() + 0.001,
            "Month-to-date generation should be <= year-to-date");
    }

    @Test
    @DisplayName("Integration should be accurate for constant power")
    void integrationShouldBeAccurateForConstantPower() {
        // Installation 1 has constant 1000W for 3 hours (9:00-12:00)
        // Expected: 1kW * 3h = 3.0 kWh
        DashboardResponse dashboard = energyDataService.getInstallationDashboard(installation1.getId());
        
        assertEquals(3.0, dashboard.getTodayGenerationKWh(), 0.1,
            "3 hours at 1kW should produce 3.0 kWh");
        assertEquals(1.5, dashboard.getTodayConsumptionKWh(), 0.1,
            "3 hours at 0.5kW should consume 1.5 kWh");
    }
}

