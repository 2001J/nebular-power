package com.solar.core_services.payment_compliance.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.solar.user_management.model.User;
import com.solar.user_management.security.UserPrincipal;
import com.solar.core_services.payment_compliance.dto.MakePaymentRequest;
import com.solar.core_services.payment_compliance.dto.PaymentDTO;
import com.solar.core_services.payment_compliance.dto.PaymentDashboardDTO;
import com.solar.core_services.payment_compliance.model.Payment;
import com.solar.core_services.payment_compliance.service.PaymentService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers;
import org.springframework.security.access.AccessDeniedException;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Test class for CustomerPaymentController
 * Source file: src/main/java/com/solar/core_services/payment_compliance/controller/CustomerPaymentController.java
 */
@ExtendWith(MockitoExtension.class)
public class CustomerPaymentControllerTest {

    private MockMvc mockMvc;

    @Mock
    private PaymentService paymentService;

    @Mock
    private Authentication authentication;

    @InjectMocks
    private CustomerPaymentController controller;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private User testUser;
    private UserPrincipal userPrincipal;

    private PaymentDashboardDTO testDashboard;
    private PaymentDTO testPaymentDTO1;
    private PaymentDTO testPaymentDTO2;
    private MakePaymentRequest testPaymentRequest;

    @BeforeEach
    void setUp() {
        // Create test user
        testUser = new User();
        testUser.setId(1L);
        testUser.setEmail("test@example.com");
        testUser.setFullName("Test User");
        testUser.setRole(User.UserRole.CUSTOMER);
        testUser.setEnabled(true);

        // Create UserPrincipal
        userPrincipal = new UserPrincipal(testUser);

        // Set up Authentication mock with lenient mode to avoid UnnecessaryStubbingException
        lenient().when(authentication.getPrincipal()).thenReturn(userPrincipal);
        lenient().when(authentication.isAuthenticated()).thenReturn(true);

        // Set up MockMvc with controller advice to handle exceptions
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .build();

        // Configure ObjectMapper for Java 8 date/time types
        objectMapper.registerModule(new com.fasterxml.jackson.datatype.jsr310.JavaTimeModule());
        objectMapper.disable(com.fasterxml.jackson.databind.SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

        // Create test payment DTOs
        testPaymentDTO1 = PaymentDTO.builder()
                .id(1L)
                .installationId(1L)
                .customerName("Test User")
                .customerEmail("test@example.com")
                .paymentPlanId(1L)
                .paymentPlanName("Test Payment Plan")
                .amount(new BigDecimal("416.67"))
                .dueDate(LocalDateTime.now().minusDays(30))
                .paidAt(LocalDateTime.now().minusDays(28))
                .status(Payment.PaymentStatus.PAID)
                .statusReason("Payment received")
                .transactionId("TX123456")
                .paymentMethod("CREDIT_CARD")
                .build();

        testPaymentDTO2 = PaymentDTO.builder()
                .id(2L)
                .installationId(1L)
                .customerName("Test User")
                .customerEmail("test@example.com")
                .paymentPlanId(1L)
                .paymentPlanName("Test Payment Plan")
                .amount(new BigDecimal("416.67"))
                .dueDate(LocalDateTime.now())
                .status(Payment.PaymentStatus.DUE_TODAY)
                .statusReason("Payment due today")
                .build();

        // Create test dashboard
        testDashboard = PaymentDashboardDTO.builder()
                .installationId(1L)
                .totalAmount(new BigDecimal("10000.00"))
                .remainingAmount(new BigDecimal("8000.00"))
                .nextPaymentAmount(new BigDecimal("416.67"))
                .nextPaymentDueDate(LocalDateTime.now())
                .totalInstallments(24)
                .remainingInstallments(20)
                .completedInstallments(4)
                .hasOverduePayments(false)
                .recentPayments(Collections.singletonList(testPaymentDTO1))
                .upcomingPayments(Collections.singletonList(testPaymentDTO2))
                .build();

        // Create test payment request
        testPaymentRequest = MakePaymentRequest.builder()
                .paymentId(2L)
                .amount(new BigDecimal("416.67"))
                .paymentMethod("CREDIT_CARD")
                .transactionId("TX789012")
                .build();
    }

    @Test
    @DisplayName("Should get payment dashboard")
    void shouldGetPaymentDashboard() throws Exception {
        // Given
        when(paymentService.getCustomerDashboard(eq(1L))).thenReturn(testDashboard);

        // When/Then
        mockMvc.perform(get("/api/payments/dashboard")
                .contentType(MediaType.APPLICATION_JSON)
                .principal(authentication))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.installationId", is(1)))
                .andExpect(jsonPath("$.totalAmount", is(10000.00)))
                .andExpect(jsonPath("$.remainingAmount", is(8000.00)))
                .andExpect(jsonPath("$.totalInstallments", is(24)))
                .andExpect(jsonPath("$.remainingInstallments", is(20)))
                .andExpect(jsonPath("$.completedInstallments", is(4)))
                .andExpect(jsonPath("$.hasOverduePayments", is(false)))
                .andExpect(jsonPath("$.recentPayments", hasSize(1)))
                .andExpect(jsonPath("$.upcomingPayments", hasSize(1)));
    }

    @Test
    @DisplayName("Should get payment history")
    void shouldGetPaymentHistory() throws Exception {
        // Given
        List<PaymentDTO> paymentHistory = Arrays.asList(testPaymentDTO1, testPaymentDTO2);
        when(paymentService.getPaymentHistory(eq(1L), any())).thenReturn(paymentHistory);

        // When/Then
        mockMvc.perform(get("/api/payments/history")
                .param("page", "0")
                .param("size", "10")
                .contentType(MediaType.APPLICATION_JSON)
                .principal(authentication))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].id", is(1)))
                .andExpect(jsonPath("$[1].id", is(2)));
    }

