package com.solar.core_services.energy_monitoring.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.solar.core_services.energy_monitoring.dto.DashboardResponse;
import com.solar.core_services.energy_monitoring.dto.EnergyDataDTO;
import com.solar.core_services.energy_monitoring.dto.EnergyDataRequest;
import com.solar.core_services.energy_monitoring.service.EnergyDataService;
import com.solar.core_services.energy_monitoring.service.SecurityService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Test class for EnergyDataController
 * Source file: src/main/java/com/solar/core_services/energy_monitoring/controller/EnergyDataController.java
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public class EnergyDataControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private EnergyDataService energyDataService;

    @MockBean
    private SecurityService securityService;

    private EnergyDataDTO energyDataDTO1;
    private EnergyDataDTO energyDataDTO2;
    private EnergyDataRequest validRequest;
    private DashboardResponse dashboardResponse;
    private final LocalDateTime now = LocalDateTime.now();

    @BeforeEach
    public void setup() {
        // Create DTOs
        energyDataDTO1 = EnergyDataDTO.builder()
                .id(1L)
                .installationId(1L)
                .powerGenerationWatts(1000.0)
                .powerConsumptionWatts(800.0)
                .timestamp(now.minusHours(1))
                .dailyYieldKWh(5.0)
                .totalYieldKWh(100.0)
                .isSimulated(true)
                .build();

        energyDataDTO2 = EnergyDataDTO.builder()
                .id(2L)
                .installationId(1L)
                .powerGenerationWatts(1200.0)
                .powerConsumptionWatts(900.0)
                .timestamp(now)
                .dailyYieldKWh(6.0)
                .totalYieldKWh(101.0)
                .isSimulated(true)
                .build();

        // Create valid request
        validRequest = EnergyDataRequest.builder()
                .installationId(1L)
                .deviceToken("valid-token")
                .powerGenerationWatts(1500.0)
                .powerConsumptionWatts(1000.0)
                .timestamp(now)
                .dailyYieldKWh(7.0)
                .totalYieldKWh(102.0)
                .batteryLevel(95.0)
                .voltage(220.0)
                .build();

        // Create dashboard response
        dashboardResponse = DashboardResponse.builder()
                .installationId(1L)
                .currentPowerGenerationWatts(1200.0)
                .currentPowerConsumptionWatts(900.0)
                .todayGenerationKWh(6.0)
                .todayConsumptionKWh(4.0)
                .monthToDateGenerationKWh(150.0)
                .monthToDateConsumptionKWh(120.0)
                .lifetimeGenerationKWh(1000.0)
                .lifetimeConsumptionKWh(800.0)
                .currentEfficiencyPercentage(85.0)
                .lastUpdated(now)
                .recentReadings(Arrays.asList(energyDataDTO2, energyDataDTO1))
                .build();
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    public void testSubmitEnergyReading() throws Exception {
        // Given
        when(energyDataService.processEnergyData(any(EnergyDataRequest.class))).thenReturn(energyDataDTO2);

        // When/Then
        mockMvc.perform(post("/monitoring/readings")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(validRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(2)))
                .andExpect(jsonPath("$.installationId", is(1)))
                .andExpect(jsonPath("$.powerGenerationWatts", is(1200.0)))
                .andExpect(jsonPath("$.powerConsumptionWatts", is(900.0)))
                .andExpect(jsonPath("$.dailyYieldKWh", is(6.0)))
                .andExpect(jsonPath("$.totalYieldKWh", is(101.0)))
                .andExpect(jsonPath("$.simulated", is(true)));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    public void testGetCustomerDashboard_AsAdmin() throws Exception {
        // Given
        when(energyDataService.getDashboardData(1L)).thenReturn(dashboardResponse);

        // When/Then
        mockMvc.perform(get("/monitoring/dashboard/customer/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.installationId", is(1)))
                .andExpect(jsonPath("$.currentPowerGenerationWatts", is(1200.0)))
                .andExpect(jsonPath("$.currentPowerConsumptionWatts", is(900.0)))
                .andExpect(jsonPath("$.todayGenerationKWh", is(6.0)))
                .andExpect(jsonPath("$.recentReadings", hasSize(2)));
    }

    @Test
    @WithMockUser(roles = "CUSTOMER")
    public void testGetCustomerDashboard_AsCustomer_Authorized() throws Exception {
        // Given
        when(securityService.isCurrentUser(1L)).thenReturn(true);
        when(energyDataService.getDashboardData(1L)).thenReturn(dashboardResponse);

        // When/Then
        mockMvc.perform(get("/monitoring/dashboard/customer/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.installationId", is(1)))
                .andExpect(jsonPath("$.currentPowerGenerationWatts", is(1200.0)));
    }

    @Test
    @WithMockUser(roles = "CUSTOMER")
    public void testGetCustomerDashboard_AsCustomer_Unauthorized() throws Exception {
        // Given
        when(securityService.isCurrentUser(1L)).thenReturn(false);

        // When/Then
        mockMvc.perform(get("/monitoring/dashboard/customer/1"))
                .andExpect(status().isInternalServerError());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    public void testGetInstallationDashboard_AsAdmin() throws Exception {
        // Given
        when(energyDataService.getInstallationDashboard(1L)).thenReturn(dashboardResponse);

        // When/Then
        mockMvc.perform(get("/monitoring/dashboard/installation/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.installationId", is(1)))
                .andExpect(jsonPath("$.currentPowerGenerationWatts", is(1200.0)));
    }

    @Test
    @WithMockUser(roles = "CUSTOMER")
    public void testGetInstallationDashboard_AsCustomer_Authorized() throws Exception {
        // Given
        when(securityService.hasAccessToInstallation(1L)).thenReturn(true);
        when(energyDataService.getInstallationDashboard(1L)).thenReturn(dashboardResponse);

        // When/Then
        mockMvc.perform(get("/monitoring/dashboard/installation/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.installationId", is(1)))
                .andExpect(jsonPath("$.currentPowerGenerationWatts", is(1200.0)));
    }

    @Test
    @WithMockUser(roles = "CUSTOMER")
    public void testGetInstallationDashboard_AsCustomer_Unauthorized() throws Exception {
        // Given
        when(securityService.hasAccessToInstallation(1L)).thenReturn(false);

        // When/Then
        mockMvc.perform(get("/monitoring/dashboard/installation/1"))
                .andExpect(status().isInternalServerError());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    public void testGetRecentReadings_AsAdmin() throws Exception {
        // Given
        List<EnergyDataDTO> readings = Arrays.asList(energyDataDTO2, energyDataDTO1);
        when(energyDataService.getRecentReadings(eq(1L), anyInt())).thenReturn(readings);

        // When/Then
        mockMvc.perform(get("/monitoring/readings/recent/1")
                .param("limit", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].id", is(2)))
                .andExpect(jsonPath("$[1].id", is(1)));
    }

    @Test
    @WithMockUser(roles = "CUSTOMER")
    public void testGetRecentReadings_AsCustomer_Authorized() throws Exception {
        // Given
        List<EnergyDataDTO> readings = Arrays.asList(energyDataDTO2, energyDataDTO1);
        when(securityService.hasAccessToInstallation(1L)).thenReturn(true);
        when(energyDataService.getRecentReadings(eq(1L), anyInt())).thenReturn(readings);

        // When/Then
        mockMvc.perform(get("/monitoring/readings/recent/1")
                .param("limit", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].id", is(2)))
                .andExpect(jsonPath("$[1].id", is(1)));
    }

    @Test
    @WithMockUser(roles = "CUSTOMER")
    public void testGetRecentReadings_AsCustomer_Unauthorized() throws Exception {
        // Given
        when(securityService.hasAccessToInstallation(1L)).thenReturn(false);

        // When/Then
        mockMvc.perform(get("/monitoring/readings/recent/1")
                .param("limit", "10"))
                .andExpect(status().isInternalServerError());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    public void testGetReadingsHistory_AsAdmin() throws Exception {
        // Given
        List<EnergyDataDTO> readings = Arrays.asList(energyDataDTO2, energyDataDTO1);
        when(energyDataService.getReadingsInDateRange(eq(1L), any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(readings);

        // When/Then
        mockMvc.perform(get("/monitoring/readings/history/1")
                .param("startDate", "2023-01-01T00:00:00")
                .param("endDate", "2023-01-02T00:00:00"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].id", is(2)))
                .andExpect(jsonPath("$[1].id", is(1)));
    }

    @Test
    @WithMockUser(roles = "CUSTOMER")
    public void testGetReadingsHistory_AsCustomer_Authorized() throws Exception {
        // Given
        List<EnergyDataDTO> readings = Arrays.asList(energyDataDTO2, energyDataDTO1);
        when(securityService.hasAccessToInstallation(1L)).thenReturn(true);
        when(energyDataService.getReadingsInDateRange(eq(1L), any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(readings);

        // When/Then
        mockMvc.perform(get("/monitoring/readings/history/1")
                .param("startDate", "2023-01-01T00:00:00")
                .param("endDate", "2023-01-02T00:00:00"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].id", is(2)))
                .andExpect(jsonPath("$[1].id", is(1)));
    }

    @Test
    @WithMockUser(roles = "CUSTOMER")
    public void testGetReadingsHistory_AsCustomer_Unauthorized() throws Exception {
        // Given
        when(securityService.hasAccessToInstallation(1L)).thenReturn(false);

        // When/Then
        mockMvc.perform(get("/monitoring/readings/history/1")
                .param("startDate", now.minusDays(7).toString())
                .param("endDate", now.toString()))
                .andExpect(status().isInternalServerError());
    }
} 