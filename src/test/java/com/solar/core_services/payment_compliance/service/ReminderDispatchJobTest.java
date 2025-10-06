package com.solar.core_services.payment_compliance.service;

import com.solar.core_services.payment_compliance.model.Payment;
import com.solar.core_services.payment_compliance.model.PaymentReminder;
import com.solar.core_services.payment_compliance.repository.PaymentRepository;
import com.solar.core_services.payment_compliance.service.impl.ReminderDispatchJob;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class ReminderDispatchJobTest {

    @Mock
    private PaymentRepository paymentRepository;

    @Mock
    private PaymentReminderService reminderService;

    @Mock
    private ReminderConfigService reminderConfigService;

    @InjectMocks
    private ReminderDispatchJob job;

    private Payment pFirst;
    private Payment pSecond;
    private Payment pFinal;

    @BeforeEach
    void setup() {
        pFirst = Payment.builder().id(1L).status(Payment.PaymentStatus.SCHEDULED).dueDate(LocalDateTime.now().plusDays(7)).build();
        pSecond = Payment.builder().id(2L).status(Payment.PaymentStatus.UPCOMING).dueDate(LocalDateTime.now().plusDays(3)).build();
        pFinal = Payment.builder().id(3L).status(Payment.PaymentStatus.SCHEDULED).dueDate(LocalDateTime.now().plusDays(1)).build();
    }

    @Test
    @DisplayName("Dispatch pre-due reminders on exact-day thresholds when auto-send is enabled")
    void shouldDispatchUpcomingOnExactDaysWhenEnabled() {
        when(reminderConfigService.isAutoSendRemindersEnabled()).thenReturn(true);
        when(reminderConfigService.getFirstReminderDays()).thenReturn(7);
        when(reminderConfigService.getSecondReminderDays()).thenReturn(3);
        when(reminderConfigService.getFinalReminderDays()).thenReturn(1);

        // Ensure no due-today/overdue/grace/final-warning interference
        when(paymentRepository.findByStatus(Payment.PaymentStatus.SUSPENSION_PENDING)).thenReturn(Collections.emptyList());
        when(paymentRepository.findByStatus(Payment.PaymentStatus.GRACE_PERIOD)).thenReturn(Collections.emptyList());
        when(paymentRepository.findByStatus(Payment.PaymentStatus.OVERDUE)).thenReturn(Collections.emptyList());
        when(paymentRepository.findDueTodayPayments(any(), any(), eq(Payment.PaymentStatus.DUE_TODAY))).thenReturn(Collections.emptyList());

        // For exact-day upcoming, job queries by dueDate range and statuses in [SCHEDULED, UPCOMING]
        when(paymentRepository.findByDueDateBetweenAndStatusIn(any(LocalDateTime.class), any(LocalDateTime.class), any(List.class)))
                .thenReturn(Collections.singletonList(pFirst))
                .thenReturn(Collections.singletonList(pSecond))
                .thenReturn(Collections.singletonList(pFinal));

        when(reminderService.hasRecentReminderOfType(any(Payment.class), eq(PaymentReminder.ReminderType.UPCOMING_PAYMENT)))
                .thenReturn(false);

        job.dispatchReminders();

        verify(reminderService, times(3)).sendPaymentReminder(any(Payment.class), eq(PaymentReminder.ReminderType.UPCOMING_PAYMENT));
    }

    @Test
    @DisplayName("Do not dispatch pre-due reminders when auto-send is disabled")
    void shouldNotDispatchUpcomingWhenDisabled() {
        when(reminderConfigService.isAutoSendRemindersEnabled()).thenReturn(false);

        job.dispatchReminders();

        verifyNoInteractions(reminderService);
    }
}

