package com.buyersmatch.controllers;

import com.buyersmatch.dto.UpdateAssignmentStatusRequest;
import com.buyersmatch.entities.Assignment;
import com.buyersmatch.entities.BuyerBrief;
import com.buyersmatch.entities.Property;
import com.buyersmatch.entities.PropertyDocument;
import com.buyersmatch.repositories.*;
import com.buyersmatch.entities.ClientPortalUser;
import com.buyersmatch.services.EmailService;
import com.buyersmatch.services.R2StorageService;
import com.buyersmatch.services.ZohoAuthService;
import com.buyersmatch.services.ZohoSyncService;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.*;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;

@RestController
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
@Slf4j
public class ClientController {

    private final BuyerBriefRepository buyerBriefRepository;
    private final PropertyRepository propertyRepository;
    private final PropertyDocumentRepository propertyDocumentRepository;
    private final AssignmentRepository assignmentRepository;
    private final ClientPortalUserRepository portalUserRepository;
    private final EmailService emailService;
    private final ZohoAuthService zohoAuthService;
    private final R2StorageService r2StorageService;
    private final RestTemplate restTemplate;
    private final ZohoSyncService zohoSyncService;

    @Value("${zoho.base.url}")
    private String zohoBaseUrl;

    @GetMapping("/api/client/{zohoContactId}/assignments")
    public ResponseEntity<Map<String, Object>> getAssignments(@PathVariable String zohoContactId) {
        List<Assignment> assignments = assignmentRepository.findAllByZohoContactId(zohoContactId);

        List<Map<String, Object>> data = new ArrayList<>();
        for (Assignment assignment : assignments) {
            Property property = null;
            if (assignment.getZohoPropertyId() != null) {
                property = propertyRepository.findByZohoPropertyId(assignment.getZohoPropertyId()).orElse(null);
            }
            Map<String, Object> entry = new HashMap<>();
            entry.put("assignment", assignment);
            entry.put("property", property);
            data.add(entry);
        }

        return ResponseEntity.ok(Map.of("success", true, "data", data));
    }

    @PostMapping("/api/client/{zohoContactId}/refresh")
    public ResponseEntity<Map<String, Object>> refreshClient(@PathVariable String zohoContactId) {
        log.info("Client refresh requested for contact {}", zohoContactId);
        CompletableFuture.runAsync(() -> zohoSyncService.refreshClientData(zohoContactId));
        return ResponseEntity.ok(Map.of("success", true, "message", "Refresh started"));
    }

