package com.buyersmatch.controllers;

import com.buyersmatch.services.ZohoSyncService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.concurrent.CompletableFuture;

@RestController
@RequestMapping("/api/webhooks/zoho")
@Slf4j
@RequiredArgsConstructor
public class ZohoWebhookController {

    private final ZohoSyncService zohoSyncService;

    @Value("${zoho.webhook.token:}")
    private String webhookToken;

    @PostMapping("/documents")
    public ResponseEntity<Map<String, Object>> documentsWebhook(
            @RequestHeader(value = "X-Webhook-Token", required = false) String token,
            @RequestBody Map<String, Object> payload) {

        if (!webhookToken.isBlank() && !webhookToken.equals(token)) {
            log.warn("Webhook: rejected documents request — invalid token");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("success", false, "error", "Invalid token"));
        }

        String zohoId = payload.get("id") != null ? payload.get("id").toString() : null;
        String operation = payload.get("operation") != null ? payload.get("operation").toString() : "update";

        if (zohoId == null) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", "Missing id"));
        }

        log.info("Webhook received: PropertyDocument {} ({})", zohoId, operation);
        CompletableFuture.runAsync(() -> zohoSyncService.handleDocumentWebhook(zohoId, operation));
        return ResponseEntity.ok(Map.of("success", true));
    }

    @PostMapping("/client-management")
    public ResponseEntity<Map<String, Object>> clientManagementWebhook(
            @RequestHeader(value = "X-Webhook-Token", required = false) String token,
            @RequestBody Map<String, Object> payload) {

        if (!webhookToken.isBlank() && !webhookToken.equals(token)) {
            log.warn("Webhook: rejected client-management request — invalid token");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("success", false, "error", "Invalid token"));
        }

        String zohoId = payload.get("id") != null ? payload.get("id").toString() : null;
        String operation = payload.get("operation") != null ? payload.get("operation").toString() : "update";

        if (zohoId == null) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", "Missing id"));
        }

        log.info("Webhook received: Assignment {} ({})", zohoId, operation);
        CompletableFuture.runAsync(() -> zohoSyncService.handleAssignmentWebhook(zohoId, operation));
        return ResponseEntity.ok(Map.of("success", true));
    }

    @PostMapping("/properties")
    public ResponseEntity<Map<String, Object>> propertiesWebhook(
            @RequestHeader(value = "X-Webhook-Token", required = false) String token,
            @RequestBody Map<String, Object> payload) {

        if (!webhookToken.isBlank() && !webhookToken.equals(token)) {
            log.warn("Webhook: rejected properties request — invalid token");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("success", false, "error", "Invalid token"));
        }

        String zohoId = payload.get("id") != null ? payload.get("id").toString() : null;
        String operation = payload.get("operation") != null ? payload.get("operation").toString() : "update";

        if (zohoId == null) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", "Missing id"));
        }

        log.info("Webhook received: Property {} ({})", zohoId, operation);
        CompletableFuture.runAsync(() -> zohoSyncService.handlePropertyWebhook(zohoId, operation));
        return ResponseEntity.ok(Map.of("success", true));
    }

    @PostMapping("/buyer-briefs")
    public ResponseEntity<Map<String, Object>> buyerBriefsWebhook(
            @RequestHeader(value = "X-Webhook-Token", required = false) String token,
            @RequestBody Map<String, Object> payload) {

        if (!webhookToken.isBlank() && !webhookToken.equals(token)) {
            log.warn("Webhook: rejected buyer-briefs request — invalid token");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("success", false, "error", "Invalid token"));
        }

        String zohoId = payload.get("id") != null ? payload.get("id").toString() : null;
        String operation = payload.get("operation") != null ? payload.get("operation").toString() : "update";

        if (zohoId == null) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", "Missing id"));
        }

        log.info("Webhook received: BuyerBrief {} ({})", zohoId, operation);
        CompletableFuture.runAsync(() -> zohoSyncService.handleBuyerBriefWebhook(zohoId, operation));
        return ResponseEntity.ok(Map.of("success", true));
    }
}
