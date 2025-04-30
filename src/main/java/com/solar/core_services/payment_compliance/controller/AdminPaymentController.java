package com.solar.core_services.payment_compliance.controller;

import com.solar.core_services.energy_monitoring.model.SolarInstallation;
import com.solar.core_services.energy_monitoring.repository.SolarInstallationRepository;
import com.solar.core_services.payment_compliance.dto.GracePeriodConfigDTO;
import com.solar.core_services.payment_compliance.dto.MakePaymentRequest;
import com.solar.core_services.payment_compliance.dto.PaymentDTO;
import com.solar.core_services.payment_compliance.dto.PaymentPlanDTO;
import com.solar.core_services.payment_compliance.dto.PaymentPlanRequest;
import com.solar.core_services.payment_compliance.dto.ReminderConfigDTO;
import com.solar.core_services.payment_compliance.model.PaymentReminder;
import com.solar.core_services.payment_compliance.service.GracePeriodConfigService;
import com.solar.core_services.payment_compliance.service.PaymentPlanService;
import com.solar.core_services.payment_compliance.service.PaymentReminderService;
import com.solar.core_services.payment_compliance.service.PaymentService;
import com.solar.core_services.payment_compliance.service.ReminderConfigService;
import com.solar.exception.ResourceNotFoundException;
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
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.ArrayList;

@RestController
@RequestMapping("/api/admin/payments")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
@Tag(name = "Admin Payments", description = "APIs for administrators to manage payment systems")
@SecurityRequirement(name = "bearerAuth")
public class AdminPaymentController {

        private final PaymentService paymentService;
        private final PaymentPlanService paymentPlanService;
        private final PaymentReminderService reminderService;
        private final GracePeriodConfigService gracePeriodConfigService;
        private final ReminderConfigService reminderConfigService;
        private final SolarInstallationRepository installationRepository;

        @GetMapping("/overdue")
        @Operation(summary = "Get overdue payments", description = "Retrieves all overdue payments across the system with pagination and sorting options.")
        @ApiResponses(value = {
                        @ApiResponse(responseCode = "200", description = "Overdue payments retrieved successfully"),
                        @ApiResponse(responseCode = "401", description = "Unauthorized", content = @Content),
                        @ApiResponse(responseCode = "403", description = "Forbidden - requires ADMIN role", content = @Content)
        })
        public ResponseEntity<Page<PaymentDTO>> getOverduePayments(
                        @Parameter(description = "Page number (zero-based)") @RequestParam(defaultValue = "0") int page,

                        @Parameter(description = "Number of items per page") @RequestParam(defaultValue = "10") int size,

                        @Parameter(description = "Field to sort by (e.g., dueDate, amount, status)") @RequestParam(defaultValue = "dueDate") String sortBy,

                        @Parameter(description = "Sort direction (asc or desc)") @RequestParam(defaultValue = "asc") String direction) {

                Sort.Direction sortDirection = direction.equalsIgnoreCase("asc") ? Sort.Direction.ASC
                                : Sort.Direction.DESC;

                Page<PaymentDTO> overduePayments = paymentService.getAllOverduePayments(
                                PageRequest.of(page, size, Sort.by(sortDirection, sortBy)));

                return ResponseEntity.ok(overduePayments);
        }

        @GetMapping("/plans/{planId}")
        @Operation(summary = "Get payment plan by ID", description = "Retrieves a specific payment plan by its ID.")
        @ApiResponses(value = {
                        @ApiResponse(responseCode = "200", description = "Payment plan retrieved successfully"),
                        @ApiResponse(responseCode = "401", description = "Unauthorized", content = @Content),
                        @ApiResponse(responseCode = "403", description = "Forbidden - requires ADMIN role", content = @Content),
                        @ApiResponse(responseCode = "404", description = "Payment plan not found", content = @Content)
        })
        public ResponseEntity<PaymentPlanDTO> getPaymentPlanById(
                        @Parameter(description = "ID of the payment plan to retrieve", required = true) @PathVariable Long planId) {
            try {
                PaymentPlanDTO paymentPlan = paymentPlanService.getPaymentPlanById(planId);
                return ResponseEntity.ok(paymentPlan);
            } catch (ResourceNotFoundException e) {
                return ResponseEntity.notFound().build();
            }
        }

