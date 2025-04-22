package com.solar.core_services.energy_monitoring.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.solar.SolarApplication;
import com.solar.core_services.energy_monitoring.dto.DeviceStatusRequest;
import com.solar.core_services.energy_monitoring.dto.SolarInstallationDTO;
import com.solar.core_services.energy_monitoring.dto.SystemOverviewResponse;
import com.solar.core_services.energy_monitoring.model.SolarInstallation;
import com.solar.core_services.energy_monitoring.service.SolarInstallationService;
import com.solar.core_services.energy_monitoring.service.SecurityService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Test class for SolarInstallationController
 * Source file:
 * src/main/java/com/solar/core_services/energy_monitoring/controller/SolarInstallationController.java
 */
@SpringBootTest(classes = SolarApplication.class)
@AutoConfigureMockMvc
@Import(TestSecurityConfig.class)
@ActiveProfiles("test")
public class SolarInstallationControllerTest {

        @Autowired
        private MockMvc mockMvc;

        @Autowired
        private ObjectMapper objectMapper;

        @MockBean
        private SolarInstallationService installationService;

        @MockBean
        private SecurityService securityService;

        private SolarInstallationDTO installationDTO1;
        private SolarInstallationDTO installationDTO2;
        private DeviceStatusRequest deviceStatusRequest;
        private SystemOverviewResponse systemOverviewResponse;
        private LocalDateTime now = LocalDateTime.now();

        @BeforeEach
        public void setup() {
                // Create installation DTOs
                installationDTO1 = SolarInstallationDTO.builder()
                                .id(1L)
                                .userId(1L)
                                .username("Customer 1")
                                .name("Installation 1") // Added name field
                                .installedCapacityKW(5.0)
                                .location("Location 1")
                                .installationDate(now.minusDays(30))
                                .status(SolarInstallation.InstallationStatus.ACTIVE)
                                .tamperDetected(false)
                                .lastTamperCheck(now)
                                .build();

                installationDTO2 = SolarInstallationDTO.builder()
                                .id(2L)
                                .userId(2L)
                                .username("Customer 2")
                                .name("Installation 2") // Added name field
                                .installedCapacityKW(3.0)
                                .location("Location 2")
                                .installationDate(now.minusDays(20))
                                .status(SolarInstallation.InstallationStatus.MAINTENANCE)
                                .tamperDetected(true)
                                .lastTamperCheck(now)
                                .build();

                // Create device status request
                deviceStatusRequest = DeviceStatusRequest.builder()
                                .installationId(1L)
                                .deviceToken("valid-token")
                                .batteryLevel(90.0)
                                .tamperDetected(false)
                                .firmwareVersion("1.0.0")
                                .connectionStatus("CONNECTED")
                                .build();

                // Create system overview response
                systemOverviewResponse = SystemOverviewResponse.builder()
                                .totalActiveInstallations(2)
                                .totalSuspendedInstallations(1)
                                .totalInstallationsWithTamperAlerts(1)
                                .totalSystemCapacityKW(8.0)
                                .currentSystemGenerationWatts(5000.0)
                                .todayTotalGenerationKWh(25.0)
                                .todayTotalConsumptionKWh(20.0)
                                .monthToDateGenerationKWh(750.0)
                                .monthToDateConsumptionKWh(600.0)
                                .yearToDateGenerationKWh(9000.0)
                                .yearToDateConsumptionKWh(7500.0)
                                .averageSystemEfficiency(0.85)
                                .lastUpdated(now)
                                .recentlyActiveInstallations(Arrays.asList(installationDTO1, installationDTO2))
                                .build();
        }

        @Test
        @WithMockUser(roles = "ADMIN")
        public void testGetCustomerInstallations_AsAdmin() throws Exception {
                // Given
                List<SolarInstallationDTO> installations = Arrays.asList(installationDTO1, installationDTO2);
                when(installationService.getInstallationsByCustomer(1L)).thenReturn(installations);

                // When/Then
                mockMvc.perform(get("/monitoring/installations/customer/1"))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$", hasSize(2)))
                                .andExpect(jsonPath("$[0].id", is(1)))
                                .andExpect(jsonPath("$[1].id", is(2)));
        }

        @Test
        @WithMockUser(roles = "CUSTOMER")
        public void testGetCustomerInstallations_AsCustomer_Authorized() throws Exception {
                // Given
                List<SolarInstallationDTO> installations = Arrays.asList(installationDTO1, installationDTO2);
                when(securityService.isCurrentUser(1L)).thenReturn(true);
                when(installationService.getInstallationsByCustomer(1L)).thenReturn(installations);

                // When/Then
                mockMvc.perform(get("/monitoring/installations/customer/1"))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$", hasSize(2)))
                                .andExpect(jsonPath("$[0].id", is(1)))
                                .andExpect(jsonPath("$[1].id", is(2)));
        }

