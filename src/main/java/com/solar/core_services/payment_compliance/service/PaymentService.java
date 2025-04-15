package com.solar.core_services.payment_compliance.service;

import com.solar.core_services.payment_compliance.dto.MakePaymentRequest;
import com.solar.core_services.payment_compliance.dto.PaymentDTO;
import com.solar.core_services.payment_compliance.dto.PaymentDashboardDTO;
import com.solar.core_services.payment_compliance.model.Payment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.List;

public interface PaymentService {
    
    // Customer-facing methods
    PaymentDashboardDTO getCustomerDashboard(Long userId);
    
    List<PaymentDTO> getPaymentHistory(Long userId, Pageable pageable);
    
    List<PaymentDTO> getUpcomingPayments(Long userId);
    
    PaymentDTO makePayment(Long userId, MakePaymentRequest request);
    
    byte[] generatePaymentReceipt(Long userId, Long paymentId);
    
    // Admin-facing methods
    Page<PaymentDTO> getAllOverduePayments(Pageable pageable);
    
    Page<PaymentDTO> getPaymentsByInstallation(Long installationId, Pageable pageable);
    
    PaymentDTO recordManualPayment(Long paymentId, MakePaymentRequest request);
    
    Page<PaymentDTO> getOverduePayments(Pageable pageable);
    
    // Scheduled job methods
    void updatePaymentStatuses();
    
    void identifyUpcomingPayments(LocalDateTime reminderThreshold);
    
    void markOverduePayments();
    
    void calculateDaysOverdue();
    
    void flagAccountsForSuspension();
    
    // Internal methods
    Payment getPaymentById(Long paymentId);
    
    void updatePaymentStatus(Payment payment, Payment.PaymentStatus newStatus, String reason);
} 