    @Test
    @DisplayName("Should get upcoming payments")
    void shouldGetUpcomingPayments() throws Exception {
        // Given
        List<PaymentDTO> upcomingPayments = Collections.singletonList(testPaymentDTO2);
        when(paymentService.getUpcomingPayments(eq(1L))).thenReturn(upcomingPayments);

        // When/Then
        mockMvc.perform(get("/api/payments/upcoming")
                .contentType(MediaType.APPLICATION_JSON)
                .principal(authentication))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].id", is(2)))
                .andExpect(jsonPath("$[0].status", is("DUE_TODAY")));
    }

    @Test
    @DisplayName("Should make payment")
    void shouldMakePayment() throws Exception {
        // Given
        when(paymentService.makePayment(eq(1L), any(MakePaymentRequest.class))).thenReturn(testPaymentDTO1);

        // When/Then
        mockMvc.perform(post("/api/payments/make-payment")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(testPaymentRequest))
                .principal(authentication))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id", is(1)))
                .andExpect(jsonPath("$.status", is("PAID")))
                .andExpect(jsonPath("$.transactionId", is("TX123456")));

        verify(paymentService, times(1)).makePayment(eq(1L), any(MakePaymentRequest.class));
    }

    @Test
    @DisplayName("Should download payment receipt")
    void shouldDownloadPaymentReceipt() throws Exception {
        // Given
        byte[] receiptData = "Test Receipt Content".getBytes();
        when(paymentService.generatePaymentReceipt(eq(1L), eq(1L))).thenReturn(receiptData);

        // When/Then
        mockMvc.perform(get("/api/payments/receipts/1")
                .contentType(MediaType.APPLICATION_JSON)
                .principal(authentication))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.TEXT_PLAIN))
                .andExpect(content().bytes(receiptData));

        verify(paymentService, times(1)).generatePaymentReceipt(eq(1L), eq(1L));
    }

    @Test
    @DisplayName("Should return error when not authenticated")
    void shouldReturnUnauthorizedWhenNotAuthenticated() throws Exception {
        // Reset the authentication mock to return false for isAuthenticated
        when(authentication.isAuthenticated()).thenReturn(false);

        try {
            // When/Then - expect an exception to be thrown
            mockMvc.perform(get("/api/payments/dashboard")
                    .contentType(MediaType.APPLICATION_JSON)
                    .principal(authentication));
        } catch (Exception e) {
            // Verify that the exception is related to authentication
            if (!(e.getCause() instanceof IllegalStateException) || 
                !e.getCause().getMessage().contains("User not authenticated")) {
                throw e; // Re-throw if it's not the expected exception
            }
            // Otherwise, this is the expected exception, so the test passes
        } finally {
            // Reset the authentication mock back to its original state for other tests
            lenient().when(authentication.isAuthenticated()).thenReturn(true);
        }

        // Verify that the service was not called
        verify(paymentService, times(0)).getCustomerDashboard(anyLong());
    }
} 
