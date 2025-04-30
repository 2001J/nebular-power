package com.solar.core_services.energy_monitoring.service;

import com.solar.core_services.energy_monitoring.dto.EnergySummaryDTO;
import com.solar.core_services.energy_monitoring.model.EnergyData;
import com.solar.core_services.energy_monitoring.model.EnergySummary;
import com.solar.core_services.energy_monitoring.model.SolarInstallation;
import com.solar.core_services.energy_monitoring.repository.EnergyDataRepository;
import com.solar.core_services.energy_monitoring.repository.EnergySummaryRepository;
import com.solar.core_services.energy_monitoring.repository.SolarInstallationRepository;
import com.solar.core_services.energy_monitoring.service.impl.EnergySummaryServiceImpl;
import com.solar.user_management.model.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Test class for EnergySummaryService
 * Source file: src/main/java/com/solar/core_services/energy_monitoring/service/EnergySummaryService.java
 */
@ExtendWith(MockitoExtension.class)
public class EnergySummaryServiceTest {

    @Mock
    private EnergySummaryRepository summaryRepository;

    @Mock
    private SolarInstallationRepository installationRepository;

    @Mock
    private EnergyDataRepository dataRepository;

    @InjectMocks
    private EnergySummaryServiceImpl summaryService;

    private User user;
    private SolarInstallation installation;
    private EnergySummary dailySummary;
    private EnergySummary weeklySummary;
    private EnergySummary monthlySummary;
    private EnergyData energyData1;
    private EnergyData energyData2;
    private final LocalDate today = LocalDate.now();
    private final LocalDateTime now = LocalDateTime.now();

    @BeforeEach
    public void setup() {
        // Create user
        user = new User();
        user.setId(1L);
        user.setEmail("test@example.com");
        user.setFullName("Test User");
        user.setRole(User.UserRole.CUSTOMER);

        // Create installation
        installation = new SolarInstallation();
        installation.setId(1L);
        installation.setInstalledCapacityKW(5.0);
        installation.setLocation("Test Location");
        installation.setInstallationDate(now.minusDays(30));
        installation.setStatus(SolarInstallation.InstallationStatus.ACTIVE);
        installation.setUser(user);
        installation.setTamperDetected(false);
        installation.setLastTamperCheck(now);

        // Create energy data
        energyData1 = new EnergyData();
        energyData1.setId(1L);
        energyData1.setInstallation(installation);
        energyData1.setTimestamp(now.minusHours(2));
        energyData1.setPowerGenerationWatts(2000.0);
        energyData1.setPowerConsumptionWatts(1500.0);
        energyData1.setDailyYieldKWh(10.0);
        energyData1.setTotalYieldKWh(100.0);

        energyData2 = new EnergyData();
        energyData2.setId(2L);
        energyData2.setInstallation(installation);
        energyData2.setTimestamp(now.minusHours(1));
        energyData2.setPowerGenerationWatts(2500.0);
        energyData2.setPowerConsumptionWatts(1800.0);
        energyData2.setDailyYieldKWh(12.0);
        energyData2.setTotalYieldKWh(120.0);

        // Create summaries
        dailySummary = new EnergySummary();
        dailySummary.setId(1L);
        dailySummary.setInstallation(installation);
        dailySummary.setDate(today);
        dailySummary.setPeriod(EnergySummary.SummaryPeriod.DAILY);
        dailySummary.setTotalGenerationKWh(25.0);
        dailySummary.setTotalConsumptionKWh(18.0);
        dailySummary.setPeakGenerationWatts(2500.0);
        dailySummary.setPeakConsumptionWatts(1800.0);
        dailySummary.setEfficiencyPercentage(85.0);
        dailySummary.setReadingsCount(24);
        dailySummary.setPeriodStart(today);
        dailySummary.setPeriodEnd(today);

        weeklySummary = new EnergySummary();
        weeklySummary.setId(2L);
        weeklySummary.setInstallation(installation);
        weeklySummary.setDate(today);
        weeklySummary.setPeriod(EnergySummary.SummaryPeriod.WEEKLY);
        weeklySummary.setTotalGenerationKWh(150.0);
        weeklySummary.setTotalConsumptionKWh(110.0);
        weeklySummary.setPeakGenerationWatts(3200.0);
        weeklySummary.setPeakConsumptionWatts(2600.0);
        weeklySummary.setEfficiencyPercentage(80.0);
        weeklySummary.setReadingsCount(168);
        weeklySummary.setPeriodStart(today.minusDays(6));
        weeklySummary.setPeriodEnd(today);

        monthlySummary = new EnergySummary();
        monthlySummary.setId(3L);
        monthlySummary.setInstallation(installation);
        monthlySummary.setDate(today);
        monthlySummary.setPeriod(EnergySummary.SummaryPeriod.MONTHLY);
        monthlySummary.setTotalGenerationKWh(600.0);
        monthlySummary.setTotalConsumptionKWh(450.0);
        monthlySummary.setPeakGenerationWatts(3500.0);
        monthlySummary.setPeakConsumptionWatts(2800.0);
        monthlySummary.setEfficiencyPercentage(75.0);
        monthlySummary.setReadingsCount(720);
        monthlySummary.setPeriodStart(today.minusDays(29));
        monthlySummary.setPeriodEnd(today);
    }

