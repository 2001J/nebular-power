package com.solar.core_services.payment_compliance.service.impl;

import com.solar.core_services.energy_monitoring.model.SolarInstallation;
import com.solar.core_services.energy_monitoring.repository.SolarInstallationRepository;
import com.solar.core_services.payment_compliance.dto.MakePaymentRequest;
import com.solar.core_services.payment_compliance.dto.PaymentDTO;
import com.solar.core_services.payment_compliance.dto.PaymentDashboardDTO;
import com.solar.core_services.payment_compliance.model.Payment;
import com.solar.core_services.payment_compliance.model.PaymentPlan;
import com.solar.core_services.payment_compliance.model.PaymentReminder;
import com.solar.core_services.payment_compliance.repository.PaymentPlanRepository;
import com.solar.core_services.payment_compliance.repository.PaymentRepository;
import com.solar.core_services.payment_compliance.service.GracePeriodConfigService;
import com.solar.core_services.payment_compliance.service.PaymentEventPublisher;
import com.solar.core_services.payment_compliance.service.PaymentPlanService;
import com.solar.core_services.payment_compliance.service.PaymentReminderService;
import com.solar.core_services.payment_compliance.service.PaymentService;
import com.solar.exception.ResourceNotFoundException;
import com.solar.user_management.model.User;
import com.solar.user_management.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Sort;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentServiceImpl implements PaymentService {

    private final PaymentRepository paymentRepository;
    private final PaymentPlanRepository paymentPlanRepository;
    private final SolarInstallationRepository installationRepository;
    private final UserRepository userRepository;
    private final PaymentPlanService paymentPlanService;
    private final PaymentReminderService reminderService;
    private final GracePeriodConfigService gracePeriodConfigService;
    private final PaymentEventPublisher paymentEventPublisher;

    @Override
    @Transactional(readOnly = true)
    public PaymentDashboardDTO getCustomerDashboard(Long userId) {
        log.info("Generating payment dashboard for user ID: {}", userId);
        
        // Find all installations for this user
        List<SolarInstallation> installations = installationRepository.findByUserId(userId);
        if (installations.isEmpty()) {
            throw new ResourceNotFoundException("No solar installations found for user ID: " + userId);
        }
        
        // For simplicity, we'll use the first installation
        SolarInstallation installation = installations.get(0);
        
        // Get active payment plan
        PaymentPlan activePlan = paymentPlanRepository.findActivePaymentPlan(installation, LocalDate.now().atStartOfDay())
                .orElseThrow(() -> new ResourceNotFoundException("No active payment plan found for installation ID: " + installation.getId()));
        
        // Get recent payments (last 5)
        List<Payment> recentPayments = paymentRepository.findByInstallation(
                installation, 
                PageRequest.of(0, 5, Sort.by(Sort.Direction.DESC, "dueDate"))
        ).getContent();
        
        // Get upcoming payments
        LocalDateTime futureDate = LocalDateTime.now().plusMonths(3);
        List<Payment> upcomingPayments = paymentRepository.findUpcomingPayments(
                futureDate, 
                Payment.PaymentStatus.SCHEDULED
        );
        
        // Check for overdue payments
        List<Payment.PaymentStatus> overdueStatuses = Arrays.asList(
                Payment.PaymentStatus.OVERDUE,
                Payment.PaymentStatus.GRACE_PERIOD,
                Payment.PaymentStatus.SUSPENSION_PENDING
        );
        
        boolean hasOverduePayments = paymentRepository.countOverduePaymentsByInstallation(
                installation, 
                overdueStatuses
        ) > 0;
        
        // Find next payment
        Payment nextPayment = null;
        LocalDateTime nextPaymentDueDate = null;
        BigDecimal nextPaymentAmount = null;
        
        for (Payment payment : upcomingPayments) {
            if (payment.getStatus() == Payment.PaymentStatus.SCHEDULED || 
                payment.getStatus() == Payment.PaymentStatus.UPCOMING || 
                payment.getStatus() == Payment.PaymentStatus.DUE_TODAY) {
                
                if (nextPayment == null || payment.getDueDate().isBefore(nextPayment.getDueDate())) {
                    nextPayment = payment;
                }
            }
        }
        
        if (nextPayment != null) {
            nextPaymentDueDate = nextPayment.getDueDate();
            nextPaymentAmount = nextPayment.getAmount();
        }
        
        // Calculate installment counts
        int totalInstallments = paymentRepository.findByPaymentPlan(activePlan).size();
        int completedInstallments = (int) paymentRepository.findByPaymentPlan(activePlan).stream()
                .filter(p -> p.getStatus() == Payment.PaymentStatus.PAID)
                .count();
        int remainingInstallments = totalInstallments - completedInstallments;
        
        // Build the dashboard DTO
        return PaymentDashboardDTO.builder()
                .installationId(installation.getId())
                .totalAmount(activePlan.getTotalAmount())
                .remainingAmount(activePlan.getRemainingAmount())
                .nextPaymentAmount(nextPaymentAmount)
                .nextPaymentDueDate(nextPaymentDueDate)
                .totalInstallments(totalInstallments)
                .remainingInstallments(remainingInstallments)
                .completedInstallments(completedInstallments)
                .hasOverduePayments(hasOverduePayments)
                .recentPayments(recentPayments.stream().map(this::mapToDTO).collect(Collectors.toList()))
                .upcomingPayments(upcomingPayments.stream().map(this::mapToDTO).collect(Collectors.toList()))
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public List<PaymentDTO> getPaymentHistory(Long userId, Pageable pageable) {
        List<SolarInstallation> installations = installationRepository.findByUserId(userId);
        if (installations.isEmpty()) {
            throw new ResourceNotFoundException("No solar installations found for user ID: " + userId);
        }
        
        // For simplicity, we'll use the first installation
        SolarInstallation installation = installations.get(0);
        
        Page<Payment> paymentsPage = paymentRepository.findByInstallation(installation, pageable);
        return paymentsPage.getContent().stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<PaymentDTO> getUpcomingPayments(Long userId) {
        List<SolarInstallation> installations = installationRepository.findByUserId(userId);
        if (installations.isEmpty()) {
            throw new ResourceNotFoundException("No solar installations found for user ID: " + userId);
        }
        
        // For simplicity, we'll use the first installation
        SolarInstallation installation = installations.get(0);
        
        LocalDateTime futureDate = LocalDateTime.now().plusMonths(3);
        List<Payment> upcomingPayments = paymentRepository.findUpcomingPayments(
                futureDate, 
                Payment.PaymentStatus.SCHEDULED
        );
        
        return upcomingPayments.stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public PaymentDTO makePayment(Long userId, MakePaymentRequest request) {
        // Verify user owns the payment
        Payment payment = getPaymentById(request.getPaymentId());
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));
        
        if (!payment.getInstallation().getUser().getId().equals(userId)) {
            throw new IllegalArgumentException("Payment does not belong to this user");
        }
        
        // Process payment
        return processPayment(payment, request);
    }

    @Override
    @Transactional
    public byte[] generatePaymentReceipt(Long userId, Long paymentId) {
        // Verify user owns the payment
        Payment payment = getPaymentById(paymentId);
        
        if (!payment.getInstallation().getUser().getId().equals(userId)) {
            throw new IllegalArgumentException("Payment does not belong to this user");
        }
        
        if (payment.getStatus() != Payment.PaymentStatus.PAID && 
            payment.getStatus() != Payment.PaymentStatus.PARTIALLY_PAID) {
            throw new IllegalStateException("Cannot generate receipt for unpaid payment");
        }
        
        // In a real implementation, we would generate a PDF receipt
        // For now, we'll just return a simple text receipt
        String receipt = generateTextReceipt(payment);
        return receipt.getBytes();
    }

    @Override
    @Transactional(readOnly = true)
    public Page<PaymentDTO> getAllOverduePayments(Pageable pageable) {
        List<Payment.PaymentStatus> overdueStatuses = Arrays.asList(
                Payment.PaymentStatus.OVERDUE,
                Payment.PaymentStatus.GRACE_PERIOD,
                Payment.PaymentStatus.SUSPENSION_PENDING
        );
        
        LocalDateTime now = LocalDateTime.now();
        // Use a direct query instead of filtering after fetching
        List<Payment> overduePaymentsList = paymentRepository.findByStatusIn(overdueStatuses);
        
        // Convert list to page manually
        int start = (int) pageable.getOffset();
        int end = Math.min((start + pageable.getPageSize()), overduePaymentsList.size());
        
        List<Payment> pageContent = overduePaymentsList.subList(start, end);
        Page<Payment> overduePayments = new PageImpl<>(pageContent, pageable, overduePaymentsList.size());
        
        return overduePayments.map(this::mapToDTO);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<PaymentDTO> getPaymentsByInstallation(Long installationId, Pageable pageable) {
        SolarInstallation installation = installationRepository.findById(installationId)
                .orElseThrow(() -> new ResourceNotFoundException("Solar installation not found with id: " + installationId));
        
        Page<Payment> paymentsPage = paymentRepository.findByInstallation(installation, pageable);
        return paymentsPage.map(this::mapToDTO);
    }

    @Override
    @Transactional
    public PaymentDTO recordManualPayment(Long paymentId, MakePaymentRequest request) {
        Payment payment = getPaymentById(paymentId);
        return processPayment(payment, request);
    }

    @Override
    @Scheduled(cron = "0 0 0 * * ?") // Run at midnight every day
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public void updatePaymentStatuses() {
        log.info("Starting daily payment status update job");
        
        try {
            // Phase 1: Identify upcoming payments
            identifyUpcomingPayments(LocalDateTime.now().plusDays(3));
            
            // Phase 2: Mark overdue payments
            markOverduePayments();
            
            // Phase 3: Calculate days overdue
            calculateDaysOverdue();
            
            // Phase 4: Flag accounts for suspension
            flagAccountsForSuspension();
            
            log.info("Completed daily payment status update job");
        } catch (Exception e) {
            log.error("Error in daily payment status update job", e);
            // In a real implementation, we would have more robust error handling and alerting
        }
    }

    @Override
    @Transactional
    public void identifyUpcomingPayments(LocalDateTime reminderThreshold) {
        log.info("Identifying upcoming payments for reminder threshold: {}", reminderThreshold);
        
        // Find payments that are due today and mark them as DUE_TODAY
        LocalDateTime startOfToday = LocalDateTime.now().toLocalDate().atStartOfDay();
        LocalDateTime endOfToday = startOfToday.plusDays(1).minusNanos(1);
        
        List<Payment> dueTodayPayments = paymentRepository.findDueTodayPayments(
                startOfToday, endOfToday, Payment.PaymentStatus.UPCOMING);
        
        for (Payment payment : dueTodayPayments) {
            updatePaymentStatus(payment, Payment.PaymentStatus.DUE_TODAY, "Payment due today");
            
            // Create and send a due today reminder
            reminderService.sendPaymentReminder(payment, PaymentReminder.ReminderType.DUE_TODAY);
        }
        
        // Find payments that are scheduled and due within the reminder threshold
        List<Payment> upcomingPayments = paymentRepository.findByDueDateBetweenAndStatus(
                LocalDateTime.now(), 
                reminderThreshold,
                Payment.PaymentStatus.SCHEDULED
        );
        
        log.info("Found {} upcoming payments", upcomingPayments.size());
        
        for (Payment payment : upcomingPayments) {
            // Update status to UPCOMING
            updatePaymentStatus(payment, Payment.PaymentStatus.UPCOMING, 
                    "Payment due date is within reminder window");
            
            // Send reminder
            reminderService.sendPaymentReminder(payment, PaymentReminder.ReminderType.UPCOMING_PAYMENT);
        }
    }

    @Override
    @Transactional
    public void markOverduePayments() {
        log.info("Marking overdue payments");
        
        // Find payments that are due today or earlier and not paid
        List<Payment> overduePayments = paymentRepository.findByDueDateBeforeAndStatus(
                LocalDateTime.now().plusDays(1).withHour(0).withMinute(0).withSecond(0), 
                Payment.PaymentStatus.DUE_TODAY
        );
        
        log.info("Found {} overdue payments", overduePayments.size());
        
        for (Payment payment : overduePayments) {
            // Update status to OVERDUE
            updatePaymentStatus(payment, Payment.PaymentStatus.OVERDUE, 
                    "Payment date has passed without payment");
            
            // Send reminder
            reminderService.sendPaymentReminder(payment, PaymentReminder.ReminderType.OVERDUE);
        }
    }

    @Override
    @Transactional
    public void calculateDaysOverdue() {
        log.info("Calculating days overdue for payments");
        
        List<Payment.PaymentStatus> overdueStatuses = Arrays.asList(
                Payment.PaymentStatus.OVERDUE,
                Payment.PaymentStatus.GRACE_PERIOD,
                Payment.PaymentStatus.SUSPENSION_PENDING
        );
        
        List<Payment> overduePayments = paymentRepository.findOverduePayments(
                LocalDateTime.now(), 
                overdueStatuses
        );
        
        log.info("Found {} payments to calculate days overdue", overduePayments.size());
        
        for (Payment payment : overduePayments) {
            // Calculate days overdue
            long daysOverdue = ChronoUnit.DAYS.between(payment.getDueDate().toLocalDate(), LocalDate.now());
            payment.setDaysOverdue((int) daysOverdue);
            
            // Check if we need to move to grace period
            int gracePeriodDays = gracePeriodConfigService.getGracePeriodDays();
            int reminderFrequency = gracePeriodConfigService.getReminderFrequency();
            
            if (payment.getStatus() == Payment.PaymentStatus.OVERDUE && daysOverdue >= 3) {
                // Move to grace period
                updatePaymentStatus(payment, Payment.PaymentStatus.GRACE_PERIOD, 
                        "Payment is now in grace period");
                
                // Send grace period reminder
                reminderService.sendPaymentReminder(payment, PaymentReminder.ReminderType.GRACE_PERIOD);
            } else if (payment.getStatus() == Payment.PaymentStatus.GRACE_PERIOD) {
                // Check if we need to send a reminder based on frequency
                if (daysOverdue % reminderFrequency == 0) {
                    reminderService.sendPaymentReminder(payment, PaymentReminder.ReminderType.GRACE_PERIOD);
                }
                
                // Check if grace period is about to expire
                if (daysOverdue >= (gracePeriodDays - 1)) {
                    // Send final warning
                    reminderService.sendPaymentReminder(payment, PaymentReminder.ReminderType.FINAL_WARNING);
                }
            }
            
            paymentRepository.save(payment);
        }
    }

    @Override
    @Transactional
    public void flagAccountsForSuspension() {
        log.info("Flagging accounts for suspension");
        
        // Only proceed if auto-suspend is enabled
        if (!gracePeriodConfigService.isAutoSuspendEnabled()) {
            log.info("Auto-suspend is disabled, skipping suspension check");
            return;
        }
        
        int gracePeriodDays = gracePeriodConfigService.getGracePeriodDays();
        
        List<Payment> gracePeriodPayments = paymentRepository.findByStatus(Payment.PaymentStatus.GRACE_PERIOD);
        
        log.info("Found {} payments in grace period to check for suspension", gracePeriodPayments.size());
        
        for (Payment payment : gracePeriodPayments) {
            // Check if grace period has expired
            if (payment.getDaysOverdue() >= gracePeriodDays) {
                // Update status to SUSPENSION_PENDING
                updatePaymentStatus(payment, Payment.PaymentStatus.SUSPENSION_PENDING, 
                        "Grace period expired, awaiting service suspension");
                
                // Publish event to service control
                paymentEventPublisher.publishGracePeriodExpired(payment);
                
                log.info("Flagged payment ID: {} for suspension", payment.getId());
            }
        }
    }

    @Override
    @Transactional(readOnly = true)
    public Payment getPaymentById(Long paymentId) {
        return paymentRepository.findById(paymentId)
                .orElseThrow(() -> new ResourceNotFoundException("Payment not found with id: " + paymentId));
    }

    @Override
    @Transactional
    public void updatePaymentStatus(Payment payment, Payment.PaymentStatus newStatus, String reason) {
        log.info("Updating payment ID: {} status from {} to {}", payment.getId(), payment.getStatus(), newStatus);
        
        payment.setStatus(newStatus);
        payment.setStatusReason(reason);
        payment.setStatusUpdatedAt(LocalDateTime.now());
        
        paymentRepository.save(payment);
        
        log.info("Successfully updated payment status");
    }
    
    private PaymentDTO processPayment(Payment payment, MakePaymentRequest request) {
        log.info("Processing payment for payment ID: {}", payment.getId());
        
        // Validate payment can be processed
        if (payment.getStatus() == Payment.PaymentStatus.PAID) {
            throw new IllegalStateException("Payment has already been paid");
        }
        
        // Record payment details
        payment.setPaymentMethod(request.getPaymentMethod());
        payment.setTransactionId(request.getTransactionId());
        payment.setPaidAt(LocalDateTime.now());
        
        // Determine if full or partial payment
        Payment.PaymentStatus newStatus;
        String statusReason;
        
        if (request.getAmount().compareTo(payment.getAmount()) >= 0) {
            // Full payment
            newStatus = Payment.PaymentStatus.PAID;
            statusReason = "Payment received in full";
        } else {
            // Partial payment
            newStatus = Payment.PaymentStatus.PARTIALLY_PAID;
            statusReason = "Partial payment received";
        }
        
        // Update payment status
        updatePaymentStatus(payment, newStatus, statusReason);
        
        // Update payment plan remaining amount
        paymentPlanService.updateRemainingAmount(payment.getPaymentPlan().getId(), request.getAmount());
        
        // If payment was overdue and service was suspended, restore service
        if (payment.getInstallation().getStatus() == SolarInstallation.InstallationStatus.SUSPENDED) {
            paymentEventPublisher.publishPaymentReceived(payment);
        }
        
        log.info("Successfully processed payment for payment ID: {}", payment.getId());
        
        return mapToDTO(payment);
    }
    
    private String generateTextReceipt(Payment payment) {
        StringBuilder receipt = new StringBuilder();
        receipt.append("PAYMENT RECEIPT\n");
        receipt.append("==============\n\n");
        receipt.append("Receipt ID: ").append(payment.getId()).append("\n");
        receipt.append("Transaction ID: ").append(payment.getTransactionId()).append("\n");
        receipt.append("Date: ").append(payment.getPaidAt()).append("\n\n");
        receipt.append("Customer: ").append(payment.getInstallation().getUser().getFullName()).append("\n");
        receipt.append("Installation ID: ").append(payment.getInstallation().getId()).append("\n\n");
        receipt.append("Amount Paid: $").append(payment.getAmount()).append("\n");
        receipt.append("Payment Method: ").append(payment.getPaymentMethod()).append("\n");
        receipt.append("Status: ").append(payment.getStatus()).append("\n\n");
        receipt.append("Thank you for your payment!\n");
        
        return receipt.toString();
    }
    
    private PaymentDTO mapToDTO(Payment payment) {
        return PaymentDTO.builder()
                .id(payment.getId())
                .installationId(payment.getInstallation().getId())
                .paymentPlanId(payment.getPaymentPlan().getId())
                .amount(payment.getAmount())
                .dueDate(payment.getDueDate())
                .paidAt(payment.getPaidAt())
                .transactionId(payment.getTransactionId())
                .paymentMethod(payment.getPaymentMethod())
                .daysOverdue(payment.getDaysOverdue())
                .status(payment.getStatus())
                .statusUpdatedAt(payment.getStatusUpdatedAt())
                .statusReason(payment.getStatusReason())
                .customerName(payment.getInstallation().getUser().getFullName())
                .customerEmail(payment.getInstallation().getUser().getEmail())
                .build();
    }

    @Override
    public Page<PaymentDTO> getOverduePayments(Pageable pageable) {
        List<Payment.PaymentStatus> overdueStatuses = Arrays.asList(
                Payment.PaymentStatus.OVERDUE,
                Payment.PaymentStatus.GRACE_PERIOD,
                Payment.PaymentStatus.SUSPENSION_PENDING
        );
        
        LocalDateTime now = LocalDateTime.now();
        // Use a direct query instead of filtering after fetching
        List<Payment> overduePaymentsList = paymentRepository.findByStatusIn(overdueStatuses);
        
        // Convert list to page manually
        int start = (int) pageable.getOffset();
        int end = Math.min((start + pageable.getPageSize()), overduePaymentsList.size());
        
        List<Payment> pageContent = overduePaymentsList.subList(start, end);
        Page<Payment> overduePayments = new PageImpl<>(pageContent, pageable, overduePaymentsList.size());
        
        return overduePayments.map(this::mapToDTO);
    }
} 