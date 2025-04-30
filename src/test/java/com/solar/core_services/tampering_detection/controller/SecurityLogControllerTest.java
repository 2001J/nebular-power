package com.solar.core_services.tampering_detection.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.solar.core_services.energy_monitoring.model.SolarInstallation;
import com.solar.core_services.energy_monitoring.repository.SolarInstallationRepository;
import com.solar.core_services.tampering_detection.dto.SecurityLogDTO;
import com.solar.core_services.tampering_detection.model.SecurityLog;
import com.solar.core_services.tampering_detection.service.SecurityLogService;
import com.solar.user_management.model.User;
import com.solar.user_management.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Test class for SecurityLogController
 * Source file: src/main/java/com/solar/core_services/tampering_detection/controller/SecurityLogController.java
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@ExtendWith(MockitoExtension.class)
public class SecurityLogControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private SecurityLogService securityLogService;

    @MockBean
    private UserService userService;

    @MockBean
    private SolarInstallationRepository installationRepository;

    @MockBean
    private com.solar.core_services.tampering_detection.repository.SecurityLogRepository securityLogRepository;

    private final Long installationId = 1L;
    private SecurityLogDTO testSecurityLogDTO;
    private List<SecurityLogDTO> testSecurityLogDTOList;
    private Page<SecurityLogDTO> testSecurityLogDTOPage;
    private User testUser;
    private SolarInstallation testInstallation;

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setId(1L);
        testUser.setEmail("test@example.com");
        
        testInstallation = new SolarInstallation();
        testInstallation.setId(installationId);
        testInstallation.setUser(testUser);
        
        // Set up test security log DTO
        testSecurityLogDTO = new SecurityLogDTO();
        testSecurityLogDTO.setId(1L);
        testSecurityLogDTO.setInstallationId(installationId);
        testSecurityLogDTO.setInstallationLocation("Test Location");
        testSecurityLogDTO.setActivityType("ALERT_GENERATED");
        testSecurityLogDTO.setDetails("Test security log details");
        testSecurityLogDTO.setTimestamp(LocalDateTime.now());
        testSecurityLogDTO.setIpAddress("192.168.1.1");
        testSecurityLogDTO.setLocation("Server Room");
        
        // Create a list of security log DTOs
        testSecurityLogDTOList = List.of(testSecurityLogDTO);
        
        // Create a page of security log DTOs
        testSecurityLogDTOPage = new PageImpl<>(testSecurityLogDTOList);
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("Should get security logs by installation ID")
    void shouldGetSecurityLogsByInstallationId() throws Exception {
        // Arrange
        // Create a properly populated non-empty page of security logs with minimal mocking
        Page<SecurityLog> mockSecurityLogsPage = mock(Page.class);
        
        // Set up only the mocks that are actually used by the controller
        when(installationRepository.findById(installationId))
            .thenReturn(java.util.Optional.of(testInstallation));
        when(securityLogRepository.findByInstallationOrderByTimestampDesc(eq(testInstallation), any(Pageable.class)))
            .thenReturn(mockSecurityLogsPage);
        
        // Page needs to map to our DTO - this is the only mock behavior we need for the page
        when(mockSecurityLogsPage.map(any())).thenAnswer(invocation -> {
            // Create a new page with our DTO
            return new PageImpl<>(List.of(testSecurityLogDTO));
        });

        // Act & Assert
        mockMvc.perform(get("/api/security/admin/installations/{installationId}/audit", installationId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray())
                .andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.content[0].id").value(testSecurityLogDTO.getId()))
                .andExpect(jsonPath("$.content[0].installationId").value(testSecurityLogDTO.getInstallationId()))
                .andExpect(jsonPath("$.content[0].activityType").value(testSecurityLogDTO.getActivityType()));

        // Verify the repository interaction
        verify(installationRepository).findById(installationId);
        verify(securityLogRepository).findByInstallationOrderByTimestampDesc(eq(testInstallation), any(Pageable.class));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("Should get security logs by installation ID and activity type")
    void shouldGetSecurityLogsByInstallationAndActivityType() throws Exception {
        // Arrange
        SecurityLog.ActivityType activityType = SecurityLog.ActivityType.ALERT_GENERATED;
        when(securityLogService.getSecurityLogsByInstallationAndActivityType(installationId, activityType))
            .thenReturn(testSecurityLogDTOList);

        // Act & Assert
        mockMvc.perform(get("/api/security/admin/installations/{installationId}/audit/activity-type", installationId)
                .param("activityType", activityType.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(testSecurityLogDTO.getId()))
                .andExpect(jsonPath("$[0].installationId").value(testSecurityLogDTO.getInstallationId()))
                .andExpect(jsonPath("$[0].activityType").value(testSecurityLogDTO.getActivityType()));

        verify(securityLogService).getSecurityLogsByInstallationAndActivityType(installationId, activityType);
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("Should get security logs by installation ID and time range")
    void shouldGetSecurityLogsByInstallationAndTimeRange() throws Exception {
        // Arrange
        LocalDateTime startTime = LocalDateTime.now().minusDays(7);
        LocalDateTime endTime = LocalDateTime.now();
        when(securityLogService.getSecurityLogsByInstallationAndTimeRange(eq(installationId), any(LocalDateTime.class), any(LocalDateTime.class)))
            .thenReturn(testSecurityLogDTOList);
        when(installationRepository.findById(installationId))
            .thenReturn(java.util.Optional.of(testInstallation));

        // Act & Assert
        mockMvc.perform(get("/api/security/admin/installations/{installationId}/audit/time-range", installationId)
                .param("startTime", startTime.toString())
                .param("endTime", endTime.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(testSecurityLogDTO.getId()))
                .andExpect(jsonPath("$[0].installationId").value(testSecurityLogDTO.getInstallationId()))
                .andExpect(jsonPath("$[0].activityType").value(testSecurityLogDTO.getActivityType()));

        verify(securityLogService).getSecurityLogsByInstallationAndTimeRange(eq(installationId), any(LocalDateTime.class), any(LocalDateTime.class));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("Should get security logs by activity type")
    void shouldGetSecurityLogsByActivityType() throws Exception {
        // Arrange
        SecurityLog.ActivityType activityType = SecurityLog.ActivityType.ALERT_GENERATED;
        when(securityLogService.getSecurityLogsByActivityType(eq(activityType), any(Pageable.class)))
            .thenReturn(testSecurityLogDTOPage);

        // Act & Assert
        mockMvc.perform(get("/api/security/admin/audit")
                .param("activityType", activityType.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value(testSecurityLogDTO.getId()))
                .andExpect(jsonPath("$.content[0].installationId").value(testSecurityLogDTO.getInstallationId()))
                .andExpect(jsonPath("$.content[0].activityType").value(testSecurityLogDTO.getActivityType()));

        verify(securityLogService).getSecurityLogsByActivityType(eq(activityType), any(Pageable.class));
    }

    @Test
    @WithMockUser(roles = "CUSTOMER")
    @DisplayName("Should get security logs by current user")
    void shouldGetSecurityLogsByCurrentUser() throws Exception {
        // Arrange
        when(userService.getCurrentUser()).thenReturn(testUser);
        when(installationRepository.findByUser(testUser)).thenReturn(Collections.singletonList(testInstallation));
        when(securityLogService.getSecurityLogsByInstallationIds(anyList(), any(Pageable.class)))
            .thenReturn(testSecurityLogDTOPage);

        // Act & Assert
        mockMvc.perform(get("/api/security/audit"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value(testSecurityLogDTO.getId()))
                .andExpect(jsonPath("$.content[0].installationId").value(testSecurityLogDTO.getInstallationId()))
                .andExpect(jsonPath("$.content[0].activityType").value(testSecurityLogDTO.getActivityType()));

        verify(userService).getCurrentUser();
        verify(installationRepository).findByUser(testUser);
        verify(securityLogService).getSecurityLogsByInstallationIds(anyList(), any(Pageable.class));
    }
    
    @Test
    @WithMockUser(roles = "CUSTOMER")
    @DisplayName("Should return empty page when user has no installations")
    void shouldReturnEmptyPageWhenUserHasNoInstallations() throws Exception {
        // Arrange
        when(userService.getCurrentUser()).thenReturn(testUser);
        when(installationRepository.findByUser(testUser)).thenReturn(List.of());

        // Act & Assert
        mockMvc.perform(get("/api/security/audit"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isEmpty());

        verify(userService).getCurrentUser();
        verify(installationRepository).findByUser(testUser);
        verifyNoInteractions(securityLogService);
    }
}