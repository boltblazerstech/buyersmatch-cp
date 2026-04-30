package com.buyersmatch.controllers;

import com.buyersmatch.entities.PropertyDocument;
import com.buyersmatch.repositories.*;
import com.buyersmatch.services.R2StorageService;
import com.buyersmatch.services.ZohoSyncService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.concurrent.CompletableFuture;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/sync")
@CrossOrigin(origins = "*")
@Slf4j
@RequiredArgsConstructor
public class SyncController {

    private final ZohoSyncService zohoSyncService;
    private final BuyerBriefRepository buyerBriefRepository;
    private final PropertyRepository propertyRepository;
    private final PropertyDocumentRepository propertyDocumentRepository;
    private final AssignmentRepository assignmentRepository;
    private final SyncStateRepository syncStateRepository;
    private final SyncLogRepository syncLogRepository;
    private final R2StorageService r2StorageService;

    @PostMapping("/full")
    public ResponseEntity<Map<String, Object>> fullSync(@RequestParam(required = false) Integer limit) {
        log.info("Full sync triggered via API, limit={}", limit);
        assignmentRepository.deleteAll();
        propertyDocumentRepository.deleteAll();
        propertyRepository.deleteAll();
        buyerBriefRepository.deleteAll();

        CompletableFuture.runAsync(() -> {
            zohoSyncService.syncBuyerBriefs(true, limit);
            zohoSyncService.syncProperties(true, limit);
            zohoSyncService.syncPropertyDocuments(true, limit);
            zohoSyncService.syncClientManagement(true, limit);
        });

        return ResponseEntity.ok(Map.of("success", true, "message", "Full sync started in background" + (limit != null ? " with limit " + limit : "")));
    }

    @PostMapping("/data")
    public ResponseEntity<Map<String, Object>> dataSync() {
        log.info("Data sync triggered via API");
        CompletableFuture.runAsync(zohoSyncService::runDataSync);
        return ResponseEntity.ok(Map.of("success", true, "message", "Data sync started in background"));
    }

    @PostMapping("/media")
    public ResponseEntity<Map<String, Object>> mediaSync() {
        log.info("Media sync triggered via API");
        CompletableFuture.runAsync(zohoSyncService::runMediaSync);
        return ResponseEntity.ok(Map.of("success", true, "message", "Media sync started in background"));
    }

    @PostMapping("/delta")
    public ResponseEntity<Map<String, Object>> deltaSync() {
        log.info("Delta sync triggered via API");
        CompletableFuture.runAsync(zohoSyncService::runDeltaSync);
        return ResponseEntity.ok(Map.of("success", true, "message", "Delta sync started in background"));
    }

    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> syncStatus() {
        return ResponseEntity.ok(Map.of("success", true, "data", syncStateRepository.findAll()));
    }

    @GetMapping("/logs")
    public ResponseEntity<Map<String, Object>> syncLogs() {
        return ResponseEntity.ok(Map.of("success", true, "data", syncLogRepository.findTop10ByOrderByStartedAtDesc()));
    }

    @GetMapping("/logs/recent")
    public ResponseEntity<Map<String, Object>> recentSyncLogs(
            @RequestParam List<String> modules,
            @RequestParam(required = false) Long since) {
        LocalDateTime after = since != null
                ? Instant.ofEpochMilli(since).atZone(ZoneId.of("UTC")).toLocalDateTime()
                : LocalDateTime.now().minusHours(1);
        List<?> logs = syncLogRepository.findByModuleInAndStartedAtAfterOrderByStartedAtDesc(modules, after);
        return ResponseEntity.ok(Map.of("success", true, "data", logs));
    }

    @PostMapping("/buyer-briefs")
    public ResponseEntity<Map<String, Object>> syncBuyerBriefs(@RequestParam(required = false) Integer limit) {
        log.info("BuyerBriefs module sync triggered via API, limit={}", limit);
        CompletableFuture.runAsync(() -> {
            buyerBriefRepository.deleteAll();
            zohoSyncService.syncBuyerBriefs(true, limit);
        });
        return ResponseEntity.ok(Map.of("success", true, "message", "BuyerBriefs sync started in background" + (limit != null ? " (limit " + limit + ")" : "")));
    }

    @PostMapping("/properties")
    public ResponseEntity<Map<String, Object>> syncProperties(@RequestParam(required = false) Integer limit) {
        log.info("Properties module sync triggered via API, limit={}", limit);
        CompletableFuture.runAsync(() -> {
            propertyRepository.deleteAll();
            zohoSyncService.syncProperties(true, limit);
        });
        return ResponseEntity.ok(Map.of("success", true, "message", "Properties sync started in background" + (limit != null ? " (limit " + limit + ")" : "")));
    }

    @PostMapping("/property-documents")
    public ResponseEntity<Map<String, Object>> syncPropertyDocuments(@RequestParam(required = false) Integer limit) {
        log.info("PropertyDocuments module sync triggered via API, limit={}", limit);
        CompletableFuture.runAsync(() -> {
            propertyDocumentRepository.deleteAll();
            zohoSyncService.syncPropertyDocuments(true, limit);
        });
        return ResponseEntity.ok(Map.of("success", true, "message", "PropertyDocuments sync started in background" + (limit != null ? " (limit " + limit + ")" : "")));
    }