    @Test
    public void testGenerateDailySummary_Success() {
        // Given
        when(installationRepository.findById(1L)).thenReturn(Optional.of(installation));
        when(summaryRepository.findByInstallationAndPeriodAndDate(installation, EnergySummary.SummaryPeriod.DAILY, today))
                .thenReturn(Optional.empty());
        
        // Use lenient() for potentially unnecessary stubbings
        lenient().when(dataRepository.findByInstallationAndTimestampBetweenOrderByTimestampDesc(
                eq(installation),
                any(LocalDateTime.class),
                any(LocalDateTime.class)))
                .thenReturn(Arrays.asList(energyData1, energyData2));
        
        lenient().when(summaryRepository.save(any(EnergySummary.class))).thenReturn(dailySummary);

        // When
        EnergySummaryDTO result = summaryService.generateDailySummary(1L, today);

        // Then
        assertThat(result).isNotNull();
        assertEquals(1L, result.getId());
        assertEquals(1L, result.getInstallationId());
        assertEquals(EnergySummary.SummaryPeriod.DAILY, result.getPeriod());
        assertEquals(25.0, result.getTotalGenerationKWh());
        assertEquals(18.0, result.getTotalConsumptionKWh());
        assertEquals(2500.0, result.getPeakGenerationWatts());
        assertEquals(1800.0, result.getPeakConsumptionWatts());
        assertEquals(85.0, result.getEfficiencyPercentage());
        assertEquals(24, result.getReadingsCount());
        assertEquals(today, result.getPeriodStart());
        assertEquals(today, result.getPeriodEnd());

        verify(installationRepository, times(1)).findById(1L);
        verify(summaryRepository, times(1)).findByInstallationAndPeriodAndDate(installation, EnergySummary.SummaryPeriod.DAILY, today);
        verify(dataRepository, times(1)).findByInstallationAndTimestampBetweenOrderByTimestampDesc(
                eq(installation),
                any(LocalDateTime.class),
                any(LocalDateTime.class));
        verify(summaryRepository, times(1)).save(any(EnergySummary.class));
    }

    @Test
    public void testGenerateDailySummary_InstallationNotFound() {
        // Given
        when(installationRepository.findById(1L)).thenReturn(Optional.empty());

        // When/Then
        Exception exception = assertThrows(RuntimeException.class, () -> {
            summaryService.generateDailySummary(1L, today);
        });

        assertThat(exception.getMessage()).contains("Solar installation not found with ID: 1");
        verify(installationRepository, times(1)).findById(1L);
        verify(summaryRepository, never()).findByInstallationAndPeriodAndDate(any(), any(), any());
        verify(dataRepository, never()).findByInstallationAndTimestampBetweenOrderByTimestampDesc(any(), any(), any());
        verify(summaryRepository, never()).save(any());
    }

    @Test
    public void testGenerateDailySummary_SummaryAlreadyExists() {
        // Given
        when(installationRepository.findById(1L)).thenReturn(Optional.of(installation));
        when(summaryRepository.findByInstallationAndPeriodAndDate(installation, EnergySummary.SummaryPeriod.DAILY, today))
                .thenReturn(Optional.of(dailySummary));

        // When
        EnergySummaryDTO result = summaryService.generateDailySummary(1L, today);

        // Then
        assertThat(result).isNotNull();
        assertEquals(1L, result.getId());
        assertEquals(1L, result.getInstallationId());
        assertEquals(EnergySummary.SummaryPeriod.DAILY, result.getPeriod());

        verify(installationRepository, times(1)).findById(1L);
        verify(summaryRepository, times(1)).findByInstallationAndPeriodAndDate(installation, EnergySummary.SummaryPeriod.DAILY, today);
        verify(dataRepository, never()).findByInstallationAndTimestampBetweenOrderByTimestampDesc(any(), any(), any());
        verify(summaryRepository, never()).save(any());
    }

