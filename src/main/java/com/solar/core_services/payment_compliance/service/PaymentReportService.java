package com.solar.core_services.payment_compliance.service;

import com.solar.core_services.energy_monitoring.model.SolarInstallation;
import com.solar.core_services.payment_compliance.model.Payment;
import com.solar.core_services.payment_compliance.model.PaymentPlan;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

public interface PaymentReportService {
    
    /**
     * Generate a report of all payments for a specific installation
     * @param installationId The ID of the installation
     * @return List of payments for the installation
     */
    List<Payment> generateInstallationPaymentReport(Long installationId);
    
    /**
     * Generate a report of payments by status
     * @param status The payment status to filter by
     * @return List of payments with the specified status
     */
    List<Payment> generatePaymentsByStatusReport(Payment.PaymentStatus status);
    
    /**
     * Generate a report of payments due within a date range
     * @param startDate The start date of the range
     * @param endDate The end date of the range
     * @return List of payments due within the date range
     */
    List<Payment> generatePaymentsDueReport(LocalDateTime startDate, LocalDateTime endDate);
    
    /**
     * Generate a report of overdue payments
     * @return List of overdue payments
     */
    List<Payment> generateOverduePaymentsReport();
    
    /**
     * Generate a report of upcoming payments
     * @param daysAhead Number of days to look ahead
     * @return List of upcoming payments
     */
    List<Payment> generateUpcomingPaymentsReport(int daysAhead);
    
    /**
     * Generate a report of payments by payment plan
     * @param paymentPlanId The ID of the payment plan
     * @return List of payments for the payment plan
     */
    List<Payment> generatePaymentPlanReport(Long paymentPlanId);
    
    /**
     * Generate a summary report of payment statistics
     * @return Map containing payment statistics
     */
    Map<String, Object> generatePaymentSummaryReport();
    
    /**
     * Generate a report of payment history for a specific installation
     * @param installationId The ID of the installation
     * @param startDate The start date of the history period
     * @param endDate The end date of the history period
     * @return List of payments for the installation within the date range
     */
    List<Payment> generatePaymentHistoryReport(Long installationId, LocalDateTime startDate, LocalDateTime endDate);
    
    /**
     * Generate a report of payment plans by status
     * @param status The payment plan status to filter by
     * @return List of payment plans with the specified status
     */
    List<PaymentPlan> generatePaymentPlansByStatusReport(PaymentPlan.PaymentPlanStatus status);
} 