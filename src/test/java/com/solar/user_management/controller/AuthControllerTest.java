// Testing: com.solar.user_management.controller.AuthController from src/main/java/com/solar/user_management/controller/AuthController.java
// Public endpoints being tested: login, register, verifyEmail, resendVerification, initiatePasswordReset, 
// completePasswordReset, changePassword, changeInitialPassword

package com.solar.user_management.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.solar.user_management.dto.auth.AuthResponse;
import com.solar.user_management.dto.auth.LoginRequest;
import com.solar.user_management.dto.auth.PasswordChangeRequest;
import com.solar.user_management.dto.auth.SignupRequest;
import com.solar.user_management.dto.user.PasswordResetConfirmRequest;
import com.solar.user_management.model.User;
import com.solar.user_management.model.UserActivityLog;
import com.solar.user_management.service.UserService;
import com.solar.user_management.service.UserActivityLogService;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import com.solar.user_management.controller.CustomerController;
import com.solar.user_management.dto.user.UserProfileResponse;
import org.springframework.http.MediaType;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;

/**
 * Test class for AuthController
 * Source file: src/main/java/com/solar/user_management/controller/AuthController.java
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@ExtendWith(MockitoExtension.class)
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private UserService userService;

    @Mock
    private UserActivityLogService userActivityLogService;

    @MockBean
    private CustomerController customerController;

    private User testUser;
    private LoginRequest loginRequest;
    private SignupRequest signupRequest;
    private PasswordChangeRequest passwordChangeRequest;
    private PasswordResetConfirmRequest passwordResetConfirmRequest;
    private AuthResponse authResponse;

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setId(1L);
        testUser.setEmail("test@example.com");
        testUser.setFullName("Test User");
        testUser.setPhoneNumber("+1234567890");
        testUser.setRole(User.UserRole.CUSTOMER);
        testUser.setEnabled(true);
        testUser.setEmailVerified(true);
        testUser.setCreatedAt(LocalDateTime.now());
        testUser.setUpdatedAt(LocalDateTime.now());

        loginRequest = new LoginRequest();
        loginRequest.setEmail("test@example.com");
        loginRequest.setPassword("password123");

        signupRequest = new SignupRequest();
        signupRequest.setEmail("newuser@example.com");
        signupRequest.setPassword("newpassword");
        signupRequest.setFullName("New User");
        signupRequest.setPhoneNumber("+9876543210");

        passwordChangeRequest = new PasswordChangeRequest();
        passwordChangeRequest.setEmail("test@example.com");
        passwordChangeRequest.setNewPassword("newpassword");
        passwordChangeRequest.setConfirmPassword("newpassword");

        passwordResetConfirmRequest = new PasswordResetConfirmRequest();
        passwordResetConfirmRequest.setToken("reset-token");
        passwordResetConfirmRequest.setNewPassword("newpassword");
        passwordResetConfirmRequest.setConfirmPassword("newpassword");

        authResponse = new AuthResponse();
        authResponse.setAccessToken("jwt-token");
        authResponse.setTokenType("Bearer");
        authResponse.setEmail(testUser.getEmail());
        authResponse.setFullName(testUser.getFullName());
        authResponse.setRole(testUser.getRole().name());
    }

    @Test
    void login_Success() throws Exception {
        when(userService.authenticateUser(any(LoginRequest.class))).thenReturn(authResponse);

        mockMvc.perform(post("/api/auth/login")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").value("jwt-token"))
                .andExpect(jsonPath("$.email").value(testUser.getEmail()));
    }

    @Test
    void login_BadCredentials() throws Exception {
        when(userService.authenticateUser(any(LoginRequest.class)))
                .thenThrow(new BadCredentialsException("Invalid credentials"));

        mockMvc.perform(post("/api/auth/login")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(username = "admin@example.com", roles = "ADMIN")
    public void register_Success() throws Exception {
        SignupRequest signupRequest = new SignupRequest();
        signupRequest.setFullName("New User");
        signupRequest.setEmail("newuser@example.com");
        signupRequest.setPassword("newpassword");
        signupRequest.setPhoneNumber("+9876543210");

        User newUser = new User();
        newUser.setId(1L);
        newUser.setFullName("New User");
        newUser.setEmail("newuser@example.com");
        newUser.setRole(User.UserRole.CUSTOMER);
        
        UserProfileResponse response = UserProfileResponse.fromUser(newUser);
        
        when(customerController.registerCustomer(any(SignupRequest.class), any(HttpServletRequest.class)))
            .thenReturn(ResponseEntity.status(HttpStatus.CREATED).body(response));

        mockMvc.perform(post("/api/customers")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(signupRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.email").value("newuser@example.com"));
    }

    @Test
    @WithMockUser(username = "admin@example.com", roles = "ADMIN")
    void register_EmailAlreadyExists() throws Exception {
        // Mock the CustomerController to throw an exception
        when(customerController.registerCustomer(any(SignupRequest.class), any(HttpServletRequest.class)))
                .thenThrow(new RuntimeException("Email is already registered"));

        mockMvc.perform(post("/api/customers")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(signupRequest)))
                .andExpect(status().is5xxServerError())
                .andExpect(jsonPath("$.message").value("Email is already registered"));
    }

    @Test
    void verifyEmail_Success() throws Exception {
        when(userService.verifyEmail(anyString())).thenReturn(testUser);

        mockMvc.perform(get("/api/auth/verify-email/{token}", "verification-token")
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Email verified successfully"));
    }

    @Test
    void verifyEmail_InvalidToken() throws Exception {
        when(userService.verifyEmail(anyString()))
                .thenThrow(new RuntimeException("Invalid or expired verification token"));

        mockMvc.perform(get("/api/auth/verify-email/{token}", "invalid-token")
                        .with(csrf()))
                .andExpect(status().is5xxServerError())
                .andExpect(jsonPath("$.message").value("Invalid or expired verification token"));
    }

    @Test
    void resendVerification_Success() throws Exception {
        when(userService.findByEmail(anyString())).thenReturn(testUser);

        mockMvc.perform(post("/api/auth/resend-verification")
                        .with(csrf())
                        .param("email", "test@example.com"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Email is already verified. You can now log in."));
    }

    @Test
    void resendVerification_UserNotFound() throws Exception {
        when(userService.findByEmail(anyString()))
                .thenThrow(new RuntimeException("User not found"));

        mockMvc.perform(post("/api/auth/resend-verification")
                        .with(csrf())
                        .param("email", "nonexistent@example.com"))
                .andExpect(status().is5xxServerError())
                .andExpect(jsonPath("$.message").value("User not found"));
    }

    @Test
    public void initiatePasswordReset_Success() throws Exception {
        doNothing().when(userService).initiatePasswordReset(anyString());

        mockMvc.perform(post("/api/profile/password/reset-request")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"test@example.com\"}"))
                .andExpect(status().isOk());
    }

    @Test
    public void completePasswordReset_Success() throws Exception {
        PasswordResetConfirmRequest request = new PasswordResetConfirmRequest();
        request.setToken("reset-token");
        request.setNewPassword("newpassword");
        request.setConfirmPassword("newpassword");

        when(userService.completePasswordReset(anyString(), anyString(), anyString())).thenReturn(testUser);

        mockMvc.perform(post("/api/profile/password/reset-confirm")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());
    }

    @Test
    public void completePasswordReset_InvalidToken() throws Exception {
        PasswordResetConfirmRequest request = new PasswordResetConfirmRequest();
        request.setToken("invalid-token");
        request.setNewPassword("newpassword");
        request.setConfirmPassword("newpassword");

        when(userService.completePasswordReset(eq("invalid-token"), anyString(), anyString()))
                .thenThrow(new RuntimeException("Invalid or expired reset token"));

        mockMvc.perform(post("/api/profile/password/reset-confirm")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.message").value("Invalid or expired reset token"));
    }

    @Test
    void changeInitialPassword_Success() throws Exception {
        mockMvc.perform(post("/api/auth/change-initial-password")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(passwordChangeRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Password changed successfully. You can now log in."));
    }

    @Test
    void changeInitialPassword_PasswordMismatch() throws Exception {
        doThrow(new RuntimeException("Passwords do not match"))
                .when(userService).changeInitialPassword(anyString(), anyString(), anyString());

        PasswordChangeRequest mismatchRequest = new PasswordChangeRequest();
        mismatchRequest.setEmail("test@example.com");
        mismatchRequest.setNewPassword("newpassword");
        mismatchRequest.setConfirmPassword("differentpassword");

        mockMvc.perform(post("/api/auth/change-initial-password")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(mismatchRequest)))
                .andExpect(status().is5xxServerError())
                .andExpect(jsonPath("$.message").value("Passwords do not match"));
    }

    @Test
    @WithMockUser(username = "test@example.com")
    void changePassword_Success() throws Exception {
        when(userService.getCurrentUser()).thenReturn(testUser);

        mockMvc.perform(post("/api/auth/change-password")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(passwordChangeRequest))
                        .param("currentPassword", "password123"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Password changed successfully"));
    }

    @Test
    @WithMockUser(username = "test@example.com")
    void changePassword_IncorrectCurrentPassword() throws Exception {
        when(userService.getCurrentUser()).thenReturn(testUser);
        doThrow(new RuntimeException("Current password is incorrect"))
                .when(userService).changePassword(any(User.class), anyString(), anyString());

        mockMvc.perform(post("/api/auth/change-password")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(passwordChangeRequest))
                        .param("currentPassword", "wrongpassword"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Current password is incorrect"));
    }
} 