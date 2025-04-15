package com.solar.core_services.energy_monitoring.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.solar.SolarApplication;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.ContextConfiguration;

/**
 * Base configuration for controller tests.
 * This configuration imports the TestSecurityConfig and configures the test environment.
 * It can be used as a base class for controller tests or imported using @Import annotation.
 */
@SpringBootTest(classes = SolarApplication.class)
@AutoConfigureMockMvc
@Import(TestSecurityConfig.class)
@ActiveProfiles("test")
@ContextConfiguration
public class ControllerTestConfig {
    
    public static final ObjectMapper objectMapper = new ObjectMapper();
    
} 