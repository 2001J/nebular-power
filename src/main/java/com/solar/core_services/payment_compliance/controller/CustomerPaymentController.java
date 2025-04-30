package com.solar.core_services.payment_compliance.controller;

import com.solar.core_services.payment_compliance.dto.MakePaymentRequest;
import com.solar.core_services.payment_compliance.dto.PaymentDTO;
import com.solar.core_services.payment_compliance.dto.PaymentDashboardDTO;
import com.solar.core_services.payment_compliance.service.PaymentService;
import com.solar.user_management.security.UserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
@Tag(name = "Customer Payments", description = "APIs for customers to manage their payments")
@SecurityRequirement(name = "bearerAuth")
public class CustomerPaymentController {

    private final PaymentService paymentService;

    @GetMapping("/dashboard")
    @Operation(
        summary = "Get payment dashboard",
        description = "Retrieves a summary dashboard of the customer's payment information, including total due, paid, and upcoming payments."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Dashboard retrieved successfully", 
                    content = @Content(schema = @Schema(implementation = PaymentDashboardDTO.class))),
        @ApiResponse(responseCode = "401", description = "Unauthorized", content = @Content),
        @ApiResponse(responseCode = "403", description = "Forbidden", content = @Content)
    })
    public ResponseEntity<PaymentDashboardDTO> getPaymentDashboard(
            @Parameter(description = "Authentication object containing user credentials", hidden = true)
            Authentication authentication) {
        Long userId = getUserIdFromAuthentication(authentication);
        PaymentDashboardDTO dashboard = paymentService.getCustomerDashboard(userId);
        return ResponseEntity.ok(dashboard);
    }

    @GetMapping("/history")
    @Operation(
        summary = "Get payment history",
        description = "Retrieves the customer's payment history with pagination and sorting options."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Payment history retrieved successfully"),
        @ApiResponse(responseCode = "401", description = "Unauthorized", content = @Content),
        @ApiResponse(responseCode = "403", description = "Forbidden", content = @Content)
    })
    public ResponseEntity<List<PaymentDTO>> getPaymentHistory(
            @Parameter(description = "Authentication object containing user credentials", hidden = true)
            Authentication authentication,

            @Parameter(description = "Page number (zero-based)")
            @RequestParam(defaultValue = "0") int page,

            @Parameter(description = "Number of items per page")
            @RequestParam(defaultValue = "10") int size,

            @Parameter(description = "Field to sort by (e.g., dueDate, amount, status)")
            @RequestParam(defaultValue = "dueDate") String sortBy,

            @Parameter(description = "Sort direction (asc or desc)")
            @RequestParam(defaultValue = "desc") String direction) {

        Long userId = getUserIdFromAuthentication(authentication);
        Sort.Direction sortDirection = direction.equalsIgnoreCase("asc") ? Sort.Direction.ASC : Sort.Direction.DESC;

        List<PaymentDTO> payments = paymentService.getPaymentHistory(
                userId, 
                PageRequest.of(page, size, Sort.by(sortDirection, sortBy))
        );

        return ResponseEntity.ok(payments);
    }

    @GetMapping("/upcoming")
    @Operation(
        summary = "Get upcoming payments",
        description = "Retrieves a list of upcoming payments that are due for the customer."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Upcoming payments retrieved successfully"),
        @ApiResponse(responseCode = "401", description = "Unauthorized", content = @Content),
        @ApiResponse(responseCode = "403", description = "Forbidden", content = @Content)
    })
    public ResponseEntity<List<PaymentDTO>> getUpcomingPayments(
            @Parameter(description = "Authentication object containing user credentials", hidden = true)
            Authentication authentication) {
        Long userId = getUserIdFromAuthentication(authentication);
        List<PaymentDTO> upcomingPayments = paymentService.getUpcomingPayments(userId);
        return ResponseEntity.ok(upcomingPayments);
    }

    @PostMapping("/make-payment")
    @Operation(
        summary = "Make a payment",
        description = "Processes a payment for the customer. This endpoint handles the payment transaction and updates the payment status."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "201", description = "Payment processed successfully", 
                    content = @Content(schema = @Schema(implementation = PaymentDTO.class))),
        @ApiResponse(responseCode = "400", description = "Invalid payment request", content = @Content),
        @ApiResponse(responseCode = "401", description = "Unauthorized", content = @Content),
        @ApiResponse(responseCode = "403", description = "Forbidden", content = @Content)
    })
    public ResponseEntity<PaymentDTO> makePayment(
            @Parameter(description = "Authentication object containing user credentials", hidden = true)
            Authentication authentication,

            @Parameter(description = "Payment request details", required = true)
            @Valid @RequestBody MakePaymentRequest request) {

        Long userId = getUserIdFromAuthentication(authentication);
        PaymentDTO payment = paymentService.makePayment(userId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(payment);
    }

    @GetMapping("/receipts/{paymentId}")
    @Operation(
        summary = "Download payment receipt",
        description = "Generates and downloads a receipt for a specific payment made by the customer."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Receipt generated successfully"),
        @ApiResponse(responseCode = "400", description = "Invalid payment ID", content = @Content),
        @ApiResponse(responseCode = "401", description = "Unauthorized", content = @Content),
        @ApiResponse(responseCode = "403", description = "Forbidden", content = @Content),
        @ApiResponse(responseCode = "404", description = "Payment not found", content = @Content)
    })
    public ResponseEntity<byte[]> downloadReceipt(
            @Parameter(description = "Authentication object containing user credentials", hidden = true)
            Authentication authentication,

            @Parameter(description = "ID of the payment to generate receipt for", required = true)
            @PathVariable Long paymentId) {

        Long userId = getUserIdFromAuthentication(authentication);
        byte[] receipt = paymentService.generatePaymentReceipt(userId, paymentId);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.TEXT_PLAIN);
        headers.setContentDispositionFormData("attachment", "payment_receipt_" + paymentId + ".txt");

        return new ResponseEntity<>(receipt, headers, HttpStatus.OK);
    }

    @GetMapping("/customers/{userId}/plan")
    @Operation(
        summary = "Get customer payment plan",
        description = "Retrieves the payment plan for a specific customer."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Payment plan retrieved successfully"),
        @ApiResponse(responseCode = "401", description = "Unauthorized", content = @Content),
        @ApiResponse(responseCode = "403", description = "Forbidden", content = @Content),
        @ApiResponse(responseCode = "404", description = "Payment plan not found", content = @Content)
    })
    public ResponseEntity<?> getCustomerPaymentPlan(
            @Parameter(description = "Authentication object containing user credentials", hidden = true)
            Authentication authentication,

            @Parameter(description = "ID of the customer to retrieve payment plan for", required = true)
            @PathVariable Long userId) {

        // Verify the authenticated user is requesting their own data
        Long authenticatedUserId = getUserIdFromAuthentication(authentication);
        if (!authenticatedUserId.equals(userId) && !hasAdminRole(authentication)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Access denied");
        }

        try {
            // Get the active payment plan for the user
            return ResponseEntity.ok(paymentService.getCustomerPaymentPlan(userId));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Payment plan not found: " + e.getMessage());
        }
    }

    private boolean hasAdminRole(Authentication authentication) {
        return authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
    }

    private Long getUserIdFromAuthentication(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new IllegalStateException("User not authenticated");
        }

        Object principal = authentication.getPrincipal();
        if (principal instanceof UserPrincipal) {
            return ((UserPrincipal) principal).getId();
        }

        throw new IllegalStateException("User principal not found or not of expected type");
    }
} 
