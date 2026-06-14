package com.buyersmatch.controllers;

import com.buyersmatch.repositories.SyncLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/public")
@RequiredArgsConstructor
public class DebugController {
    private final SyncLogRepository syncLogRepository;

    @GetMapping("/logs")
    public ResponseEntity<Map<String, Object>> getLogs() {
        return ResponseEntity.ok(Map.of("logs", syncLogRepository.findAll()));
    }
}
