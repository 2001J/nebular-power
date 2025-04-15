package com.solar.core_services.payment_compliance.service;

import com.solar.core_services.payment_compliance.model.Payment;
import com.solar.core_services.payment_compliance.model.PaymentPlan;

public interface PaymentEventPublisher {
    
    void publishPaymentReceived(Payment payment);
    
    void publishGracePeriodExpired(Payment payment);
    
    void publishPaymentPlanUpdated(PaymentPlan paymentPlan);
    
    boolean confirmServiceControlAction(Long installationId, String actionType);
} 