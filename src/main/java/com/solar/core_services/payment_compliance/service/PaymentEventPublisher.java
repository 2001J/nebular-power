package com.solar.core_services.payment_compliance.service;

import com.solar.core_services.payment_compliance.model.Payment;
import com.solar.core_services.payment_compliance.model.PaymentPlan;

public interface PaymentEventPublisher {
    
    void publishPaymentReceived(Payment payment);
    
    void publishGracePeriodExpired(Payment payment);
    
    void publishPaymentPlanUpdated(PaymentPlan paymentPlan);
    
    /**
     * Publish a generic payment status change event to decouple Payment Compliance and Service Control.
     */
    void publishPaymentStatusChanged(Payment payment, Payment.PaymentStatus oldStatus, Payment.PaymentStatus newStatus);
    
    boolean confirmServiceControlAction(Long installationId, String actionType);
} 