        @Test
        @WithMockUser(roles = "CUSTOMER")
        public void testGetCustomerInstallations_AsCustomer_Unauthorized() throws Exception {
                // Given
                when(securityService.isCurrentUser(1L)).thenReturn(false);

                // When/Then
                mockMvc.perform(get("/monitoring/installations/customer/1"))
                                .andExpect(status().is5xxServerError());
        }

        @Test
        @WithMockUser(roles = "ADMIN")
        public void testGetInstallationDetails_AsAdmin() throws Exception {
                // Given
                when(installationService.getInstallationById(1L)).thenReturn(installationDTO1);

                // When/Then
                mockMvc.perform(get("/monitoring/installations/1"))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.id", is(1)))
                                .andExpect(jsonPath("$.userId", is(1)))
                                .andExpect(jsonPath("$.installedCapacityKW", is(5.0)))
                                .andExpect(jsonPath("$.location", is("Location 1")))
                                .andExpect(jsonPath("$.status", is("ACTIVE")))
                                .andExpect(jsonPath("$.tamperDetected", is(false)));
        }

        @Test
        @WithMockUser(roles = "CUSTOMER")
        public void testGetInstallationDetails_AsCustomer_Authorized() throws Exception {
                // Given
                when(securityService.hasAccessToInstallation(1L)).thenReturn(true);
                when(installationService.getInstallationById(1L)).thenReturn(installationDTO1);

                // When/Then
                mockMvc.perform(get("/monitoring/installations/1"))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.id", is(1)))
                                .andExpect(jsonPath("$.userId", is(1)))
                                .andExpect(jsonPath("$.installedCapacityKW", is(5.0)));
        }

        @Test
        @WithMockUser(roles = "CUSTOMER")
        public void testGetInstallationDetails_AsCustomer_Unauthorized() throws Exception {
                // Given
                when(securityService.hasAccessToInstallation(1L)).thenReturn(false);

                // When/Then
                mockMvc.perform(get("/monitoring/installations/1"))
                                .andExpect(status().is5xxServerError());
        }

