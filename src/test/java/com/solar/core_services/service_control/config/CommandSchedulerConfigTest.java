package com.solar.core_services.service_control.config;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Integration tests for CommandSchedulerConfig
 */
@SpringBootTest
@TestPropertySource(properties = {
    "device.command.scheduler.enabled=true",
    "device.command.expiration.hours=48",
    "device.command.expiration.cron=0 0 * * * *",
    "device.command.retry.max-attempts=5",
    "device.command.retry.delay-minutes=10",
    "device.command.retry.cron=0 */10 * * * *"
})
class CommandSchedulerConfigTest {

    @Autowired
    private CommandSchedulerConfig config;

    @Test
    void testSchedulerConfigLoads() {
        assertThat(config).isNotNull();
        assertThat(config.getScheduler()).isNotNull();
        assertThat(config.getExpiration()).isNotNull();
        assertThat(config.getRetry()).isNotNull();
    }

    @Test
    void testSchedulerEnabled() {
        assertThat(config.getScheduler().isEnabled()).isTrue();
    }

    @Test
    void testExpirationConfig() {
        assertThat(config.getExpiration().getHours()).isEqualTo(48);
        assertThat(config.getExpiration().getCron()).isEqualTo("0 0 * * * *");
    }

    @Test
    void testRetryConfig() {
        assertThat(config.getRetry().getMaxAttempts()).isEqualTo(5);
        assertThat(config.getRetry().getDelayMinutes()).isEqualTo(10);
        assertThat(config.getRetry().getCron()).isEqualTo("0 */10 * * * *");
    }
}
