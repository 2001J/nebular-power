package com.solar.core_services.payment_compliance.repository;

import com.solar.core_services.energy_monitoring.model.SolarInstallation;
import com.solar.core_services.payment_compliance.model.Payment;
import com.solar.core_services.payment_compliance.model.PaymentPlan;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface PaymentRepository extends JpaRepository<Payment, Long> {
    List<Payment> findByInstallation(SolarInstallation installation);
    
    List<Payment> findByDueDateBeforeAndStatus(LocalDateTime date, Payment.PaymentStatus status);
    
    List<Payment> findByInstallationAndStatus(SolarInstallation installation, Payment.PaymentStatus status);
    
    // Find payments due within a specific date range
    List<Payment> findByDueDateBetweenAndStatus(LocalDateTime startDate, LocalDateTime endDate, Payment.PaymentStatus status);
    
    // Find payments that are due today - using between for start and end of day
    @Query("SELECT p FROM Payment p WHERE p.dueDate BETWEEN :startOfDay AND :endOfDay AND p.status = :status")
    List<Payment> findDueTodayPayments(
            @Param("startOfDay") LocalDateTime startOfDay,
            @Param("endOfDay") LocalDateTime endOfDay,
            @Param("status") Payment.PaymentStatus status);
    
    // Find payments that are overdue by a specific number of days
    @Query("SELECT p FROM Payment p WHERE p.dueDate < :cutoffDate AND p.status IN :statuses")
    List<Payment> findOverduePayments(@Param("cutoffDate") LocalDateTime cutoffDate, @Param("statuses") List<Payment.PaymentStatus> statuses);
    
    // Find payments by payment plan
    List<Payment> findByPaymentPlan(PaymentPlan paymentPlan);
    
    // Find payments by payment plan and status
    List<Payment> findByPaymentPlanAndStatus(PaymentPlan paymentPlan, Payment.PaymentStatus status);
    
    // Find payments for a specific installation with pagination
    Page<Payment> findByInstallation(SolarInstallation installation, Pageable pageable);
    
    // Find upcoming payments (scheduled within the next N days)
    @Query("SELECT p FROM Payment p WHERE p.dueDate BETWEEN CURRENT_TIMESTAMP AND :futureDate AND p.status = :status")
    List<Payment> findUpcomingPayments(@Param("futureDate") LocalDateTime futureDate, @Param("status") Payment.PaymentStatus status);
    
    // Count overdue payments by installation
    @Query("SELECT COUNT(p) FROM Payment p WHERE p.installation = :installation AND p.status IN :statuses")
    Long countOverduePaymentsByInstallation(@Param("installation") SolarInstallation installation, @Param("statuses") List<Payment.PaymentStatus> statuses);
    
    // Find payments by status
    List<Payment> findByStatus(Payment.PaymentStatus status);
    
    // Find payments by payment plan and due date
    List<Payment> findByPaymentPlanAndDueDate(PaymentPlan paymentPlan, LocalDateTime dueDate);
    
    // Find payments by multiple statuses
    List<Payment> findByStatusIn(List<Payment.PaymentStatus> statuses);
    
    // Find payments by due date range
    List<Payment> findByDueDateBetween(LocalDateTime startDate, LocalDateTime endDate);
    
    // Find payments by paid date range
    List<Payment> findByPaidAtBetween(LocalDateTime startDate, LocalDateTime endDate);
    
    // Find payments by installation and due date range
    List<Payment> findByInstallationAndDueDateBetween(SolarInstallation installation, LocalDateTime startDate, LocalDateTime endDate);
    
    // Find payments by installation and paid date range
    List<Payment> findByInstallationAndPaidAtBetween(SolarInstallation installation, LocalDateTime startDate, LocalDateTime endDate);
} 