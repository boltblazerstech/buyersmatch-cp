package com.buyersmatch.controllers;

import com.buyersmatch.dto.AssignPropertyRequest;
import com.buyersmatch.dto.OnboardClientRequest;
import com.buyersmatch.dto.SaveNotesRequest;
import com.buyersmatch.entities.Assignment;
import com.buyersmatch.entities.BuyerBrief;
import com.buyersmatch.entities.ClientPortalUser;
import com.buyersmatch.entities.Property;
import com.buyersmatch.repositories.AssignmentRepository;
import com.buyersmatch.repositories.BuyerBriefRepository;
import com.buyersmatch.repositories.ClientPortalUserRepository;
import com.buyersmatch.repositories.PropertyRepository;
import com.buyersmatch.services.ClientPortalUserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/admin")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
@Slf4j
public class AdminClientController {

    private final ClientPortalUserRepository portalUserRepository;
    private final BuyerBriefRepository buyerBriefRepository;
    private final PropertyRepository propertyRepository;
    private final AssignmentRepository assignmentRepository;
    private final ClientPortalUserService clientPortalUserService;

    // -------------------------------------------------------------------------
    // GET /api/admin/clients
    // -------------------------------------------------------------------------

    @GetMapping("/clients")
    @Transactional(readOnly = true)
    public ResponseEntity<Map<String, Object>> getAllClients() {
        List<ClientPortalUser> users = portalUserRepository.findAll();

        List<Map<String, Object>> data = new ArrayList<>();
        for (ClientPortalUser user : users) {
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("id", user.getId());
            entry.put("loginEmail", user.getLoginEmail());
            entry.put("status", user.getStatus());
            entry.put("password", user.getSourcePassword());
            entry.put("notes", user.getNotes());
            entry.put("lastLoginAt", user.getLastLoginAt());
            entry.put("createdAt", user.getCreatedAt());
            entry.put("updatedAt", user.getUpdatedAt());
            
            BuyerBrief brief = user.getBuyerBrief();
            if (brief != null) {
                Map<String, Object> briefMap = new HashMap<>();
                briefMap.put("id", brief.getId());
                briefMap.put("fullName", brief.getFullName() != null ? brief.getFullName() : brief.getZohoName());
                briefMap.put("email", brief.getEmail());
                briefMap.put("zohoContactId", brief.getZohoContactId());
                entry.put("buyerBrief", briefMap);
            } else {
                entry.put("buyerBrief", null);
            }
            
            data.add(entry);
        }

        return ResponseEntity.ok(Map.of("success", true, "data", data));
    }

    // -------------------------------------------------------------------------
    // GET /api/admin/buyer-briefs
    // -------------------------------------------------------------------------

