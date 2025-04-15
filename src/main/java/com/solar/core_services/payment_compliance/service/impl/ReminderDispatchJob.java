package com.solar.core_services.payment_compliance.service.impl;

import com.solar.core_services.payment_compliance.model.Payment;
import com.solar.core_services.payment_compliance.model.PaymentReminder;
import com.solar.core_services.payment_compliance.repository.PaymentRepository;
import com.solar.core_services.payment_compliance.service.PaymentReminderService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class ReminderDispatchJob {

    private final PaymentRepository paymentRepository;
    private final PaymentReminderService reminderService;

    @Scheduled(cron = "0 0 8 * * ?") // Run at 8 AM every day
    @Transactional
    public void dispatchReminders() {
        log.info("Starting reminder dispatch job");
        
        try {
            // Process reminders in priority order
            dispatchFinalWarningReminders();
            dispatchGracePeriodReminders();
            dispatchOverdueReminders();
            dispatchDueTodayReminders();
            dispatchUpcomingReminders();
            
            // Process any failed reminders from previous attempts
            reminderService.processFailedReminders();
            
            log.info("Completed reminder dispatch job");
        } catch (Exception e) {
            log.error("Error in reminder dispatch job", e);
            // In a real implementation, we would have more robust error handling and alerting
        }
    }
    
    private void dispatchFinalWarningReminders() {
        log.info("Dispatching final warning reminders");
        
        List<Payment> suspensionPendingPayments = paymentRepository.findByStatus(Payment.PaymentStatus.SUSPENSION_PENDING);
        
        for (Payment payment : suspensionPendingPayments) {
            if (!reminderService.hasRecentReminderOfType(payment, PaymentReminder.ReminderType.FINAL_WARNING)) {
                reminderService.sendPaymentReminder(payment, PaymentReminder.ReminderType.FINAL_WARNING);
            }
        }
    }
    
    private void dispatchGracePeriodReminders() {
        log.info("Dispatching grace period reminders");
        
        List<Payment> gracePeriodPayments = paymentRepository.findByStatus(Payment.PaymentStatus.GRACE_PERIOD);
        
        for (Payment payment : gracePeriodPayments) {
            if (!reminderService.hasRecentReminderOfType(payment, PaymentReminder.ReminderType.GRACE_PERIOD)) {
                reminderService.sendPaymentReminder(payment, PaymentReminder.ReminderType.GRACE_PERIOD);
            }
        }
    }
    
    private void dispatchOverdueReminders() {
        log.info("Dispatching overdue reminders");
        
        List<Payment> overduePayments = paymentRepository.findByStatus(Payment.PaymentStatus.OVERDUE);
        
        for (Payment payment : overduePayments) {
            if (!reminderService.hasRecentReminderOfType(payment, PaymentReminder.ReminderType.OVERDUE)) {
                reminderService.sendPaymentReminder(payment, PaymentReminder.ReminderType.OVERDUE);
            }
        }
    }
    
    private void dispatchDueTodayReminders() {
        log.info("Dispatching due today reminders");
        
        LocalDateTime startOfToday = LocalDateTime.now().toLocalDate().atStartOfDay();
        LocalDateTime endOfToday = startOfToday.plusDays(1).minusNanos(1);
        
        List<Payment> dueTodayPayments = paymentRepository.findDueTodayPayments(
                startOfToday, endOfToday, Payment.PaymentStatus.DUE_TODAY);
        
        for (Payment payment : dueTodayPayments) {
            if (!reminderService.hasRecentReminderOfType(payment, PaymentReminder.ReminderType.DUE_TODAY)) {
                reminderService.sendPaymentReminder(payment, PaymentReminder.ReminderType.DUE_TODAY);
            }
        }
    }
    
    private void dispatchUpcomingReminders() {
        log.info("Dispatching upcoming payment reminders");
        
        List<Payment> upcomingPayments = paymentRepository.findByStatus(Payment.PaymentStatus.UPCOMING);
        
        for (Payment payment : upcomingPayments) {
            if (!reminderService.hasRecentReminderOfType(payment, PaymentReminder.ReminderType.UPCOMING_PAYMENT)) {
                reminderService.sendPaymentReminder(payment, PaymentReminder.ReminderType.UPCOMING_PAYMENT);
            }
        }
    }
} 