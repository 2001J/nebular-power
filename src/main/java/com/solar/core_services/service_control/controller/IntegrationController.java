package com.solar.core_services.service_control.controller;

import com.solar.core_services.payment_compliance.model.Payment;
import com.solar.core_services.service_control.dto.ServiceStatusDTO;
import com.solar.core_services.service_control.service.PaymentIntegrationService;
import com.solar.core_services.service_control.service.SecurityIntegrationService;
import com.solar.core_services.service_control.service.OperationalLogService;
import com.solar.core_services.service_control.model.OperationalLog;
import com.solar.core_services.tampering_detection.model.TamperEvent;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/service/integration")
@RequiredArgsConstructor
@Tag(name = "Module Integration", description = "APIs for integration with other modules")
public class IntegrationController {

    private final PaymentIntegrationService paymentIntegrationService;
    private final SecurityIntegrationService securityIntegrationService;
    private final OperationalLogService operationalLogService;

    // Payment Integration Endpoints
    
    @PostMapping("/payment/{paymentId}/status-change")
    @Operation(
        summary = "Handle payment status change",
        description = "Processes a payment status change event from the payment module."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Payment status change processed successfully"),
        @ApiResponse(responseCode = "404", description = "Payment not found", content = @Content)
    })
    public ResponseEntity<Void> handlePaymentStatusChange(
            @Parameter(description = "Payment ID", required = true)
            @PathVariable Long paymentId,
            @Parameter(description = "Old payment status", required = true)
            @RequestParam String oldStatus,
            @Parameter(description = "New payment status", required = true)
            @RequestParam String newStatus,
            HttpServletRequest request) {
        
        // Convert string status to enum
        paymentIntegrationService.handlePaymentStatusChange(
                paymentId, 
                Enum.valueOf(Payment.PaymentStatus.class, oldStatus),
                Enum.valueOf(Payment.PaymentStatus.class, newStatus)
        );
        
        // Log the operation
        operationalLogService.logOperation(
                null, // No specific installation at this point
                OperationalLog.OperationType.PAYMENT_STATUS_CHANGE,
                "PAYMENT_MODULE",
                "Payment status changed from " + oldStatus + " to " + newStatus + " for payment ID " + paymentId,
                "PAYMENT_MODULE",
                "PAYMENT_STATUS_CHANGE",
                request.getRemoteAddr(),
                request.getHeader("User-Agent"),
                true,
                null
        );
        
        return ResponseEntity.ok().build();
    }

    @PostMapping("/payment/process-overdue")
    @Operation(
        summary = "Process overdue payments",
        description = "Processes all overdue payments and suspends service if needed."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Overdue payments processed successfully")
    })
    public ResponseEntity<Map<String, Object>> processOverduePayments(HttpServletRequest request) {
        paymentIntegrationService.processOverduePayments();
        
        // Create a result map for the response
        Map<String, Object> result = new HashMap<>();
        result.put("status", "success");
        result.put("message", "Overdue payments processed successfully");
        
        // Log the operation
        operationalLogService.logOperation(
                null, // No specific installation
                OperationalLog.OperationType.PROCESS_OVERDUE_PAYMENTS,
                "SYSTEM",
                "Processed overdue payments",
                "SERVICE_CONTROL",
                "PROCESS_OVERDUE",
                request.getRemoteAddr(),
                request.getHeader("User-Agent"),
                true,
                null
        );
        
        return ResponseEntity.ok(result);
    }

    @PostMapping("/payment/{installationId}/restore/{paymentId}")
    @Operation(
        summary = "Restore service after payment",
        description = "Restores service for an installation after payment is received."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Service restored successfully", 
                    content = @Content(schema = @Schema(implementation = ServiceStatusDTO.class))),
        @ApiResponse(responseCode = "404", description = "Installation or payment not found", content = @Content)
    })
    public ResponseEntity<Void> restoreServiceAfterPayment(
            @Parameter(description = "Installation ID", required = true)
            @PathVariable Long installationId,
            @Parameter(description = "Payment ID", required = true)
            @PathVariable Long paymentId,
            HttpServletRequest request) {
        
        paymentIntegrationService.restoreServiceAfterPayment(installationId, paymentId);
        
        // Log the operation
        operationalLogService.logOperation(
                installationId,
                OperationalLog.OperationType.SERVICE_RESTORATION,
                "PAYMENT_MODULE",
                "Service restored after payment. Payment ID: " + paymentId,
                "PAYMENT_MODULE",
                "RESTORE_AFTER_PAYMENT",
                request.getRemoteAddr(),
                request.getHeader("User-Agent"),
                true,
                null
        );
        
        return ResponseEntity.ok().build();
    }

    @GetMapping("/payment/{installationId}/overdue")
    @Operation(
        summary = "Check for overdue payments",
        description = "Checks if an installation has overdue payments."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Overdue payment check completed"),
        @ApiResponse(responseCode = "404", description = "Installation not found", content = @Content)
    })
    public ResponseEntity<Boolean> hasOverduePayments(
            @Parameter(description = "Installation ID", required = true)
            @PathVariable Long installationId) {
        
        boolean hasOverdue = paymentIntegrationService.hasOverduePayments(installationId);
        return ResponseEntity.ok(hasOverdue);
    }

    @GetMapping("/payment/{installationId}/days-until-suspension")
    @Operation(
        summary = "Get days until suspension",
        description = "Gets the number of days until service suspension for an installation."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Days until suspension retrieved"),
        @ApiResponse(responseCode = "404", description = "Installation not found", content = @Content)
    })
    public ResponseEntity<Integer> getDaysUntilSuspension(
            @Parameter(description = "Installation ID", required = true)
            @PathVariable Long installationId) {
        
        int days = paymentIntegrationService.getDaysUntilSuspension(installationId);
        return ResponseEntity.ok(days);
    }

    @GetMapping("/payment/{installationId}/grace-period")
    @Operation(
        summary = "Get grace period",
        description = "Gets the grace period for an installation."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Grace period retrieved"),
        @ApiResponse(responseCode = "404", description = "Installation not found", content = @Content)
    })
    public ResponseEntity<Integer> getGracePeriod(
            @Parameter(description = "Installation ID", required = true)
            @PathVariable Long installationId) {
        
        int gracePeriod = paymentIntegrationService.getGracePeriod(installationId);
        return ResponseEntity.ok(gracePeriod);
    }

    // Security Integration Endpoints
    
    @PostMapping("/security/tamper-event/{tamperEventId}")
    @Operation(
        summary = "Handle tamper event",
        description = "Processes a tamper event from the tamper detection module."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Tamper event processed successfully"),
        @ApiResponse(responseCode = "404", description = "Tamper event not found", content = @Content)
    })
    public ResponseEntity<Void> handleTamperEvent(
            @Parameter(description = "Tamper event ID", required = true)
            @PathVariable Long tamperEventId,
            @Parameter(description = "Tamper event type", required = true)
            @RequestParam TamperEvent.TamperEventType eventType,
            @Parameter(description = "Tamper severity", required = true)
            @RequestParam TamperEvent.TamperSeverity severity,
            HttpServletRequest request) {
        
        securityIntegrationService.handleTamperEvent(tamperEventId, eventType, severity);
        
        // Log the operation
        operationalLogService.logOperation(
                null, // No specific installation at this point
                OperationalLog.OperationType.TAMPER_EVENT_RECEIVED,
                "TAMPER_DETECTION",
                "Received tamper event: " + eventType + " with severity " + severity + 
                        " for event ID " + tamperEventId,
                "TAMPER_DETECTION",
                "TAMPER_EVENT",
                request.getRemoteAddr(),
                request.getHeader("User-Agent"),
                true,
                null
        );
        
        return ResponseEntity.ok().build();
    }

    @PostMapping("/security/response/{tamperEventId}")
    @Operation(
        summary = "Process security response",
        description = "Processes a security response for a tamper event."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Security response processed successfully"),
        @ApiResponse(responseCode = "404", description = "Tamper event not found", content = @Content)
    })
    public ResponseEntity<Void> processSecurityResponse(
            @Parameter(description = "Tamper event ID", required = true)
            @PathVariable Long tamperEventId,
            HttpServletRequest request) {
        
        securityIntegrationService.processSecurityResponse(tamperEventId);
        
        // Log the operation
        operationalLogService.logOperation(
                null, // No specific installation at this point
                OperationalLog.OperationType.SECURITY_RESPONSE_PROCESSED,
                "TAMPER_DETECTION",
                "Processed security response for tamper event ID " + tamperEventId,
                "TAMPER_DETECTION",
                "SECURITY_RESPONSE",
                request.getRemoteAddr(),
                request.getHeader("User-Agent"),
                true,
                null
        );
        
        return ResponseEntity.ok().build();
    }

    @PostMapping("/security/{installationId}/suspend")
    @Operation(
        summary = "Suspend service for security",
        description = "Suspends service for an installation due to security concerns."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Service suspended successfully", 
                    content = @Content(schema = @Schema(implementation = ServiceStatusDTO.class))),
        @ApiResponse(responseCode = "404", description = "Installation not found", content = @Content)
    })
    public ResponseEntity<Void> suspendServiceForSecurity(
            @Parameter(description = "Installation ID", required = true)
            @PathVariable Long installationId,
            @Parameter(description = "Reason for suspension", required = true)
            @RequestParam String reason,
            @Parameter(description = "Tamper event ID", required = true)
            @RequestParam Long tamperEventId,
            HttpServletRequest request) {
        
        securityIntegrationService.suspendServiceForSecurity(installationId, reason, tamperEventId);
        
        // Log the operation
        operationalLogService.logOperation(
                installationId,
                OperationalLog.OperationType.SERVICE_SUSPENSION,
                "TAMPER_DETECTION",
                "Service suspended for security. Reason: " + reason + ", Tamper Event ID: " + tamperEventId,
                "TAMPER_DETECTION",
                "SECURITY_SUSPENSION",
                request.getRemoteAddr(),
                request.getHeader("User-Agent"),
                true,
                null
        );
        
        return ResponseEntity.ok().build();
    }

    @PostMapping("/security/{installationId}/restore")
    @Operation(
        summary = "Restore service after security resolution",
        description = "Restores service for an installation after security issues are resolved."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Service restored successfully", 
                    content = @Content(schema = @Schema(implementation = ServiceStatusDTO.class))),
        @ApiResponse(responseCode = "404", description = "Installation not found", content = @Content)
    })
    public ResponseEntity<Void> restoreServiceAfterSecurityResolution(
            @Parameter(description = "Installation ID", required = true)
            @PathVariable Long installationId,
            @Parameter(description = "Tamper event ID", required = true)
            @RequestParam Long tamperEventId,
            HttpServletRequest request) {
        
        securityIntegrationService.restoreServiceAfterSecurityResolution(installationId, tamperEventId);
        
        // Log the operation
        operationalLogService.logOperation(
                installationId,
                OperationalLog.OperationType.SERVICE_RESTORATION,
                "TAMPER_DETECTION",
                "Service restored after security resolution. Tamper Event ID: " + tamperEventId,
                "TAMPER_DETECTION",
                "SECURITY_RESTORATION",
                request.getRemoteAddr(),
                request.getHeader("User-Agent"),
                true,
                null
        );
        
        return ResponseEntity.ok().build();
    }

    @GetMapping("/security/{installationId}/active-issues")
    @Operation(
        summary = "Check for active security issues",
        description = "Checks if an installation has active security issues."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Security check completed"),
        @ApiResponse(responseCode = "404", description = "Installation not found", content = @Content)
    })
    public ResponseEntity<Boolean> hasActiveSecurityIssues(
            @Parameter(description = "Installation ID", required = true)
            @PathVariable Long installationId) {
        
        boolean hasIssues = securityIntegrationService.hasActiveSecurityIssues(installationId);
        return ResponseEntity.ok(hasIssues);
    }

    @GetMapping("/security/{installationId}/status")
    @Operation(
        summary = "Get security status",
        description = "Retrieves the security status for an installation."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Security status retrieved"),
        @ApiResponse(responseCode = "404", description = "Installation not found", content = @Content)
    })
    public ResponseEntity<String> getSecurityStatus(
            @Parameter(description = "Installation ID", required = true)
            @PathVariable Long installationId) {
        
        String status = securityIntegrationService.getSecurityStatus(installationId);
        return ResponseEntity.ok(status);
    }
} 