    @GetMapping("/buyer-briefs")
    public ResponseEntity<Map<String, Object>> getAllBuyerBriefs() {
        List<BuyerBrief> allBriefs = buyerBriefRepository.findAll();
        List<ClientPortalUser> portalUsers = portalUserRepository.findAll();

        // Portal users mapped by the Brief they're linked to
        Map<UUID, ClientPortalUser> portalByBriefId = new HashMap<>();
        for (ClientPortalUser pu : portalUsers) {
            if (pu.getBuyerBrief() != null) {
                portalByBriefId.put(pu.getBuyerBrief().getId(), pu);
            }
        }

        // Grouping briefs by Zoho Contact ID
        // Key: zohoContactId, Value: List of briefs for that person
        Map<String, List<BuyerBrief>> briefsByContactId = new LinkedHashMap<>();
        for (BuyerBrief b : allBriefs) {
            String contactId = b.getZohoContactId() != null ? b.getZohoContactId() : "unlinked-" + b.getId();
            briefsByContactId.computeIfAbsent(contactId, k -> new ArrayList<>()).add(b);
        }

        List<Map<String, Object>> data = new ArrayList<>();
        for (Map.Entry<String, List<BuyerBrief>> entry : briefsByContactId.entrySet()) {
            List<BuyerBrief> group = entry.getValue();
            // Sort group by sync time desc so the most recent brief is at the top
            group.sort((a, b) -> {
                String ta = (a.getZohoCreatedAt() != null && !a.getZohoCreatedAt().trim().isEmpty()) ? a.getZohoCreatedAt() : (a.getSyncedAt() != null ? a.getSyncedAt().toString() : "");
                String tb = (b.getZohoCreatedAt() != null && !b.getZohoCreatedAt().trim().isEmpty()) ? b.getZohoCreatedAt() : (b.getSyncedAt() != null ? b.getSyncedAt().toString() : "");
                return tb.compareTo(ta);
            });

            BuyerBrief representative = group.get(0);
            
            // Check if ANY brief in this group is onboarded
            ClientPortalUser activePortalUser = null;
            BuyerBrief onboardedBrief = null;
            for (BuyerBrief b : group) {
                if (portalByBriefId.containsKey(b.getId())) {
                    activePortalUser = portalByBriefId.get(b.getId());
                    onboardedBrief = b;
                    break;
                }
            }

            Map<String, Object> buyer = new LinkedHashMap<>();
            buyer.put("id", activePortalUser != null ? onboardedBrief.getId() : representative.getId());
            buyer.put("zohoContactId", entry.getKey().startsWith("unlinked-") ? null : entry.getKey());
            buyer.put("fullName", representative.getFullName() != null ? representative.getFullName() : representative.getZohoName());
            buyer.put("email", representative.getEmail());
            buyer.put("status", representative.getStatus());
            buyer.put("briefCount", group.size());
            buyer.put("activeBriefCount", group.stream().filter(b -> !"Closed".equalsIgnoreCase(b.getStatus())).count());
            String zCreatedAt = representative.getZohoCreatedAt();
            buyer.put("latestBriefDate", (zCreatedAt != null && !zCreatedAt.trim().isEmpty()) ? zCreatedAt : representative.getSyncedAt());
            
            if (activePortalUser != null) {
                buyer.put("portalUser", Map.of(
                    "id", activePortalUser.getId(),
                    "email", activePortalUser.getLoginEmail(),
                    "status", activePortalUser.getStatus(),
                    "password", activePortalUser.getSourcePassword() != null ? activePortalUser.getSourcePassword() : "—"
                ));
            } else {
                buyer.put("portalUser", null);
            }
            
            data.add(buyer);
        }

        // Final sort of buyers list by representative sync time
        data.sort((a, b) -> {
            String ta = a.get("latestBriefDate") != null ? a.get("latestBriefDate").toString() : "";
            String tb = b.get("latestBriefDate") != null ? b.get("latestBriefDate").toString() : "";
            return tb.compareTo(ta);
        });

        return ResponseEntity.ok(Map.of("success", true, "data", data));
    }

    // -------------------------------------------------------------------------
    // POST /api/admin/client
    // -------------------------------------------------------------------------

    @PostMapping("/client")
    public ResponseEntity<Map<String, Object>> createClient(@Valid @RequestBody OnboardClientRequest request) {
        return ResponseEntity.ok(Map.of("success", true, "data",
                clientPortalUserService.onboardClient(request)));
    }

    // -------------------------------------------------------------------------
    // POST /api/admin/assign-property
    // -------------------------------------------------------------------------

    @PostMapping("/assign-property")
    public ResponseEntity<Map<String, Object>> assignProperty(@Valid @RequestBody AssignPropertyRequest request) {
        BuyerBrief clientBrief = buyerBriefRepository.findById(request.getClientId())
                .orElseThrow(() -> new IllegalArgumentException("BuyerBrief not found for clientId: " + request.getClientId()));

        Property property = propertyRepository.findById(request.getPropertyId())
                .orElseThrow(() -> new IllegalArgumentException("Property not found: " + request.getPropertyId()));

        BuyerBrief brief = buyerBriefRepository.findById(request.getBriefId())
                .orElseThrow(() -> new IllegalArgumentException("BuyerBrief not found for briefId: " + request.getBriefId()));

        Assignment assignment = Assignment.builder()
                .zohoAssignmentId("manual-" + UUID.randomUUID())
                .zohoContactId(clientBrief.getZohoContactId())
                .zohoPropertyId(property.getZohoPropertyId())
                .zohoBriefId(brief.getZohoBriefId())
                .portalStatus("PENDING")
                .build();

        assignmentRepository.save(assignment);
        log.info("Admin assigned propertyId={} to clientId={}", request.getPropertyId(), request.getClientId());

        return ResponseEntity.ok(Map.of("success", true, "data", assignment));
    }

