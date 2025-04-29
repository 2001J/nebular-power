package com.solar.core_services.payment_compliance.service.impl;

import com.solar.core_services.energy_monitoring.model.SolarInstallation;
import com.solar.core_services.energy_monitoring.repository.SolarInstallationRepository;
import com.solar.core_services.payment_compliance.dto.PaymentDTO;
import com.solar.core_services.payment_compliance.dto.PaymentPlanDTO;
import com.solar.core_services.payment_compliance.dto.PaymentPlanRequest;
import com.solar.core_services.payment_compliance.model.Payment;
import com.solar.core_services.payment_compliance.model.PaymentPlan;
import com.solar.core_services.payment_compliance.repository.PaymentPlanRepository;
import com.solar.core_services.payment_compliance.repository.PaymentRepository;
import com.solar.core_services.payment_compliance.service.GracePeriodConfigService;
import com.solar.core_services.payment_compliance.service.PaymentEventPublisher;
import com.solar.core_services.payment_compliance.service.PaymentPlanService;
import com.solar.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentPlanServiceImpl implements PaymentPlanService {

    private final PaymentPlanRepository paymentPlanRepository;
    private final PaymentRepository paymentRepository;
    private final SolarInstallationRepository installationRepository;
    private final PaymentEventPublisher paymentEventPublisher;
    private final GracePeriodConfigService gracePeriodConfigService;

    @Override
    @Transactional
    public PaymentPlanDTO createPaymentPlan(PaymentPlanRequest request) {
        SolarInstallation installation = installationRepository.findById(request.getInstallationId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Solar installation not found with id: " + request.getInstallationId()));

        // Check if there's already an active plan
        paymentPlanRepository.findActivePaymentPlan(installation, LocalDate.now().atStartOfDay())
                .ifPresent(existingPlan -> {
                    throw new IllegalStateException("An active payment plan already exists for this installation");
                });

        PaymentPlan paymentPlan = new PaymentPlan();
        paymentPlan.setInstallation(installation);
        paymentPlan.setName(request.getName() != null ? request.getName()
                : "Payment Plan for Installation #" + installation.getId());
        paymentPlan.setDescription(request.getDescription());
        paymentPlan.setInstallmentAmount(request.getInstallmentAmount());
        paymentPlan.setFrequency(request.getFrequency());
        paymentPlan.setStartDate(request.getStartDate().atStartOfDay());
        paymentPlan.setEndDate(request.getEndDate().atStartOfDay());
        paymentPlan.setTotalAmount(request.getTotalAmount());
        paymentPlan.setRemainingAmount(request.getTotalAmount());
        paymentPlan.setStatus(PaymentPlan.PaymentPlanStatus.ACTIVE);
        paymentPlan.setInterestRate(request.getInterestRate() != null ? request.getInterestRate() : BigDecimal.ZERO);

        // Handle late fee settings
        if (!request.isApplyLateFee()) {
            // If late fees are disabled, set the amount to zero and don't use global
            // settings
            paymentPlan.setLateFeeAmount(BigDecimal.ZERO);
            log.info("Late fees are explicitly disabled for new plan");
        } else if (request.isUseDefaultLateFee()) {
            // Use the system-wide late fee if flag is set to use default
            paymentPlan.setLateFeeAmount(gracePeriodConfigService.getLateFeeAmount());
            log.info("Using default late fee amount: {} for new plan",
                    gracePeriodConfigService.getLateFeeAmount());
        } else if (request.getLateFeeAmount() != null) {
            // Only use the provided value if not using default
            paymentPlan.setLateFeeAmount(request.getLateFeeAmount());
            log.info("Using custom late fee amount: {} for new plan",
                    request.getLateFeeAmount());
        } else {
            // Fallback to system settings if nothing is specified but late fees are enabled
            paymentPlan.setLateFeeAmount(gracePeriodConfigService.getLateFeeAmount());
            log.info("Falling back to default late fee amount: {} for new plan",
                    gracePeriodConfigService.getLateFeeAmount());
        }

        // Handle grace period settings
        if (request.isUseDefaultGracePeriod()) {
            // Use the system-wide grace period if flag is set to use default
            paymentPlan.setGracePeriodDays(gracePeriodConfigService.getGracePeriodDays());
            log.info("Using default grace period: {} days for new plan",
                    gracePeriodConfigService.getGracePeriodDays());
        } else if (request.getGracePeriodDays() != null) {
            // Only use the provided value if not using default
            paymentPlan.setGracePeriodDays(request.getGracePeriodDays());
            log.info("Using custom grace period: {} days for new plan",
                    request.getGracePeriodDays());
        } else {
            // Fallback to system settings if nothing is specified
            paymentPlan.setGracePeriodDays(gracePeriodConfigService.getGracePeriodDays());
            log.info("Falling back to default grace period: {} days for new plan",
                    gracePeriodConfigService.getGracePeriodDays());
        }

        // Calculate number of payments based on the total amount and installment amount
        int numberOfPayments;
        if (request.getInstallmentAmount() != null && request.getInstallmentAmount().compareTo(BigDecimal.ZERO) > 0) {
            // If installment amount is provided, calculate number of payments by dividing total by installment
            numberOfPayments = request.getTotalAmount().divide(request.getInstallmentAmount(), 0, RoundingMode.CEILING).intValue();
            log.info("Calculated {} payments based on total amount {} and installment amount {}", 
                     numberOfPayments, request.getTotalAmount(), request.getInstallmentAmount());
        } else {
            // Otherwise, calculate based on date range and frequency
            numberOfPayments = calculateNumberOfPayments(
                    paymentPlan.getStartDate().toLocalDate(),
                    paymentPlan.getEndDate().toLocalDate(),
                    paymentPlan.getFrequency());
            log.info("Calculated {} payments based on date range and frequency", numberOfPayments);
        }
        
        paymentPlan.setNumberOfPayments(numberOfPayments);

        PaymentPlan savedPlan = paymentPlanRepository.save(paymentPlan);

        // Generate payment schedule
        generatePaymentSchedule(savedPlan);

        // Notify service control
        paymentEventPublisher.publishPaymentPlanUpdated(savedPlan);

        return mapToDTO(savedPlan);
    }

    @Override
    @Transactional
    public PaymentPlanDTO updatePaymentPlan(Long planId, PaymentPlanRequest request) {
        PaymentPlan paymentPlan = getPaymentPlanEntityById(planId);

        // Validate the installation ID matches
        if (!paymentPlan.getInstallation().getId().equals(request.getInstallationId())) {
            throw new IllegalArgumentException(
                    "Installation ID in request does not match the payment plan's installation");
        }

        // Update plan details
        paymentPlan.setInstallmentAmount(request.getInstallmentAmount());
        paymentPlan.setFrequency(request.getFrequency());
        paymentPlan.setEndDate(request.getEndDate().atStartOfDay());
        paymentPlan.setTotalAmount(request.getTotalAmount());

        // Handle late fee settings
        if (!request.isApplyLateFee()) {
            // If late fees are disabled, set the amount to zero and don't use global
            // settings
            paymentPlan.setLateFeeAmount(BigDecimal.ZERO);
            log.info("Late fees are explicitly disabled for plan ID: {}", planId);
        } else if (request.isUseDefaultLateFee()) {
            // Use the system-wide late fee if flag is set to use default
            paymentPlan.setLateFeeAmount(gracePeriodConfigService.getLateFeeAmount());
            log.info("Using default late fee amount: {} for plan ID: {}",
                    gracePeriodConfigService.getLateFeeAmount(), planId);
        } else if (request.getLateFeeAmount() != null) {
            // Only use the provided value if not using default
            paymentPlan.setLateFeeAmount(request.getLateFeeAmount());
            log.info("Using custom late fee amount: {} for plan ID: {}",
                    request.getLateFeeAmount(), planId);
        }

        // Handle grace period settings
        if (request.isUseDefaultGracePeriod()) {
            // Use the system-wide grace period if flag is set to use default
            paymentPlan.setGracePeriodDays(gracePeriodConfigService.getGracePeriodDays());
            log.info("Using default grace period: {} days for plan ID: {}",
                    gracePeriodConfigService.getGracePeriodDays(), planId);
        } else if (request.getGracePeriodDays() != null) {
            // Only use the provided value if not using default
            paymentPlan.setGracePeriodDays(request.getGracePeriodDays());
            log.info("Using custom grace period: {} days for plan ID: {}",
                    request.getGracePeriodDays(), planId);
        }

        // Recalculate remaining amount based on payments made
        BigDecimal paidAmount = paymentPlan.getTotalAmount().subtract(paymentPlan.getRemainingAmount());
        paymentPlan.setRemainingAmount(request.getTotalAmount().subtract(paidAmount));

        PaymentPlan updatedPlan = paymentPlanRepository.save(paymentPlan);

        // Clear existing future payments and regenerate schedule
        List<Payment> existingPayments = paymentRepository.findByPaymentPlan(paymentPlan);
        List<Payment> paymentsToKeep = existingPayments.stream()
                .filter(p -> p.getStatus() == Payment.PaymentStatus.PAID ||
                        p.getStatus() == Payment.PaymentStatus.PARTIALLY_PAID)
                .collect(Collectors.toList());

        // Delete future unpaid payments
        existingPayments.stream()
                .filter(p -> p.getStatus() != Payment.PaymentStatus.PAID &&
                        p.getStatus() != Payment.PaymentStatus.PARTIALLY_PAID)
                .forEach(paymentRepository::delete);

        // Regenerate payment schedule
        generatePaymentSchedule(updatedPlan);

        // Notify service control
        paymentEventPublisher.publishPaymentPlanUpdated(updatedPlan);

        return mapToDTO(updatedPlan);
    }

    @Override
    @Transactional(readOnly = true)
    public PaymentPlanDTO getPaymentPlanById(Long planId) {
        PaymentPlan paymentPlan = getPaymentPlanEntityById(planId);
        return mapToDTO(paymentPlan);
    }

    @Override
    @Transactional(readOnly = true)
    public List<PaymentPlanDTO> getPaymentPlansByInstallation(Long installationId) {
        SolarInstallation installation = installationRepository.findById(installationId)
                .orElseThrow(
                        () -> new ResourceNotFoundException("Solar installation not found with id: " + installationId));

        List<PaymentPlan> plans = paymentPlanRepository.findByInstallation(installation);
        return plans.stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public PaymentPlanDTO getActivePaymentPlan(Long installationId) {
        SolarInstallation installation = installationRepository.findById(installationId)
                .orElseThrow(
                        () -> new ResourceNotFoundException("Solar installation not found with id: " + installationId));

        PaymentPlan activePlan = paymentPlanRepository
                .findActivePaymentPlan(installation, LocalDate.now().atStartOfDay())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No active payment plan found for installation id: " + installationId));

        return mapToDTO(activePlan);
    }

    @Override
    @Transactional
    public void updateRemainingAmount(Long planId, BigDecimal paymentAmount) {
        PaymentPlan plan = getPaymentPlanEntityById(planId);

        // Ensure we don't go below zero
        BigDecimal newRemainingAmount = plan.getRemainingAmount().subtract(paymentAmount);
        if (newRemainingAmount.compareTo(BigDecimal.ZERO) < 0) {
            newRemainingAmount = BigDecimal.ZERO;
        }

        plan.setRemainingAmount(newRemainingAmount);
        paymentPlanRepository.save(plan);

        log.info("Updated remaining amount for payment plan ID: {}. New remaining amount: {}",
                planId, newRemainingAmount);
    }

    @Override
    @Transactional(readOnly = true)
    public PaymentPlan getPaymentPlanEntityById(Long planId) {
        return paymentPlanRepository.findById(planId)
                .orElseThrow(() -> new ResourceNotFoundException("Payment plan not found with id: " + planId));
    }

    @Override
    @Transactional
    public void generatePaymentSchedule(PaymentPlan paymentPlan) {
        log.info("Generating payment schedule for plan ID: {}", paymentPlan.getId());

        LocalDate startDate = paymentPlan.getStartDate().toLocalDate();
        LocalDate endDate = paymentPlan.getEndDate().toLocalDate();
        LocalDate today = LocalDate.now();

        // If start date is today, shift the first payment to the next month
        // to avoid same-day payments
        if (startDate.equals(today)) {
            startDate = today.plusMonths(1);
            log.info("First payment shifted to next month since payment plan was created today");
        }

        // Get number of payments from the payment plan
        int numberOfPayments = paymentPlan.getNumberOfPayments();
        log.info("Plan specifies {} payments", numberOfPayments);
        
        // Verify the installment amount makes sense for the total amount and number of payments
        if (paymentPlan.getInstallmentAmount() == null
                || paymentPlan.getInstallmentAmount().compareTo(BigDecimal.ZERO) == 0) {
            paymentPlan.setInstallmentAmount(
                    paymentPlan.getTotalAmount().divide(BigDecimal.valueOf(numberOfPayments), 2, RoundingMode.HALF_UP));
            log.info("Calculated installment amount: {}", paymentPlan.getInstallmentAmount());
        } else {
            // Validate that the installment amount * number of payments approximately equals the total amount
            BigDecimal calculatedTotal = paymentPlan.getInstallmentAmount().multiply(BigDecimal.valueOf(numberOfPayments));
            if (calculatedTotal.compareTo(paymentPlan.getTotalAmount()) != 0) {
                log.warn("Warning: installment amount ({}) * number of payments ({}) = {} does not match total amount ({})",
                         paymentPlan.getInstallmentAmount(), numberOfPayments, calculatedTotal, paymentPlan.getTotalAmount());
                
                // Adjust the final payment to make the sum equal to the total amount
                log.info("Will adjust final payment to ensure total matches");
            }
        }

        // Get existing paid payments to avoid duplicates
        List<Payment> existingPaidPayments = paymentRepository.findByPaymentPlanAndStatus(paymentPlan,
                Payment.PaymentStatus.PAID);
        List<LocalDateTime> paidDates = existingPaidPayments.stream()
                .map(Payment::getDueDate)
                .collect(Collectors.toList());

        // Get all existing payments for this plan to avoid duplicates
        List<Payment> existingPayments = paymentRepository.findByPaymentPlan(paymentPlan);
        Map<LocalDateTime, Payment> paymentsByDueDate = existingPayments.stream()
                .collect(Collectors.toMap(Payment::getDueDate, p -> p, (p1, p2) -> p1));

        List<Payment> newPayments = new ArrayList<>();

        // Start date for payments
        LocalDateTime dueDateTime = startDate.atTime(0, 0);
        BigDecimal totalPlanned = BigDecimal.ZERO;
        
        for (int i = 0; i < numberOfPayments; i++) {
            boolean isLastPayment = (i == numberOfPayments - 1);
            BigDecimal paymentAmount = paymentPlan.getInstallmentAmount();
            
            // For the last payment, adjust amount if needed to match total exactly
            if (isLastPayment) {
                BigDecimal remaining = paymentPlan.getTotalAmount().subtract(totalPlanned);
                if (remaining.compareTo(paymentAmount) != 0) {
                    log.info("Adjusting final payment from {} to {} to match total amount exactly", 
                             paymentAmount, remaining);
                    paymentAmount = remaining;
                }
            }
            
            // Skip if this date already has a payment
            if (!paymentsByDueDate.containsKey(dueDateTime)) {
                Payment payment = new Payment();
                payment.setPaymentPlan(paymentPlan);
                payment.setInstallation(paymentPlan.getInstallation());
                payment.setAmount(paymentAmount);
                payment.setDueDate(dueDateTime);
                payment.setStatus(Payment.PaymentStatus.SCHEDULED);
                payment.setStatusReason("Payment scheduled as part of payment plan");

                newPayments.add(payment);
                totalPlanned = totalPlanned.add(paymentAmount);
                log.info("Scheduled payment #{}: {} due on {}", i+1, paymentAmount, dueDateTime);
            } else {
                // There's already a payment for this date
                Payment existingPayment = paymentsByDueDate.get(dueDateTime);
                totalPlanned = totalPlanned.add(existingPayment.getAmount());
                log.info("Payment already exists for {}: {}", dueDateTime, existingPayment.getAmount());
            }

            // Increment date based on frequency for next payment
            switch (paymentPlan.getFrequency()) {
                case MONTHLY:
                    dueDateTime = dueDateTime.plusMonths(1);
                    break;
                case QUARTERLY:
                    dueDateTime = dueDateTime.plusMonths(3);
                    break;
                case SEMI_ANNUALLY:
                    dueDateTime = dueDateTime.plusMonths(6);
                    break;
                case ANNUALLY:
                    dueDateTime = dueDateTime.plusYears(1);
                    break;
                case WEEKLY:
                    dueDateTime = dueDateTime.plusWeeks(1);
                    break;
                case BI_WEEKLY:
                    dueDateTime = dueDateTime.plusWeeks(2);
                    break;
                default:
                    dueDateTime = dueDateTime.plusDays(1); // fallback
            }
        }

        // Verify the payments sum to the total amount
        log.info("Plan total amount: {}, Sum of all payments: {}", paymentPlan.getTotalAmount(), totalPlanned);
        
        // Save all new payments
        if (!newPayments.isEmpty()) {
            paymentRepository.saveAll(newPayments);
            log.info("Generated {} new payments for payment plan ID: {}", newPayments.size(), paymentPlan.getId());
        }
    }

    private PaymentPlanDTO mapToDTO(PaymentPlan plan) {
        // Calculate total installments based on the numberOfPayments field
        // This is more reliable than counting payments which might include system entries
        int totalInstallments = plan.getNumberOfPayments();
        
        // Count remaining installments that are still scheduled
        int remainingInstallments = paymentRepository.findByPaymentPlanAndStatus(
                plan, Payment.PaymentStatus.SCHEDULED).size();
                
        // Find next payment date
        LocalDateTime nextPaymentDate = null;
        if (plan.getPayments() != null && !plan.getPayments().isEmpty()) {
            nextPaymentDate = plan.getPayments().stream()
                    .filter(p -> p.getStatus() == Payment.PaymentStatus.SCHEDULED || 
                                p.getStatus() == Payment.PaymentStatus.UPCOMING || 
                                p.getStatus() == Payment.PaymentStatus.DUE_TODAY)
                    .min(Comparator.comparing(Payment::getDueDate))
                    .map(Payment::getDueDate)
                    .orElse(null);
        }

        return PaymentPlanDTO.builder()
                .id(plan.getId())
                .installationId(plan.getInstallation().getId())
                .customerName(plan.getInstallation().getUser().getFullName())
                .customerEmail(plan.getInstallation().getUser().getEmail())
                .name(plan.getName())
                .description(plan.getDescription())
                .totalAmount(plan.getTotalAmount())
                .remainingAmount(plan.getRemainingAmount())
                .numberOfPayments(plan.getNumberOfPayments())
                .totalInstallments(totalInstallments)
                .remainingInstallments(remainingInstallments)
                .installmentAmount(plan.getInstallmentAmount())
                .monthlyPayment(plan.getInstallmentAmount())
                .frequency(plan.getFrequency())
                .startDate(plan.getStartDate())
                .endDate(plan.getEndDate())
                .status(plan.getStatus())
                .interestRate(plan.getInterestRate())
                .lateFeeAmount(plan.getLateFeeAmount())
                .gracePeriodDays(plan.getGracePeriodDays())
                .payments(plan.getPayments().stream()
                        .map(PaymentDTO::fromEntity)
                        .collect(Collectors.toList()))
                .nextPaymentDate(nextPaymentDate)
                .createdAt(plan.getCreatedAt())
                .updatedAt(plan.getUpdatedAt())
                .build();
    }

    private Payment createPaymentForSchedule(PaymentPlan plan, LocalDateTime dueDate, BigDecimal amount,
            int paymentNumber) {
        Payment payment = Payment.builder()
                .installation(plan.getInstallation())
                .paymentPlan(plan)
                .amount(amount)
                .dueDate(dueDate)
                .status(Payment.PaymentStatus.SCHEDULED)
                .statusReason("Scheduled payment")
                .build();

        return payment;
    }

    /**
     * Calculate the number of payments based on start date, end date, and frequency
     */
    private int calculateNumberOfPayments(LocalDate startDate, LocalDate endDate,
            PaymentPlan.PaymentFrequency frequency) {
        long totalDays = ChronoUnit.DAYS.between(startDate, endDate);
        int numberOfPayments;

        switch (frequency) {
            case MONTHLY:
                numberOfPayments = (int) Math.ceil(totalDays / 30.0);
                break;
            case QUARTERLY:
                numberOfPayments = (int) Math.ceil(totalDays / 90.0);
                break;
            case SEMI_ANNUALLY:
                numberOfPayments = (int) Math.ceil(totalDays / 180.0);
                break;
            case ANNUALLY:
                numberOfPayments = (int) Math.ceil(totalDays / 365.0);
                break;
            case WEEKLY:
                numberOfPayments = (int) Math.ceil(totalDays / 7.0);
                break;
            case BI_WEEKLY:
                numberOfPayments = (int) Math.ceil(totalDays / 14.0);
                break;
            default:
                throw new IllegalArgumentException("Unsupported payment frequency: " + frequency);
        }

        // Ensure at least one payment
        return Math.max(1, numberOfPayments);
    }
}