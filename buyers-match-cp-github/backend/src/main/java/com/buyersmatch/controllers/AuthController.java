package com.buyersmatch.controllers;

import com.buyersmatch.dto.AuthLoginRequest;
import com.buyersmatch.dto.ForgotPasswordRequest;
import com.buyersmatch.dto.ResetPasswordRequest;
import com.buyersmatch.services.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@Valid @RequestBody AuthLoginRequest request) {
        return ResponseEntity.ok(Map.of("success", true, "data", authService.login(request)));
    }

    // -------------------------------------------------------------------------
    // INVITE TOKEN — set password via invite link
    // -------------------------------------------------------------------------

    @GetMapping("/verify-invite-token")
    public ResponseEntity<Map<String, Object>> verifyInviteToken(@RequestParam String token) {
        return ResponseEntity.ok(Map.of("success", true, "data", authService.verifyInviteToken(token)));
    }

    @PostMapping("/set-password")
    public ResponseEntity<Map<String, Object>> setPassword(@Valid @RequestBody ResetPasswordRequest request) {
        authService.setPasswordViaInvite(request.getToken(), request.getNewPassword());
        return ResponseEntity.ok(Map.of("success", true, "message", "Password set successfully"));
    }

    // -------------------------------------------------------------------------
    // FORGOT / RESET PASSWORD — client
    // -------------------------------------------------------------------------

    @PostMapping("/forgot-password")
    public ResponseEntity<Map<String, Object>> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        authService.requestClientPasswordReset(request.getEmail());
        return ResponseEntity.ok(Map.of("success", true,
                "message", "If an account with that email exists, a reset link has been sent"));
    }

    @GetMapping("/verify-reset-token")
    public ResponseEntity<Map<String, Object>> verifyResetToken(@RequestParam String token) {
        return ResponseEntity.ok(Map.of("success", true, "data", authService.verifyClientResetToken(token)));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<Map<String, Object>> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        authService.resetClientPassword(request.getToken(), request.getNewPassword());
        return ResponseEntity.ok(Map.of("success", true, "message", "Password reset successfully"));
    }

    // -------------------------------------------------------------------------
    // EXCEPTION HANDLER
    // -------------------------------------------------------------------------

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, Object>> handleResponseStatus(ResponseStatusException ex) {
        return ResponseEntity.status(ex.getStatusCode())
                .body(Map.of("success", false, "error", ex.getReason()));
    }
}