    // -------------------------------------------------------------------------
    // POST /api/admin/client/:clientId/notes
    // -------------------------------------------------------------------------

    @PostMapping("/client/{clientId}/notes")
    public ResponseEntity<Map<String, Object>> saveNotes(
            @PathVariable UUID clientId,
            @RequestBody SaveNotesRequest request) {

        ClientPortalUser user = portalUserRepository.findById(clientId)
                .orElseThrow(() -> new IllegalArgumentException("Client not found: " + clientId));

        user.setNotes(request.getNotes());
        portalUserRepository.save(user);
        log.info("Admin saved notes for clientId={}", clientId);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", user.getId());
        result.put("notes", user.getNotes());
        return ResponseEntity.ok(Map.of("success", true, "data", result));
    }

    // -------------------------------------------------------------------------
    // POST /api/admin/assignment/:assignmentId/agent-notes
    // -------------------------------------------------------------------------

    @PostMapping("/assignment/{assignmentId}/agent-notes")
    public ResponseEntity<Map<String, Object>> saveAgentNotes(
            @PathVariable UUID assignmentId,
            @RequestBody Map<String, Object> body) {

        Assignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new IllegalArgumentException("Assignment not found: " + assignmentId));

        String agentNotes = body.getOrDefault("agentNotes", "").toString();
        assignment.setAgentNotes(agentNotes);
        assignmentRepository.save(assignment);
        log.info("Agent notes saved for assignmentId={}", assignmentId);

        return ResponseEntity.ok(Map.of("success", true, "data",
                Map.of("id", assignmentId, "agentNotes", agentNotes)));
    }

    // -------------------------------------------------------------------------
    // GET /api/admin/responses
    // -------------------------------------------------------------------------

    @GetMapping("/responses")
    public ResponseEntity<Map<String, Object>> getAllResponses() {
        List<Assignment> assignments = assignmentRepository.findAll();

        List<Map<String, Object>> data = new ArrayList<>();
        for (Assignment assignment : assignments) {
            BuyerBrief brief = null;
            if (assignment.getZohoContactId() != null) {
                brief = buyerBriefRepository.findByZohoContactId(assignment.getZohoContactId()).orElse(null);
            }
            Property property = null;
            if (assignment.getZohoPropertyId() != null) {
                property = propertyRepository.findByZohoPropertyId(assignment.getZohoPropertyId()).orElse(null);
            }

            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("assignmentId", assignment.getId());
            entry.put("clientName", brief != null ? brief.getFullName() : null);
            entry.put("property", property);
            entry.put("portalStatus", assignment.getPortalStatus());
            entry.put("zohoStatus", assignment.getZohoStatus());
            entry.put("updatedAt", assignment.getUpdatedAt());
            data.add(entry);
        }

        return ResponseEntity.ok(Map.of("success", true, "data", data));
    }

    // -------------------------------------------------------------------------
    // EXCEPTION HANDLERS
    // -------------------------------------------------------------------------

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalArgument(IllegalArgumentException ex) {
        return ResponseEntity.badRequest().body(Map.of("success", false, "error", ex.getMessage()));
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalState(IllegalStateException ex) {
        return ResponseEntity.badRequest().body(Map.of("success", false, "error", ex.getMessage()));
    }

    // TEMPORARY - DELETE AFTER USE
    @GetMapping("/hash")
    public org.springframework.http.ResponseEntity<String> hashPassword(
            @RequestParam String password) {
        String hashed = new org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder().encode(password);
        return org.springframework.http.ResponseEntity.ok(hashed);
    }
}