    // Accepts both buyer_brief.id (UUID) and zohoContactId (string)
    @GetMapping("/api/client/{clientId}/brief")
    public ResponseEntity<Map<String, Object>> getBrief(@PathVariable String clientId) {
        Optional<BuyerBrief> brief;
        try {
            UUID uuid = UUID.fromString(clientId);
            brief = buyerBriefRepository.findById(uuid);
        } catch (IllegalArgumentException e) {
            brief = buyerBriefRepository.findByZohoContactId(clientId);
        }
        if (brief.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("success", false, "error", "Brief not found"));
        }
        return ResponseEntity.ok(Map.of("success", true, "data", brief.get()));
    }

    // Accepts both buyer_brief.id (UUID) and zohoContactId (string)
    @GetMapping("/api/client/{clientId}/properties")
    public ResponseEntity<Map<String, Object>> getProperties(@PathVariable String clientId) {
        BuyerBrief brief;
        try {
            UUID uuid = UUID.fromString(clientId);
            brief = buyerBriefRepository.findById(uuid).orElse(null);
        } catch (IllegalArgumentException e) {
            brief = buyerBriefRepository.findByZohoContactId(clientId).orElse(null);
        }
        if (brief == null) {
            return ResponseEntity.status(404).body(Map.of("success", false, "error", "Client not found"));
        }

        // 1. Determine the Zoho Contact ID to use for fetching all records
        String contactId = brief.getZohoContactId();

        List<BuyerBrief> allBriefs;
        List<Assignment> allAssignments;

        if (contactId != null) {
            allBriefs = buyerBriefRepository.findAllByZohoContactId(contactId);
            allAssignments = assignmentRepository.findAllByZohoContactId(contactId);
        } else {
            allBriefs = Collections.singletonList(brief);
            allAssignments = assignmentRepository.findAllByZohoBriefId(brief.getZohoBriefId());
        }

        // Exclude assignments whose buyer brief is Closed
        Set<String> activeBriefIds = allBriefs.stream()
                .filter(b -> !"Closed".equalsIgnoreCase(b.getStatus()))
                .map(BuyerBrief::getZohoBriefId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        allAssignments = allAssignments.stream()
                .filter(a -> a.getZohoBriefId() == null || activeBriefIds.contains(a.getZohoBriefId()))
                .filter(a -> !"Brief Confirmed".equalsIgnoreCase(a.getZohoStatus()))
                .collect(Collectors.toList());

        // 2. Enrich assignments with property data
        List<Map<String, Object>> assignmentsData = new ArrayList<>();
        for (Assignment assignment : allAssignments) {
            Property property = null;
            if (assignment.getZohoPropertyId() != null) {
                property = propertyRepository.findByZohoPropertyId(assignment.getZohoPropertyId()).orElse(null);
            }
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("assignment", assignment);
            entry.put("property", property);
            entry.put("propertyId", property != null ? property.getId() : null);
            entry.put("portalStatus", assignment.getPortalStatus());
            entry.put("zohoBriefId", assignment.getZohoBriefId());
            entry.put("clientNotes", assignment.getClientNotes());
            entry.put("agentNotes", assignment.getAgentNotes());
            assignmentsData.add(entry);
        }

        // 3. Sort by most recent
        assignmentsData.sort((a, b) -> {
            Assignment aa = (Assignment) a.get("assignment");
            Assignment bb = (Assignment) b.get("assignment");
            LocalDateTime ta = aa.getUpdatedAt() != null ? aa.getUpdatedAt() : LocalDateTime.MIN;
            LocalDateTime tb = bb.getUpdatedAt() != null ? bb.getUpdatedAt() : LocalDateTime.MIN;
            return tb.compareTo(ta);
        });

        // 4. Return both briefs and assignments
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("assignments", assignmentsData);
        result.put("briefs", allBriefs);

        return ResponseEntity.ok(Map.of("success", true, "data", result));
    }

    // Accepts both buyer_brief.id (UUID) and zohoContactId (string)
    @GetMapping("/api/client/{clientId}/profile")
    public ResponseEntity<Map<String, Object>> getProfile(@PathVariable String clientId) {
        Optional<BuyerBrief> briefOpt;
        try {
            UUID uuid = UUID.fromString(clientId);
            briefOpt = buyerBriefRepository.findById(uuid);
        } catch (IllegalArgumentException e) {
            briefOpt = buyerBriefRepository.findByZohoContactId(clientId);
        }

        if (briefOpt.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("success", false, "error", "Brief not found"));
        }
        BuyerBrief brief = briefOpt.get();

        final Map<String, Object> profile = new LinkedHashMap<>();
        profile.put("fullName", brief.getFullName() != null ? brief.getFullName() : brief.getZohoName());
        profile.put("email", brief.getEmail());
        profile.put("secondaryEmail", brief.getSecondaryEmail());
        profile.put("greetingName", brief.getGreetingName());
        profile.put("zohoContactId", brief.getZohoContactId());

        // Fill from portal user if still missing
        portalUserRepository.findByBuyerBriefId(brief.getId()).ifPresent(pu -> {
            if (profile.get("fullName") == null || "N/A".equals(profile.get("fullName"))) {
                // If portal user has no fullName concept, maybe we can't do much,
                // but let's at least ensure email is there.
            }
            if (profile.get("email") == null) {
                profile.put("email", pu.getLoginEmail());
            }
        });

        return ResponseEntity.ok(Map.of("success", true, "data", profile));
    }

    @GetMapping("/api/properties")
    public ResponseEntity<Map<String, Object>> getAllProperties() {
        return ResponseEntity.ok(Map.of("success", true, "data", propertyRepository.findAll()));
    }

    @GetMapping("/api/properties/{zohoPropertyId}")
    public ResponseEntity<Map<String, Object>> getProperty(@PathVariable String zohoPropertyId) {
        Optional<Property> property = propertyRepository.findByZohoPropertyId(zohoPropertyId);
        if (property.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("success", false, "error", "Property not found"));
        }
        return ResponseEntity.ok(Map.of("success", true, "data", property.get()));
    }

    @GetMapping("/api/properties/{zohoPropertyId}/documents")
    public ResponseEntity<Map<String, Object>> getPropertyDocuments(@PathVariable String zohoPropertyId) {
        List<PropertyDocument> all = propertyDocumentRepository.findAllByZohoPropertyId(zohoPropertyId);
        return ResponseEntity.ok(Map.of("success", true, "data", categorizeDocuments(all, null)));
    }

    // --- Step 2: new singular /api/property endpoints ---

    @GetMapping("/api/property/{propertyId}")
    public ResponseEntity<Map<String, Object>> getPropertyById(@PathVariable String propertyId) {
        Optional<Property> property;
        try {
            UUID uuid = UUID.fromString(propertyId);
            property = propertyRepository.findById(uuid);
        } catch (IllegalArgumentException e) {
            property = propertyRepository.findByZohoPropertyId(propertyId);
        }
        if (property.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("success", false, "error", "Property not found"));
        }
        return ResponseEntity.ok(Map.of("success", true, "data", property.get()));
    }

    @GetMapping("/api/property/{propertyId}/documents")
    public ResponseEntity<Map<String, Object>> getPropertyDocumentsById(@PathVariable String propertyId) {
        Property property;
        try {
            UUID uuid = UUID.fromString(propertyId);
            property = propertyRepository.findById(uuid).orElse(null);
        } catch (IllegalArgumentException e) {
            property = propertyRepository.findByZohoPropertyId(propertyId).orElse(null);
        }
        if (property == null) {
            return ResponseEntity.status(404).body(Map.of("success", false, "error", "Property not found"));
        }

        List<PropertyDocument> all = propertyDocumentRepository.findAllByZohoPropertyId(property.getZohoPropertyId());
        return ResponseEntity
                .ok(Map.of("success", true, "data", categorizeDocuments(all, property.getPropertyVideoUrl())));
    }

    /**
     * Proxies a document to the browser.
     * - If r2Url is set → 302 redirect to the CDN (fast, no bandwidth cost).
     * - Otherwise → fetch from Zoho using OAuth and stream back as binary.
     */
    @GetMapping("/api/document/{docId}/stream")
    public void streamDocument(@PathVariable String docId, HttpServletResponse response) throws IOException {
        PropertyDocument doc;
        try {
            UUID uuid = UUID.fromString(docId);
            doc = propertyDocumentRepository.findById(uuid).orElse(null);
        } catch (IllegalArgumentException e) {
            doc = propertyDocumentRepository.findByZohoDocId(docId).orElse(null);
        }

        if (doc == null) {
            response.sendError(HttpServletResponse.SC_NOT_FOUND, "Document not found");
            return;
        }

        // R2 CDN is public — just redirect the browser there directly
        if (doc.getR2Url() != null && !doc.getR2Url().isBlank()) {
            response.sendRedirect(doc.getR2Url());
            return;
        }

        // Determine source URL: prefer CRM attachment (requires auth), fallback to
        // WorkDrive
        String sourceUrl = doc.getCrmDownloadUrl();
        if (sourceUrl == null || sourceUrl.isBlank()) {
            sourceUrl = doc.getDownloadLink();
        }
        if (sourceUrl == null || sourceUrl.isBlank()) {
            response.sendError(HttpServletResponse.SC_NOT_FOUND, "No source URL for document");
            return;
        }

        String contentType = r2StorageService.getContentType(doc.getFileExtension());
        response.setContentType(contentType);
        if (doc.getFileName() != null) {
            response.setHeader("Content-Disposition", "inline; filename=\"" + doc.getFileName() + "\"");
        }
        response.setHeader("Cache-Control", "public, max-age=86400");

        try {
            String accessToken = zohoAuthService.getAccessToken();
            HttpHeaders headers = new HttpHeaders();
            headers.set("Authorization", "Zoho-oauthtoken " + accessToken);
            headers.set(HttpHeaders.ACCEPT, "application/octet-stream, image/*, */*");

            HttpEntity<Void> entity = new HttpEntity<>(headers);
            ResponseEntity<byte[]> zohoResponse = restTemplate.exchange(
                    sourceUrl, HttpMethod.GET, entity, byte[].class);

            if (zohoResponse.getStatusCode().is2xxSuccessful() && zohoResponse.getBody() != null) {
                byte[] bytes = zohoResponse.getBody();
                response.setContentLengthLong(bytes.length);
                response.getOutputStream().write(bytes);
                response.flushBuffer();
            } else {
                response.sendError(HttpServletResponse.SC_BAD_GATEWAY,
                        "Upstream returned: " + zohoResponse.getStatusCode());
            }
        } catch (Exception e) {
            log.error("Failed to stream document {}: {}", docId, e.getMessage());
            if (!response.isCommitted()) {
                response.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR, "Stream error");
            }
        }
    }

    /**
     * Handles client response to a property assignment.
     * For ACCEPT: Zoho CRM must be updated successfully first, then email is sent.
     * Local DB is NOT touched — portalStatus syncs back via regular Zoho sync.
     * For REQUEST_WALKTHROUGH: email only, no Zoho write.
     */
    @PostMapping("/api/client/assignment/{assignmentId}/notify")
    public ResponseEntity<Map<String, Object>> notifyAssignmentAction(
            @PathVariable UUID assignmentId,
            @RequestBody Map<String, Object> body) {

        Assignment assignment = assignmentRepository.findById(assignmentId).orElse(null);
        if (assignment == null) {
            return ResponseEntity.status(404).body(Map.of("success", false, "error", "Assignment not found"));
        }

        String action = body.getOrDefault("action", "").toString();
        String remark = body.getOrDefault("remark", "").toString();

        // Resolve property address
        String propertyAddress = "Unknown Property";
        if (assignment.getZohoPropertyId() != null) {
            Property prop = propertyRepository.findByZohoPropertyId(assignment.getZohoPropertyId()).orElse(null);
            if (prop != null && prop.getAddress() != null)
                propertyAddress = prop.getAddress();
        }

        // Resolve client name from brief (contact may have multiple briefs — any will
        // do)
        String clientName = "Client";
        if (assignment.getZohoContactId() != null) {
            List<BuyerBrief> briefs = buyerBriefRepository.findAllByZohoContactId(assignment.getZohoContactId());
            if (!briefs.isEmpty()) {
                BuyerBrief brief = briefs.get(0);
                String name = brief.getFullName() != null ? brief.getFullName() : brief.getZohoName();
                clientName = name != null ? name : (brief.getEmail() != null ? brief.getEmail() : "Client");
            }
        }

        // For ACCEPT: push to Zoho CRM first — email only fires if this succeeds
        if ("ACCEPT".equalsIgnoreCase(action)) {
            if (assignment.getZohoAssignmentId() == null) {
                log.error("Cannot accept assignment {} — zohoAssignmentId is null", assignmentId);
                return ResponseEntity.status(500)
                        .body(Map.of("success", false, "error", "Assignment has no Zoho ID — cannot update CRM"));
            }
            try {
                String accessToken = zohoAuthService.getAccessToken();
                HttpHeaders zh = new HttpHeaders();
                zh.set("Authorization", "Zoho-oauthtoken " + accessToken);
                zh.setContentType(MediaType.APPLICATION_JSON);
                Map<String, Object> zohoBody = Map.of("data", List.of(Map.of("Status", "PROPERTY ACCEPTED")));
                ResponseEntity<String> zohoResp = restTemplate.exchange(
                        zohoBaseUrl + "/Client_Management/" + assignment.getZohoAssignmentId(),
                        HttpMethod.PUT,
                        new HttpEntity<>(zohoBody, zh),
                        String.class);

                String respBody = zohoResp.getBody();
                boolean isError = respBody != null
                        && (respBody.contains("\"status\":\"error\"") || respBody.contains("\"status\": \"error\""));

                if (isError) {
                    boolean blueprintResolved = false;

                    if (respBody.contains("RECORD_IN_BLUEPRINT")) {
                        log.warn("Record is in Blueprint. Fetching available transitions...");
                        try {
                            ResponseEntity<Map> bpResp = restTemplate.exchange(
                                    zohoBaseUrl + "/Client_Management/" + assignment.getZohoAssignmentId()
                                            + "/actions/blueprint",
                                    HttpMethod.GET,
                                    new HttpEntity<>(zh),
                                    Map.class);

                            Map<String, Object> bpBody = bpResp.getBody();
                            if (bpBody != null && bpBody.containsKey("blueprint")) {
                                Map<String, Object> blueprint = (Map<String, Object>) bpBody.get("blueprint");
                                List<Map<String, Object>> transitions = (List<Map<String, Object>>) blueprint
                                        .get("transitions");

                                String transitionId = null;
                                if (transitions != null) {
                                    for (Map<String, Object> t : transitions) {
                                        String tName = t.get("name") != null ? t.get("name").toString() : "";
                                        if (tName.equalsIgnoreCase("Property Accepted")) {
                                            transitionId = t.get("id").toString();
                                            break;
                                        }
                                    }
                                }

                                if (transitionId != null) {
                                    log.info("Found Blueprint transition 'Property Accepted' with ID: {}",
                                            transitionId);
                                    Map<String, Object> bpPutData = Map.of(
                                            "blueprint", List.of(
                                                    Map.of("transition_id", transitionId, "data", Map.of())));
                                    ResponseEntity<String> bpExecResp = restTemplate.exchange(
                                            zohoBaseUrl + "/Client_Management/" + assignment.getZohoAssignmentId()
                                                    + "/actions/blueprint",
                                            HttpMethod.PUT,
                                            new HttpEntity<>(bpPutData, zh),
                                            String.class);
                                    String execBody = bpExecResp.getBody();
                                    if (execBody != null && execBody.contains("\"status\":\"error\"")) {
                                        return ResponseEntity.status(400).body(Map.of("success", false, "error",
                                                "Blueprint execution failed: " + execBody));
                                    }
                                    log.info("Successfully executed Blueprint transition {}", transitionId);
                                    blueprintResolved = true;
                                } else {
                                    log.error("Blueprint transition 'Property Accepted' not found. Available: {}",
                                            transitions);
                                    return ResponseEntity.status(400).body(Map.of("success", false, "error",
                                            "Blueprint transition 'Property Accepted' not found."));
                                }
                            }
                        } catch (Exception bpEx) {
                            log.error("Failed to execute blueprint transition", bpEx);
                            return ResponseEntity.status(500).body(Map.of("success", false, "error",
                                    "Failed to execute blueprint: " + bpEx.getMessage()));
                        }
                    }

                    if (!blueprintResolved) {
                        log.error("Zoho CRM update returned error: {}", respBody);
                        return ResponseEntity.status(400)
                                .body(Map.of("success", false, "error", "Zoho update rejected: " + respBody));
                    }
                }

                log.info("Zoho CRM updated to 'PROPERTY ACCEPTED' for assignment {} — HTTP {} - Body {}", assignmentId,
                        zohoResp.getStatusCode(), respBody);

                // Stage DB update — will be saved after email succeeds
                assignment.setZohoStatus("Property Accepted");
                assignment.setPortalStatus("ACCEPTED");

            } catch (Exception e) {
                log.error("Zoho CRM update failed for assignment {}: {}", assignmentId, e.getMessage());
                return ResponseEntity.status(500)
                        .body(Map.of("success", false, "error", "Failed to update CRM: " + e.getMessage()));
            }
        }

        // Stage walkthrough flag — will be saved after email succeeds
        if ("REQUEST_WALKTHROUGH".equalsIgnoreCase(action)) {
            assignment.setWalkthroughRequested(true);
        }

        try {
            emailService.sendClientActionNotification(clientName, propertyAddress, action, remark);
        } catch (Exception e) {
            log.warn("Email failed for assignment {}: {}", assignmentId, e.getMessage());
            return ResponseEntity.status(500)
                    .body(Map.of("success", false, "error", "Email failed: " + e.getMessage()));
        }

        // Persist DB changes only after email succeeds
        if ("ACCEPT".equalsIgnoreCase(action) || "REQUEST_WALKTHROUGH".equalsIgnoreCase(action)) {
            assignmentRepository.save(assignment);
        }

        return ResponseEntity.ok(Map.of("success", true, "message", "Done"));
    }

    /**
     * Saves client-only notes for an assignment. Only visible to the client.
     */
    @PostMapping("/api/client/assignment/{assignmentId}/client-notes")
    public ResponseEntity<Map<String, Object>> saveClientNotes(
            @PathVariable UUID assignmentId,
            @RequestBody Map<String, Object> body) {

        Assignment assignment = assignmentRepository.findById(assignmentId).orElse(null);
        if (assignment == null) {
            return ResponseEntity.status(404).body(Map.of("success", false, "error", "Assignment not found"));
        }

        String notes = body.getOrDefault("notes", "").toString();
        assignment.setClientNotes(notes);
        assignmentRepository.save(assignment);
        log.info("Client notes saved for assignmentId={}", assignmentId);

        return ResponseEntity.ok(Map.of("success", true, "data", Map.of("clientNotes", notes)));
    }

    // -------------------------------------------------------------------------
    // DOCUMENT HELPERS
    // -------------------------------------------------------------------------

    /**
     * Projects a PropertyDocument to a clean frontend-safe map.
     * Resolves a single "url" field: r2Url first, downloadLink as fallback.
     * Never exposes crmDownloadUrl or raw Zoho internals.
     */
    private Map<String, Object> projectDoc(PropertyDocument doc) {
        String url = doc.getR2Url() != null ? doc.getR2Url() : doc.getDownloadLink();
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", doc.getId());
        m.put("documentType", doc.getDocumentType());
        m.put("caption", doc.getCaption());
        m.put("fileName", doc.getFileName());
        m.put("fileExtension", doc.getFileExtension());
        m.put("fileSizeBytes", doc.getFileSizeBytes());
        m.put("url", url);
        return m;
    }

    private Map<String, Object> categorizeDocuments(List<PropertyDocument> all, String propertyVideoUrl) {
        List<Map<String, Object>> propertyImages = new ArrayList<>();
        List<Map<String, Object>> images = new ArrayList<>();
        List<Map<String, Object>> pdfs = new ArrayList<>();
        List<Map<String, Object>> others = new ArrayList<>();
        // url → caption; LinkedHashMap preserves order and deduplicates by URL
        Map<String, String> videoMap = new LinkedHashMap<>();

        if (propertyVideoUrl != null && !propertyVideoUrl.isBlank()) {
            videoMap.putIfAbsent(propertyVideoUrl, null);
        }

        Set<String> imgExts = Set.of("png", "jpg", "jpeg", "webp", "gif");
        Set<String> videoExts = Set.of("mp4", "mov", "movie", "webm");

        for (PropertyDocument doc : all) {
            String ext = doc.getFileExtension() != null ? doc.getFileExtension().toLowerCase() : "";
            String type = doc.getDocumentType() != null ? doc.getDocumentType() : "";

            // Property Video Link — embed via property_video_url (YouTube URL)
            if ("Property Video Link".equals(type)) {
                if (doc.getPropertyVideoUrl() != null && !doc.getPropertyVideoUrl().isBlank()) {
                    videoMap.putIfAbsent(doc.getPropertyVideoUrl(), doc.getCaption());
                }
                continue;
            }
            // All other video types/extensions — skip entirely
            if ("Property Video".equals(type) || "VIDEO".equals(type) || videoExts.contains(ext)) {
                continue;
            }

            Map<String, Object> projected = projectDoc(doc);

            if ("Property Image".equals(type) || "Property Images".equals(type) || "PROPERTY_IMAGE".equals(type)) {
                propertyImages.add(projected);
            } else if ("Due Diligence Image".equals(type) || "DUE_DILIGENCE_IMAGE".equals(type) || imgExts.contains(ext)) {
                images.add(projected);
            } else if ("pdf".equals(ext)) {
                pdfs.add(projected);
            } else {
                others.add(projected);
            }
        }

        List<Map<String, String>> externalVideos = new ArrayList<>();
        for (Map.Entry<String, String> entry : videoMap.entrySet()) {
            Map<String, String> map = new HashMap<>();
            map.put("url", entry.getKey());
            map.put("caption", entry.getValue());
            externalVideos.add(map);
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("propertyImages", propertyImages);
        result.put("images", images);
        result.put("videos", List.of());
        result.put("pdfs", pdfs);
        result.put("others", others);
        result.put("externalVideos", externalVideos);
        return result;
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalArgument(IllegalArgumentException ex) {
        return ResponseEntity.badRequest().body(Map.of("success", false, "error", ex.getMessage()));
    }
}
