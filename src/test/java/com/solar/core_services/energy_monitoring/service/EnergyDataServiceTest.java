package com.solar.core_services.energy_monitoring.service;

import com.solar.core_services.energy_monitoring.dto.EnergyDataDTO;
import com.solar.core_services.energy_monitoring.dto.EnergyDataRequest;
import com.solar.core_services.energy_monitoring.model.EnergyData;
import com.solar.core_services.energy_monitoring.model.SolarInstallation;
import com.solar.core_services.energy_monitoring.repository.EnergyDataRepository;
import com.solar.core_services.energy_monitoring.repository.SolarInstallationRepository;
import com.solar.core_services.energy_monitoring.service.impl.EnergyDataServiceImpl;
import com.solar.user_management.model.User;
import com.solar.user_management.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Test class for EnergyDataService
 * Source file: src/main/java/com/solar/core_services/energy_monitoring/service/EnergyDataService.java
 */
@ExtendWith(MockitoExtension.class)
public class EnergyDataServiceTest {

    @Mock
    private EnergyDataRepository dataRepository;

    @Mock
    private SolarInstallationRepository installationRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private WebSocketService webSocketService;

    @InjectMocks
    private EnergyDataServiceImpl dataService;

    private User user;
    private SolarInstallation installation;
    private EnergyData energyData1;
    private EnergyData energyData2;
    private EnergyDataRequest energyDataRequest;
    private LocalDateTime now = LocalDateTime.now();

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

        // Create request
        energyDataRequest = EnergyDataRequest.builder()
                .installationId(1L)
                .deviceToken("valid-token")
                .timestamp(now)
                .powerGenerationWatts(3000.0)
                .powerConsumptionWatts(2000.0)
                .dailyYieldKWh(15.0)
                .totalYieldKWh(150.0)
                .batteryLevel(90.0)
                .voltage(220.0)
                .build();
    }

    @Test
    public void testProcessEnergyData_Success() {
        // Given
        when(installationRepository.findById(1L)).thenReturn(Optional.of(installation));
        when(dataRepository.save(any(EnergyData.class))).thenAnswer(invocation -> {
            EnergyData savedData = invocation.getArgument(0);
            savedData.setId(3L);
            return savedData;
        });
        
        // Mock the WebSocketService to do nothing when called
        lenient().doNothing().when(webSocketService).sendEnergyDataUpdate(anyLong(), any(EnergyDataDTO.class));

        // When
        EnergyDataDTO result = dataService.processEnergyData(energyDataRequest);

        // Then
        assertThat(result).isNotNull();
        assertEquals(3L, result.getId());
        assertEquals(1L, result.getInstallationId());
        assertEquals(3000.0, result.getPowerGenerationWatts());
        assertEquals(2000.0, result.getPowerConsumptionWatts());
        assertEquals(15.0, result.getDailyYieldKWh());

        verify(installationRepository, times(1)).findById(1L);
        verify(dataRepository, times(1)).save(any(EnergyData.class));
        verify(webSocketService, times(1)).sendEnergyDataUpdate(eq(1L), any(EnergyDataDTO.class));
    }

    @Test
    public void testProcessEnergyData_InstallationNotFound() {
        // Given
        when(installationRepository.findById(1L)).thenReturn(Optional.empty());

        // When/Then
        Exception exception = assertThrows(RuntimeException.class, () -> {
            dataService.processEnergyData(energyDataRequest);
        });

        assertThat(exception.getMessage()).contains("Solar installation not found with ID: 1");
        verify(installationRepository, times(1)).findById(1L);
        verify(dataRepository, never()).save(any(EnergyData.class));
        verify(webSocketService, never()).sendEnergyDataUpdate(anyLong(), any(EnergyDataDTO.class));
    }

    @Test
    public void testGetRecentReadings_Success() {
        // Given
        when(installationRepository.findById(1L)).thenReturn(Optional.of(installation));
        when(dataRepository.findByInstallationOrderByTimestampDesc(eq(installation)))
                .thenReturn(Arrays.asList(energyData2, energyData1));

        // When
        List<EnergyDataDTO> result = dataService.getRecentReadings(1L, 10);

        // Then
        assertThat(result).isNotEmpty();
        assertThat(result).hasSize(2);
        assertEquals(2L, result.get(0).getId());
        assertEquals(1L, result.get(1).getId());
        assertEquals(2500.0, result.get(0).getPowerGenerationWatts());
        assertEquals(2000.0, result.get(1).getPowerGenerationWatts());

        verify(installationRepository, times(1)).findById(1L);
        verify(dataRepository, times(1)).findByInstallationOrderByTimestampDesc(installation);
    }

    @Test
    public void testGetRecentReadings_InstallationNotFound() {
        // Given
        when(installationRepository.findById(1L)).thenReturn(Optional.empty());

        // When/Then
        Exception exception = assertThrows(RuntimeException.class, () -> {
            dataService.getRecentReadings(1L, 10);
        });

        assertThat(exception.getMessage()).contains("Solar installation not found with ID: 1");
        verify(installationRepository, times(1)).findById(1L);
        verify(dataRepository, never()).findByInstallationOrderByTimestampDesc(any());
    }

    @Test
    public void testGetReadingsInDateRange_Success() {
        // Given
        LocalDateTime startDate = now.minusDays(1);
        LocalDateTime endDate = now;

        when(installationRepository.findById(1L)).thenReturn(Optional.of(installation));
        when(dataRepository.findByInstallationAndTimestampBetweenOrderByTimestampDesc(
                eq(installation), eq(startDate), eq(endDate)))
                .thenReturn(Arrays.asList(energyData1, energyData2));

        // When
        List<EnergyDataDTO> result = dataService.getReadingsInDateRange(1L, startDate, endDate);

        // Then
        assertThat(result).isNotEmpty();
        assertThat(result).hasSize(2);
        assertEquals(1L, result.get(0).getId());
        assertEquals(2L, result.get(1).getId());
        assertEquals(2000.0, result.get(0).getPowerGenerationWatts());
        assertEquals(2500.0, result.get(1).getPowerGenerationWatts());

        verify(installationRepository, times(1)).findById(1L);
        verify(dataRepository, times(1)).findByInstallationAndTimestampBetweenOrderByTimestampDesc(
                installation, startDate, endDate);
    }

    @Test
    public void testGetReadingsInDateRange_InstallationNotFound() {
        // Given
        LocalDateTime startDate = now.minusDays(1);
        LocalDateTime endDate = now;

        when(installationRepository.findById(1L)).thenReturn(Optional.empty());

        // When/Then
        Exception exception = assertThrows(RuntimeException.class, () -> {
            dataService.getReadingsInDateRange(1L, startDate, endDate);
        });

        assertThat(exception.getMessage()).contains("Solar installation not found with ID: 1");
        verify(installationRepository, times(1)).findById(1L);
        verify(dataRepository, never()).findByInstallationAndTimestampBetweenOrderByTimestampDesc(
                any(), any(), any());
    }
} 