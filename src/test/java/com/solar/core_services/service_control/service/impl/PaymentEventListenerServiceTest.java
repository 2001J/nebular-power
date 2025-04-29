package com.solar.core_services.service_control.service.impl;

import com.solar.core_services.energy_monitoring.model.SolarInstallation;
import com.solar.core_services.payment_compliance.model.Payment;
import com.solar.core_services.payment_compliance.repository.PaymentRepository;
import com.solar.core_services.payment_compliance.service.impl.PaymentEventPublisherImpl.PaymentReceivedEvent;
import com.solar.core_services.service_control.service.PaymentIntegrationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PaymentEventListenerServiceTest {

    @Mock
    private PaymentIntegrationService paymentIntegrationService;
    
    @Mock
    private PaymentRepository paymentRepository;
    
    @InjectMocks
    private PaymentEventListenerService paymentEventListenerService;
    
    private Payment payment;
    private SolarInstallation installation;
    private PaymentReceivedEvent paymentReceivedEvent;
    private static final Long PAYMENT_ID = 100L;
    private static final Long INSTALLATION_ID = 1L;
    
    @BeforeEach
    void setUp() {
        // Create test installation
        installation = new SolarInstallation();
        installation.setId(INSTALLATION_ID);
        
        // Create test payment
        payment = new Payment();
        payment.setId(PAYMENT_ID);
        payment.setInstallation(installation);
        
        // Create test event
        paymentReceivedEvent = new PaymentReceivedEvent(this, INSTALLATION_ID, PAYMENT_ID);
    }
    
    @Test
    @DisplayName("Should restore service when installation was suspended")
    void shouldRestoreServiceWhenInstallationWasSuspended() {
        // Given
        installation.setStatus(SolarInstallation.InstallationStatus.SUSPENDED);
        when(paymentRepository.findById(PAYMENT_ID)).thenReturn(Optional.of(payment));
        
        // When
        paymentEventListenerService.handlePaymentReceivedEvent(paymentReceivedEvent);
        
        // Then
        verify(paymentIntegrationService, times(1)).restoreServiceAfterPayment(INSTALLATION_ID, PAYMENT_ID);
    }
    
    @Test
    @DisplayName("Should not restore service when installation was already active")
    void shouldNotRestoreServiceWhenInstallationWasAlreadyActive() {
        // Given
        installation.setStatus(SolarInstallation.InstallationStatus.ACTIVE);
        when(paymentRepository.findById(PAYMENT_ID)).thenReturn(Optional.of(payment));
        
        // When
        paymentEventListenerService.handlePaymentReceivedEvent(paymentReceivedEvent);
        
        // Then
        verify(paymentIntegrationService, never()).restoreServiceAfterPayment(anyLong(), anyLong());
    }
} 