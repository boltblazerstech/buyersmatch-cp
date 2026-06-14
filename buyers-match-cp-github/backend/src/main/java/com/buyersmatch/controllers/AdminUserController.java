package com.buyersmatch.controllers;

import com.buyersmatch.services.ClientPortalUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/user")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class AdminUserController {

    private final ClientPortalUserService clientPortalUserService;

    @PostMapping("/{userId}/reset-password")
    public ResponseEntity<Map<String, Object>> resetPassword(
            @PathVariable UUID userId,
            @RequestBody(required = false) Map<String, Object> body) {
        boolean sendEmail = body != null && Boolean.TRUE.equals(body.get("sendEmail"));
        String requestedPassword = body != null ? (String) body.get("newPassword") : null;
        String newPassword = clientPortalUserService.resetPasswordByUserId(userId, requestedPassword, sendEmail);
        return ResponseEntity.ok(Map.of("success", true, "data", Map.of("newPassword", newPassword)));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalArgument(IllegalArgumentException ex) {
        return ResponseEntity.badRequest().body(Map.of("success", false, "error", ex.getMessage()));
    }
}