        @GetMapping("/customers/{customerId}/plan")
        @Operation(summary = "Get customer payment plans", description = "Retrieves all payment plans associated with a specific customer.")
        @ApiResponses(value = {
                        @ApiResponse(responseCode = "200", description = "Payment plans retrieved successfully"),
                        @ApiResponse(responseCode = "401", description = "Unauthorized", content = @Content),
                        @ApiResponse(responseCode = "403", description = "Forbidden - requires ADMIN role", content = @Content),
                        @ApiResponse(responseCode = "404", description = "Customer not found", content = @Content)
        })
        public ResponseEntity<List<PaymentPlanDTO>> getCustomerPaymentPlans(
                        @Parameter(description = "ID of the customer to retrieve payment plans for", required = true) @PathVariable Long customerId) {

                // First, find all installations belonging to this customer
                List<SolarInstallation> installations = installationRepository.findByUserId(customerId);

                if (installations.isEmpty()) {
                        return ResponseEntity.notFound().build();
                }

                // Get payment plans for all installations belonging to the customer
                List<PaymentPlanDTO> allPlans = new ArrayList<>();
                for (SolarInstallation installation : installations) {
                        List<PaymentPlanDTO> installationPlans = paymentPlanService
                                        .getPaymentPlansByInstallation(installation.getId());
                        allPlans.addAll(installationPlans);
                }

                return ResponseEntity.ok(allPlans);
        }