        @Test
        @WithMockUser(roles = "ADMIN")
        public void testCreateInstallation() throws Exception {
                // Given
                SolarInstallationDTO newInstallationDTO = SolarInstallationDTO.builder()
                                .userId(1L)
                                .name("New Test Installation") // Added name field
                                .installedCapacityKW(4.0)
                                .location("New Location")
                                .installationDate(now)
                                .status(SolarInstallation.InstallationStatus.ACTIVE)
                                .build();

                SolarInstallationDTO createdInstallationDTO = SolarInstallationDTO.builder()
                                .id(3L)
                                .userId(1L)
                                .username("Customer 1")
                                .name("New Test Installation") // Added name field
                                .installedCapacityKW(4.0)
                                .location("New Location")
                                .installationDate(now)
                                .status(SolarInstallation.InstallationStatus.ACTIVE)
                                .tamperDetected(false)
                                .lastTamperCheck(now)
                                .build();

                when(installationService.createInstallation(any(SolarInstallationDTO.class)))
                                .thenReturn(createdInstallationDTO);

                // When/Then
                mockMvc.perform(post("/monitoring/installations")
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(newInstallationDTO)))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.id", is(3)))
                                .andExpect(jsonPath("$.userId", is(1)))
                                .andExpect(jsonPath("$.name", is("New Test Installation"))) // Added assertion for name
                                .andExpect(jsonPath("$.installedCapacityKW", is(4.0)))
                                .andExpect(jsonPath("$.location", is("New Location")))
                                .andExpect(jsonPath("$.status", is("ACTIVE")));
        }

        @Test
        @WithMockUser(roles = "CUSTOMER")
        public void testCreateInstallation_Unauthorized() throws Exception {
                // Given
                SolarInstallationDTO newInstallationDTO = SolarInstallationDTO.builder()
                                .userId(1L)
                                .name("New Test Installation") // Added name field
                                .installedCapacityKW(4.0)
                                .location("New Location")
                                .installationDate(now)
                                .status(SolarInstallation.InstallationStatus.ACTIVE)
                                .build();

                // When/Then
                mockMvc.perform(post("/monitoring/installations")
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(newInstallationDTO)))
                                .andExpect(status().is5xxServerError());
        }

        @Test
        @WithMockUser(roles = "ADMIN")
        public void testUpdateInstallation() throws Exception {
                // Given
                SolarInstallationDTO updateDTO = SolarInstallationDTO.builder()
                                .id(1L)
                                .userId(1L)
                                .name("Updated Installation Name") // Added name field
                                .installedCapacityKW(6.0)
                                .location("Updated Location")
                                .installationDate(now.minusDays(30))
                                .status(SolarInstallation.InstallationStatus.ACTIVE)
                                .build();

                SolarInstallationDTO updatedDTO = SolarInstallationDTO.builder()
                                .id(1L)
                                .userId(1L)
                                .username("Customer 1")
                                .name("Updated Installation Name") // Added name field
                                .installedCapacityKW(6.0)
                                .location("Updated Location")
                                .installationDate(now.minusDays(30))
                                .status(SolarInstallation.InstallationStatus.ACTIVE)
                                .tamperDetected(false)
                                .lastTamperCheck(now.minusDays(1))
                                .build();

                when(installationService.updateInstallation(eq(1L), any(SolarInstallationDTO.class)))
                                .thenReturn(updatedDTO);

                // When/Then
                mockMvc.perform(put("/monitoring/installations/1")
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(updateDTO)))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.id", is(1)))
                                .andExpect(jsonPath("$.userId", is(1)))
                                .andExpect(jsonPath("$.name", is("Updated Installation Name"))) // Added assertion for
                                                                                                // name
                                .andExpect(jsonPath("$.installedCapacityKW", is(6.0)))
                                .andExpect(jsonPath("$.location", is("Updated Location")));
        }

        @Test
        @WithMockUser(roles = "CUSTOMER")
        public void testUpdateInstallation_Unauthorized() throws Exception {
                // Given
                SolarInstallationDTO updateDTO = SolarInstallationDTO.builder()
                                .id(1L)
                                .userId(1L)
                                .name("Updated Installation Name") // Added name field
                                .installedCapacityKW(6.0)
                                .location("Updated Location")
                                .installationDate(now.minusDays(30))
                                .status(SolarInstallation.InstallationStatus.ACTIVE)
                                .build();

                // When/Then
                mockMvc.perform(put("/monitoring/installations/1")
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(updateDTO)))
                                .andExpect(status().is5xxServerError());
        }

        @Test
        public void testUpdateDeviceStatus() throws Exception {
                // Given
                when(installationService.updateDeviceStatus(any(DeviceStatusRequest.class)))
                                .thenReturn(installationDTO1);

                // When/Then
                mockMvc.perform(post("/monitoring/installations/device-status")
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(deviceStatusRequest)))
                                .andExpect(status().isUnauthorized());
        }

        @Test
        @WithMockUser(roles = "ADMIN")
        public void testGetSystemOverview() throws Exception {
                // Given
                when(installationService.getSystemOverview()).thenReturn(systemOverviewResponse);

                // When/Then
                mockMvc.perform(get("/monitoring/installations/overview"))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.totalActiveInstallations", is(2)))
                                .andExpect(jsonPath("$.totalInstallationsWithTamperAlerts", is(1)))
                                .andExpect(jsonPath("$.totalSystemCapacityKW", is(8.0)))
                                .andExpect(jsonPath("$.currentSystemGenerationWatts", is(5000.0)))
                                .andExpect(jsonPath("$.recentlyActiveInstallations", hasSize(2)));
        }

        @Test
        @WithMockUser(roles = "CUSTOMER")
        public void testGetSystemOverview_Unauthorized() throws Exception {
                // When/Then
                mockMvc.perform(get("/monitoring/installations/overview"))
                                .andExpect(status().is5xxServerError());
        }

        @Test
        @WithMockUser(roles = "ADMIN")
        public void testGetTamperAlerts() throws Exception {
                // Given
                List<SolarInstallationDTO> tamperAlerts = Collections.singletonList(installationDTO2);
                when(installationService.getInstallationsWithTamperAlerts()).thenReturn(tamperAlerts);

                // When/Then
                mockMvc.perform(get("/monitoring/installations/tamper-alerts"))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$", hasSize(1)))
                                .andExpect(jsonPath("$[0].id", is(2)))
                                .andExpect(jsonPath("$[0].tamperDetected", is(true)));
        }

        @Test
        @WithMockUser(roles = "CUSTOMER")
        public void testGetTamperAlerts_Unauthorized() throws Exception {
                // When/Then
                mockMvc.perform(get("/monitoring/installations/tamper-alerts"))
                                .andExpect(status().is5xxServerError());
        }
}