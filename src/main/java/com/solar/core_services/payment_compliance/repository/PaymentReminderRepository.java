package com.solar.core_services.payment_compliance.repository;

import com.solar.core_services.payment_compliance.model.Payment;
import com.solar.core_services.payment_compliance.model.PaymentReminder;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface PaymentReminderRepository extends JpaRepository<PaymentReminder, Long> {
    List<PaymentReminder> findByPayment(Payment payment);
    
    List<PaymentReminder> findByPaymentAndReminderType(Payment payment, PaymentReminder.ReminderType reminderType);
    
    List<PaymentReminder> findByDeliveryStatus(PaymentReminder.DeliveryStatus deliveryStatus);
    
    @Query("SELECT pr FROM PaymentReminder pr WHERE pr.deliveryStatus = :status AND pr.retryCount < :maxRetries")
    List<PaymentReminder> findFailedRemindersForRetry(@Param("status") PaymentReminder.DeliveryStatus status, @Param("maxRetries") Integer maxRetries);
    
    @Query("SELECT pr FROM PaymentReminder pr WHERE pr.payment.installation.id = :installationId")
    List<PaymentReminder> findByInstallationId(@Param("installationId") Long installationId);
    
    @Query("SELECT pr FROM PaymentReminder pr WHERE pr.payment.installation.user.id = :userId")
    Page<PaymentReminder> findByUserId(@Param("userId") Long userId, Pageable pageable);
    
    @Query("SELECT COUNT(pr) FROM PaymentReminder pr WHERE pr.payment = :payment AND pr.reminderType = :reminderType AND pr.sentDate > :cutoffDate")
    Long countRecentRemindersByType(@Param("payment") Payment payment, @Param("reminderType") PaymentReminder.ReminderType reminderType, @Param("cutoffDate") LocalDateTime cutoffDate);
} 