        @PutMapping("/customers/{customerId}/plan/{planId}")
        @Operation(summary = "Update payment plan", description = "Updates an existing payment plan for a specific customer.")
        @ApiResponses(value = {
                        @ApiResponse(responseCode = "200", description = "Payment plan updated successfully", content = @Content(schema = @Schema(implementation = PaymentPlanDTO.class))),
                        @ApiResponse(responseCode = "400", description = "Invalid request or customer ID mismatch", content = @Content),
                        @ApiResponse(responseCode = "401", description = "Unauthorized", content = @Content),
                        @ApiResponse(responseCode = "403", description = "Forbidden - requires ADMIN role", content = @Content),
                        @ApiResponse(responseCode = "404", description = "Payment plan not found", content = @Content)
        })
        public ResponseEntity<Object> updatePaymentPlan(
                        @Parameter(description = "ID of the customer owning the payment plan", required = true) @PathVariable Long customerId,

                        @Parameter(description = "ID of the payment plan to update", required = true) @PathVariable Long planId,

                        @Parameter(description = "Updated payment plan details", required = true) @Valid @RequestBody PaymentPlanRequest request) {

                try {
                        // Verify the installation exists
                        SolarInstallation installation = installationRepository.findById(request.getInstallationId())
                                        .orElseThrow(() -> new ResourceNotFoundException(
                                                        "Solar installation not found with id: " + request.getInstallationId()));

                        // Check if this installation belongs to the customer
                        if (!installation.getUser().getId().equals(customerId)) {
                                Map<String, String> errorResponse = new HashMap<>();
                                errorResponse.put("error", "Installation #" + request.getInstallationId() +
                                                " does not belong to customer #" + customerId);
                                return ResponseEntity.badRequest().body(errorResponse);
                        }

                        // Verify the payment plan exists and belongs to this installation
                        PaymentPlanDTO existingPlan = paymentPlanService.getPaymentPlanById(planId);
                        if (!existingPlan.getInstallationId().equals(installation.getId())) {
                                Map<String, String> errorResponse = new HashMap<>();
                                errorResponse.put("error", "Payment plan #" + planId + 
                                                " does not belong to installation #" + installation.getId());
                                return ResponseEntity.badRequest().body(errorResponse);
                        }

                        // Update the payment plan
                        PaymentPlanDTO updatedPlan = paymentPlanService.updatePaymentPlan(planId, request);
                        return ResponseEntity.ok(updatedPlan);
                } catch (ResourceNotFoundException e) {
                        Map<String, String> errorResponse = new HashMap<>();
                        errorResponse.put("error", e.getMessage());
                        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorResponse);
                } catch (IllegalArgumentException e) {
                        Map<String, String> errorResponse = new HashMap<>();
                        errorResponse.put("error", e.getMessage());
                        return ResponseEntity.badRequest().body(errorResponse);
                } catch (Exception e) {
                        Map<String, String> errorResponse = new HashMap<>();
                        errorResponse.put("error", "Failed to update payment plan: " + e.getMessage());
                        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
                }
        }

        @PostMapping("/customers/{customerId}/plan")
        @Operation(summary = "Create payment plan", description = "Creates a new payment plan for a specific customer.")
        @ApiResponses(value = {
                        @ApiResponse(responseCode = "201", description = "Payment plan created successfully", content = @Content(schema = @Schema(implementation = PaymentPlanDTO.class))),
                        @ApiResponse(responseCode = "400", description = "Invalid request", content = @Content),
                        @ApiResponse(responseCode = "401", description = "Unauthorized", content = @Content),
                        @ApiResponse(responseCode = "403", description = "Forbidden - requires ADMIN role", content = @Content),
                        @ApiResponse(responseCode = "404", description = "Customer or installation not found", content = @Content)
        })
        public ResponseEntity<Object> createPaymentPlan(
                        @Parameter(description = "ID of the customer to create payment plan for", required = true) @PathVariable Long customerId,

                        @Parameter(description = "New payment plan details", required = true) @Valid @RequestBody PaymentPlanRequest request) {

                // Verify the installation belongs to the customer
                SolarInstallation installation = installationRepository.findById(request.getInstallationId())
                                .orElse(null);

                if (installation == null) {
                        return ResponseEntity.notFound().build();
                }

                // Check if this installation belongs to the customer
                if (!installation.getUser().getId().equals(customerId)) {
                        Map<String, String> errorResponse = new HashMap<>();
                        errorResponse.put("error", "Installation #" + request.getInstallationId() +
                                        " does not belong to customer #" + customerId);
                        return ResponseEntity.badRequest().body(errorResponse);
                }

                PaymentPlanDTO newPlan = paymentPlanService.createPaymentPlan(request);
                return ResponseEntity.status(HttpStatus.CREATED).body(newPlan);
        }

        @PostMapping("/customers/{customerId}/manual-payment")
        @Operation(summary = "Record manual payment", description = "Records a manual payment made by a customer, typically used for payments made outside the system (e.g., bank transfers).")
        @ApiResponses(value = {
                        @ApiResponse(responseCode = "201", description = "Manual payment recorded successfully", content = @Content(schema = @Schema(implementation = PaymentDTO.class))),
                        @ApiResponse(responseCode = "400", description = "Invalid payment request", content = @Content),
                        @ApiResponse(responseCode = "401", description = "Unauthorized", content = @Content),
                        @ApiResponse(responseCode = "403", description = "Forbidden - requires ADMIN role", content = @Content),
                        @ApiResponse(responseCode = "404", description = "Customer not found", content = @Content)
        })
        public ResponseEntity<PaymentDTO> recordManualPayment(
                        @Parameter(description = "ID of the customer making the payment", required = true) @PathVariable Long customerId,

                        @Parameter(description = "Payment details", required = true) @Valid @RequestBody MakePaymentRequest request) {

                PaymentDTO payment = paymentService.recordManualPayment(request.getPaymentId(), request);
                return ResponseEntity.status(HttpStatus.CREATED).body(payment);
        }

        @GetMapping("/installations/{installationId}/payments")
        @Operation(summary = "Get installation payments", description = "Retrieves all payments for a specific installation with pagination and sorting options.")
        @ApiResponses(value = {
                        @ApiResponse(responseCode = "200", description = "Payments retrieved successfully"),
                        @ApiResponse(responseCode = "401", description = "Unauthorized", content = @Content),
                        @ApiResponse(responseCode = "403", description = "Forbidden - requires ADMIN role", content = @Content),
                        @ApiResponse(responseCode = "404", description = "Installation not found", content = @Content)
        })
        public ResponseEntity<Page<PaymentDTO>> getInstallationPayments(
                        @Parameter(description = "ID of the installation to get payments for", required = true) @PathVariable Long installationId,

                        @Parameter(description = "Page number (zero-based)") @RequestParam(defaultValue = "0") int page,

                        @Parameter(description = "Number of items per page") @RequestParam(defaultValue = "10") int size,

                        @Parameter(description = "Field to sort by (e.g., dueDate, amount, status)") @RequestParam(defaultValue = "dueDate") String sortBy,

                        @Parameter(description = "Sort direction (asc or desc)") @RequestParam(defaultValue = "desc") String direction) {

                Sort.Direction sortDirection = direction.equalsIgnoreCase("asc") ? Sort.Direction.ASC
                                : Sort.Direction.DESC;

                Page<PaymentDTO> payments = paymentService.getPaymentsByInstallation(
                                installationId,
                                PageRequest.of(page, size, Sort.by(sortDirection, sortBy)));

                return ResponseEntity.ok(payments);
        }

        @PostMapping("/reminders/send")
        @Operation(summary = "Send manual reminder", description = "Manually sends a payment reminder to a customer for a specific payment.")
        @ApiResponses(value = {
                        @ApiResponse(responseCode = "200", description = "Reminder sent successfully"),
                        @ApiResponse(responseCode = "400", description = "Invalid reminder type", content = @Content),
                        @ApiResponse(responseCode = "401", description = "Unauthorized", content = @Content),
                        @ApiResponse(responseCode = "403", description = "Forbidden - requires ADMIN role", content = @Content),
                        @ApiResponse(responseCode = "404", description = "Payment not found", content = @Content)
        })
        public ResponseEntity<Void> sendManualReminder(
                        @Parameter(description = "ID of the payment to send reminder for", required = true) @RequestParam Long paymentId,

                        @Parameter(description = "Type of reminder to send (e.g., EMAIL, SMS, FIRST_REMINDER)", required = true) @RequestParam String reminderType) {

                PaymentReminder.ReminderType type = PaymentReminder.ReminderType.valueOf(reminderType);
                reminderService.sendManualReminder(paymentId, type);

                return ResponseEntity.ok().build();
        }

        @GetMapping("/grace-period-config")
        @Operation(summary = "Get grace period configuration", description = "Retrieves the current grace period configuration for late payments.")
        @ApiResponses(value = {
                        @ApiResponse(responseCode = "200", description = "Configuration retrieved successfully", content = @Content(schema = @Schema(implementation = GracePeriodConfigDTO.class))),
                        @ApiResponse(responseCode = "401", description = "Unauthorized", content = @Content),
                        @ApiResponse(responseCode = "403", description = "Forbidden - requires ADMIN role", content = @Content)
        })
        public ResponseEntity<GracePeriodConfigDTO> getGracePeriodConfig() {
                GracePeriodConfigDTO config = gracePeriodConfigService.getCurrentConfig();
                return ResponseEntity.ok(config);
        }

        @PutMapping("/grace-period-config")
        @Operation(summary = "Update grace period configuration", description = "Updates the grace period configuration for late payments.")
        @ApiResponses(value = {
                        @ApiResponse(responseCode = "200", description = "Configuration updated successfully", content = @Content(schema = @Schema(implementation = GracePeriodConfigDTO.class))),
                        @ApiResponse(responseCode = "400", description = "Invalid configuration", content = @Content),
                        @ApiResponse(responseCode = "401", description = "Unauthorized", content = @Content),
                        @ApiResponse(responseCode = "403", description = "Forbidden - requires ADMIN role", content = @Content)
        })
        public ResponseEntity<GracePeriodConfigDTO> updateGracePeriodConfig(
                        @Parameter(description = "Authentication object containing admin credentials", hidden = true) Authentication authentication,

                        @Parameter(description = "Updated grace period configuration", required = true) @Valid @RequestBody GracePeriodConfigDTO configDTO) {

                String username = authentication.getName();
                GracePeriodConfigDTO updatedConfig = gracePeriodConfigService.updateConfig(configDTO, username);

                return ResponseEntity.ok(updatedConfig);
        }

        @GetMapping("/reminder-config")
        @Operation(summary = "Get reminder configuration", description = "Retrieves the current reminder configuration for payment notifications.")
        @ApiResponses(value = {
                        @ApiResponse(responseCode = "200", description = "Configuration retrieved successfully", content = @Content(schema = @Schema(implementation = ReminderConfigDTO.class))),
                        @ApiResponse(responseCode = "401", description = "Unauthorized", content = @Content),
                        @ApiResponse(responseCode = "403", description = "Forbidden - requires ADMIN role", content = @Content)
        })
        public ResponseEntity<ReminderConfigDTO> getReminderConfig() {
                ReminderConfigDTO config = reminderConfigService.getCurrentConfig();
                return ResponseEntity.ok(config);
        }

        @PutMapping("/reminder-config")
        @Operation(summary = "Update reminder configuration", description = "Updates the reminder configuration for payment notifications.")
        @ApiResponses(value = {
                        @ApiResponse(responseCode = "200", description = "Configuration updated successfully", content = @Content(schema = @Schema(implementation = ReminderConfigDTO.class))),
                        @ApiResponse(responseCode = "400", description = "Invalid configuration", content = @Content),
                        @ApiResponse(responseCode = "401", description = "Unauthorized", content = @Content),
                        @ApiResponse(responseCode = "403", description = "Forbidden - requires ADMIN role", content = @Content)
        })
        public ResponseEntity<ReminderConfigDTO> updateReminderConfig(
                        @Parameter(description = "Authentication object containing admin credentials", hidden = true) Authentication authentication,

                        @Parameter(description = "Updated reminder configuration", required = true) @Valid @RequestBody ReminderConfigDTO configDTO) {

                try {
                        String username = authentication.getName();
                        ReminderConfigDTO updatedConfig = reminderConfigService.updateConfig(configDTO, username);
                        return ResponseEntity.ok(updatedConfig);
                } catch (IllegalArgumentException e) {
                        // Return bad request for validation errors
                        return ResponseEntity.badRequest().build();
                }
        }

        @PostMapping("/update-statuses")
        @Operation(
            summary = "Force payment status update",
            description = "Manually triggers the payment status update process to recalculate overdue, upcoming, and due payments."
        )
        @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Status update completed successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthorized", content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden - requires ADMIN role", content = @Content)
        })
        public ResponseEntity<Map<String, String>> forcePaymentStatusUpdate() {
            try {
                // Run the status update job
                paymentService.updatePaymentStatuses();

                Map<String, String> response = new HashMap<>();
                response.put("status", "success");
                response.put("message", "Payment status update completed successfully");
                return ResponseEntity.ok(response);
            } catch (Exception e) {
                Map<String, String> errorResponse = new HashMap<>();
                errorResponse.put("status", "error");
                errorResponse.put("message", "Error updating payment statuses: " + e.getMessage());
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
            }
        }
}