    @Test
    public void testGenerateWeeklySummary_Success() {
        // Given
        when(installationRepository.findById(1L)).thenReturn(Optional.of(installation));
        when(summaryRepository.findByInstallationAndPeriodAndDate(installation, EnergySummary.SummaryPeriod.WEEKLY, today))
                .thenReturn(Optional.of(weeklySummary));

        // When
        EnergySummaryDTO result = summaryService.generateWeeklySummary(1L, today);

        // Then
        assertThat(result).isNotNull();
        assertEquals(2L, result.getId());
        assertEquals(1L, result.getInstallationId());
        assertEquals(EnergySummary.SummaryPeriod.WEEKLY, result.getPeriod());

        verify(installationRepository, times(1)).findById(1L);
        verify(summaryRepository, times(1)).findByInstallationAndPeriodAndDate(installation, EnergySummary.SummaryPeriod.WEEKLY, today);
    }

    @Test
    public void testGetSummariesByPeriod_Success() {
        // Given
        when(installationRepository.findById(1L)).thenReturn(Optional.of(installation));
        when(summaryRepository.findByInstallationAndPeriodOrderByDateDesc(installation, EnergySummary.SummaryPeriod.DAILY))
                .thenReturn(Collections.singletonList(dailySummary));

        // When
        List<EnergySummaryDTO> result = summaryService.getSummariesByPeriod(1L, EnergySummary.SummaryPeriod.DAILY);

        // Then
        assertThat(result).isNotEmpty();
        assertThat(result).hasSize(1);
        assertEquals(1L, result.get(0).getId());
        assertEquals(1L, result.get(0).getInstallationId());
        assertEquals(EnergySummary.SummaryPeriod.DAILY, result.get(0).getPeriod());

        verify(installationRepository, times(1)).findById(1L);
        verify(summaryRepository, times(1)).findByInstallationAndPeriodOrderByDateDesc(installation, EnergySummary.SummaryPeriod.DAILY);
    }

    @Test
    public void testGetSummariesByPeriod_InstallationNotFound() {
        // Given
        when(installationRepository.findById(1L)).thenReturn(Optional.empty());

        // When/Then
        Exception exception = assertThrows(RuntimeException.class, () -> {
            summaryService.getSummariesByPeriod(1L, EnergySummary.SummaryPeriod.DAILY);
        });

        assertThat(exception.getMessage()).contains("Solar installation not found with ID: 1");
        verify(installationRepository, times(1)).findById(1L);
        verify(summaryRepository, never()).findByInstallationAndPeriodOrderByDateDesc(any(), any());
    }

    @Test
    public void testGetSummariesByPeriodAndDateRange_Success() {
        // Given
        LocalDate startDate = today.minusDays(7);
        LocalDate endDate = today;

        when(installationRepository.findById(1L)).thenReturn(Optional.of(installation));
        when(summaryRepository.findByInstallationAndPeriodAndDateBetweenOrderByDateDesc(
                installation, EnergySummary.SummaryPeriod.DAILY, startDate, endDate))
                .thenReturn(Collections.singletonList(dailySummary));

        // When
        List<EnergySummaryDTO> result = summaryService.getSummariesByPeriodAndDateRange(
                1L, EnergySummary.SummaryPeriod.DAILY, startDate, endDate);

        // Then
        assertThat(result).isNotEmpty();
        assertThat(result).hasSize(1);
        assertEquals(1L, result.get(0).getId());
        assertEquals(1L, result.get(0).getInstallationId());
        assertEquals(EnergySummary.SummaryPeriod.DAILY, result.get(0).getPeriod());

        verify(installationRepository, times(1)).findById(1L);
        verify(summaryRepository, times(1)).findByInstallationAndPeriodAndDateBetweenOrderByDateDesc(
                installation, EnergySummary.SummaryPeriod.DAILY, startDate, endDate);
    }

    @Test
    public void testGetSummariesByPeriodAndDateRange_InstallationNotFound() {
        // Given
        LocalDate startDate = today.minusDays(7);
        LocalDate endDate = today;

        when(installationRepository.findById(1L)).thenReturn(Optional.empty());

        // When/Then
        Exception exception = assertThrows(RuntimeException.class, () -> {
            summaryService.getSummariesByPeriodAndDateRange(
                    1L, EnergySummary.SummaryPeriod.DAILY, startDate, endDate);
        });

        assertThat(exception.getMessage()).contains("Solar installation not found with ID: 1");
        verify(installationRepository, times(1)).findById(1L);
        verify(summaryRepository, never()).findByInstallationAndPeriodAndDateBetweenOrderByDateDesc(
                any(), any(), any(), any());
    }
} 