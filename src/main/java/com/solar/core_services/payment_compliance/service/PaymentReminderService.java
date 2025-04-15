package com.solar.core_services.payment_compliance.service;

import com.solar.core_services.payment_compliance.dto.PaymentReminderDTO;
import com.solar.core_services.payment_compliance.model.Payment;
import com.solar.core_services.payment_compliance.model.PaymentReminder;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface PaymentReminderService {
    
    void sendPaymentReminder(Payment payment, PaymentReminder.ReminderType reminderType);
    
    void processFailedReminders();
    
    List<PaymentReminderDTO> getRemindersByPayment(Long paymentId);
    
    Page<PaymentReminderDTO> getRemindersByUser(Long userId, Pageable pageable);
    
    void sendManualReminder(Long paymentId, PaymentReminder.ReminderType reminderType);
    
    boolean hasRecentReminderOfType(Payment payment, PaymentReminder.ReminderType reminderType);
} 