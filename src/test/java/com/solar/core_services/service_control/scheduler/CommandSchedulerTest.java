package com.solar.core_services.service_control.scheduler;

import com.solar.core_services.service_control.service.DeviceCommandService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.mockito.Mockito.*;

/**
 * Unit tests for CommandScheduler
 */
@ExtendWith(MockitoExtension.class)
class CommandSchedulerTest {

    @Mock
    private DeviceCommandService commandService;

    @InjectMocks
    private CommandScheduler commandScheduler;

    @BeforeEach
    void setUp() {
        commandScheduler = new CommandScheduler(commandService);
    }

    @Test
    void testProcessExpiredCommands_Success() {
        // Act
        commandScheduler.processExpiredCommands();

        // Assert
        verify(commandService, times(1)).processExpiredCommands();
    }

    @Test
    void testProcessExpiredCommands_HandlesException() {
        // Arrange
        doThrow(new RuntimeException("Test exception"))
            .when(commandService).processExpiredCommands();

        // Act - should not throw exception
        commandScheduler.processExpiredCommands();

        // Assert
        verify(commandService, times(1)).processExpiredCommands();
    }

    @Test
    void testProcessCommandRetries_Success() {
        // Act
        commandScheduler.processCommandRetries();

        // Assert
        verify(commandService, times(1)).processCommandRetries();
    }

    @Test
    void testProcessCommandRetries_HandlesException() {
        // Arrange
        doThrow(new RuntimeException("Test exception"))
            .when(commandService).processCommandRetries();

        // Act - should not throw exception
        commandScheduler.processCommandRetries();

        // Assert
        verify(commandService, times(1)).processCommandRetries();
    }
}
