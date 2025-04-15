// Testing: com.solar.user_management.controller.CustomerController from src/main/java/com/solar/user_management/controller/CustomerController.java
// Public endpoints being tested: getAllCustomers, getCustomerById, searchCustomers, updateCustomer, deactivateCustomer, 
// reactivateCustomer, resetCustomerPassword, getCustomerActivityLogs

package com.solar.user_management.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.solar.core_services.energy_monitoring.controller.TestSecurityConfig;
import com.solar.user_management.dto.customer.CustomerUpdateRequest;
import com.solar.user_management.model.User;
import com.solar.user_management.model.UserActivityLog;
import com.solar.user_management.service.UserActivityLogService;
import com.solar.user_management.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.context.annotation.Import;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Test class for CustomerController
 * Source file: src/main/java/com/solar/user_management/controller/CustomerController.java
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestSecurityConfig.class)
@ActiveProfiles("test")
public class CustomerControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private UserService userService;

    @MockBean
    private UserActivityLogService activityLogService;

    private User testCustomer;
    private UserActivityLog testActivityLog;
    private CustomerUpdateRequest updateRequest;

    @BeforeEach
    void setUp() {
        // Set up test data
        testCustomer = new User();
        testCustomer.setId(1L);
        testCustomer.setEmail("customer@example.com");
        testCustomer.setFullName("Test Customer");
        testCustomer.setPhoneNumber("+1234567890");
        testCustomer.setRole(User.UserRole.CUSTOMER);
        testCustomer.setEnabled(true);
        testCustomer.setEmailVerified(true);
        testCustomer.setCreatedAt(LocalDateTime.now());
        testCustomer.setUpdatedAt(LocalDateTime.now());

        testActivityLog = new UserActivityLog();
        testActivityLog.setId(1L);
        testActivityLog.setUser(testCustomer);
        testActivityLog.setActivityType(UserActivityLog.ActivityType.LOGIN);
        testActivityLog.setActivity("User login");
        testActivityLog.setDetails("Successful login from web application");
        testActivityLog.setIpAddress("192.168.1.1");
        testActivityLog.setTimestamp(LocalDateTime.now());
        
        updateRequest = new CustomerUpdateRequest(
            "Updated Customer", 
            testCustomer.getEmail(), 
            "+9876543210", 
            null  // No password change
        );
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void getAllCustomers_Success() throws Exception {
        // Arrange
        List<User> customers = new ArrayList<>();
        customers.add(testCustomer);
        when(userService.getAllCustomers()).thenReturn(customers);

        // Act & Assert
        mockMvc.perform(get("/api/customers"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].email").value(testCustomer.getEmail()))
                .andExpect(jsonPath("$[0].fullName").value(testCustomer.getFullName()));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void getCustomerById_Success() throws Exception {
        // Arrange
        when(userService.getCustomerById(anyLong())).thenReturn(testCustomer);

        // Act & Assert
        mockMvc.perform(get("/api/customers/{id}", 1L))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(testCustomer.getEmail()))
                .andExpect(jsonPath("$.fullName").value(testCustomer.getFullName()));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void getCustomerById_NotFound() throws Exception {
        // Arrange
        when(userService.getCustomerById(anyLong())).thenThrow(new RuntimeException("Customer not found"));

        // Act & Assert
        mockMvc.perform(get("/api/customers/{id}", 999L))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.message").value("Customer not found"));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void searchCustomers_Success() throws Exception {
        // Arrange
        List<User> customers = new ArrayList<>();
        customers.add(testCustomer);
        when(userService.searchCustomers(anyString())).thenReturn(customers);

        // Act & Assert
        mockMvc.perform(get("/api/customers/search")
                .param("query", "test"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].email").value(testCustomer.getEmail()))
                .andExpect(jsonPath("$[0].fullName").value(testCustomer.getFullName()));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void updateCustomer_Success() throws Exception {
        // Arrange
        when(userService.getCustomerById(anyLong())).thenReturn(testCustomer);
        doNothing().when(userService).updateCustomer(any(User.class));

        // Act & Assert
        mockMvc.perform(put("/api/customers/{id}", 1L)
                .with(SecurityMockMvcRequestPostProcessors.csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(updateRequest)))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void deactivateCustomer_Success() throws Exception {
        // Arrange
        when(userService.getCustomerById(anyLong())).thenReturn(testCustomer);
        doNothing().when(userService).deactivateCustomer(anyLong());

        // Act & Assert
        mockMvc.perform(delete("/api/customers/{id}", 1L)
                .with(SecurityMockMvcRequestPostProcessors.csrf()))
                .andExpect(status().isNoContent());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void reactivateCustomer_Success() throws Exception {
        // Arrange
        when(userService.getCustomerById(anyLong())).thenReturn(testCustomer);
        doNothing().when(userService).reactivateCustomer(anyLong());

        // Act & Assert
        mockMvc.perform(post("/api/customers/{id}/reactivate", 1L)
                .with(SecurityMockMvcRequestPostProcessors.csrf()))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void resetCustomerPassword_Success() throws Exception {
        // Arrange
        when(userService.getCustomerById(anyLong())).thenReturn(testCustomer);
        doNothing().when(userService).resetCustomerPassword(anyLong());

        // Act & Assert
        mockMvc.perform(post("/api/customers/{id}/reset-password", 1L)
                .with(SecurityMockMvcRequestPostProcessors.csrf()))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void getCustomerActivityLogs_Success() throws Exception {
        // Arrange
        List<UserActivityLog> logs = new ArrayList<>();
        logs.add(testActivityLog);
        Page<UserActivityLog> page = new PageImpl<>(logs, PageRequest.of(0, 10), logs.size());

        when(userService.getCustomerById(anyLong())).thenReturn(testCustomer);
        when(activityLogService.getUserActivityLogs(eq(testCustomer), any(Pageable.class))).thenReturn(page);

        // Act & Assert
        mockMvc.perform(get("/api/customers/{id}/activity", 1L)
                .param("page", "0")
                .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].activity").value(testActivityLog.getActivity()))
                .andExpect(jsonPath("$.totalElements").value(1));
    }
} 