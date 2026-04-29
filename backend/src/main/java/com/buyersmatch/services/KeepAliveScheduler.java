package com.buyersmatch.services;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.time.Instant;
import java.util.concurrent.atomic.AtomicReference;

@Component
@Slf4j
@RequiredArgsConstructor
public class KeepAliveScheduler {

    private final RestTemplate restTemplate;
    private final EmailService emailService;

    @Value("${app.public.url}")
    private String appPublicUrl;

    // Tracks last alert time — avoids flooding inbox on sustained outage
    private final AtomicReference<Instant> lastAlertSent = new AtomicReference<>(Instant.EPOCH);

    private static final long ALERT_COOLDOWN_MINUTES = 30;

    @Scheduled(fixedRate = 60_000)
    public void ping() {
        String url = appPublicUrl + "/health";
        try {
            restTemplate.getForObject(url, String.class);
            log.debug("Keep-alive ping OK: {}", url);
        } catch (Exception e) {
            log.warn("Keep-alive ping FAILED for {}: {}", url, e.getMessage());
            sendAlertIfCooldownExpired(e.getMessage());
        }
    }

    private void sendAlertIfCooldownExpired(String errorMessage) {
        Instant now = Instant.now();
        Instant last = lastAlertSent.get();
        long minutesSinceLast = java.time.Duration.between(last, now).toMinutes();

        if (minutesSinceLast >= ALERT_COOLDOWN_MINUTES) {
            lastAlertSent.set(now);
            try {
                emailService.sendKeepAliveAlert(errorMessage);
            } catch (Exception ex) {
                log.error("Failed to send keep-alive alert email: {}", ex.getMessage());
            }
        } else {
            log.debug("Keep-alive alert suppressed (cooldown: {}min remaining)", ALERT_COOLDOWN_MINUTES - minutesSinceLast);
        }
    }
}
