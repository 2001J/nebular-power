package com.solar.core_services.service_control.service.impl;

import com.solar.core_services.energy_monitoring.model.SolarInstallation;
import com.solar.core_services.payment_compliance.model.Payment;
import com.solar.core_services.payment_compliance.repository.PaymentRepository;
import com.solar.core_services.payment_compliance.service.impl.PaymentEventPublisherImpl;
import com.solar.core_services.service_control.service.PaymentIntegrationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Service to listen for payment-related events and trigger appropriate actions
 * Bridges the gap between payment compliance and service control modules
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentEventListenerService {
    
    private final PaymentIntegrationService paymentIntegrationService;
    private final PaymentRepository paymentRepository;
    
    /**
     * Listen for payment received events and restore service if needed
     */
    @EventListener
    @Transactional
    public void handlePaymentReceivedEvent(PaymentEventPublisherImpl.PaymentReceivedEvent event) {
        log.info("Received payment event for installation {}, payment {}", 
                event.getInstallationId(), event.getPaymentId());
        
        // Get payment to check installation status
        Payment payment = paymentRepository.findById(event.getPaymentId())
                .orElseThrow(() -> new RuntimeException("Payment not found with ID: " + event.getPaymentId()));
        
        // Only restore service if the installation was previously suspended
        if (payment.getInstallation().getStatus() == SolarInstallation.InstallationStatus.SUSPENDED) {
            log.info("Installation {} was suspended. Restoring service after payment {}.", 
                    event.getInstallationId(), event.getPaymentId());
            
            // Restore service for the installation
            paymentIntegrationService.restoreServiceAfterPayment(
                    event.getInstallationId(),
                    event.getPaymentId()
            );
        } else {
            log.info("Installation {} is already active. No need to restore service.", 
                    event.getInstallationId());
        }
    }
    
    /**
     * Listen for grace period expired events and suspend service
     */
    @EventListener
    @Transactional
    public void handleGracePeriodExpiredEvent(PaymentEventPublisherImpl.GracePeriodExpiredEvent event) {
        log.info("Received grace period expired event for installation {}, payment {}", 
                event.getInstallationId(), event.getPaymentId());
        
        // Handle payment status change to trigger service suspension
        paymentIntegrationService.handlePaymentStatusChange(
                event.getPaymentId(),
                Payment.PaymentStatus.OVERDUE,
                Payment.PaymentStatus.SUSPENSION_PENDING
        );
    }
} 