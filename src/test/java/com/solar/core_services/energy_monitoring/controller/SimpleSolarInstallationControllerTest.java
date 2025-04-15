package com.solar.core_services.energy_monitoring.controller;

import com.solar.SolarApplication;
import com.solar.core_services.energy_monitoring.service.SolarInstallationService;
import com.solar.core_services.energy_monitoring.service.SecurityService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * A simplified test class for SolarInstallationController using @SpringBootTest
 * to verify if the application context can be loaded properly.
 */
@SpringBootTest(classes = SolarApplication.class)
@AutoConfigureMockMvc
@Import(TestSecurityConfig.class)
@ActiveProfiles("test")
public class SimpleSolarInstallationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private SolarInstallationService installationService;

    @MockBean
    private SecurityService securityService;

    @Test
    @WithMockUser(roles = "ADMIN")
    public void testSimpleEndpoint() throws Exception {
        // A simple test to verify if the application context loads
        mockMvc.perform(get("/monitoring/installations/overview"))
                .andExpect(status().isOk());
    }
} 