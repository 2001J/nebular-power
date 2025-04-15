package com.solar.core_services.payment_compliance.service.impl;

import com.solar.core_services.payment_compliance.dto.PaymentReminderDTO;
import com.solar.core_services.payment_compliance.model.Payment;
import com.solar.core_services.payment_compliance.model.PaymentReminder;
import com.solar.core_services.payment_compliance.repository.PaymentReminderRepository;
import com.solar.core_services.payment_compliance.repository.PaymentRepository;
import com.solar.core_services.payment_compliance.service.PaymentReminderService;
import com.solar.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentReminderServiceImpl implements PaymentReminderService {

    private final PaymentReminderRepository reminderRepository;
    private final PaymentRepository paymentRepository;
    
    // In a real implementation, these would be injected notification services
    // private final EmailService emailService;
    // private final SmsService smsService;
    
    private static final int MAX_RETRY_ATTEMPTS = 3;
    private static final int REMINDER_COOLDOWN_HOURS = 24; // Don't send same reminder type within 24 hours

    @Override
    @Transactional
    public void sendPaymentReminder(Payment payment, PaymentReminder.ReminderType reminderType) {
        log.info("Sending {} reminder for payment ID: {}", reminderType, payment.getId());
        
        // Check if we've already sent this type of reminder recently
        if (hasRecentReminderOfType(payment, reminderType)) {
            log.info("Skipping reminder as a similar one was sent recently for payment ID: {}", payment.getId());
            return;
        }
        
        // Create reminder record
        PaymentReminder reminder = new PaymentReminder();
        reminder.setPayment(payment);
        reminder.setReminderType(reminderType);
        
        // In a real implementation, we would get the user's contact info from the installation
        String userEmail = payment.getInstallation().getUser().getEmail();
        String userPhone = payment.getInstallation().getUser().getPhoneNumber();
        
        // Determine delivery channel (email for this example)
        reminder.setDeliveryChannel("EMAIL");
        reminder.setRecipientAddress(userEmail);
        
        // Generate message content based on reminder type
        String messageContent = generateReminderMessage(payment, reminderType);
        reminder.setMessageContent(messageContent);
        
        // Save the reminder before attempting delivery
        PaymentReminder savedReminder = reminderRepository.save(reminder);
        
        try {
            // In a real implementation, we would call the email service
            // emailService.sendEmail(userEmail, getSubjectForReminderType(reminderType), messageContent);
            
            // Simulate sending email
            log.info("Simulating sending email to: {} with subject: {}", userEmail, getSubjectForReminderType(reminderType));
            
            // Update delivery status
            savedReminder.setDeliveryStatus(PaymentReminder.DeliveryStatus.SENT);
            reminderRepository.save(savedReminder);
            
            log.info("Successfully sent {} reminder for payment ID: {}", reminderType, payment.getId());
        } catch (Exception e) {
            log.error("Failed to send reminder for payment ID: {}", payment.getId(), e);
            savedReminder.setDeliveryStatus(PaymentReminder.DeliveryStatus.FAILED);
            savedReminder.setErrorMessage(e.getMessage());
            reminderRepository.save(savedReminder);
        }
    }

    @Override
    @Transactional
    public void processFailedReminders() {
        log.info("Processing failed reminders for retry");
        
        List<PaymentReminder> failedReminders = reminderRepository.findFailedRemindersForRetry(
                PaymentReminder.DeliveryStatus.FAILED, MAX_RETRY_ATTEMPTS);
        
        log.info("Found {} failed reminders to retry", failedReminders.size());
        
        for (PaymentReminder reminder : failedReminders) {
            try {
                // Increment retry count
                reminder.setRetryCount(reminder.getRetryCount() + 1);
                reminder.setLastRetryDate(LocalDateTime.now());
                
                // In a real implementation, we would retry sending the notification
                // if (reminder.getDeliveryChannel().equals("EMAIL")) {
                //     emailService.sendEmail(reminder.getRecipientAddress(), 
                //                           getSubjectForReminderType(reminder.getReminderType()), 
                //                           reminder.getMessageContent());
                // } else if (reminder.getDeliveryChannel().equals("SMS")) {
                //     smsService.sendSms(reminder.getRecipientAddress(), reminder.getMessageContent());
                // }
                
                // Simulate successful retry
                log.info("Simulating successful retry for reminder ID: {}", reminder.getId());
                
                reminder.setDeliveryStatus(PaymentReminder.DeliveryStatus.SENT);
                reminderRepository.save(reminder);
                
                log.info("Successfully retried reminder ID: {}", reminder.getId());
            } catch (Exception e) {
                log.error("Failed to retry reminder ID: {}", reminder.getId(), e);
                
                // If we've reached max retries, mark as permanently failed
                if (reminder.getRetryCount() >= MAX_RETRY_ATTEMPTS) {
                    reminder.setDeliveryStatus(PaymentReminder.DeliveryStatus.FAILED);
                    log.warn("Max retry attempts reached for reminder ID: {}", reminder.getId());
                } else {
                    reminder.setDeliveryStatus(PaymentReminder.DeliveryStatus.RETRY_SCHEDULED);
                }
                
                reminder.setErrorMessage(e.getMessage());
                reminderRepository.save(reminder);
            }
        }
    }

    @Override
    @Transactional(readOnly = true)
    public List<PaymentReminderDTO> getRemindersByPayment(Long paymentId) {
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new ResourceNotFoundException("Payment not found with id: " + paymentId));
        
        List<PaymentReminder> reminders = reminderRepository.findByPayment(payment);
        return reminders.stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public Page<PaymentReminderDTO> getRemindersByUser(Long userId, Pageable pageable) {
        Page<PaymentReminder> reminderPage = reminderRepository.findByUserId(userId, pageable);
        return reminderPage.map(this::mapToDTO);
    }

    @Override
    @Transactional
    public void sendManualReminder(Long paymentId, PaymentReminder.ReminderType reminderType) {
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new ResourceNotFoundException("Payment not found with id: " + paymentId));
        
        sendPaymentReminder(payment, reminderType);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean hasRecentReminderOfType(Payment payment, PaymentReminder.ReminderType reminderType) {
        LocalDateTime cutoffTime = LocalDateTime.now().minusHours(REMINDER_COOLDOWN_HOURS);
        Long count = reminderRepository.countRecentRemindersByType(payment, reminderType, cutoffTime);
        return count > 0;
    }
    
    private String generateReminderMessage(Payment payment, PaymentReminder.ReminderType reminderType) {
        String customerName = payment.getInstallation().getUser().getFullName();
        String formattedAmount = payment.getAmount().toString();
        String formattedDueDate = payment.getDueDate().toLocalDate().toString();
        
        switch (reminderType) {
            case UPCOMING_PAYMENT:
                return String.format(
                        "Dear %s,\n\nThis is a friendly reminder that your solar installment payment of $%s is due on %s. " +
                        "Please ensure your account has sufficient funds for the automatic payment, or log in to make a manual payment.\n\n" +
                        "Thank you for choosing our solar energy solutions.\n\nBest regards,\nSolar Energy Team",
                        customerName, formattedAmount, formattedDueDate);
                
            case DUE_TODAY:
                return String.format(
                        "Dear %s,\n\nYour solar installment payment of $%s is due today. " +
                        "Please ensure your payment is processed by the end of the day to maintain uninterrupted service.\n\n" +
                        "You can make your payment through our website or mobile app.\n\n" +
                        "Thank you for your prompt attention to this matter.\n\nBest regards,\nSolar Energy Team",
                        customerName, formattedAmount);
                
            case OVERDUE:
                return String.format(
                        "Dear %s,\n\nYour solar installment payment of $%s was due on %s and is now overdue. " +
                        "Please make your payment as soon as possible to avoid any late fees or service interruptions.\n\n" +
                        "If you have already made your payment, please disregard this message.\n\n" +
                        "Thank you for your attention to this matter.\n\nBest regards,\nSolar Energy Team",
                        customerName, formattedAmount, formattedDueDate);
                
            case GRACE_PERIOD:
                return String.format(
                        "Dear %s,\n\nThis is an important notice regarding your overdue solar installment payment of $%s " +
                        "that was due on %s. Your account is currently in the grace period.\n\n" +
                        "To avoid service suspension, please make your payment immediately. " +
                        "If you are experiencing financial difficulties, please contact our customer service team to discuss payment options.\n\n" +
                        "Thank you for your prompt attention to this matter.\n\nBest regards,\nSolar Energy Team",
                        customerName, formattedAmount, formattedDueDate);
                
            case FINAL_WARNING:
                return String.format(
                        "Dear %s,\n\nFINAL NOTICE: Your solar installment payment of $%s remains unpaid since %s. " +
                        "Your grace period is about to expire, and your service will be suspended if payment is not received within 24 hours.\n\n" +
                        "To maintain your solar energy service, please make your payment immediately. " +
                        "If you need assistance, please contact our customer service team urgently.\n\n" +
                        "Thank you for your immediate attention to this critical matter.\n\nBest regards,\nSolar Energy Team",
                        customerName, formattedAmount, formattedDueDate);
                
            default:
                return String.format(
                        "Dear %s,\n\nThis is a notification regarding your solar installment payment of $%s due on %s. " +
                        "Please log in to your account for more details.\n\n" +
                        "Thank you for choosing our solar energy solutions.\n\nBest regards,\nSolar Energy Team",
                        customerName, formattedAmount, formattedDueDate);
        }
    }
    
    private String getSubjectForReminderType(PaymentReminder.ReminderType reminderType) {
        switch (reminderType) {
            case UPCOMING_PAYMENT:
                return "Upcoming Solar Payment Reminder";
            case DUE_TODAY:
                return "Solar Payment Due Today";
            case OVERDUE:
                return "Overdue Solar Payment Notice";
            case GRACE_PERIOD:
                return "Important: Solar Payment Grace Period Notice";
            case FINAL_WARNING:
                return "URGENT: Final Notice Before Service Suspension";
            default:
                return "Solar Payment Notification";
        }
    }
    
    private PaymentReminderDTO mapToDTO(PaymentReminder reminder) {
        return PaymentReminderDTO.builder()
                .id(reminder.getId())
                .paymentId(reminder.getPayment().getId())
                .sentDate(reminder.getSentDate())
                .reminderType(reminder.getReminderType())
                .deliveryStatus(reminder.getDeliveryStatus())
                .deliveryChannel(reminder.getDeliveryChannel())
                .recipientAddress(reminder.getRecipientAddress())
                .retryCount(reminder.getRetryCount())
                .lastRetryDate(reminder.getLastRetryDate())
                .build();
    }
} 