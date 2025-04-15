package com.solar.core_services.payment_compliance.service;

import com.solar.core_services.payment_compliance.dto.PaymentPlanDTO;
import com.solar.core_services.payment_compliance.dto.PaymentPlanRequest;
import com.solar.core_services.payment_compliance.model.PaymentPlan;

import java.math.BigDecimal;
import java.util.List;

public interface PaymentPlanService {
    
    PaymentPlanDTO createPaymentPlan(PaymentPlanRequest request);
    
    PaymentPlanDTO updatePaymentPlan(Long planId, PaymentPlanRequest request);
    
    PaymentPlanDTO getPaymentPlanById(Long planId);
    
    List<PaymentPlanDTO> getPaymentPlansByInstallation(Long installationId);
    
    PaymentPlanDTO getActivePaymentPlan(Long installationId);
    
    void updateRemainingAmount(Long planId, BigDecimal paymentAmount);
    
    // Internal methods
    PaymentPlan getPaymentPlanEntityById(Long planId);
    
    void generatePaymentSchedule(PaymentPlan paymentPlan);
} 