package com.solar.core_services.tampering_detection.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.solar.core_services.energy_monitoring.model.SolarInstallation;
import com.solar.core_services.energy_monitoring.repository.SolarInstallationRepository;
import com.solar.core_services.tampering_detection.dto.TamperEventCreateDTO;
import com.solar.core_services.tampering_detection.dto.TamperEventDTO;
import com.solar.core_services.tampering_detection.dto.TamperEventUpdateDTO;
import com.solar.core_services.tampering_detection.model.TamperEvent.TamperEventStatus;
import com.solar.core_services.tampering_detection.model.TamperEvent.TamperEventType;
import com.solar.core_services.tampering_detection.model.TamperEvent.TamperSeverity;
import com.solar.core_services.tampering_detection.service.TamperEventService;
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
import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;

/**
 * Test class for TamperEventController
 * Source file: src/main/java/com/solar/core_services/tampering_detection/controller/TamperEventController.java
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@ExtendWith(MockitoExtension.class)
public class TamperEventControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private TamperEventService tamperEventService;

    @MockBean
    private SolarInstallationRepository installationRepository;

    @MockBean
    private UserService userService;

    private final Long installationId = 1L;
    private final Long eventId = 1L;
    private TamperEventDTO testTamperEventDTO;
    private TamperEventCreateDTO testCreateDTO;
    private TamperEventUpdateDTO testUpdateDTO;

    @BeforeEach
    void setUp() {
        // Set up test tamper event DTO
        testTamperEventDTO = new TamperEventDTO();
        testTamperEventDTO.setId(eventId);
        testTamperEventDTO.setInstallationId(installationId);
        testTamperEventDTO.setEventType(TamperEventType.PHYSICAL_MOVEMENT);
        testTamperEventDTO.setSeverity(TamperSeverity.HIGH);
        testTamperEventDTO.setTimestamp(LocalDateTime.now());
        testTamperEventDTO.setDescription("Test tamper event");
        testTamperEventDTO.setConfidenceScore(0.85);
        testTamperEventDTO.setStatus(TamperEventStatus.NEW);
        
        // Set up test create DTO
        testCreateDTO = new TamperEventCreateDTO();
        testCreateDTO.setInstallationId(installationId);
        testCreateDTO.setEventType(TamperEventType.PHYSICAL_MOVEMENT);
        testCreateDTO.setSeverity(TamperSeverity.HIGH);
        testCreateDTO.setDescription("Test tamper event");
        testCreateDTO.setConfidenceScore(0.85);
        testCreateDTO.setRawSensorData("{\"acceleration\": 0.85, \"timestamp\": \"2023-06-15T14:30:00\"}");
        
        // Set up test update DTO
        testUpdateDTO = new TamperEventUpdateDTO();
        testUpdateDTO.setStatus(TamperEventStatus.ACKNOWLEDGED);
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("Should create a tamper event")
    void shouldCreateTamperEvent() throws Exception {
        // Arrange
        when(tamperEventService.createTamperEvent(any(TamperEventCreateDTO.class))).thenReturn(testTamperEventDTO);

        // Act & Assert
        mockMvc.perform(post("/api/security/tamper-events")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(testCreateDTO))
                .with(csrf()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(testTamperEventDTO.getId()))
                .andExpect(jsonPath("$.installationId").value(testTamperEventDTO.getInstallationId()))
                .andExpect(jsonPath("$.eventType").value(testTamperEventDTO.getEventType().name()));

        verify(tamperEventService).createTamperEvent(any(TamperEventCreateDTO.class));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("Should get a tamper event by ID")
    void shouldGetTamperEventById() throws Exception {
        // Arrange
        when(tamperEventService.getTamperEventById(eventId)).thenReturn(testTamperEventDTO);

        // Act & Assert
        mockMvc.perform(get("/api/security/tamper-events/{id}", eventId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(testTamperEventDTO.getId()))
                .andExpect(jsonPath("$.installationId").value(testTamperEventDTO.getInstallationId()))
                .andExpect(jsonPath("$.eventType").value(testTamperEventDTO.getEventType().name()));

        verify(tamperEventService).getTamperEventById(eventId);
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("Should get tamper events by installation ID")
    void shouldGetTamperEventsByInstallationId() throws Exception {
        // Arrange
        Page<TamperEventDTO> eventsPage = new PageImpl<>(List.of(testTamperEventDTO));
        when(tamperEventService.getTamperEventsByInstallationId(eq(installationId), any(Pageable.class)))
                .thenReturn(eventsPage);

        // Act & Assert
        mockMvc.perform(get("/api/security/installations/{installationId}/events", installationId)
                .param("page", "0")
                .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value(testTamperEventDTO.getId()))
                .andExpect(jsonPath("$.content[0].installationId").value(testTamperEventDTO.getInstallationId()))
                .andExpect(jsonPath("$.content[0].eventType").value(testTamperEventDTO.getEventType().name()));

        verify(tamperEventService).getTamperEventsByInstallationId(eq(installationId), any(Pageable.class));
    }

    @Test
    @WithMockUser(roles = "CUSTOMER")
    @DisplayName("Should get tamper events for current user")
    void shouldGetTamperEventsForCurrentUser() throws Exception {
        // Arrange
        Page<TamperEventDTO> eventsPage = new PageImpl<>(List.of(testTamperEventDTO));
        User mockUser = mock(User.class);
        SolarInstallation mockInstallation = mock(SolarInstallation.class);
        when(mockInstallation.getId()).thenReturn(installationId);
        
        when(userService.getCurrentUser()).thenReturn(mockUser);
        when(installationRepository.findByUser(mockUser)).thenReturn(List.of(mockInstallation));
        when(tamperEventService.getTamperEventsByInstallationIds(anyList(), any(Pageable.class)))
                .thenReturn(eventsPage);

        // Act & Assert
        mockMvc.perform(get("/api/security/events")
                .param("page", "0")
                .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value(testTamperEventDTO.getId()))
                .andExpect(jsonPath("$.content[0].installationId").value(testTamperEventDTO.getInstallationId()))
                .andExpect(jsonPath("$.content[0].eventType").value(testTamperEventDTO.getEventType().name()));

        verify(tamperEventService).getTamperEventsByInstallationIds(anyList(), any(Pageable.class));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("Should get unresolved tamper events")
    void shouldGetUnresolvedTamperEvents() throws Exception {
        // Arrange
        Page<TamperEventDTO> eventsPage = new PageImpl<>(List.of(testTamperEventDTO));
        when(tamperEventService.getUnresolvedTamperEvents(anyList(), any(Pageable.class)))
                .thenReturn(eventsPage);

        // Act & Assert
        mockMvc.perform(get("/api/security/admin/alerts")
                .param("severities", "HIGH,CRITICAL")
                .param("page", "0")
                .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value(testTamperEventDTO.getId()))
                .andExpect(jsonPath("$.content[0].installationId").value(testTamperEventDTO.getInstallationId()))
                .andExpect(jsonPath("$.content[0].eventType").value(testTamperEventDTO.getEventType().name()));

        verify(tamperEventService).getUnresolvedTamperEvents(anyList(), any(Pageable.class));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("Should get tamper events by time range")
    void shouldGetTamperEventsByTimeRange() throws Exception {
        // Arrange
        LocalDateTime start = LocalDateTime.now().minusDays(7);
        LocalDateTime end = LocalDateTime.now();
        
        when(tamperEventService.getTamperEventsByInstallationAndTimeRange(eq(installationId), any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(List.of(testTamperEventDTO));

        // Act & Assert
        mockMvc.perform(get("/api/security/installations/{installationId}/events/time-range", installationId)
                .param("start", start.toString())
                .param("end", end.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(testTamperEventDTO.getId()))
                .andExpect(jsonPath("$[0].installationId").value(testTamperEventDTO.getInstallationId()))
                .andExpect(jsonPath("$[0].eventType").value(testTamperEventDTO.getEventType().name()));

        verify(tamperEventService).getTamperEventsByInstallationAndTimeRange(eq(installationId), any(LocalDateTime.class), any(LocalDateTime.class));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("Should update tamper event status")
    void shouldUpdateTamperEventStatus() throws Exception {
        // Arrange
        when(tamperEventService.updateTamperEventStatus(eq(eventId), any(TamperEventUpdateDTO.class))).thenReturn(testTamperEventDTO);

        // Act & Assert
        mockMvc.perform(put("/api/security/admin/events/{eventId}/status", eventId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(testUpdateDTO))
                .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(testTamperEventDTO.getId()))
                .andExpect(jsonPath("$.status").value(testTamperEventDTO.getStatus().name()));

        verify(tamperEventService).updateTamperEventStatus(eq(eventId), any(TamperEventUpdateDTO.class));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("Should acknowledge a tamper event")
    void shouldAcknowledgeTamperEvent() throws Exception {
        // Arrange
        testTamperEventDTO.setStatus(TamperEventStatus.ACKNOWLEDGED);
        
        User mockUser = mock(User.class);
        when(mockUser.getFullName()).thenReturn("Admin User");
        when(userService.getCurrentUser()).thenReturn(mockUser);
        
        when(tamperEventService.updateTamperEventStatus(eq(eventId), any(TamperEventUpdateDTO.class))).thenReturn(testTamperEventDTO);

        // Act & Assert
        mockMvc.perform(put("/api/security/events/{eventId}/acknowledge", eventId)
                .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(testTamperEventDTO.getId()))
                .andExpect(jsonPath("$.status").value(TamperEventStatus.ACKNOWLEDGED.name()));

        verify(tamperEventService).updateTamperEventStatus(eq(eventId), any(TamperEventUpdateDTO.class));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("Should resolve a tamper event")
    void shouldResolveTamperEvent() throws Exception {
        // Arrange
        testTamperEventDTO.setStatus(TamperEventStatus.RESOLVED);
        String resolutionNotes = "Fixed the issue";
        String resolvedBy = "admin";
        
        when(tamperEventService.resolveTamperEvent(eq(eventId), eq(resolvedBy), eq(resolutionNotes))).thenReturn(testTamperEventDTO);

        // Act & Assert
        mockMvc.perform(post("/api/security/admin/events/{eventId}/resolve", eventId)
                .param("resolvedBy", resolvedBy)
                .param("resolutionNotes", resolutionNotes)
                .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(testTamperEventDTO.getId()))
                .andExpect(jsonPath("$.status").value(TamperEventStatus.RESOLVED.name()));

        verify(tamperEventService).resolveTamperEvent(eq(eventId), eq(resolvedBy), eq(resolutionNotes));
    }

    @Test
    @WithMockUser(roles = "CUSTOMER")
    @DisplayName("Should allow user to view their own tamper events")
    void shouldAllowUserToViewTheirOwnTamperEvents() throws Exception {
        // Arrange
        Page<TamperEventDTO> eventsPage = new PageImpl<>(List.of(testTamperEventDTO));
        User mockUser = mock(User.class);
        SolarInstallation mockInstallation = mock(SolarInstallation.class);
        when(mockInstallation.getId()).thenReturn(installationId);
        
        when(userService.getCurrentUser()).thenReturn(mockUser);
        when(installationRepository.findByUser(mockUser)).thenReturn(List.of(mockInstallation));
        when(tamperEventService.getTamperEventsByInstallationIds(anyList(), any(Pageable.class)))
                .thenReturn(eventsPage);

        // Act & Assert
        mockMvc.perform(get("/api/security/events")
                .param("page", "0")
                .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value(testTamperEventDTO.getId()))
                .andExpect(jsonPath("$.content[0].installationId").value(testTamperEventDTO.getInstallationId()))
                .andExpect(jsonPath("$.content[0].eventType").value(testTamperEventDTO.getEventType().name()));

        verify(tamperEventService).getTamperEventsByInstallationIds(anyList(), any(Pageable.class));
    }

    @Test
    @WithMockUser(roles = "CUSTOMER")
    @DisplayName("Should return forbidden for admin-only endpoints")
    void shouldReturnForbiddenForAdminOnlyEndpoints() throws Exception {
        // Act & Assert
        mockMvc.perform(get("/api/security/admin/alerts")
                .param("severities", "HIGH,CRITICAL")
                .param("page", "0")
                .param("size", "10"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("You do not have permission to access this resource"));

        verifyNoInteractions(tamperEventService);
    }
}