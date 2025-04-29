package com.solar.core_services.payment_compliance.controller;

import com.solar.core_services.payment_compliance.dto.PaymentDTO;
import com.solar.core_services.payment_compliance.dto.PaymentPlanDTO;
import com.solar.core_services.payment_compliance.model.Payment;
import com.solar.core_services.payment_compliance.model.PaymentPlan;
import com.solar.core_services.payment_compliance.service.PaymentReportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin/payments/reports")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
@Tag(name = "Payment Reports", description = "APIs for generating payment compliance and financial reports")
@SecurityRequirement(name = "bearerAuth")
public class PaymentReportController {

    private final PaymentReportService paymentReportService;

    @GetMapping("/{reportType}")
    @Operation(
        summary = "Generate payment report",
        description = "Generates a comprehensive payment report based on the specified report type. Available report types: compliance, revenue, defaulters, collection, summary."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Report generated successfully"),
        @ApiResponse(responseCode = "400", description = "Invalid report type", content = @Content),
        @ApiResponse(responseCode = "401", description = "Unauthorized", content = @Content),
        @ApiResponse(responseCode = "403", description = "Forbidden - requires ADMIN role", content = @Content)
    })
    public ResponseEntity<Map<String, Object>> generateReport(
            @Parameter(description = "Type of report to generate (compliance, revenue, defaulters, collection, summary)", required = true)
            @PathVariable String reportType,
            
            @Parameter(description = "Start date for the report period (ISO date format: yyyy-MM-dd)")
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            
            @Parameter(description = "End date for the report period (ISO date format: yyyy-MM-dd)")
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        
        // Add debugging information
        System.out.println("Generating " + reportType + " report with startDate=" + startDate + ", endDate=" + endDate);
        
        // Convert LocalDate to LocalDateTime if needed for service methods
        LocalDateTime startDateTime = startDate != null ? startDate.atStartOfDay() : null;
        LocalDateTime endDateTime = endDate != null ? endDate.atTime(23, 59, 59) : null;
        
        Map<String, Object> report = new HashMap<>();
        
        switch (reportType.toLowerCase()) {
            case "compliance":
                report = generateComplianceReport(startDateTime, endDateTime);
                break;
            case "revenue":
                report = generateRevenueReport(startDateTime, endDateTime);
                break;
            case "defaulters":
                report = generateDefaultersReport();
                break;
            case "collection":
                report = generateCollectionReport(startDateTime, endDateTime);
                break;
            case "summary":
                report = paymentReportService.generatePaymentSummaryReport();
                break;
            default:
                return ResponseEntity.badRequest().body(Map.of("error", "Invalid report type"));
        }
        
        return ResponseEntity.ok(report);
    }
    
    @GetMapping("/installation/{installationId}")
    @Operation(
        summary = "Get installation payment report",
        description = "Retrieves a detailed payment report for a specific solar installation."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Report generated successfully"),
        @ApiResponse(responseCode = "401", description = "Unauthorized", content = @Content),
        @ApiResponse(responseCode = "403", description = "Forbidden - requires ADMIN role", content = @Content),
        @ApiResponse(responseCode = "404", description = "Installation not found", content = @Content)
    })
    public ResponseEntity<List<PaymentDTO>> getInstallationPaymentReport(
            @Parameter(description = "ID of the installation to generate report for", required = true)
            @PathVariable Long installationId) {
        List<Payment> payments = paymentReportService.generateInstallationPaymentReport(installationId);
        return ResponseEntity.ok(payments.stream()
                .map(PaymentDTO::fromEntity)
                .collect(Collectors.toList()));
    }
    
    @GetMapping("/status/{status}")
    @Operation(
        summary = "Get payments by status report",
        description = "Retrieves a report of all payments with a specific payment status."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Report generated successfully"),
        @ApiResponse(responseCode = "400", description = "Invalid payment status", content = @Content),
        @ApiResponse(responseCode = "401", description = "Unauthorized", content = @Content),
        @ApiResponse(responseCode = "403", description = "Forbidden - requires ADMIN role", content = @Content)
    })
    public ResponseEntity<List<PaymentDTO>> getPaymentsByStatusReport(
            @Parameter(description = "Payment status to filter by (e.g., PAID, PENDING, OVERDUE)", required = true)
            @PathVariable Payment.PaymentStatus status) {
        List<Payment> payments = paymentReportService.generatePaymentsByStatusReport(status);
        return ResponseEntity.ok(payments.stream()
                .map(PaymentDTO::fromEntity)
                .collect(Collectors.toList()));
    }
    
    @GetMapping("/due")
    @Operation(
        summary = "Get payments due report",
        description = "Retrieves a report of all payments due within a specified date range."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Report generated successfully"),
        @ApiResponse(responseCode = "400", description = "Invalid date range", content = @Content),
        @ApiResponse(responseCode = "401", description = "Unauthorized", content = @Content),
        @ApiResponse(responseCode = "403", description = "Forbidden - requires ADMIN role", content = @Content)
    })
    public ResponseEntity<List<PaymentDTO>> getPaymentsDueReport(
            @Parameter(description = "Start date of the range (ISO date format: yyyy-MM-dd)", required = true)
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            
            @Parameter(description = "End date of the range (ISO date format: yyyy-MM-dd)", required = true)
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
            
        // Convert to LocalDateTime for backward compatibility with service methods
        LocalDateTime startDateTime = startDate.atStartOfDay();
        LocalDateTime endDateTime = endDate.atTime(23, 59, 59);
        
        List<Payment> payments = paymentReportService.generatePaymentsDueReport(startDateTime, endDateTime);
        return ResponseEntity.ok(payments.stream()
                .map(PaymentDTO::fromEntity)
                .collect(Collectors.toList()));
    }
    
    @GetMapping("/overdue")
    @Operation(
        summary = "Get overdue payments report",
        description = "Retrieves a report of all overdue payments across the system."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Report generated successfully"),
        @ApiResponse(responseCode = "401", description = "Unauthorized", content = @Content),
        @ApiResponse(responseCode = "403", description = "Forbidden - requires ADMIN role", content = @Content)
    })
    public ResponseEntity<List<PaymentDTO>> getOverduePaymentsReport() {
        List<Payment> payments = paymentReportService.generateOverduePaymentsReport();
        return ResponseEntity.ok(payments.stream()
                .map(PaymentDTO::fromEntity)
                .collect(Collectors.toList()));
    }
    
    @GetMapping("/upcoming")
    @Operation(
        summary = "Get upcoming payments report",
        description = "Retrieves a report of all upcoming payments due within the specified number of days."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Report generated successfully"),
        @ApiResponse(responseCode = "401", description = "Unauthorized", content = @Content),
        @ApiResponse(responseCode = "403", description = "Forbidden - requires ADMIN role", content = @Content)
    })
    public ResponseEntity<List<PaymentDTO>> getUpcomingPaymentsReport(
            @Parameter(description = "Number of days ahead to look for upcoming payments")
            @RequestParam(defaultValue = "7") int daysAhead) {
        List<Payment> payments = paymentReportService.generateUpcomingPaymentsReport(daysAhead);
        return ResponseEntity.ok(payments.stream()
                .map(PaymentDTO::fromEntity)
                .collect(Collectors.toList()));
    }
    
    @GetMapping("/payment-plan/{paymentPlanId}")
    @Operation(
        summary = "Get payment plan report",
        description = "Retrieves a detailed report for a specific payment plan, including all associated payments."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Report generated successfully"),
        @ApiResponse(responseCode = "401", description = "Unauthorized", content = @Content),
        @ApiResponse(responseCode = "403", description = "Forbidden - requires ADMIN role", content = @Content),
        @ApiResponse(responseCode = "404", description = "Payment plan not found", content = @Content)
    })
    public ResponseEntity<List<PaymentDTO>> getPaymentPlanReport(
            @Parameter(description = "ID of the payment plan to generate report for", required = true)
            @PathVariable Long paymentPlanId) {
        List<Payment> payments = paymentReportService.generatePaymentPlanReport(paymentPlanId);
        return ResponseEntity.ok(payments.stream()
                .map(PaymentDTO::fromEntity)
                .collect(Collectors.toList()));
    }
    
    @GetMapping("/history/{installationId}")
    @Operation(
        summary = "Get payment history report",
        description = "Retrieves a historical payment report for a specific installation within a date range."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Report generated successfully"),
        @ApiResponse(responseCode = "400", description = "Invalid date range", content = @Content),
        @ApiResponse(responseCode = "401", description = "Unauthorized", content = @Content),
        @ApiResponse(responseCode = "403", description = "Forbidden - requires ADMIN role", content = @Content),
        @ApiResponse(responseCode = "404", description = "Installation not found", content = @Content)
    })
    public ResponseEntity<List<PaymentDTO>> getPaymentHistoryReport(
            @Parameter(description = "ID of the installation to generate history report for", required = true)
            @PathVariable Long installationId,
            
            @Parameter(description = "Start date of the history period (ISO date format: yyyy-MM-dd)", required = true)
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            
            @Parameter(description = "End date of the history period (ISO date format: yyyy-MM-dd)", required = true)
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        
        // Convert to LocalDateTime for service methods
        LocalDateTime startDateTime = startDate.atStartOfDay();
        LocalDateTime endDateTime = endDate.atTime(23, 59, 59);
        
        List<Payment> payments = paymentReportService.generatePaymentHistoryReport(installationId, startDateTime, endDateTime);
        return ResponseEntity.ok(payments.stream()
                .map(PaymentDTO::fromEntity)
                .collect(Collectors.toList()));
    }
    
    @GetMapping("/payment-plans/status/{status}")
    @Operation(
        summary = "Get payment plans by status report",
        description = "Retrieves a report of all payment plans with a specific status."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Report generated successfully"),
        @ApiResponse(responseCode = "400", description = "Invalid payment plan status", content = @Content),
        @ApiResponse(responseCode = "401", description = "Unauthorized", content = @Content),
        @ApiResponse(responseCode = "403", description = "Forbidden - requires ADMIN role", content = @Content)
    })
    public ResponseEntity<List<PaymentPlanDTO>> getPaymentPlansByStatusReport(
            @Parameter(description = "Payment plan status to filter by (e.g., ACTIVE, COMPLETED, DEFAULTED)", required = true)
            @PathVariable PaymentPlan.PaymentPlanStatus status) {
        List<PaymentPlan> paymentPlans = paymentReportService.generatePaymentPlansByStatusReport(status);
        return ResponseEntity.ok(paymentPlans.stream()
                .map(PaymentPlanDTO::fromEntity)
                .collect(Collectors.toList()));
    }
    
    private Map<String, Object> generateComplianceReport(LocalDateTime startDate, LocalDateTime endDate) {
        Map<String, Object> report = new HashMap<>();
        
        // Set default dates if not provided
        if (startDate == null) {
            startDate = LocalDateTime.now().minusMonths(1);
        }
        if (endDate == null) {
            endDate = LocalDateTime.now();
        }
        
        System.out.println("Generating compliance report for period: " + startDate + " to " + endDate);
        
        // Get all payments due in the period
        List<Payment> duePayments = paymentReportService.generatePaymentsDueReport(startDate, endDate);
        System.out.println("Found " + duePayments.size() + " payments due in the period");
        
        // Add summary of all payments by status
        Map<Payment.PaymentStatus, Long> countByStatus = duePayments.stream()
                .collect(Collectors.groupingBy(Payment::getStatus, Collectors.counting()));
        
        System.out.println("Payment status breakdown: " + countByStatus);
        
        // Count paid on time
        long paidOnTime = duePayments.stream()
                .filter(p -> p.getStatus() == Payment.PaymentStatus.PAID && 
                        (p.getPaidAt() != null && !p.getPaidAt().isAfter(p.getDueDate())))
                .count();
        
        // Count paid late
        long paidLate = duePayments.stream()
                .filter(p -> p.getStatus() == Payment.PaymentStatus.PAID && 
                        (p.getPaidAt() != null && p.getPaidAt().isAfter(p.getDueDate())))
                .count();
        
        // Count unpaid
        long unpaid = duePayments.stream()
                .filter(p -> p.getStatus() != Payment.PaymentStatus.PAID && 
                        p.getStatus() != Payment.PaymentStatus.PARTIALLY_PAID)
                .count();
        
        // Calculate compliance rate
        double complianceRate = duePayments.isEmpty() ? 0 : 
                (double) (paidOnTime + paidLate) / duePayments.size() * 100;
        
        // Calculate on-time payment rate
        double onTimeRate = duePayments.isEmpty() ? 0 : 
                (double) paidOnTime / duePayments.size() * 100;
        
        System.out.println("Compliance metrics: paidOnTime=" + paidOnTime + ", paidLate=" + paidLate + 
                ", unpaid=" + unpaid + ", complianceRate=" + complianceRate + 
                ", onTimeRate=" + onTimeRate);
        
        report.put("reportType", "Payment Compliance Report");
        report.put("startDate", startDate);
        report.put("endDate", endDate);
        report.put("totalPaymentsDue", duePayments.size());
        report.put("paidOnTime", paidOnTime);
        report.put("paidLate", paidLate);
        report.put("unpaid", unpaid);
        report.put("complianceRate", BigDecimal.valueOf(complianceRate).setScale(2, RoundingMode.HALF_UP));
        report.put("onTimePaymentRate", BigDecimal.valueOf(onTimeRate).setScale(2, RoundingMode.HALF_UP));
        
        // Add payment details for debugging
        report.put("paymentDetails", duePayments.stream()
                .map(payment -> {
                    Map<String, Object> details = new HashMap<>();
                    details.put("id", payment.getId());
                    details.put("amount", payment.getAmount());
                    details.put("dueDate", payment.getDueDate());
                    details.put("status", payment.getStatus());
                    details.put("paidAt", payment.getPaidAt());
                    details.put("customerName", payment.getInstallation().getUser().getFullName());
                    return details;
                })
                .collect(Collectors.toList()));
        
        return report;
    }
    
    private Map<String, Object> generateRevenueReport(LocalDateTime startDate, LocalDateTime endDate) {
        Map<String, Object> report = new HashMap<>();
        
        // Set default dates if not provided
        if (startDate == null) {
            startDate = LocalDateTime.now().minusMonths(1);
        }
        if (endDate == null) {
            endDate = LocalDateTime.now();
        }
        
        System.out.println("Generating revenue report for period: " + startDate + " to " + endDate);
        
        // Get all payments due in the period
        List<Payment> duePayments = paymentReportService.generatePaymentsDueReport(startDate, endDate);
        System.out.println("Found " + duePayments.size() + " payments due in the period");
        
        // Add breakdown of payments by status
        Map<Payment.PaymentStatus, Long> countByStatus = duePayments.stream()
                .collect(Collectors.groupingBy(Payment::getStatus, Collectors.counting()));
        
        System.out.println("Payment status breakdown: " + countByStatus);
        
        // Calculate total revenue from paid payments
        BigDecimal totalRevenue = duePayments.stream()
                .filter(p -> p.getStatus() == Payment.PaymentStatus.PAID || p.getStatus() == Payment.PaymentStatus.PARTIALLY_PAID)
                .map(Payment::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        // Calculate expected revenue (all payments due in the period)
        BigDecimal expectedRevenue = duePayments.stream()
                .map(Payment::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        // Calculate collection rate
        double collectionRate = expectedRevenue.compareTo(BigDecimal.ZERO) == 0 ? 0 :
                totalRevenue.divide(expectedRevenue, 4, RoundingMode.HALF_UP)
                        .multiply(BigDecimal.valueOf(100))
                        .doubleValue();
        
        System.out.println("Revenue metrics: totalRevenue=" + totalRevenue + 
                ", expectedRevenue=" + expectedRevenue + ", collectionRate=" + collectionRate);
        
        report.put("reportType", "Revenue Report");
        report.put("startDate", startDate);
        report.put("endDate", endDate);
        report.put("totalRevenue", totalRevenue);
        report.put("expectedRevenue", expectedRevenue);
        report.put("collectionRate", BigDecimal.valueOf(collectionRate).setScale(2, RoundingMode.HALF_UP));
        report.put("numberOfPayments", duePayments.stream()
                .filter(p -> p.getStatus() == Payment.PaymentStatus.PAID || p.getStatus() == Payment.PaymentStatus.PARTIALLY_PAID)
                .count());
        
        // Add breakdown of payment status counts
        report.put("paymentStatusBreakdown", countByStatus);
        
        // Add payment details for debugging
        report.put("paymentDetails", duePayments.stream()
                .map(payment -> {
                    Map<String, Object> details = new HashMap<>();
                    details.put("id", payment.getId());
                    details.put("amount", payment.getAmount());
                    details.put("dueDate", payment.getDueDate());
                    details.put("status", payment.getStatus());
                    details.put("paidAt", payment.getPaidAt());
                    details.put("customerName", payment.getInstallation().getUser().getFullName());
                    return details;
                })
                .collect(Collectors.toList()));
        
        return report;
    }
    
    private Map<String, Object> generateDefaultersReport() {
        Map<String, Object> report = new HashMap<>();
        
        // Get all overdue payments
        List<Payment> overduePayments = paymentReportService.generateOverduePaymentsReport();
        
        // Group by installation
        Map<Long, List<Payment>> paymentsByInstallation = overduePayments.stream()
                .collect(Collectors.groupingBy(p -> p.getInstallation().getId()));
        
        // Calculate total overdue amount by installation
        Map<Long, BigDecimal> overdueAmountByInstallation = new HashMap<>();
        for (Map.Entry<Long, List<Payment>> entry : paymentsByInstallation.entrySet()) {
            BigDecimal totalOverdue = entry.getValue().stream()
                    .map(Payment::getAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            overdueAmountByInstallation.put(entry.getKey(), totalOverdue);
        }
        
        // Sort installations by overdue amount (descending)
        List<Map.Entry<Long, BigDecimal>> sortedInstallations = new ArrayList<>(overdueAmountByInstallation.entrySet());
        sortedInstallations.sort((e1, e2) -> e2.getValue().compareTo(e1.getValue()));
        
        // Prepare top defaulters
        List<Map<String, Object>> topDefaulters = new ArrayList<>();
        for (Map.Entry<Long, BigDecimal> entry : sortedInstallations) {
            Long installationId = entry.getKey();
            List<Payment> payments = paymentsByInstallation.get(installationId);
            
            Map<String, Object> defaulter = new HashMap<>();
            defaulter.put("installationId", installationId);
            defaulter.put("customerName", payments.get(0).getInstallation().getUser().getFullName());
            defaulter.put("customerEmail", payments.get(0).getInstallation().getUser().getEmail());
            defaulter.put("totalOverdueAmount", entry.getValue());
            defaulter.put("numberOfOverduePayments", payments.size());
            defaulter.put("oldestOverdueDate", payments.stream()
                    .map(Payment::getDueDate)
                    .min(LocalDateTime::compareTo)
                    .orElse(null));
            
            // Calculate max days overdue
            long maxDaysOverdue = payments.stream()
                    .mapToLong(p -> ChronoUnit.DAYS.between(p.getDueDate(), LocalDateTime.now()))
                    .max()
                    .orElse(0);
            defaulter.put("maxDaysOverdue", maxDaysOverdue);
            
            // Add payment details
            defaulter.put("payments", payments.stream()
                    .map(PaymentDTO::fromEntity)
                    .collect(Collectors.toList()));
            
            topDefaulters.add(defaulter);
        }
        
        report.put("reportType", "Defaulters Report");
        report.put("generatedAt", LocalDateTime.now());
        report.put("totalDefaulters", paymentsByInstallation.size());
        report.put("totalOverduePayments", overduePayments.size());
        report.put("totalOverdueAmount", overduePayments.stream()
                .map(Payment::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add));
        report.put("topDefaulters", topDefaulters);
        
        return report;
    }
    
    private Map<String, Object> generateCollectionReport(LocalDateTime startDate, LocalDateTime endDate) {
        Map<String, Object> report = new HashMap<>();
        
        // Set default dates if not provided
        if (startDate == null) {
            startDate = LocalDateTime.now().minusMonths(1);
        }
        if (endDate == null) {
            endDate = LocalDateTime.now();
        }
        
        // Get all payments due in the period
        List<Payment> duePayments = paymentReportService.generatePaymentsDueReport(startDate, endDate);
        
        // Get all paid payments in the period
        List<Payment> paidPayments = duePayments.stream()
                .filter(p -> p.getStatus() == Payment.PaymentStatus.PAID)
                .collect(Collectors.toList());
        
        // Calculate collection metrics
        BigDecimal totalDue = duePayments.stream()
                .map(Payment::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        BigDecimal totalCollected = paidPayments.stream()
                .map(Payment::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        double collectionRate = totalDue.compareTo(BigDecimal.ZERO) == 0 ? 0 :
                totalCollected.divide(totalDue, 4, RoundingMode.HALF_UP)
                        .multiply(BigDecimal.valueOf(100))
                        .doubleValue();
        
        // Calculate average days to payment
        double avgDaysToPayment = paidPayments.isEmpty() ? 0 :
                paidPayments.stream()
                        .mapToLong(p -> ChronoUnit.DAYS.between(p.getDueDate(), p.getPaidAt()))
                        .average()
                        .orElse(0);
        
        report.put("reportType", "Collection Report");
        report.put("startDate", startDate);
        report.put("endDate", endDate);
        report.put("totalDueAmount", totalDue);
        report.put("totalCollectedAmount", totalCollected);
        report.put("collectionRate", BigDecimal.valueOf(collectionRate).setScale(2, RoundingMode.HALF_UP));
        report.put("totalPaymentsDue", duePayments.size());
        report.put("totalPaymentsCollected", paidPayments.size());
        report.put("averageDaysToPayment", BigDecimal.valueOf(avgDaysToPayment).setScale(1, RoundingMode.HALF_UP));
        
        // Add payment details
        report.put("payments", paidPayments.stream()
                .map(PaymentDTO::fromEntity)
                .collect(Collectors.toList()));
        
        return report;
    }
}