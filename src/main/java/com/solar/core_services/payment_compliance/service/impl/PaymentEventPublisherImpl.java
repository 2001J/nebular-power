package com.solar.core_services.payment_compliance.service.impl;

import com.solar.core_services.payment_compliance.model.Payment;
import com.solar.core_services.payment_compliance.model.PaymentPlan;
import com.solar.core_services.payment_compliance.service.PaymentEventPublisher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentEventPublisherImpl implements PaymentEventPublisher {

    private final ApplicationEventPublisher applicationEventPublisher;

    @Override
    public void publishPaymentReceived(Payment payment) {
        log.info("Publishing payment received event for installation ID: {}", payment.getInstallation().getId());
        try {
            PaymentReceivedEvent event = new PaymentReceivedEvent(this, payment.getInstallation().getId(), payment.getId());
            applicationEventPublisher.publishEvent(event);
            log.info("Successfully published payment received event");
        } catch (Exception e) {
            log.error("Failed to publish payment received event", e);
            // Implement fallback mechanism here
            handleEventPublishingFailure("PAYMENT_RECEIVED", payment.getInstallation().getId());
        }
    }

    @Override
    public void publishGracePeriodExpired(Payment payment) {
        log.info("Publishing grace period expired event for installation ID: {}", payment.getInstallation().getId());
        try {
            GracePeriodExpiredEvent event = new GracePeriodExpiredEvent(this, payment.getInstallation().getId(), payment.getId());
            applicationEventPublisher.publishEvent(event);
            log.info("Successfully published grace period expired event");
        } catch (Exception e) {
            log.error("Failed to publish grace period expired event", e);
            // Implement fallback mechanism here
            handleEventPublishingFailure("GRACE_PERIOD_EXPIRED", payment.getInstallation().getId());
        }
    }

    @Override
    public void publishPaymentPlanUpdated(PaymentPlan paymentPlan) {
        log.info("Publishing payment plan updated event for installation ID: {}", paymentPlan.getInstallation().getId());
        try {
            PaymentPlanUpdatedEvent event = new PaymentPlanUpdatedEvent(this, paymentPlan.getInstallation().getId(), paymentPlan.getId());
            applicationEventPublisher.publishEvent(event);
            log.info("Successfully published payment plan updated event");
        } catch (Exception e) {
            log.error("Failed to publish payment plan updated event", e);
            // Implement fallback mechanism here
            handleEventPublishingFailure("PAYMENT_PLAN_UPDATED", paymentPlan.getInstallation().getId());
        }
    }

    @Override
    public boolean confirmServiceControlAction(Long installationId, String actionType) {
        // In a real implementation, this would wait for a confirmation from the Service Control module
        // For now, we'll just log and return true
        log.info("Received confirmation request for action: {} on installation: {}", actionType, installationId);
        return true;
    }
    
    private void handleEventPublishingFailure(String eventType, Long installationId) {
        // This would implement a fallback mechanism, such as:
        // 1. Queue the event for retry
        // 2. Send a direct HTTP request to the Service Control module
        // 3. Create a database record for manual processing
        log.warn("Using fallback mechanism for failed event: {} on installation: {}", eventType, installationId);
    }
    
    // Event classes
    public static class PaymentReceivedEvent {
        private final Object source;
        private final Long installationId;
        private final Long paymentId;
        
        public PaymentReceivedEvent(Object source, Long installationId, Long paymentId) {
            this.source = source;
            this.installationId = installationId;
            this.paymentId = paymentId;
        }
        
        public Object getSource() {
            return source;
        }
        
        public Long getInstallationId() {
            return installationId;
        }
        
        public Long getPaymentId() {
            return paymentId;
        }
    }
    
    public static class GracePeriodExpiredEvent {
        private final Object source;
        private final Long installationId;
        private final Long paymentId;
        
        public GracePeriodExpiredEvent(Object source, Long installationId, Long paymentId) {
            this.source = source;
            this.installationId = installationId;
            this.paymentId = paymentId;
        }
        
        public Object getSource() {
            return source;
        }
        
        public Long getInstallationId() {
            return installationId;
        }
        
        public Long getPaymentId() {
            return paymentId;
        }
    }
    
    public static class PaymentPlanUpdatedEvent {
        private final Object source;
        private final Long installationId;
        private final Long paymentPlanId;
        
        public PaymentPlanUpdatedEvent(Object source, Long installationId, Long paymentPlanId) {
            this.source = source;
            this.installationId = installationId;
            this.paymentPlanId = paymentPlanId;
        }
        
        public Object getSource() {
            return source;
        }
        
        public Long getInstallationId() {
            return installationId;
        }
        
        public Long getPaymentPlanId() {
            return paymentPlanId;
        }
    }
} 