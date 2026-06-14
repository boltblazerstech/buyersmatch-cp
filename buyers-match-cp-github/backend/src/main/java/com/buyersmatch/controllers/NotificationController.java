package com.buyersmatch.controllers;

import com.buyersmatch.entities.Notification;
import com.buyersmatch.services.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/client")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
@Slf4j
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping("/{zohoContactId}/notifications")
    public ResponseEntity<Map<String, Object>> getNotifications(
            @PathVariable String zohoContactId) {

        List<Notification> notifications = notificationService.getNotifications(zohoContactId);
        long unreadCount = notificationService.getUnreadCount(zohoContactId);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "data", notifications,
                "unreadCount", unreadCount
        ));
    }

    @GetMapping("/{zohoContactId}/notifications/unread-count")
    public ResponseEntity<Map<String, Object>> getUnreadCount(
            @PathVariable String zohoContactId) {

        long count = notificationService.getUnreadCount(zohoContactId);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "count", count
        ));
    }

    @PatchMapping("/notifications/{id}/read")
    public ResponseEntity<Map<String, Object>> markAsRead(
            @PathVariable String id) {

        UUID uuid = UUID.fromString(id);
        notificationService.markAsRead(uuid);

        return ResponseEntity.ok(Map.of("success", true));
    }

    @PatchMapping("/{zohoContactId}/notifications/read-all")
    public ResponseEntity<Map<String, Object>> markAllAsRead(
            @PathVariable String zohoContactId) {

        notificationService.markAllAsRead(zohoContactId);

        return ResponseEntity.ok(Map.of("success", true));
    }
}
