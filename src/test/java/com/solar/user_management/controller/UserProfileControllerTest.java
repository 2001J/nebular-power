// Testing: com.solar.user_management.controller.UserProfileController from src/main/java/com/solar/user_management/controller/UserProfileController.java
// Public endpoints being tested: getCurrentUser, updateProfile, getUserActivityLogs

package com.solar.user_management.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.solar.core_services.energy_monitoring.controller.TestSecurityConfig;
import com.solar.user_management.dto.user.UpdateProfileRequest;
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
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Test class for UserProfileController
 * Source file: src/main/java/com/solar/user_management/controller/UserProfileController.java
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class UserProfileControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private UserService userService;

    @MockBean
    private UserActivityLogService userActivityLogService;

    private User user;
    private UpdateProfileRequest updateProfileRequest;
    private UserActivityLog userActivityLog;

    @BeforeEach
    void setUp() {
        user = new User();
        user.setId(1L);
        user.setEmail("test@example.com");
        user.setFullName("Test User");
        user.setPhoneNumber("+1234567890");
        user.setRole(User.UserRole.CUSTOMER);
        user.setCreatedAt(LocalDateTime.now());
        user.setUpdatedAt(LocalDateTime.now());

        updateProfileRequest = new UpdateProfileRequest();
        updateProfileRequest.setFullName("Updated Name");
        updateProfileRequest.setPhoneNumber("+9876543210");

        userActivityLog = new UserActivityLog();
        userActivityLog.setId(1L);
        userActivityLog.setUser(user);
        userActivityLog.setActivity("Login");
        userActivityLog.setDetails("User logged in");
        userActivityLog.setIpAddress("127.0.0.1");
        userActivityLog.setTimestamp(LocalDateTime.now());
        userActivityLog.setActivityType(UserActivityLog.ActivityType.LOGIN);
    }

    @Test
    @WithMockUser(username = "test@example.com")
    void getCurrentUser_Success() throws Exception {
        when(userService.getCurrentUser()).thenReturn(user);

        mockMvc.perform(get("/api/profile"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.email").value("test@example.com"))
                .andExpect(jsonPath("$.fullName").value("Test User"));
    }

    @Test
    @WithMockUser(username = "test@example.com")
    void updateProfile_Success() throws Exception {
        // Create a valid update request with email included
        UpdateProfileRequest updateRequest = new UpdateProfileRequest();
        updateRequest.setFullName("Updated Name");
        updateRequest.setEmail("test@example.com"); // Add valid email
        updateRequest.setPhoneNumber("+9876543210");

        when(userService.updateProfile(any(UpdateProfileRequest.class))).thenReturn(user);

        mockMvc.perform(put("/api/profile")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fullName").value(user.getFullName()))
                .andExpect(jsonPath("$.email").value(user.getEmail()));
    }

    @Test
    @WithMockUser(username = "test@example.com")
    void getUserActivityLogs_Success() throws Exception {
        List<UserActivityLog> logs = Collections.singletonList(userActivityLog);
        Page<UserActivityLog> page = new PageImpl<>(logs, PageRequest.of(0, 10), logs.size());
        
        when(userService.getCurrentUser()).thenReturn(user);
        when(userActivityLogService.getUserActivityLogs(any(User.class), any(Pageable.class))).thenReturn(page);

        mockMvc.perform(get("/api/profile/activity")
                        .param("page", "0")
                        .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].activity").value("Login"))
                .andExpect(jsonPath("$.totalElements").value(1));
    }
} 