    @PostMapping("/client-management")
    public ResponseEntity<Map<String, Object>> syncClientManagement(@RequestParam(required = false) Integer limit) {
        log.info("ClientManagement module sync triggered via API, limit={}", limit);
        CompletableFuture.runAsync(() -> {
            assignmentRepository.deleteAll();
            zohoSyncService.syncClientManagement(true, limit);
        });
        return ResponseEntity.ok(Map.of("success", true, "message", "ClientManagement sync started in background" + (limit != null ? " (limit " + limit + ")" : "")));
    }

    @PostMapping("/documents/missing-r2")
    public ResponseEntity<Map<String, Object>> uploadMissingR2Documents() {
        log.info("Missing R2 upload triggered via API");
        int pending = propertyDocumentRepository.findAllByR2UrlIsNullAndCrmDownloadUrlIsNotNull().size()
                + propertyDocumentRepository.findAllByR2UrlIsNullAndCrmDownloadUrlIsNullAndDownloadLinkIsNotNull().size();
        CompletableFuture.runAsync(() -> zohoSyncService.uploadMissingR2Documents());
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "R2 upload started in background",
                "pendingCount", pending
        ));
    }

    @PostMapping("/clear-r2")
    public ResponseEntity<Map<String, Object>> clearR2() {
        log.info("Clearing R2 bucket and resetting database R2 URLs");
        
        // 1. Delete all files from R2
        r2StorageService.deleteAllObjects();
        
        // 2. Reset r2Url in database
        List<PropertyDocument> allDocs = propertyDocumentRepository.findAll();
        for (PropertyDocument doc : allDocs) {
            doc.setR2Url(null);
        }
        propertyDocumentRepository.saveAll(allDocs);
        
        return ResponseEntity.ok(Map.of("success", true, "message", "R2 bucket cleared and database URLs reset"));
    }

    @PostMapping("/test-r2")
    public ResponseEntity<Map<String, Object>> testR2Connection() {
        try {
            // Minimal valid 1×1 white PNG (67 bytes) — no file path needed
            byte[] png = new byte[]{
                (byte)0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A, // PNG signature
                0x00,0x00,0x00,0x0D,0x49,0x48,0x44,0x52,        // IHDR chunk
                0x00,0x00,0x00,0x01,0x00,0x00,0x00,0x01,
                0x08,0x02,0x00,0x00,0x00,(byte)0x90,0x77,0x53,(byte)0xDE,
                0x00,0x00,0x00,0x0C,0x49,0x44,0x41,0x54,        // IDAT chunk
                0x08,(byte)0xD7,0x63,(byte)0xF8,(byte)0xCF,(byte)0xC0,0x00,0x00,
                0x00,0x02,0x00,0x01,(byte)0xE2,0x21,(byte)0xBC,0x33,
                0x00,0x00,0x00,0x00,0x49,0x45,0x4E,0x44,        // IEND chunk
                (byte)0xAE,0x42,0x60,(byte)0x82
            };

            software.amazon.awssdk.core.sync.RequestBody body =
                    software.amazon.awssdk.core.sync.RequestBody.fromBytes(png);
            software.amazon.awssdk.services.s3.model.PutObjectRequest req =
                    software.amazon.awssdk.services.s3.model.PutObjectRequest.builder()
                            .bucket(r2StorageService.getBucketName())
                            .key("test/connectivity-check.png")
                            .contentType("image/png")
                            .build();
            r2StorageService.getS3Client().putObject(req, body);
            String url = r2StorageService.getPublicUrl("test/connectivity-check.png");
            log.info("R2 connectivity test passed — uploaded test/connectivity-check.png");
            return ResponseEntity.ok(Map.of("success", true, "url", url));
        } catch (Exception e) {
            log.error("R2 connectivity test FAILED: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body(Map.of("success", false, "error", e.getMessage()));
        }
    }

    @PostMapping("/test-upload")
    public ResponseEntity<Map<String, Object>> testUpload(@RequestBody Map<String, String> body) {
        String crmDownloadUrl = body.get("crmDownloadUrl");
        String fileName = body.get("fileName");
        String fileExtension = body.get("fileExtension");
        String zohoDocId = body.get("zohoDocId");

        if (crmDownloadUrl == null || fileName == null) {
            return ResponseEntity.badRequest()
                    .body(Map.of("success", false, "error", "crmDownloadUrl and fileName are required"));
        }

        if (fileExtension == null) {
            fileExtension = fileName.contains(".") ? fileName.substring(fileName.lastIndexOf('.') + 1) : "bin";
        }
        if (zohoDocId == null) zohoDocId = "test";

        String fileKey = zohoDocId + "/" + fileName;
        String contentType = r2StorageService.getContentType(fileExtension);
        String r2Url = r2StorageService.uploadFromUrl(crmDownloadUrl, fileKey, contentType, zohoSyncService.getZohoHeadersPublic());

        if (r2Url != null) {
            return ResponseEntity.ok(Map.of("success", true, "r2Url", r2Url, "fileKey", fileKey));
        } else {
            return ResponseEntity.ok(Map.of("success", false, "error", "Upload failed — check backend logs for details"));
        }
    }
}
