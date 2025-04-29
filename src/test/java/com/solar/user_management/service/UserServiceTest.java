// Testing: com.solar.user_management.service.impl.UserServiceImpl from src/main/java/com/solar/user_management/service/impl/UserServiceImpl.java
// Public methods being tested: authenticateUser, registerCustomer, updateCustomer, deactivateCustomer, reactivateCustomer, 
// getAllCustomers, getCustomerById, searchCustomers, getCurrentUser, updateProfile, verifyEmail, resendVerificationEmail, 
// isEmailVerified, initiatePasswordReset, completePasswordReset, changePassword, resetCustomerPassword, 
// changeInitialPassword, isPasswordChangeRequired, incrementFailedLoginAttempts, resetFailedLoginAttempts, 
// isAccountLocked, unlockAccount, existsByEmail, findByEmail, updateLastLogin, checkAccountStatus

package com.solar.user_management.service;

import com.solar.user_management.dto.auth.AuthResponse;
import com.solar.user_management.dto.auth.LoginRequest;
import com.solar.user_management.dto.auth.SignupRequest;
import com.solar.user_management.dto.user.UpdateProfileRequest;
import com.solar.user_management.model.User;
import com.solar.user_management.repository.UserRepository;
import com.solar.user_management.security.JwtTokenProvider;
import com.solar.user_management.service.impl.UserServiceImpl;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtTokenProvider tokenProvider;

    @Mock
    private EmailService emailService;

    @Mock
    private AuthenticationManager authenticationManager;

    @Mock
    private Authentication authentication;

    @InjectMocks
    private UserServiceImpl userService;

    private User testUser;
    private LoginRequest loginRequest;
    private SignupRequest signupRequest;
    private UpdateProfileRequest updateProfileRequest;

    @BeforeEach
    void setUp() {
        // Set up test data
        testUser = new User();
        testUser.setId(1L);
        testUser.setEmail("test@example.com");
        testUser.setPassword("encodedPassword");
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

        updateProfileRequest = new UpdateProfileRequest();
        updateProfileRequest.setFullName("Updated Name");
        updateProfileRequest.setPhoneNumber("+1122334455");

        // Set private field values using ReflectionTestUtils
        ReflectionTestUtils.setField(userService, "passwordResetTokenExpirationMinutes", 30);
    }

    @Test
    void authenticateUser_Success() {
        // Arrange
        when(userRepository.findByEmail(anyString())).thenReturn(Optional.of(testUser));
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenReturn(authentication);
        when(tokenProvider.generateToken(any(Authentication.class))).thenReturn("jwt-token");

        // Act
        AuthResponse response = userService.authenticateUser(loginRequest);

        // Assert
        assertNotNull(response);
        assertEquals("jwt-token", response.getAccessToken());
        assertEquals(testUser.getEmail(), response.getEmail());
        verify(userRepository, times(4)).findByEmail(loginRequest.getEmail());
    }

    @Test
    void authenticateUser_UserNotFound() {
        // Arrange
        when(userRepository.findByEmail(anyString())).thenReturn(Optional.empty());

        // Act & Assert
        assertThrows(UsernameNotFoundException.class, () -> userService.authenticateUser(loginRequest));
    }

    @Test
    void authenticateUser_BadCredentials() {
        // Arrange
        when(userRepository.findByEmail(anyString())).thenReturn(Optional.of(testUser));
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenThrow(new BadCredentialsException("Bad credentials"));
        
        // Use spy to verify the method call
        UserServiceImpl userServiceSpy = spy(userService);
        doNothing().when(userServiceSpy).incrementFailedLoginAttempts(anyString());

        // Act & Assert
        assertThrows(BadCredentialsException.class, () -> userServiceSpy.authenticateUser(loginRequest));
        verify(userServiceSpy).incrementFailedLoginAttempts(loginRequest.getEmail());
    }

    @Test
    void registerCustomer_Success() {
        // Arrange
        when(userRepository.existsByEmail(anyString())).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("encodedPassword");
        when(userRepository.save(any(User.class))).thenReturn(testUser);

        // Act
        User result = userService.registerCustomer(signupRequest);

        // Assert
        assertNotNull(result);
        verify(userRepository).existsByEmail(signupRequest.getEmail());
        verify(passwordEncoder).encode(signupRequest.getPassword());
        verify(userRepository).save(any(User.class));
        verify(emailService).sendVerificationEmail(any(User.class), anyString());
    }

    @Test
    void registerCustomer_EmailAlreadyExists() {
        // Arrange
        when(userRepository.existsByEmail(anyString())).thenReturn(true);

        // Act & Assert
        assertThrows(RuntimeException.class, () -> userService.registerCustomer(signupRequest));
        verify(userRepository).existsByEmail(signupRequest.getEmail());
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void updateCustomer_Success() {
        // Arrange
        User updatedUser = new User();
        updatedUser.setId(1L);
        updatedUser.setFullName("Updated User");
        updatedUser.setRole(User.UserRole.CUSTOMER);
        
        when(userRepository.findById(anyLong())).thenReturn(Optional.of(testUser));
        when(userRepository.save(any(User.class))).thenReturn(updatedUser);

        // Act
        userService.updateCustomer(updatedUser);

        // Assert
        verify(userRepository).save(updatedUser);
    }

    @Test
    void deactivateCustomer_Success() {
        // Arrange
        when(userRepository.findById(anyLong())).thenReturn(Optional.of(testUser));
        when(userRepository.save(any(User.class))).thenReturn(testUser);

        // Act
        userService.deactivateCustomer(1L);

        // Assert
        assertFalse(testUser.isEnabled());
        verify(userRepository).findById(1L);
        verify(userRepository).save(testUser);
        verify(emailService).sendAccountStatusChangeEmail(eq(testUser), eq(User.AccountStatus.SUSPENDED));
    }

    @Test
    void reactivateCustomer_Success() {
        // Arrange
        testUser.setEnabled(false);
        when(userRepository.findById(anyLong())).thenReturn(Optional.of(testUser));
        when(userRepository.save(any(User.class))).thenReturn(testUser);

        // Act
        userService.reactivateCustomer(1L);

        // Assert
        assertTrue(testUser.isEnabled());
        verify(userRepository).findById(1L);
        verify(userRepository).save(testUser);
        verify(emailService).sendAccountStatusChangeEmail(eq(testUser), eq(User.AccountStatus.ACTIVE));
    }

    @Test
    void getAllCustomers_Success() {
        // Arrange
        List<User> customers = new ArrayList<>();
        customers.add(testUser);
        when(userRepository.findByRole(User.UserRole.CUSTOMER)).thenReturn(customers);

        // Act
        List<User> result = userService.getAllCustomers();

        // Assert
        assertNotNull(result);
        assertEquals(1, result.size());
        verify(userRepository).findByRole(User.UserRole.CUSTOMER);
    }

    @Test
    void getCustomerById_Success() {
        // Arrange
        when(userRepository.findById(anyLong())).thenReturn(Optional.of(testUser));

        // Act
        User result = userService.getCustomerById(1L);

        // Assert
        assertNotNull(result);
        assertEquals(testUser.getId(), result.getId());
        verify(userRepository).findById(1L);
    }

    @Test
    void getCustomerById_NotFound() {
        // Arrange
        when(userRepository.findById(anyLong())).thenReturn(Optional.empty());

        // Act & Assert
        assertThrows(RuntimeException.class, () -> userService.getCustomerById(1L));
        verify(userRepository).findById(1L);
    }

    @Test
    void existsByEmail_True() {
        // Arrange
        when(userRepository.existsByEmail(anyString())).thenReturn(true);

        // Act
        boolean result = userService.existsByEmail("test@example.com");

        // Assert
        assertTrue(result);
        verify(userRepository).existsByEmail("test@example.com");
    }

    @Test
    void existsByEmail_False() {
        // Arrange
        when(userRepository.existsByEmail(anyString())).thenReturn(false);

        // Act
        boolean result = userService.existsByEmail("nonexistent@example.com");

        // Assert
        assertFalse(result);
        verify(userRepository).existsByEmail("nonexistent@example.com");
    }

    @Test
    void findByEmail_Success() {
        // Arrange
        when(userRepository.findByEmail(anyString())).thenReturn(Optional.of(testUser));

        // Act
        User result = userService.findByEmail("test@example.com");

        // Assert
        assertNotNull(result);
        assertEquals(testUser.getEmail(), result.getEmail());
        verify(userRepository).findByEmail("test@example.com");
    }

    @Test
    void findByEmail_NotFound() {
        // Arrange
        when(userRepository.findByEmail(anyString())).thenReturn(Optional.empty());

        // Act & Assert
        assertThrows(EntityNotFoundException.class, () -> userService.findByEmail("nonexistent@example.com"));
        verify(userRepository).findByEmail("nonexistent@example.com");
    }

    @Test
    void updateLastLogin_Success() {
        // Arrange
        when(userRepository.findByEmail(anyString())).thenReturn(Optional.of(testUser));
        when(userRepository.saveAndFlush(any(User.class))).thenReturn(testUser);
        when(userRepository.findById(anyLong())).thenReturn(Optional.of(testUser));

        // Act
        userService.updateLastLogin("test@example.com");

        // Assert
        assertNotNull(testUser.getLastLogin());
        verify(userRepository).findByEmail("test@example.com");
        verify(userRepository).saveAndFlush(testUser);
    }

    @Test
    void checkAccountStatus_AccountLocked() {
        // Arrange
        testUser.setAccountLocked(true);
        testUser.setLockTime(LocalDateTime.now().minusMinutes(10));

        // Act & Assert
        assertThrows(RuntimeException.class, () -> userService.checkAccountStatus(testUser));
    }

    @Test
    void checkAccountStatus_AccountDisabled() {
        // Arrange
        testUser.setEnabled(false);

        // Act & Assert
        assertThrows(RuntimeException.class, () -> userService.checkAccountStatus(testUser));
    }

    @Test
    void checkAccountStatus_EmailNotVerified() {
        // Arrange
        testUser.setEmailVerified(false);

        // Act & Assert
        assertThrows(RuntimeException.class, () -> userService.checkAccountStatus(testUser));
    }

    @Test
    void incrementFailedLoginAttempts_Success() {
        // Arrange
        testUser.setFailedLoginAttempts(2);
        when(userRepository.findByEmail(anyString())).thenReturn(Optional.of(testUser));
        when(userRepository.save(any(User.class))).thenReturn(testUser);

        // Act
        userService.incrementFailedLoginAttempts("test@example.com");

        // Assert
        assertEquals(3, testUser.getFailedLoginAttempts());
        verify(userRepository).findByEmail("test@example.com");
        verify(userRepository).save(testUser);
    }

    @Test
    void resetFailedLoginAttempts_Success() {
        // Arrange
        testUser.setFailedLoginAttempts(3);
        when(userRepository.findByEmail(anyString())).thenReturn(Optional.of(testUser));
        when(userRepository.save(any(User.class))).thenReturn(testUser);

        // Act
        userService.resetFailedLoginAttempts("test@example.com");

        // Assert
        assertEquals(0, testUser.getFailedLoginAttempts());
        verify(userRepository).findByEmail("test@example.com");
        verify(userRepository).save(testUser);
    }

    @Test
    void isAccountLocked_True() {
        // Arrange
        testUser.setAccountLocked(true);
        when(userRepository.findByEmail(anyString())).thenReturn(Optional.of(testUser));

        // Act
        boolean result = userService.isAccountLocked("test@example.com");

        // Assert
        assertTrue(result);
        verify(userRepository).findByEmail("test@example.com");
    }

    @Test
    void isAccountLocked_False() {
        // Arrange
        testUser.setAccountLocked(false);
        when(userRepository.findByEmail(anyString())).thenReturn(Optional.of(testUser));

        // Act
        boolean result = userService.isAccountLocked("test@example.com");

        // Assert
        assertFalse(result);
        verify(userRepository).findByEmail("test@example.com");
    }

    @Test
    void unlockAccount_Success() {
        // Arrange
        testUser.setAccountLocked(true);
        testUser.setFailedLoginAttempts(5);
        when(userRepository.findByEmail(anyString())).thenReturn(Optional.of(testUser));
        when(userRepository.save(any(User.class))).thenReturn(testUser);

        // Act
        userService.unlockAccount("test@example.com");

        // Assert
        assertFalse(testUser.isAccountLocked());
        assertEquals(0, testUser.getFailedLoginAttempts());
        assertNull(testUser.getLockTime());
        verify(userRepository).findByEmail("test@example.com");
        verify(userRepository).save(testUser);
    }
} 