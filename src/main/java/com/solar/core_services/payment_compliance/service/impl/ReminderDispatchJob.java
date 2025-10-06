package com.solar.core_services.payment_compliance.service.impl;

import com.solar.core_services.payment_compliance.model.Payment;
import com.solar.core_services.payment_compliance.model.PaymentReminder;
import com.solar.core_services.payment_compliance.repository.PaymentRepository;
import com.solar.core_services.payment_compliance.service.PaymentReminderService;
import com.solar.core_services.payment_compliance.service.ReminderConfigService;
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
    private final ReminderConfigService reminderConfigService;

    @Scheduled(cron = "0 0 8 * * ?") // Run at 8 AM every day
    @Transactional
    public void dispatchReminders() {
        log.info("Starting reminder dispatch job");
        // Honor auto-reminder configuration
        try {
            if (!reminderConfigService.isAutoSendRemindersEnabled()) {
                log.info("Auto-send reminders is disabled. Skipping reminder dispatch job.");
                return;
            }
        } catch (Exception e) {
            log.warn("Could not determine auto-reminder configuration. Proceeding with defaults.");
        }
        
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
        log.info("Dispatching upcoming payment reminders (exact-day thresholds)");

        // Read configured days-before thresholds
        int firstDays = 0;
        int secondDays = 0;
        int finalDays = 0;
        try {
            firstDays = reminderConfigService.getFirstReminderDays();
            secondDays = reminderConfigService.getSecondReminderDays();
            finalDays = reminderConfigService.getFinalReminderDays();
        } catch (Exception ex) {
            log.warn("Failed to read reminder thresholds: {}. Skipping upcoming reminders.", ex.getMessage());
            return;
        }

        // Helper to compute day window
        java.util.function.Function<Integer, java.time.LocalDateTime[]> windowForDays = days -> {
            java.time.LocalDateTime start = java.time.LocalDate.now().plusDays(days).atStartOfDay();
            java.time.LocalDateTime end = start.plusDays(1).minusNanos(1);
            return new java.time.LocalDateTime[]{ start, end };
        };

        // Consider SCHEDULED and UPCOMING to be safe
        java.util.List<Payment.PaymentStatus> statuses = java.util.Arrays.asList(
                Payment.PaymentStatus.SCHEDULED,
                Payment.PaymentStatus.UPCOMING
        );

        // Process each configured day (first, second, final)
        for (int days : new int[]{ firstDays, secondDays, finalDays }) {
            if (days <= 0) continue; // ignore non-positive
            java.time.LocalDateTime[] w = windowForDays.apply(days);
            List<Payment> payments = paymentRepository.findByDueDateBetweenAndStatusIn(w[0], w[1], statuses);
            log.info("Found {} payments due in {} day(s)", payments.size(), days);
            for (Payment payment : payments) {
                if (!reminderService.hasRecentReminderOfType(payment, PaymentReminder.ReminderType.UPCOMING_PAYMENT)) {
                    reminderService.sendPaymentReminder(payment, PaymentReminder.ReminderType.UPCOMING_PAYMENT);
                }
            }
        }
    }
} 
