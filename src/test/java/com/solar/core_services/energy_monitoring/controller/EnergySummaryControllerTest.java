package com.solar.core_services.energy_monitoring.controller;

import com.solar.core_services.energy_monitoring.dto.EnergySummaryDTO;
import com.solar.core_services.energy_monitoring.model.EnergySummary;
import com.solar.core_services.energy_monitoring.service.EnergySummaryService;
import com.solar.core_services.energy_monitoring.service.SecurityService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Test class for EnergySummaryController
 * Source file: src/main/java/com/solar/core_services/energy_monitoring/controller/EnergySummaryController.java
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public class EnergySummaryControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private EnergySummaryService summaryService;

    @MockBean
    private SecurityService securityService;

    private EnergySummaryDTO dailySummaryDTO;
    private EnergySummaryDTO weeklySummaryDTO;
    private EnergySummaryDTO monthlySummaryDTO;
    private final LocalDate today = LocalDate.now();

    @BeforeEach
    public void setup() {
        // Create DTOs
        dailySummaryDTO = EnergySummaryDTO.builder()
                .id(1L)
                .installationId(1L)
                .date(today)
                .period(EnergySummary.SummaryPeriod.DAILY)
                .totalGenerationKWh(25.0)
                .totalConsumptionKWh(18.0)
                .peakGenerationWatts(2500.0)
                .peakConsumptionWatts(1800.0)
                .efficiencyPercentage(85.0)
                .readingsCount(24)
                .periodStart(today)
                .periodEnd(today)
                .build();

        weeklySummaryDTO = EnergySummaryDTO.builder()
                .id(2L)
                .installationId(1L)
                .date(today)
                .period(EnergySummary.SummaryPeriod.WEEKLY)
                .totalGenerationKWh(150.0)
                .totalConsumptionKWh(110.0)
                .peakGenerationWatts(3200.0)
                .peakConsumptionWatts(2600.0)
                .efficiencyPercentage(80.0)
                .readingsCount(168)
                .periodStart(today.minusDays(6))
                .periodEnd(today)
                .build();

        monthlySummaryDTO = EnergySummaryDTO.builder()
                .id(3L)
                .installationId(1L)
                .date(today)
                .period(EnergySummary.SummaryPeriod.MONTHLY)
                .totalGenerationKWh(600.0)
                .totalConsumptionKWh(450.0)
                .peakGenerationWatts(3500.0)
                .peakConsumptionWatts(2800.0)
                .efficiencyPercentage(75.0)
                .readingsCount(720)
                .periodStart(today.minusDays(29))
                .periodEnd(today)
                .build();
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    public void testGetDailySummaries_AsAdmin() throws Exception {
        // Given
        List<EnergySummaryDTO> summaries = Collections.singletonList(dailySummaryDTO);
        when(summaryService.getSummariesByPeriod(1L, EnergySummary.SummaryPeriod.DAILY)).thenReturn(summaries);

        // When/Then
        mockMvc.perform(get("/monitoring/summaries/1/daily"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].id", is(1)))
                .andExpect(jsonPath("$[0].installationId", is(1)))
                .andExpect(jsonPath("$[0].period", is("DAILY")))
                .andExpect(jsonPath("$[0].totalGenerationKWh", is(25.0)))
                .andExpect(jsonPath("$[0].totalConsumptionKWh", is(18.0)));
    }

    @Test
    @WithMockUser(roles = "CUSTOMER")
    public void testGetDailySummaries_AsCustomer_Authorized() throws Exception {
        // Given
        List<EnergySummaryDTO> summaries = Collections.singletonList(dailySummaryDTO);
        when(securityService.hasAccessToInstallation(1L)).thenReturn(true);
        when(summaryService.getSummariesByPeriod(1L, EnergySummary.SummaryPeriod.DAILY)).thenReturn(summaries);

        // When/Then
        mockMvc.perform(get("/monitoring/summaries/1/daily"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].id", is(1)))
                .andExpect(jsonPath("$[0].period", is("DAILY")));
    }

    @Test
    @WithMockUser(roles = "CUSTOMER")
    public void testGetDailySummaries_AsCustomer_Unauthorized() throws Exception {
        // Given
        when(securityService.hasAccessToInstallation(1L)).thenReturn(false);

        // When/Then
        mockMvc.perform(get("/monitoring/summaries/1/daily"))
                .andExpect(status().isForbidden()); // Updated to expect 403 Forbidden instead of 500
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    public void testGetWeeklySummaries_AsAdmin() throws Exception {
        // Given
        List<EnergySummaryDTO> summaries = Collections.singletonList(weeklySummaryDTO);
        when(summaryService.getSummariesByPeriod(1L, EnergySummary.SummaryPeriod.WEEKLY)).thenReturn(summaries);

        // When/Then
        mockMvc.perform(get("/monitoring/summaries/1/weekly"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].id", is(2)))
                .andExpect(jsonPath("$[0].period", is("WEEKLY")))
                .andExpect(jsonPath("$[0].totalGenerationKWh", is(150.0)));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    public void testGetMonthlySummaries_AsAdmin() throws Exception {
        // Given
        List<EnergySummaryDTO> summaries = Collections.singletonList(monthlySummaryDTO);
        when(summaryService.getSummariesByPeriod(1L, EnergySummary.SummaryPeriod.MONTHLY)).thenReturn(summaries);

        // When/Then
        mockMvc.perform(get("/monitoring/summaries/1/monthly"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].id", is(3)))
                .andExpect(jsonPath("$[0].period", is("MONTHLY")))
                .andExpect(jsonPath("$[0].totalGenerationKWh", is(600.0)));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    public void testGetSummariesByPeriodAndDateRange() throws Exception {
        // Given
        List<EnergySummaryDTO> summaries = Collections.singletonList(dailySummaryDTO);
        when(summaryService.getSummariesByPeriodAndDateRange(
                eq(1L), 
                eq(EnergySummary.SummaryPeriod.DAILY), 
                any(LocalDate.class), 
                any(LocalDate.class)))
                .thenReturn(summaries);

        // When/Then
        mockMvc.perform(get("/monitoring/summaries/1/DAILY")
                .param("startDate", today.minusDays(7).toString())
                .param("endDate", today.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].id", is(1)))
                .andExpect(jsonPath("$[0].period", is("DAILY")));
    }

    @Test
    @WithMockUser(roles = "CUSTOMER")
    public void testGetSummariesByPeriodAndDateRange_AsCustomer_Authorized() throws Exception {
        // Given
        List<EnergySummaryDTO> summaries = Collections.singletonList(dailySummaryDTO);
        when(securityService.hasAccessToInstallation(1L)).thenReturn(true);
        when(summaryService.getSummariesByPeriodAndDateRange(
                eq(1L), 
                eq(EnergySummary.SummaryPeriod.DAILY), 
                any(LocalDate.class), 
                any(LocalDate.class)))
                .thenReturn(summaries);

        // When/Then
        mockMvc.perform(get("/monitoring/summaries/1/DAILY")
                .param("startDate", today.minusDays(7).toString())
                .param("endDate", today.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].id", is(1)))
                .andExpect(jsonPath("$[0].period", is("DAILY")));
    }

    @Test
    @WithMockUser(roles = "CUSTOMER")
    public void testGetSummariesByPeriodAndDateRange_AsCustomer_Unauthorized() throws Exception {
        // Given
        when(securityService.hasAccessToInstallation(1L)).thenReturn(false);

        // When/Then
        mockMvc.perform(get("/monitoring/summaries/1/DAILY")
                .param("startDate", today.minusDays(7).toString())
                .param("endDate", today.toString()))
                .andExpect(status().isForbidden()); // Updated to expect 403 Forbidden instead of 500
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    public void testGenerateDailySummary() throws Exception {
        // Given
        when(summaryService.generateDailySummary(eq(1L), any(LocalDate.class))).thenReturn(dailySummaryDTO);

        // When/Then
        mockMvc.perform(post("/monitoring/summaries/1/generate/daily")
                .with(csrf())
                .param("date", today.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(1)))
                .andExpect(jsonPath("$.installationId", is(1)))
                .andExpect(jsonPath("$.period", is("DAILY")))
                .andExpect(jsonPath("$.totalGenerationKWh", is(25.0)));
    }

    @Test
    @WithMockUser(roles = "CUSTOMER")
    public void testGenerateDailySummary_Unauthorized() throws Exception {
        // Given
        when(securityService.hasAccessToInstallation(1L)).thenReturn(false);

        // When/Then
        mockMvc.perform(post("/monitoring/summaries/1/generate/daily")
                .with(csrf())
                .param("date", today.toString()))
                .andExpect(status().isForbidden()); // Updated to expect 403 Forbidden instead of 500
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    public void testGenerateWeeklySummary() throws Exception {
        // Given
        when(summaryService.generateWeeklySummary(eq(1L), any(LocalDate.class))).thenReturn(weeklySummaryDTO);

        // When/Then
        mockMvc.perform(post("/monitoring/summaries/1/generate/weekly")
                .with(csrf())
                .param("weekStartDate", today.minusDays(6).toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(2)))
                .andExpect(jsonPath("$.installationId", is(1)))
                .andExpect(jsonPath("$.period", is("WEEKLY")))
                .andExpect(jsonPath("$.totalGenerationKWh", is(150.0)));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    public void testGenerateMonthlySummary() throws Exception {
        // Given
        when(summaryService.generateMonthlySummary(eq(1L), any(LocalDate.class))).thenReturn(monthlySummaryDTO);

        // When/Then
        mockMvc.perform(post("/monitoring/summaries/1/generate/monthly")
                .with(csrf())
                .param("monthStartDate", today.minusDays(29).toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(3)))
                .andExpect(jsonPath("$.installationId", is(1)))
                .andExpect(jsonPath("$.period", is("MONTHLY")))
                .andExpect(jsonPath("$.totalGenerationKWh", is(600.0)));
    }
}