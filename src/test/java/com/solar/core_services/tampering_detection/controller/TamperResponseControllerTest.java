package com.solar.core_services.tampering_detection.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.solar.core_services.energy_monitoring.model.SolarInstallation;
import com.solar.core_services.energy_monitoring.repository.SolarInstallationRepository;
import com.solar.core_services.tampering_detection.dto.TamperResponseDTO;
import com.solar.core_services.tampering_detection.model.TamperEvent;
import com.solar.core_services.tampering_detection.model.TamperResponse;
import com.solar.core_services.tampering_detection.service.TamperResponseService;
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
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Test class for TamperResponseController
 * Source file: src/main/java/com/solar/core_services/tampering_detection/controller/TamperResponseController.java
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@ExtendWith(MockitoExtension.class)
public class TamperResponseControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private TamperResponseService tamperResponseService;

    @MockBean
    private UserService userService;

    @MockBean
    private SolarInstallationRepository installationRepository;

    private Long installationId = 1L;
    private Long tamperEventId = 1L;
    private Long tamperResponseId = 1L;
    private TamperResponseDTO testResponseDTO;
    private List<TamperResponseDTO> testResponseDTOList;
    private Page<TamperResponseDTO> testResponseDTOPage;
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
        
        // Set up test tamper response DTO
        testResponseDTO = new TamperResponseDTO();
        testResponseDTO.setId(tamperResponseId);
        testResponseDTO.setTamperEventId(tamperEventId);
        testResponseDTO.setResponseType(TamperResponse.ResponseType.MANUAL_INTERVENTION);
        testResponseDTO.setExecutedAt(LocalDateTime.now());
        testResponseDTO.setSuccess(true);
        testResponseDTO.setFailureReason(null);
        testResponseDTO.setExecutedBy("admin");
        testResponseDTO.setResponseDetails("Test response description");
        
        // Create a list of response DTOs
        testResponseDTOList = Arrays.asList(testResponseDTO);
        
        // Create a page of response DTOs
        testResponseDTOPage = new PageImpl<>(testResponseDTOList);
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("Should create a tamper response")
    void shouldCreateTamperResponse() throws Exception {
        // Arrange
        TamperResponse.ResponseType responseType = TamperResponse.ResponseType.MANUAL_INTERVENTION;
        String executedBy = "admin";
        String responseDetails = "Test response description";
        
        when(tamperResponseService.createTamperResponse(eq(tamperEventId), eq(responseType), eq(executedBy), eq(responseDetails)))
            .thenReturn(testResponseDTO);

        // Act & Assert
        mockMvc.perform(post("/api/security/responses/events/{tamperEventId}", tamperEventId)
                .param("responseType", responseType.toString())
                .param("executedBy", executedBy)
                .param("responseDetails", responseDetails))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(testResponseDTO.getId()))
                .andExpect(jsonPath("$.tamperEventId").value(testResponseDTO.getTamperEventId()))
                .andExpect(jsonPath("$.responseType").value(testResponseDTO.getResponseType().toString()));

        verify(tamperResponseService).createTamperResponse(eq(tamperEventId), eq(responseType), eq(executedBy), eq(responseDetails));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("Should get tamper response by ID")
    void shouldGetTamperResponseById() throws Exception {
        // Arrange
        when(tamperResponseService.getTamperResponseById(tamperResponseId))
            .thenReturn(testResponseDTO);

        // Act & Assert
        mockMvc.perform(get("/api/security/responses/{id}", tamperResponseId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(testResponseDTO.getId()))
                .andExpect(jsonPath("$.tamperEventId").value(testResponseDTO.getTamperEventId()))
                .andExpect(jsonPath("$.responseType").value(testResponseDTO.getResponseType().toString()));

        verify(tamperResponseService).getTamperResponseById(tamperResponseId);
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("Should get tamper responses by event ID")
    void shouldGetTamperResponsesByEventId() throws Exception {
        // Arrange
        when(tamperResponseService.getTamperResponsesByTamperEventId(tamperEventId))
            .thenReturn(testResponseDTOList);

        // Act & Assert
        mockMvc.perform(get("/api/security/responses/events/{tamperEventId}", tamperEventId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(testResponseDTO.getId()))
                .andExpect(jsonPath("$[0].tamperEventId").value(testResponseDTO.getTamperEventId()))
                .andExpect(jsonPath("$[0].responseType").value(testResponseDTO.getResponseType().toString()));

        verify(tamperResponseService).getTamperResponsesByTamperEventId(tamperEventId);
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("Should get tamper responses by installation ID")
    void shouldGetTamperResponsesByInstallationId() throws Exception {
        // Arrange
        when(tamperResponseService.getTamperResponsesByInstallationId(eq(installationId), any(Pageable.class)))
            .thenReturn(testResponseDTOPage);

        // Act & Assert
        mockMvc.perform(get("/api/security/responses/installations/{installationId}", installationId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value(testResponseDTO.getId()))
                .andExpect(jsonPath("$.content[0].tamperEventId").value(testResponseDTO.getTamperEventId()))
                .andExpect(jsonPath("$.content[0].responseType").value(testResponseDTO.getResponseType().toString()));

        verify(tamperResponseService).getTamperResponsesByInstallationId(eq(installationId), any(Pageable.class));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("Should get tamper responses by event ID and type")
    void shouldGetTamperResponsesByEventIdAndType() throws Exception {
        // Arrange
        TamperResponse.ResponseType responseType = TamperResponse.ResponseType.MANUAL_INTERVENTION;
        when(tamperResponseService.getTamperResponsesByEventIdAndType(eq(tamperEventId), eq(responseType)))
            .thenReturn(testResponseDTOList);

        // Act & Assert
        mockMvc.perform(get("/api/security/responses/events/{tamperEventId}/type/{responseType}", tamperEventId, responseType))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(testResponseDTO.getId()))
                .andExpect(jsonPath("$[0].tamperEventId").value(testResponseDTO.getTamperEventId()))
                .andExpect(jsonPath("$[0].responseType").value(testResponseDTO.getResponseType().toString()));

        verify(tamperResponseService).getTamperResponsesByEventIdAndType(eq(tamperEventId), eq(responseType));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("Should get tamper responses by time range")
    void shouldGetTamperResponsesByTimeRange() throws Exception {
        // Arrange
        LocalDateTime start = LocalDateTime.now().minusDays(7);
        LocalDateTime end = LocalDateTime.now();
        when(tamperResponseService.getTamperResponsesByTimeRange(any(LocalDateTime.class), any(LocalDateTime.class)))
            .thenReturn(testResponseDTOList);

        // Act & Assert
        mockMvc.perform(get("/api/security/responses/time-range")
                .param("start", start.toString())
                .param("end", end.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(testResponseDTO.getId()))
                .andExpect(jsonPath("$[0].tamperEventId").value(testResponseDTO.getTamperEventId()))
                .andExpect(jsonPath("$[0].responseType").value(testResponseDTO.getResponseType().toString()));

        verify(tamperResponseService).getTamperResponsesByTimeRange(any(LocalDateTime.class), any(LocalDateTime.class));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("Should execute automatic response")
    void shouldExecuteAutomaticResponse() throws Exception {
        // Arrange
        doNothing().when(tamperResponseService).executeAutomaticResponse(tamperEventId);

        // Act & Assert
        mockMvc.perform(post("/api/security/responses/events/{tamperEventId}/auto-response", tamperEventId))
                .andExpect(status().isOk());

        verify(tamperResponseService).executeAutomaticResponse(tamperEventId);
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("Should send notification for tamper event")
    void shouldSendNotification() throws Exception {
        // Arrange
        String notificationType = "EMAIL";
        
        doNothing().when(tamperResponseService).sendNotification(eq(tamperEventId), eq(notificationType));

        // Act & Assert
        mockMvc.perform(post("/api/security/responses/events/{tamperEventId}/notify", tamperEventId)
                .param("notificationType", notificationType))
                .andExpect(status().isOk());

        verify(tamperResponseService).sendNotification(eq(tamperEventId), eq(notificationType));
    }
} 