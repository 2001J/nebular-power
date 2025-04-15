package com.solar.core_services.service_control.service;

import com.solar.core_services.payment_compliance.model.Payment;

public interface PaymentIntegrationService {
    
    /**
     * Handle payment status change event
     */
    void handlePaymentStatusChange(Long paymentId, Payment.PaymentStatus oldStatus, 
                                  Payment.PaymentStatus newStatus);
    
    /**
     * Process overdue payments and suspend service if needed
     */
    void processOverduePayments();
    
    /**
     * Restore service after payment received
     */
    void restoreServiceAfterPayment(Long installationId, Long paymentId);
    
    /**
     * Check if installation has overdue payments
     */
    boolean hasOverduePayments(Long installationId);
    
    /**
     * Get days until service suspension for an installation
     */
    int getDaysUntilSuspension(Long installationId);
    
    /**
     * Get grace period for an installation
     */
    int getGracePeriod(Long installationId);
} 