package com.solar.core_services.payment_compliance.repository;

import com.solar.core_services.energy_monitoring.model.SolarInstallation;
import com.solar.core_services.payment_compliance.model.PaymentPlan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface PaymentPlanRepository extends JpaRepository<PaymentPlan, Long> {
    List<PaymentPlan> findByInstallation(SolarInstallation installation);
    
    Optional<PaymentPlan> findByInstallationAndEndDateAfter(SolarInstallation installation, LocalDateTime date);
    
    @Query("SELECT p FROM PaymentPlan p WHERE p.installation = :installation AND :currentDate BETWEEN p.startDate AND p.endDate")
    Optional<PaymentPlan> findActivePaymentPlan(@Param("installation") SolarInstallation installation, @Param("currentDate") LocalDateTime currentDate);
    
    @Query("SELECT SUM(p.remainingAmount) FROM PaymentPlan p WHERE p.installation = :installation")
    BigDecimal getTotalRemainingAmountByInstallation(@Param("installation") SolarInstallation installation);
    
    @Query("SELECT COUNT(p) FROM PaymentPlan p WHERE p.installation.user.id = :userId")
    Long countPaymentPlansByUserId(@Param("userId") Long userId);
    
    List<PaymentPlan> findByStatus(PaymentPlan.PaymentPlanStatus status);
    
    List<PaymentPlan> findByInstallationAndStatus(SolarInstallation installation, PaymentPlan.PaymentPlanStatus status);
    
    List<PaymentPlan> findByStartDateBetween(LocalDateTime startDate, LocalDateTime endDate);
    
    List<PaymentPlan> findByEndDateBetween(LocalDateTime startDate, LocalDateTime endDate);
    
    @Query("SELECT p FROM PaymentPlan p WHERE p.installation = :installation AND p.status = com.solar.core_services.payment_compliance.model.PaymentPlan.PaymentPlanStatus.ACTIVE")
    List<PaymentPlan> findActivePaymentPlans(@Param("installation") SolarInstallation installation);
    
    List<PaymentPlan> findByFrequency(PaymentPlan.PaymentFrequency frequency);
    
    List<PaymentPlan> findByTotalAmountGreaterThan(double amount);
    
    List<PaymentPlan> findByTotalAmountLessThan(double amount);
    
    List<PaymentPlan> findByNumberOfPayments(int numberOfPayments);
    
    List<PaymentPlan> findByName(String name);
    
    List<PaymentPlan> findByNameContaining(String nameFragment);
} 