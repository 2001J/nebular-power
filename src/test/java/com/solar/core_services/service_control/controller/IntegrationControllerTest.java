package com.solar.core_services.service_control.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.solar.core_services.energy_monitoring.controller.TestSecurityConfig;
import com.solar.core_services.payment_compliance.model.Payment;
import com.solar.core_services.service_control.model.OperationalLog;
import com.solar.core_services.service_control.dto.OperationalLogDTO;
import com.solar.core_services.service_control.service.OperationalLogService;
import com.solar.core_services.service_control.service.PaymentIntegrationService;
import com.solar.core_services.service_control.service.SecurityIntegrationService;
import com.solar.core_services.tampering_detection.model.TamperEvent;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(IntegrationController.class)
@Import(TestSecurityConfig.class)
public class IntegrationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private PaymentIntegrationService paymentIntegrationService;

    @MockBean
    private SecurityIntegrationService securityIntegrationService;

    @MockBean
    private OperationalLogService operationalLogService;

    // Payment Integration Tests

    @Test
    @DisplayName("Should handle payment status change")
    @WithMockUser(username = "payment-system")
    void shouldHandlePaymentStatusChange() throws Exception {
        // Arrange
        Long paymentId = 1L;
        String oldStatus = "PENDING";
        String newStatus = "PAID";
        
        doNothing().when(paymentIntegrationService).handlePaymentStatusChange(
                eq(paymentId), 
                eq(Payment.PaymentStatus.PENDING), 
                eq(Payment.PaymentStatus.PAID)
        );
        when(operationalLogService.logOperation(
                isNull(), any(), anyString(), anyString(), anyString(), anyString(), 
                anyString(), isNull(), anyBoolean(), any()
        )).thenReturn(new OperationalLogDTO());

        // Act & Assert
        mockMvc.perform(post("/api/service/integration/payment/{paymentId}/status-change", paymentId)
                .with(csrf())
                .param("oldStatus", oldStatus)
                .param("newStatus", newStatus))
                .andExpect(status().isOk());

        verify(paymentIntegrationService).handlePaymentStatusChange(
                eq(paymentId), 
                eq(Payment.PaymentStatus.PENDING), 
                eq(Payment.PaymentStatus.PAID)
        );
        verify(operationalLogService).logOperation(
                isNull(), eq(OperationalLog.OperationType.PAYMENT_STATUS_CHANGE), anyString(), 
                contains("Payment status changed"), anyString(), anyString(), 
                anyString(), isNull(), eq(true), isNull()
        );
    }

    @Test
    @DisplayName("Should process overdue payments")
    @WithMockUser(username = "admin")
    void shouldProcessOverduePayments() throws Exception {
        // Arrange
        doNothing().when(paymentIntegrationService).processOverduePayments();

        // Act & Assert
        mockMvc.perform(post("/api/service/integration/payment/process-overdue")
                .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("success"))
                .andExpect(jsonPath("$.message").value("Overdue payments processed successfully"));

        verify(paymentIntegrationService).processOverduePayments();
        verify(operationalLogService).logOperation(
                isNull(), eq(OperationalLog.OperationType.PROCESS_OVERDUE_PAYMENTS), anyString(), 
                anyString(), anyString(), anyString(), anyString(), isNull(), 
                eq(true), isNull()
        );
    }

    @Test
    @DisplayName("Should restore service after payment")
    @WithMockUser(username = "payment-system")
    void shouldRestoreServiceAfterPayment() throws Exception {
        // Arrange
        Long installationId = 1L;
        Long paymentId = 2L;
        
        doNothing().when(paymentIntegrationService).restoreServiceAfterPayment(
                eq(installationId), eq(paymentId)
        );

        // Act & Assert
        mockMvc.perform(post("/api/service/integration/payment/{installationId}/restore/{paymentId}", 
                installationId, paymentId)
                .with(csrf()))
                .andExpect(status().isOk());

        verify(paymentIntegrationService).restoreServiceAfterPayment(
                eq(installationId), eq(paymentId)
        );
        verify(operationalLogService).logOperation(
                eq(installationId), eq(OperationalLog.OperationType.SERVICE_RESTORATION), anyString(), 
                contains("Service restored after payment"), anyString(), anyString(), 
                anyString(), isNull(), eq(true), isNull()
        );
    }

    @Test
    @DisplayName("Should check for overdue payments")
    @WithMockUser(username = "user")
    void shouldCheckForOverduePayments() throws Exception {
        // Arrange
        Long installationId = 1L;
        when(paymentIntegrationService.hasOverduePayments(eq(installationId)))
                .thenReturn(true);

        // Act & Assert
        mockMvc.perform(get("/api/service/integration/payment/{installationId}/overdue", installationId))
                .andExpect(status().isOk())
                .andExpect(content().string("true"));

        verify(paymentIntegrationService).hasOverduePayments(eq(installationId));
    }

    @Test
    @DisplayName("Should get days until suspension")
    @WithMockUser(username = "user")
    void shouldGetDaysUntilSuspension() throws Exception {
        // Arrange
        Long installationId = 1L;
        when(paymentIntegrationService.getDaysUntilSuspension(eq(installationId)))
                .thenReturn(5);

        // Act & Assert
        mockMvc.perform(get("/api/service/integration/payment/{installationId}/days-until-suspension", 
                installationId))
                .andExpect(status().isOk())
                .andExpect(content().string("5"));

        verify(paymentIntegrationService).getDaysUntilSuspension(eq(installationId));
    }

    @Test
    @DisplayName("Should get grace period")
    @WithMockUser(username = "user")
    void shouldGetGracePeriod() throws Exception {
        // Arrange
        Long installationId = 1L;
        when(paymentIntegrationService.getGracePeriod(eq(installationId)))
                .thenReturn(14);

        // Act & Assert
        mockMvc.perform(get("/api/service/integration/payment/{installationId}/grace-period", 
                installationId))
                .andExpect(status().isOk())
                .andExpect(content().string("14"));

        verify(paymentIntegrationService).getGracePeriod(eq(installationId));
    }

    // Security Integration Tests

    @Test
    @DisplayName("Should handle tamper event")
    @WithMockUser(username = "security-system")
    void shouldHandleTamperEvent() throws Exception {
        // Arrange
        Long tamperEventId = 1L;
        TamperEvent.TamperEventType eventType = TamperEvent.TamperEventType.PANEL_ACCESS;
        TamperEvent.TamperSeverity severity = TamperEvent.TamperSeverity.HIGH;
        
        doNothing().when(securityIntegrationService).handleTamperEvent(
                eq(tamperEventId), eq(eventType), eq(severity)
        );

        // Act & Assert
        mockMvc.perform(post("/api/service/integration/security/tamper-event/{tamperEventId}", tamperEventId)
                .with(csrf())
                .param("eventType", eventType.name())
                .param("severity", severity.name()))
                .andExpect(status().isOk());

        verify(securityIntegrationService).handleTamperEvent(
                eq(tamperEventId), eq(eventType), eq(severity)
        );
        verify(operationalLogService).logOperation(
                isNull(), eq(OperationalLog.OperationType.TAMPER_EVENT_RECEIVED), anyString(), 
                contains("Received tamper event"), anyString(), anyString(), 
                anyString(), isNull(), eq(true), isNull()
        );
    }

    @Test
    @DisplayName("Should process security response")
    @WithMockUser(username = "security-system")
    void shouldProcessSecurityResponse() throws Exception {
        // Arrange
        Long tamperEventId = 1L;
        
        doNothing().when(securityIntegrationService).processSecurityResponse(eq(tamperEventId));

        // Act & Assert
        mockMvc.perform(post("/api/service/integration/security/response/{tamperEventId}", tamperEventId)
                .with(csrf()))
                .andExpect(status().isOk());

        verify(securityIntegrationService).processSecurityResponse(eq(tamperEventId));
        verify(operationalLogService).logOperation(
                isNull(), eq(OperationalLog.OperationType.SECURITY_RESPONSE_PROCESSED), anyString(), 
                contains("Processed security response"), anyString(), anyString(), 
                anyString(), isNull(), eq(true), isNull()
        );
    }

    @Test
    @DisplayName("Should suspend service for security")
    @WithMockUser(username = "security-system")
    void shouldSuspendServiceForSecurity() throws Exception {
        // Arrange
        Long installationId = 1L;
        Long tamperEventId = 2L;
        String reason = "Unauthorized panel access detected";
        
        doNothing().when(securityIntegrationService).suspendServiceForSecurity(
                eq(installationId), eq(reason), eq(tamperEventId)
        );

        // Act & Assert
        mockMvc.perform(post("/api/service/integration/security/{installationId}/suspend", installationId)
                .with(csrf())
                .param("reason", reason)
                .param("tamperEventId", tamperEventId.toString()))
                .andExpect(status().isOk());

        verify(securityIntegrationService).suspendServiceForSecurity(
                eq(installationId), eq(reason), eq(tamperEventId)
        );
        verify(operationalLogService).logOperation(
                eq(1L), eq(OperationalLog.OperationType.SERVICE_SUSPENSION), anyString(), 
                contains("Service suspended for security"), anyString(), anyString(), 
                anyString(), isNull(), eq(true), isNull()
        );
    }

    @Test
    @DisplayName("Should restore service after security resolution")
    @WithMockUser(username = "security-system")
    void shouldRestoreServiceAfterSecurityResolution() throws Exception {
        // Arrange
        Long installationId = 1L;
        Long tamperEventId = 2L;
        
        doNothing().when(securityIntegrationService).restoreServiceAfterSecurityResolution(
                eq(installationId), eq(tamperEventId)
        );

        // Act & Assert
        mockMvc.perform(post("/api/service/integration/security/{installationId}/restore", installationId)
                .with(csrf())
                .param("tamperEventId", tamperEventId.toString()))
                .andExpect(status().isOk());

        verify(securityIntegrationService).restoreServiceAfterSecurityResolution(
                eq(installationId), eq(tamperEventId)
        );
        verify(operationalLogService).logOperation(
                eq(1L), eq(OperationalLog.OperationType.SERVICE_RESTORATION), anyString(), 
                contains("Service restored after security resolution"), anyString(), anyString(), 
                anyString(), isNull(), eq(true), isNull()
        );
    }

    @Test
    @DisplayName("Should check for active security issues")
    @WithMockUser(username = "user")
    void shouldCheckForActiveSecurityIssues() throws Exception {
        // Arrange
        Long installationId = 1L;
        when(securityIntegrationService.hasActiveSecurityIssues(eq(installationId)))
                .thenReturn(true);

        // Act & Assert
        mockMvc.perform(get("/api/service/integration/security/{installationId}/active-issues", 
                installationId))
                .andExpect(status().isOk())
                .andExpect(content().string("true"));

        verify(securityIntegrationService).hasActiveSecurityIssues(eq(installationId));
    }

    @Test
    @DisplayName("Should get security status")
    @WithMockUser(username = "user")
    void shouldGetSecurityStatus() throws Exception {
        // Arrange
        Long installationId = 1L;
        when(securityIntegrationService.getSecurityStatus(eq(installationId)))
                .thenReturn("ALERT");

        // Act & Assert
        mockMvc.perform(get("/api/service/integration/security/{installationId}/status", 
                installationId))
                .andExpect(status().isOk())
                .andExpect(content().string("ALERT"));

        verify(securityIntegrationService).getSecurityStatus(eq(installationId));
    }
} 