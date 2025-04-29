package com.solar.core_services.service_control.service.impl;

import com.solar.core_services.payment_compliance.model.Payment;
import com.solar.core_services.payment_compliance.repository.PaymentRepository;
import com.solar.core_services.service_control.model.OperationalLog;
import com.solar.core_services.service_control.service.DeviceCommandService;
import com.solar.core_services.service_control.service.OperationalLogService;
import com.solar.core_services.service_control.service.PaymentIntegrationService;
import com.solar.core_services.service_control.service.ServiceStatusService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;

/**
 * Implementation of the PaymentIntegrationService interface
 * Handles payment-related operations and service status changes
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentIntegrationServiceImpl implements PaymentIntegrationService {

    private final ServiceStatusService serviceStatusService;
    private final OperationalLogService operationalLogService;
    private final DeviceCommandService deviceCommandService;
    private final PaymentRepository paymentRepository;
    
    // Default grace period in days
    private static final int DEFAULT_GRACE_PERIOD = 7;
    
    @Override
    @Transactional
    public void handlePaymentStatusChange(Long paymentId, Payment.PaymentStatus oldStatus, 
                                         Payment.PaymentStatus newStatus) {
        log.info("Handling payment status change for payment {}: {} -> {}", 
                paymentId, oldStatus, newStatus);
        
        // Retrieve the payment to get installationId
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new RuntimeException("Payment not found with ID: " + paymentId));
        
        Long installationId = payment.getInstallation().getId();
                
        // Log the payment status change
        operationalLogService.logOperation(
                installationId,
                OperationalLog.OperationType.PAYMENT_STATUS_CHANGE,
                "SYSTEM",
                "Payment status changed from " + oldStatus + " to " + newStatus + " for payment " + paymentId,
                "PAYMENT_SYSTEM",
                "PAYMENT_STATUS_CHANGE",
                "internal",
                "PaymentIntegrationService",
                true,
                null
        );
        
        // If payment status changed to PAID, restore service
        if (newStatus == Payment.PaymentStatus.PAID && 
                (oldStatus == Payment.PaymentStatus.OVERDUE || oldStatus == Payment.PaymentStatus.PENDING)) {
            restoreServiceAfterPayment(installationId, paymentId);
        }
        
        // If payment status changed to OVERDUE or SUSPENSION_PENDING, consider suspending service
        if (newStatus == Payment.PaymentStatus.OVERDUE || newStatus == Payment.PaymentStatus.SUSPENSION_PENDING) {
            // In a real implementation, check if grace period has expired before suspending
            log.info("Payment {} is now overdue. Service suspension may be required for installation {}", 
                     paymentId, installationId);
            
            // If status is SUSPENSION_PENDING, it means grace period has expired
            if (newStatus == Payment.PaymentStatus.SUSPENSION_PENDING) {
                log.info("Grace period expired for payment {}. Suspending service for installation {}", 
                         paymentId, installationId);
                
                // Suspend service
                serviceStatusService.suspendServiceForPayment(
                        installationId,
                        "Service suspended due to payment " + paymentId + " being overdue",
                        "PAYMENT_SYSTEM"
                );
                
                // Send device command to suspend service
                Map<String, Object> parameters = new HashMap<>();
                parameters.put("reason", "Payment overdue - ID: " + paymentId);
                parameters.put("gracePeriodExpired", true);
                
                try {
                    deviceCommandService.sendCommand(
                            installationId,
                            "SUSPEND_SERVICE",
                            parameters,
                            "PAYMENT_SYSTEM"
                    );
                    log.info("Sent SUSPEND_SERVICE command to installation {}", installationId);
                } catch (Exception e) {
                    log.error("Failed to send SUSPEND_SERVICE command to installation {}: {}", 
                             installationId, e.getMessage(), e);
                }
            }
        }
    }

    @Override
    @Transactional
    public void processOverduePayments() {
        log.info("Processing overdue payments");
        
        // Log the operation
        operationalLogService.logOperation(
                null, // No specific installation
                OperationalLog.OperationType.PROCESS_OVERDUE_PAYMENTS,
                "SYSTEM",
                "Processing overdue payments",
                "PAYMENT_SYSTEM",
                "PROCESS_OVERDUE_PAYMENTS",
                "internal",
                "PaymentIntegrationService",
                true,
                null
        );
        
        // In a real implementation, we would:
        // 1. Query the database for all overdue payments
        // 2. For each overdue payment, check if grace period has expired
        // 3. If grace period has expired, suspend service for the installation
        
        log.info("Overdue payments processed");
    }

    @Override
    @Transactional
    public void restoreServiceAfterPayment(Long installationId, Long paymentId) {
        log.info("Restoring service for installation {} after payment {}", installationId, paymentId);
        
        try {
            // Restore service using the service status service
            serviceStatusService.restoreService(
                    installationId,
                    "Service restored after payment " + paymentId,
                    "PAYMENT_SYSTEM"
            );
            
            // Send device command to restore service
            Map<String, Object> parameters = new HashMap<>();
            parameters.put("paymentId", paymentId);
            parameters.put("restorationReason", "Payment received");
            
            deviceCommandService.sendCommand(
                    installationId,
                    "RESTORE_SERVICE",
                    parameters,
                    "PAYMENT_SYSTEM"
            );
            
            // Log the operation
            operationalLogService.logOperation(
                    installationId,
                    OperationalLog.OperationType.SERVICE_RESTORATION,
                    "PAYMENT_SYSTEM",
                    "Service restored after payment " + paymentId,
                    "PAYMENT_SYSTEM",
                    "RESTORE_SERVICE",
                    "internal",
                    "PaymentIntegrationService",
                    true,
                    null
            );
            
            log.info("Service restored successfully for installation {}", installationId);
        } catch (Exception e) {
            log.error("Error restoring service for installation {}: {}", installationId, e.getMessage(), e);
            
            // Log the failed operation
            operationalLogService.logOperation(
                    installationId,
                    OperationalLog.OperationType.SERVICE_RESTORATION,
                    "PAYMENT_SYSTEM",
                    "Failed to restore service after payment " + paymentId,
                    "PAYMENT_SYSTEM",
                    "RESTORE_SERVICE",
                    "internal",
                    "PaymentIntegrationService",
                    false,
                    e.getMessage()
            );
        }
    }

    @Override
    @Transactional(readOnly = true)
    public boolean hasOverduePayments(Long installationId) {
        log.info("Checking if installation {} has overdue payments", installationId);
        
        // In a real implementation, we would query the database to check for overdue payments
        // For now, we'll just return false
        
        // Simulating a check for overdue payments
        boolean hasOverduePayments = false; // This would be determined by querying the database
        
        log.info("Installation {} has overdue payments: {}", installationId, hasOverduePayments);
        return hasOverduePayments;
    }

    @Override
    @Transactional(readOnly = true)
    public int getDaysUntilSuspension(Long installationId) {
        log.info("Getting days until suspension for installation {}", installationId);
        
        // In a real implementation, we would:
        // 1. Check if there are any overdue payments
        // 2. If yes, calculate days until grace period expires
        // 3. If no, return a large number or -1
        
        // For now, we'll just return a default value
        int daysUntilSuspension = 30; // This would be calculated based on grace period and overdue date
        
        log.info("Days until suspension for installation {}: {}", installationId, daysUntilSuspension);
        return daysUntilSuspension;
    }

    @Override
    @Transactional(readOnly = true)
    public int getGracePeriod(Long installationId) {
        log.info("Getting grace period for installation {}", installationId);
        
        // In a real implementation, we would retrieve the grace period configuration for the installation
        // For now, we'll just return a default value
        
        // Simulating retrieval of grace period
        int gracePeriod = DEFAULT_GRACE_PERIOD; // This would be retrieved from configuration
        
        log.info("Grace period for installation {}: {} days", installationId, gracePeriod);
        return gracePeriod;
    }
} 