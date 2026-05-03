package com.buyersmatch.services;

import com.buyersmatch.entities.*;
import com.buyersmatch.repositories.*;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
@Slf4j
@RequiredArgsConstructor
public class ZohoSyncService {

    private final ZohoAuthService zohoAuthService;
    private final BuyerBriefRepository buyerBriefRepository;
    private final PropertyRepository propertyRepository;
    private final PropertyDocumentRepository propertyDocumentRepository;
    private final AssignmentRepository assignmentRepository;
    private final SyncStateRepository syncStateRepository;
    private final SyncLogRepository syncLogRepository;
    private final RestTemplate restTemplate;
    private final R2StorageService r2StorageService;
    private final ClientPortalUserRepository clientPortalUserRepository;
    private final NotificationService notificationService;

    @Value("${zoho.base.url}")
    private String baseUrl;

    // Zoho expects ISO-8601 with offset e.g. 2024-01-15T08:30:00+00:00
    private static final DateTimeFormatter ZOHO_DATE_FORMAT =
            DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ssXXX");


    // -------------------------------------------------------------------------
    // HELPER METHODS
    // -------------------------------------------------------------------------

    private HttpHeaders getZohoHeaders() {
        String token = zohoAuthService.getAccessToken();
        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "Zoho-oauthtoken " + token);
        return headers;
    }

    /** Public accessor used by SyncController for manual test uploads. */
    public HttpHeaders getZohoHeadersPublic() {
        return getZohoHeaders();
    }

    private HttpHeaders getZohoHeaders(LocalDateTime since) {
        HttpHeaders headers = getZohoHeaders();
        if (since != null) {
            ZonedDateTime zdt = since.atZone(ZoneId.systemDefault());
            headers.set("If-Modified-Since", ZOHO_DATE_FORMAT.format(zdt));
        }
        return headers;
    }

    private void updateSyncState(String module, boolean fullSync) {
        SyncState state = syncStateRepository.findByModule(module)
                .orElse(new SyncState());
        state.setModule(module);
        state.setLastSyncedAt(LocalDateTime.now());
        if (fullSync) {
            state.setLastFullSyncAt(LocalDateTime.now());
        }
        syncStateRepository.save(state);
    }

    private LocalDateTime getLastSyncedAt(String module) {
        return syncStateRepository.findByModule(module)
                .map(SyncState::getLastSyncedAt)
                .orElse(null);
    }

    private SyncLog startLog(String module, String type) {
        SyncLog syncLog = SyncLog.builder()
                .module(module)
                .syncType(type)
                .startedAt(LocalDateTime.now())
                .status("RUNNING")
                .build();
        return syncLogRepository.save(syncLog);
    }

    private void endLog(SyncLog syncLog, int count, String status) {
        syncLog.setCompletedAt(LocalDateTime.now());
        syncLog.setRecordsSynced(count);
        syncLog.setStatus(status);
        syncLogRepository.save(syncLog);
    }

    private String getNestedId(Map<String, Object> record, String key) {
        Object value = record.get(key);
        if (value == null) return null;
        if (value instanceof String) return (String) value;
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> nested = (Map<String, Object>) value;
            Object id = nested.get("id");
            return id != null ? id.toString() : null;
        } catch (ClassCastException | IndexOutOfBoundsException e) {
            return null;
        }
    }

    private String getNestedName(Map<String, Object> record, String key) {
        Object value = record.get(key);
        if (value == null) return null;
        if (value instanceof String) return (String) value;
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> nested = (Map<String, Object>) value;
            Object name = nested.get("name");
            return name != null ? name.toString() : null;
        } catch (ClassCastException e) {
            return null;
        }
    }

    private String[] getStringArray(Map<String, Object> record, String key) {
        Object value = record.get(key);
        if (value == null) return new String[0];
        try {
            @SuppressWarnings("unchecked")
            List<String> list = (List<String>) value;
            return list.toArray(new String[0]);
        } catch (ClassCastException e) {
            return new String[0];
        }
    }

    private String[] getTagNames(Map<String, Object> record) {
        Object value = record.get("Tag");
        if (value == null) return new String[0];
        try {
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> tags = (List<Map<String, Object>>) value;
            return tags.stream()
                    .map(t -> t.get("name"))
                    .filter(Objects::nonNull)
                    .map(Object::toString)
                    .toArray(String[]::new);
        } catch (ClassCastException e) {
            return new String[0];
        }
    }

    private BigDecimal toBigDecimal(Object value) {
        if (value == null) return null;
        try {
            return new BigDecimal(value.toString());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private Integer toInteger(Object value) {
        if (value == null) return null;
        try {
            return ((Number) value).intValue();
        } catch (ClassCastException e) {
            return null;
        }
    }

    private Double toDouble(Object value) {
        if (value == null) return null;
        try {
            return ((Number) value).doubleValue();
        } catch (ClassCastException e) {
            return null;
        }
    }

    /**
     * Fetches all pages from a Zoho module endpoint.
     * If `since` is provided, adds the If-Modified-Since header so Zoho only
     * returns records modified after that timestamp (true delta sync).
     * Returns an empty list if Zoho responds with 304 Not Modified.
     */
    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> fetchAllPages(String endpoint, LocalDateTime since) {
        List<Map<String, Object>> allRecords = new ArrayList<>();
        int page = 1;
        boolean moreRecords = true;

        if (since != null) {
            log.debug("Delta fetch for {} since {}", endpoint, since);
        }

        while (moreRecords) {
            String url = baseUrl + endpoint + "?per_page=200&page=" + page;
            HttpEntity<Void> entity = new HttpEntity<>(getZohoHeaders(since));

            try {
                ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.GET, entity, Map.class);

                // 304 = nothing changed since last sync
                if (response.getStatusCode() == HttpStatus.NOT_MODIFIED) {
                    log.info("No changes since last sync for {} (304 Not Modified)", endpoint);
                    break;
                }

                if (response.getStatusCode() != HttpStatus.OK || response.getBody() == null) {
                    log.warn("Non-OK response from Zoho at {}: {}", url, response.getStatusCode());
                    break;
                }

                Map<String, Object> body = response.getBody();
                List<Map<String, Object>> data = (List<Map<String, Object>>) body.get("data");
                if (data == null || data.isEmpty()) break;

                allRecords.addAll(data);

                Map<String, Object> info = (Map<String, Object>) body.get("info");
                moreRecords = info != null && Boolean.TRUE.equals(info.get("more_records"));
                page++;

            } catch (Exception e) {
                log.error("Error fetching page {} from {}: {}", page, url, e.getMessage());
                break;
            }
        }

        return allRecords;
    }

    /**
     * Fetches only the most recent records (1 page = up to 200) from a Zoho endpoint,
     * sorted by id descending (newest first). Used to avoid full syncs on large modules.
     */
    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> fetchNewest(String endpoint, int limit) {
        List<Map<String, Object>> records = new ArrayList<>();
        String url = baseUrl + endpoint + "?per_page=" + limit + "&page=1&sort_by=id&sort_order=desc";
        HttpEntity<Void> entity = new HttpEntity<>(getZohoHeaders(null));
        try {
            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.GET, entity, Map.class);
            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                List<Map<String, Object>> data = (List<Map<String, Object>>) response.getBody().get("data");
                if (data != null) records.addAll(data);
            }
        } catch (Exception e) {
            log.error("Error fetching newest from {}: {}", url, e.getMessage());
        }
        return records;
    }

    // -------------------------------------------------------------------------
    // METHOD 1: Sync Buyer Briefs
    // -------------------------------------------------------------------------

    public void syncBuyerBriefs(boolean fullSync, Integer limit) {
        String syncType = fullSync ? (limit != null ? "FULL (LIMIT " + limit + ")" : "FULL") : "DELTA";
        SyncLog syncLog = startLog("BuyerBriefs", syncType);
        int count = 0;

        try {
            LocalDateTime since = fullSync ? null : getLastSyncedAt("BuyerBriefs");
            List<Map<String, Object>> records = (fullSync && limit != null)
                    ? fetchNewest("/Buyer_Briefs", limit)
                    : fetchAllPages("/Buyer_Briefs", since);

            if (records.isEmpty() && since != null) {
                log.info("BuyerBriefs: no changes since {}", since);
                endLog(syncLog, 0, "SUCCESS");
                updateSyncState("BuyerBriefs", false);
                return;
            }

            for (Map<String, Object> r : records) {
                try {
                    String zohoBriefId = r.get("id") != null ? r.get("id").toString() : null;
                    if (zohoBriefId == null) continue;
                    saveBuyerBriefRecord(r, zohoBriefId);
                    count++;
                } catch (Exception e) {
                    log.error("Error mapping BuyerBrief record {}: {}", r.get("id"), e.getMessage());
                }
            }

            log.info("Synced {} BuyerBrief records ({})", count, syncType);
            updateSyncState("BuyerBriefs", fullSync);
            endLog(syncLog, count, "SUCCESS");

        } catch (Exception e) {
            log.error("BuyerBriefs sync failed: {}", e.getMessage(), e);
            endLog(syncLog, count, "FAILED");
        }
    }

    // -------------------------------------------------------------------------
    // METHOD 2: Sync Properties
    // -------------------------------------------------------------------------

    public void syncProperties(boolean fullSync, Integer limit) {
        String syncType = fullSync ? (limit != null ? "FULL (LIMIT " + limit + ")" : "FULL") : "DELTA";
        SyncLog syncLog = startLog("Properties", syncType);
        int count = 0;

        try {
            LocalDateTime since = fullSync ? null : getLastSyncedAt("Properties");
            List<Map<String, Object>> records = (fullSync && limit != null)
                    ? fetchNewest("/Properties", limit)
                    : fetchAllPages("/Properties", since);

            if (records.isEmpty() && since != null) {
                log.info("Properties: no changes since {}", since);
                endLog(syncLog, 0, "SUCCESS");
                updateSyncState("Properties", false);
                return;
            }

            for (Map<String, Object> r : records) {
                try {
                    String zohoPropertyId = r.get("id") != null ? r.get("id").toString() : null;
                    if (zohoPropertyId == null) continue;
                    if (savePropertyRecord(r, zohoPropertyId, !fullSync)) count++;
                } catch (Exception e) {
                    log.error("Error mapping Property record {}: {}", r.get("id"), e.getMessage());
                }
            }

            log.info("Synced {} Property records ({})", count, syncType);
            updateSyncState("Properties", fullSync);
            endLog(syncLog, count, "SUCCESS");

        } catch (Exception e) {
            log.error("Properties sync failed: {}", e.getMessage(), e);
            endLog(syncLog, count, "FAILED");
        }
    }

    // -------------------------------------------------------------------------
    // METHOD 3: Sync Property Documents
    // -------------------------------------------------------------------------

    public void syncPropertyDocuments(boolean fullSync, Integer limit) {
        syncPropertyDocuments(fullSync, limit, false);
    }

    public void syncPropertyDocuments(boolean fullSync, Integer limit, boolean skipR2) {
        String syncType = fullSync ? (limit != null ? "FULL (LIMIT " + limit + ")" : "FULL") : "DELTA";
        SyncLog syncLog = startLog("PropertyDocuments", syncType);
        int count = 0;

        try {
            LocalDateTime since = fullSync ? null : getLastSyncedAt("PropertyDocuments");
            List<Map<String, Object>> records = (fullSync && limit != null)
                    ? fetchNewest("/Property_Documents", limit)
                    : fetchAllPages("/Property_Documents", since);

            if (records.isEmpty()) {
                log.info("PropertyDocuments: no records returned");
                endLog(syncLog, 0, "SUCCESS");
                updateSyncState("PropertyDocuments", false);
                return;
            }

            // All properties in DB are valid (rejected ones are cascade-deleted on sync)
            Set<String> validPropertyIds = propertyRepository.findAll().stream()
                    .map(Property::getZohoPropertyId)
                    .filter(Objects::nonNull)
                    .collect(Collectors.toSet());

            for (Map<String, Object> r : records) {
                try {
                    String zohoDocId = r.get("id") != null ? r.get("id").toString() : null;
                    if (zohoDocId == null) continue;

                    String docPropertyId = getNestedId(r, "Property");
                    if (!validPropertyIds.contains(docPropertyId)) {
                        // Property not in DB (rejected or never synced) — remove orphan doc if any
                        propertyDocumentRepository.findByZohoDocId(zohoDocId)
                                .ifPresent(propertyDocumentRepository::delete);
                        continue;
                    }

                    savePropertyDocumentRecord(r, zohoDocId, validPropertyIds, skipR2);
                    count++;
                } catch (Exception e) {
                    log.error("Error mapping PropertyDocument record {}: {}", r.get("id"), e.getMessage());
                }
            }

            log.info("Synced {} PropertyDocument records ({})", count, syncType);
            updateSyncState("PropertyDocuments", fullSync);
            endLog(syncLog, count, "SUCCESS");

        } catch (Exception e) {
            log.error("PropertyDocuments sync failed: {}", e.getMessage(), e);
            endLog(syncLog, count, "FAILED");
        }
    }

    // -------------------------------------------------------------------------
    // METHOD 4: Sync Client Management (Assignments)
    // -------------------------------------------------------------------------

    public void syncClientManagement(boolean fullSync, Integer limit) {
        String syncType = fullSync ? (limit != null ? "FULL (LIMIT " + limit + ")" : "FULL") : "DELTA";
        SyncLog syncLog = startLog("ClientManagement", syncType);
        int count = 0;
        Map<String, String> contactEmailCache = new HashMap<>(); // zohoContactId → email, shared across the sync run

        try {
            LocalDateTime since = fullSync ? null : getLastSyncedAt("ClientManagement");
            List<Map<String, Object>> records = (fullSync && limit != null)
                    ? fetchNewest("/Client_Management", limit)
                    : fetchAllPages("/Client_Management", since);

            if (records.isEmpty() && since != null) {
                log.info("ClientManagement: no changes since {}", since);
                endLog(syncLog, 0, "SUCCESS");
                updateSyncState("ClientManagement", false);
                return;
            }

            // Only save assignments for properties that exist in our DB
            Set<String> validPropertyIds = propertyRepository.findAll().stream()
                    .map(Property::getZohoPropertyId)
                    .filter(Objects::nonNull)
                    .collect(Collectors.toSet());

            for (Map<String, Object> r : records) {
                try {
                    String zohoAssignmentId = r.get("id") != null ? r.get("id").toString() : null;
                    if (zohoAssignmentId == null) continue;

                    String assignmentPropertyId = getNestedId(r, "Property");
                    if (assignmentPropertyId != null && !validPropertyIds.contains(assignmentPropertyId)) {
                        // Property not in DB — remove orphan assignment if any
                        assignmentRepository.findByZohoAssignmentId(zohoAssignmentId)
                                .ifPresent(assignmentRepository::delete);
                        continue;
                    }

                    saveAssignmentRecord(r, zohoAssignmentId, contactEmailCache);
                    count++;
                } catch (Exception e) {
                    log.error("Error mapping Assignment record {}: {}", r.get("id"), e.getMessage());
                }
            }

            log.info("Synced {} Assignment records ({})", count, syncType);
            updateSyncState("ClientManagement", fullSync);
            endLog(syncLog, count, "SUCCESS");

        } catch (Exception e) {
            log.error("ClientManagement sync failed: {}", e.getMessage(), e);
            endLog(syncLog, count, "FAILED");
        }
    }


    // -------------------------------------------------------------------------
    // METHOD 5: Full Sync
    // -------------------------------------------------------------------------

    public void runFullSync() {
        log.info("Starting full sync");
        syncBuyerBriefs(true, null);
        syncProperties(true, null);
        syncPropertyDocuments(true, null);
        syncClientManagement(true, null);
        uploadMissingR2Documents();
        log.info("Full sync completed");
    }

    // -------------------------------------------------------------------------
    // METHOD 6: Data Sync — text only, no R2 uploads, runs in parallel
    // Used by the 5-minute scheduler and the "Sync Data" button.
    // -------------------------------------------------------------------------

    public void runDataSync() {
        log.info("Starting data sync (no R2)");
        // Properties first — docs/assignments reference property IDs
        syncProperties(false, null);
        java.util.concurrent.CompletableFuture<Void> briefs =
                java.util.concurrent.CompletableFuture.runAsync(() -> syncBuyerBriefs(false, null));
        java.util.concurrent.CompletableFuture<Void> docs =
                java.util.concurrent.CompletableFuture.runAsync(() -> syncPropertyDocuments(true, null, true));
        java.util.concurrent.CompletableFuture<Void> clients =
                java.util.concurrent.CompletableFuture.runAsync(() -> syncClientManagement(false, null));
        java.util.concurrent.CompletableFuture.allOf(briefs, docs, clients).join();
        updateSyncState("DataSync", false);
        log.info("Data sync completed");

        // If data sync found new docs without R2 URLs, upload them in the background
        long pending = propertyDocumentRepository.findAllByR2UrlIsNullAndCrmDownloadUrlIsNotNull().size()
                + propertyDocumentRepository.findAllByR2UrlIsNullAndCrmDownloadUrlIsNullAndDownloadLinkIsNotNull().size();
        if (pending > 0) {
            log.info("Data sync found {} docs pending R2 upload — triggering media sync in background", pending);
            java.util.concurrent.CompletableFuture.runAsync(this::uploadMissingR2Documents);
        }
    }

    // -------------------------------------------------------------------------
    // METHOD 7: Media Sync — upload missing R2 files for onboarded clients
    // Used by the "Sync Media" button.
    // -------------------------------------------------------------------------

    public void runMediaSync() {
        log.info("Starting media sync (R2 uploads only)");
        uploadMissingR2Documents();
        updateSyncState("MediaSync", false);
        log.info("Media sync completed");
    }

    // -------------------------------------------------------------------------
    // METHOD 8: Delta Sync (legacy — data + media together)
    // -------------------------------------------------------------------------

    public void runDeltaSync() {
        log.info("Starting delta sync");
        runDataSync();
        uploadMissingR2Documents();
        log.info("Delta sync completed");
    }

    // -------------------------------------------------------------------------
    // PORTAL CLIENT PROPERTY ID HELPER
    // -------------------------------------------------------------------------

    /**
     * Returns the set of zohoPropertyIds that are eligible for R2 media upload:
     * - assigned to at least one ONBOARDED portal user
     * - assignment is NOT rejected (zohoStatus contains "reject" or portalStatus = "REJECTED")
     */
    private Set<String> getAllValidPropertyIds() {
        return propertyRepository.findAll().stream()
                .map(Property::getZohoPropertyId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
    }

    private Set<String> getPortalClientPropertyIds() {
        List<String> contactIds = clientPortalUserRepository.findAllResolvedZohoContactIdsByStatus("onboarded");
        log.info("getPortalClientPropertyIds: {} contact IDs from onboarded portal users", contactIds.size());
        if (contactIds.isEmpty()) return Collections.emptySet();
        Set<String> propertyIds = assignmentRepository.findAllByZohoContactIdIn(contactIds)
                .stream()
                .filter(a -> {
                    String zs = a.getZohoStatus() != null ? a.getZohoStatus().toLowerCase() : "";
                    String ps = a.getPortalStatus() != null ? a.getPortalStatus() : "";
                    return !zs.contains("reject") && !"REJECTED".equalsIgnoreCase(ps);
                })
                .map(Assignment::getZohoPropertyId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        log.info("getPortalClientPropertyIds: {} eligible property IDs (onboarded clients, non-rejected assignments)", propertyIds.size());
        return propertyIds;
    }

    // -------------------------------------------------------------------------
    // CONTACT EMAIL LOOKUP — cached per sync run to avoid duplicate API calls
    // -------------------------------------------------------------------------

    @SuppressWarnings("unchecked")
    private String fetchContactEmail(String zohoContactId, Map<String, String> cache) {
        if (zohoContactId == null) return null;
        if (cache.containsKey(zohoContactId)) return cache.get(zohoContactId);
        try {
            String url = baseUrl + "/Contacts/" + zohoContactId;
            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.GET, new HttpEntity<>(getZohoHeaders()), Map.class);
            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                List<Map<String, Object>> data = (List<Map<String, Object>>) response.getBody().get("data");
                if (data != null && !data.isEmpty()) {
                    Object email = data.get(0).get("Email");
                    String result = email != null ? email.toString() : null;
                    cache.put(zohoContactId, result);
                    return result;
                }
            }
        } catch (Exception e) {
            log.warn("Failed to fetch contact email for {}: {}", zohoContactId, e.getMessage());
        }
        cache.put(zohoContactId, null);
        return null;
    }

    // -------------------------------------------------------------------------
    // CASCADE DELETE — removes property + all its docs (R2 + DB) + assignments
    // -------------------------------------------------------------------------

    private void deletePropertyWithCascade(String zohoPropertyId) {
        List<PropertyDocument> docs = propertyDocumentRepository.findAllByZohoPropertyId(zohoPropertyId);
        for (PropertyDocument doc : docs) {
            if (doc.getZohoDocId() != null && doc.getFileName() != null) {
                r2StorageService.deleteObject(r2StorageService.generateFileKey(doc.getZohoDocId(), doc.getFileName()));
            }
        }
        propertyDocumentRepository.deleteAll(docs);

        List<Assignment> assignments = assignmentRepository.findAllByZohoPropertyId(zohoPropertyId);
        assignmentRepository.deleteAll(assignments);

        propertyRepository.findByZohoPropertyId(zohoPropertyId).ifPresent(propertyRepository::delete);

        log.info("Cascade deleted property {} ({} docs, {} assignments)", zohoPropertyId, docs.size(), assignments.size());
    }

    // -------------------------------------------------------------------------
    // SINGLE-PROPERTY ASSIGNMENT SYNC (used for brand-new properties in delta sync)
    // -------------------------------------------------------------------------

    @SuppressWarnings("unchecked")
    private void syncAssignmentsForSingleProperty(String zohoPropertyId) {
        try {
            String url = baseUrl + "/Client_Management/search?criteria=(Property:equals:" + zohoPropertyId + ")&per_page=200";
            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.GET, new HttpEntity<>(getZohoHeaders()), Map.class);
            if (response.getStatusCode() != HttpStatus.OK || response.getBody() == null) return;
            List<Map<String, Object>> records = (List<Map<String, Object>>) response.getBody().get("data");
            if (records == null || records.isEmpty()) return;

            Map<String, String> contactEmailCache = new HashMap<>();
            for (Map<String, Object> r : records) {
                try {
                    String zohoAssignmentId = r.get("id") != null ? r.get("id").toString() : null;
                    if (zohoAssignmentId == null) continue;
                    saveAssignmentRecord(r, zohoAssignmentId, contactEmailCache);
                } catch (Exception e) {
                    log.error("Error saving assignment {} for property {}: {}", r.get("id"), zohoPropertyId, e.getMessage());
                }
            }
            log.info("Synced {} assignments for new property {}", records.size(), zohoPropertyId);
        } catch (Exception e) {
            log.error("Failed to sync assignments for property {}: {}", zohoPropertyId, e.getMessage());
        }
    }

    private void saveAssignmentRecord(Map<String, Object> r, String zohoAssignmentId, Map<String, String> contactEmailCache) {
        Assignment assignment = assignmentRepository.findByZohoAssignmentId(zohoAssignmentId).orElse(null);
        boolean isNew = (assignment == null);
        if (assignment == null) assignment = Assignment.builder().build();

        assignment.setZohoAssignmentId(zohoAssignmentId);
        assignment.setZohoContactId(getNestedId(r, "Buyer"));
        assignment.setZohoPropertyId(getNestedId(r, "Property"));
        assignment.setZohoBriefId(getNestedId(r, "Buyer_Brief"));

        String zohoStatus = r.get("Status") != null ? r.get("Status").toString() : null;
        assignment.setZohoStatus(zohoStatus);

        if (zohoStatus != null) {
            notificationService.createNotificationFromStatus(
                    zohoAssignmentId,
                    assignment.getZohoContactId(),
                    assignment.getZohoPropertyId(),
                    zohoStatus
            );
        }

        if (zohoStatus != null) {
            String zs = zohoStatus.toLowerCase();
            if (zs.contains("reject") || zs.contains("withdraw")) {
                assignment.setPortalStatus("REJECTED");
            } else if (zs.contains("accept") || zs.contains("offer") || zs.contains("contract") || zs.contains("bnp") || zs.contains("finance") || zs.contains("settlement") || zs.contains("done") || zs.contains("tenanted") || zs.contains("psi")) {
                assignment.setPortalStatus("ACCEPTED");
            } else if (zs.contains("assigned")) {
                assignment.setPortalStatus("PENDING");
            }
        } else if (isNew) {
            assignment.setPortalStatus("PENDING");
        }

        assignment.setJointBuyersName(r.get("Joint_Buyers_Full_Name") != null ? r.get("Joint_Buyers_Full_Name").toString() : null);
        assignment.setSecondaryBuyerEmail(r.get("Secondary_Buyer_Email") != null ? r.get("Secondary_Buyer_Email").toString() : null);
        assignment.setFinanceOption(r.get("Finance_Option") != null ? r.get("Finance_Option").toString() : null);
        assignment.setFinanceStatus(r.get("Finance_Status") != null ? r.get("Finance_Status").toString() : null);
        assignment.setFinanceDate(r.get("Finance_Date") != null ? r.get("Finance_Date").toString() : null);
        assignment.setContractStatus(r.get("Contract_Status") != null ? r.get("Contract_Status").toString() : null);
        assignment.setContractDate(r.get("Contract_Date") != null ? r.get("Contract_Date").toString() : null);
        assignment.setContractSettlementDate(r.get("Contract_Settlement_Date") != null ? r.get("Contract_Settlement_Date").toString() : null);
        assignment.setSettlementDate(r.get("Settlement_Date") != null ? r.get("Settlement_Date").toString() : null);
        assignment.setOfferAmount(toBigDecimal(r.get("Offer_Amount")));
        assignment.setOfferDate(r.get("Offer_Date") != null ? r.get("Offer_Date").toString() : null);
        assignment.setPurchasePrice(toBigDecimal(r.get("Purchase_Price")));
        assignment.setDepositAmount(toBigDecimal(r.get("Deposit_Amount")));
        assignment.setDepositPercentage(toBigDecimal(r.get("Deposit_Percentage")));
        assignment.setDepositDueDate(r.get("Deposit_Due_Date") != null ? r.get("Deposit_Due_Date").toString() : null);
        assignment.setBnpReportLink(r.get("BNP_Report_Download_Link") != null ? r.get("BNP_Report_Download_Link").toString() : null);
        assignment.setFinanceLetterLink(r.get("Finance_Letter_Download_Link") != null ? r.get("Finance_Letter_Download_Link").toString() : null);
        assignment.setContractDownloadLink(r.get("Contract_Download_Link") != null ? r.get("Contract_Download_Link").toString() : null);
        assignment.setDocusignLink(r.get("Enter_Docusign_Link") != null ? r.get("Enter_Docusign_Link").toString() : null);
        assignment.setCashflowDocLink(r.get("Cashflow_Document_Link") != null ? r.get("Cashflow_Document_Link").toString() : null);
        assignment.setCurrentWeeklyRent(toBigDecimal(r.get("Current_Weekly_Rent")));
        assignment.setRentalYield(toDouble(r.get("Rental_Yield")));
        assignment.setRealEstateAgentName(getNestedName(r, "Real_Estate_Agent"));

        String conveyancerId = getNestedId(r, "Conveyancer");
        assignment.setConveyancerZohoId(conveyancerId);
        assignment.setConveyancerName(getNestedName(r, "Conveyancer"));
        assignment.setConveyancerEmail(fetchContactEmail(conveyancerId, contactEmailCache));

        assignment.setZohoCreatedAt(r.get("Created_Time") != null ? r.get("Created_Time").toString() : null);
        assignment.setZohoModifiedAt(r.get("Modified_Time") != null ? r.get("Modified_Time").toString() : null);
        assignment.setSyncedAt(LocalDateTime.now());

        assignmentRepository.save(assignment);
    }

    // -------------------------------------------------------------------------
    // SINGLE-PROPERTY DOCUMENT SYNC (used for brand-new properties in delta sync)
    // -------------------------------------------------------------------------

    @SuppressWarnings("unchecked")
    private void syncDocumentsForSingleProperty(String zohoPropertyId) {
        try {
            String url = baseUrl + "/Property_Documents/search?criteria=(Property:equals:" + zohoPropertyId + ")&per_page=200";
            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.GET, new HttpEntity<>(getZohoHeaders()), Map.class);
            if (response.getStatusCode() != HttpStatus.OK || response.getBody() == null) return;
            List<Map<String, Object>> records = (List<Map<String, Object>>) response.getBody().get("data");
            if (records == null || records.isEmpty()) return;

            Set<String> allowedPropertyIds = getAllValidPropertyIds();
            for (Map<String, Object> r : records) {
                try {
                    String zohoDocId = r.get("id") != null ? r.get("id").toString() : null;
                    if (zohoDocId == null) continue;
                    savePropertyDocumentRecord(r, zohoDocId, allowedPropertyIds, false);
                } catch (Exception e) {
                    log.error("Error saving document {} for property {}: {}", r.get("id"), zohoPropertyId, e.getMessage());
                }
            }
            log.info("Re-synced {} documents for property {} after Rejected→active", records.size(), zohoPropertyId);
        } catch (Exception e) {
            log.error("Failed to re-sync documents for property {}: {}", zohoPropertyId, e.getMessage());
        }
    }

    @SuppressWarnings("unchecked")
    private void savePropertyDocumentRecord(Map<String, Object> r, String zohoDocId, Set<String> allowedPropertyIds, boolean skipR2) {
        PropertyDocument doc = propertyDocumentRepository.findByZohoDocId(zohoDocId)
                .orElse(PropertyDocument.builder().build());

        doc.setZohoDocId(zohoDocId);
        doc.setZohoPropertyId(getNestedId(r, "Property"));
        doc.setDocumentType(r.get("Document_Type") != null ? r.get("Document_Type").toString().trim() : null);
        doc.setCaption(r.get("Document_Caption") != null ? r.get("Document_Caption").toString() : null);
        doc.setDownloadLink(r.get("Download_Link") != null ? r.get("Download_Link").toString() : null);
        doc.setPropertyVideoUrl(r.get("Property_Video_URL") != null ? r.get("Property_Video_URL").toString() : null);

        Object uploadObj = r.get("Document_Upload");
        if (uploadObj instanceof List) {
            List<Map<String, Object>> uploads = (List<Map<String, Object>>) uploadObj;
            if (!uploads.isEmpty()) {
                Map<String, Object> first = uploads.get(0);
                doc.setFileName(first.get("file_Name") != null ? first.get("file_Name").toString() : null);
                doc.setFileExtension(first.get("extn") != null ? first.get("extn").toString() : null);
                doc.setFileSizeBytes(first.get("original_Size_Byte") != null ? first.get("original_Size_Byte").toString() : null);
                Object entityIdObj = first.get("entity_Id");
                Object attachmentIdObj = first.get("attachment_Id");
                if (entityIdObj != null && attachmentIdObj != null) {
                    doc.setCrmDownloadUrl(baseUrl + "/Property_Documents/" + entityIdObj + "/attachments/" + attachmentIdObj);
                }
            }
        }

        if (!skipR2) {
            String propId = doc.getZohoPropertyId();
            if (!isVideoDoc(doc) && allowedPropertyIds.contains(propId)) {
                String fileKey = r2StorageService.generateFileKey(zohoDocId, doc.getFileName());
                String contentType = r2StorageService.getContentType(doc.getFileExtension());
                if (r2StorageService.fileExists(fileKey)) {
                    doc.setR2Url(r2StorageService.getPublicUrl(fileKey));
                } else {
                    doc.setR2Url(tryUploadWithFallback(doc, fileKey, contentType));
                }
            }
        }

        propertyDocumentRepository.save(doc);
    }

    // -------------------------------------------------------------------------
    // R2 ELIGIBILITY CHECK
    // -------------------------------------------------------------------------

    private static final Set<String> VIDEO_EXTENSIONS = Set.of("mp4", "mov", "movie", "webm", "avi", "mkv");

    /** Videos are served via external URLs (YouTube/WorkDrive), never uploaded to R2. */
    private boolean isVideoDoc(PropertyDocument doc) {
        String type = doc.getDocumentType();
        if ("Property Video".equals(type) || "Property Video Link".equals(type) || "VIDEO".equals(type)) return true;
        String ext = doc.getFileExtension();
        return ext != null && VIDEO_EXTENSIONS.contains(ext.toLowerCase());
    }

    // -------------------------------------------------------------------------
    // R2 UPLOAD HELPER — CRM URL first, WorkDrive public link as fallback
    // -------------------------------------------------------------------------

    /**
     * Tries to upload a document to R2.
     * 1. Uses crmDownloadUrl with Zoho auth headers.
     * 2. If that returns null (HTML response / download failure), retries with
     *    the WorkDrive public downloadLink (no auth headers needed).
     */
    private String tryUploadWithFallback(PropertyDocument doc, String fileKey, String contentType) {
        // Attempt 1: CRM attachment URL (requires OAuth token)
        if (doc.getCrmDownloadUrl() != null) {
            String r2Url = r2StorageService.uploadFromUrl(doc.getCrmDownloadUrl(), fileKey, contentType, getZohoHeaders());
            if (r2Url != null) return r2Url;
            log.info("CRM download failed for {}, retrying with WorkDrive link", fileKey);
        }

        // Attempt 2: WorkDrive public share link (no auth)
        if (doc.getDownloadLink() != null) {
            String r2Url = r2StorageService.uploadFromUrl(doc.getDownloadLink(), fileKey, contentType, null);
            if (r2Url != null) return r2Url;
            log.warn("WorkDrive download also failed for {}", fileKey);
        }

        return null;
    }

    // -------------------------------------------------------------------------
    // METHOD 7: Upload Missing R2 Documents
    // -------------------------------------------------------------------------

    public int uploadMissingR2Documents() {
        SyncLog syncLog = startLog("Media", "MANUAL");
        // Docs missing R2 that have a CRM attachment URL
        List<PropertyDocument> missingCrm = propertyDocumentRepository
                .findAllByR2UrlIsNullAndCrmDownloadUrlIsNotNull();
        // Docs missing R2 that only have a WorkDrive public link
        List<PropertyDocument> missingWorkDrive = propertyDocumentRepository
                .findAllByR2UrlIsNullAndCrmDownloadUrlIsNullAndDownloadLinkIsNotNull();

        List<PropertyDocument> missing = new ArrayList<>();
        missing.addAll(missingCrm);
        missing.addAll(missingWorkDrive);

        log.info("uploadMissingR2Documents: {} docs without r2Url ({} CRM, {} WorkDrive-only)",
                missing.size(), missingCrm.size(), missingWorkDrive.size());

        Set<String> allowedPropertyIds = getAllValidPropertyIds();

        int uploaded = 0;
        for (PropertyDocument doc : missing) {
            try {
                if (isVideoDoc(doc)) {
                    log.debug("Skipping R2 upload for video doc {}", doc.getZohoDocId());
                    continue;
                }
                if (!allowedPropertyIds.contains(doc.getZohoPropertyId())) {
                    log.info("Skipping R2 upload for doc {} — property not in DB", doc.getZohoDocId());
                    continue;
                }

                String fileKey = r2StorageService.generateFileKey(doc.getZohoDocId(), doc.getFileName());
                String contentType = r2StorageService.getContentType(doc.getFileExtension());

                if (r2StorageService.fileExists(fileKey)) {
                    doc.setR2Url(r2StorageService.getPublicUrl(fileKey));
                    log.info("Already in R2, skipping: {}", fileKey);
                } else {
                    String r2Url = tryUploadWithFallback(doc, fileKey, contentType);
                    if (r2Url != null) {
                        doc.setR2Url(r2Url);
                        log.info("Uploaded to R2: {}", fileKey);
                    } else {
                        log.warn("Failed to upload to R2: {}", fileKey);
                    }
                }

                propertyDocumentRepository.save(doc);
                uploaded++;
            } catch (Exception e) {
                log.error("Error uploading missing R2 doc {}: {}", doc.getZohoDocId(), e.getMessage());
            }
        }

        log.info("uploadMissingR2Documents completed: {}/{} uploaded", uploaded, missing.size());
        updateSyncState("Media", false);
        endLog(syncLog, uploaded, "SUCCESS");
        return uploaded;
    }

    // -------------------------------------------------------------------------
    // RECORD SAVE HELPERS — shared by scheduler and webhook handlers
    // -------------------------------------------------------------------------

    private void saveBuyerBriefRecord(Map<String, Object> r, String zohoBriefId) {
        BuyerBrief brief = buyerBriefRepository.findByZohoBriefId(zohoBriefId)
                .orElse(BuyerBrief.builder().build());

        brief.setZohoBriefId(zohoBriefId);
        brief.setZohoContactId(getNestedId(r, "Buyer_Name"));
        brief.setZohoName(getNestedName(r, "Buyer_Name"));
        brief.setFullName(getNestedName(r, "Buyer_Name"));
        brief.setEmail(r.get("Buyer_Email") != null ? r.get("Buyer_Email").toString() : null);
        brief.setSecondaryEmail(r.get("Secondary_Client_Email") != null ? r.get("Secondary_Client_Email").toString() : null);
        brief.setGreetingName(r.get("Contact_Greeting_Name_1") != null ? r.get("Contact_Greeting_Name_1").toString() : null);
        brief.setMinBudget(toBigDecimal(r.get("Minimum_Budget")));
        brief.setMaxBudget(toBigDecimal(r.get("Maximum_Budget")));
        brief.setAvailableDeposit(toBigDecimal(r.get("Available_Deposit")));
        brief.setDepositEquityPercent(toBigDecimal(r.get("Deposit_Equity_Percent")));
        brief.setPropertyTypes(getStringArray(r, "Property_Type"));
        brief.setPreferredStates(getStringArray(r, "Preffered_State"));
        brief.setPreferredSuburbs(r.get("Preferred_Suburbs_List") != null ? r.get("Preferred_Suburbs_List").toString() : null);
        brief.setBedBathGarage(r.get("Bed_Bath_Garage") != null ? r.get("Bed_Bath_Garage").toString() : null);
        brief.setLandSizeSqm(r.get("Land_Size_sqm") != null ? r.get("Land_Size_sqm").toString() : null);
        brief.setTimelineToBuy(r.get("Timeline_to_Buy") != null ? r.get("Timeline_to_Buy").toString() : null);
        brief.setPreApproved("Yes".equals(r.get("Pre_Approved")));
        brief.setInterestRate(toBigDecimal(r.get("Interest_Rate_Percent")));
        brief.setWeeklyRent(toBigDecimal(r.get("Weekly_Rent")));
        brief.setMonthlyHoldingCost(toBigDecimal(r.get("Monthly_Holding_Cost")));
        brief.setYieldPercent(toBigDecimal(r.get("Yield_Percent2")));
        brief.setTaxRate(toBigDecimal(r.get("Tax_Rate")));
        brief.setStatus(r.get("Status") != null ? r.get("Status").toString() : null);
        brief.setPriority(r.get("Priority") != null ? r.get("Priority").toString() : null);
        brief.setAssignedAgents(getStringArray(r, "Buyers_Brief_Owner_1"));
        brief.setTags(getTagNames(r));

        Object financerObj = r.get("Financer");
        if (financerObj instanceof Map) {
            @SuppressWarnings("unchecked")
            Map<String, Object> financer = (Map<String, Object>) financerObj;
            Object name = financer.get("name");
            brief.setFinancerName(name != null ? name.toString() : null);
        } else {
            brief.setFinancerName(null);
        }

        brief.setPropertyAssigned(r.get("Property_Assigned") instanceof Boolean ? (Boolean) r.get("Property_Assigned") : null);
        brief.setZohoCreatedAt(r.get("Created_Time") != null ? r.get("Created_Time").toString() : null);
        brief.setZohoModifiedAt(r.get("Modified_Time") != null ? r.get("Modified_Time").toString() : null);
        brief.setSyncedAt(LocalDateTime.now());

        buyerBriefRepository.save(brief);
    }

    // Returns true if saved, false if rejected/skipped
    private boolean savePropertyRecord(Map<String, Object> r, String zohoPropertyId, boolean syncDocsAndAssignments) {
        String newStatus = r.get("Status") != null ? r.get("Status").toString() : null;
        Property existing = propertyRepository.findByZohoPropertyId(zohoPropertyId).orElse(null);

        if ("Rejected".equalsIgnoreCase(newStatus)) {
            if (existing != null) {
                log.info("Property {} is Rejected — cascade deleting from DB and R2", zohoPropertyId);
                deletePropertyWithCascade(zohoPropertyId);
            }
            return false;
        }

        boolean isNew = (existing == null);
        Property property = existing != null ? existing : Property.builder().build();

        property.setZohoPropertyId(zohoPropertyId);
        property.setAddress(r.get("Name") != null ? r.get("Name").toString() : null);
        property.setAddressLine1(r.get("Address_Line_1") != null ? r.get("Address_Line_1").toString() : null);
        property.setSuburb(r.get("Suburb") != null ? r.get("Suburb").toString() : null);
        property.setState(r.get("State") != null ? r.get("State").toString() : null);
        property.setPostCode(r.get("Post_Code") != null ? r.get("Post_Code").toString() : null);
        property.setPropertyType(r.get("Property_Type") != null ? r.get("Property_Type").toString() : null);
        property.setBedrooms(toInteger(r.get("Bedrooms")));
        property.setBathrooms(toInteger(r.get("Bathrooms")));
        property.setCarParking(toInteger(r.get("Car_Parking")));
        property.setAreaSqm(toDouble(r.get("Area_Sq_m")));
        property.setYearBuilt(toInteger(r.get("Year_Built")));
        property.setPool(r.get("Pool") instanceof Boolean ? (Boolean) r.get("Pool") : null);
        property.setAskingPriceMin(toBigDecimal(r.get("Asking_Price_Min")));
        property.setAskingPriceMax(toBigDecimal(r.get("Asking_Price_Max")));
        property.setMinRentPerMonth(toBigDecimal(r.get("Minimum_Rent_Per_Month")));
        property.setYieldPercent(toDouble(r.get("Yield_Percent")));
        property.setStatus(newStatus);
        property.setSaleType(r.get("Sale_Type") != null ? r.get("Sale_Type").toString() : null);
        property.setRentalSituation(r.get("Rental_Situation") != null ? r.get("Rental_Situation").toString() : null);
        property.setLgaRegion(r.get("LGA_Region") != null ? r.get("LGA_Region").toString() : null);
        property.setRentalAppraisal(r.get("Rental_Appraisal") != null ? r.get("Rental_Appraisal").toString() : null);
        property.setDateOfListing(r.get("Date_Of_Listing") != null ? r.get("Date_Of_Listing").toString() : null);
        property.setLinkToListing(r.get("Link_To_Listing") != null ? r.get("Link_To_Listing").toString() : null);
        property.setStashLink(r.get("Stash_Link") != null ? r.get("Stash_Link").toString() : null);
        property.setCmaLink(r.get("CMA_Link1") != null ? r.get("CMA_Link1").toString() : null);
        property.setCoreLogicLink(r.get("Core_Logic_Link") != null ? r.get("Core_Logic_Link").toString() : null);
        property.setPropertyVideoUrl(r.get("Youtube_Video_URL") != null ? r.get("Youtube_Video_URL").toString() : null);
        property.setAgentName(getNestedName(r, "Agent_Name"));
        property.setZohoCreatedAt(r.get("Created_Time") != null ? r.get("Created_Time").toString() : null);
        property.setZohoModifiedAt(r.get("Modified_Time") != null ? r.get("Modified_Time").toString() : null);
        property.setSyncedAt(LocalDateTime.now());

        propertyRepository.save(property);

        if (isNew && syncDocsAndAssignments) {
            log.info("New property {} — syncing its docs and assignments", zohoPropertyId);
            syncDocumentsForSingleProperty(zohoPropertyId);
            syncAssignmentsForSingleProperty(zohoPropertyId);
        }
        return true;
    }

    // -------------------------------------------------------------------------
    // WEBHOOK HANDLERS — called by ZohoWebhookController for real-time events
    // -------------------------------------------------------------------------

    @SuppressWarnings("unchecked")
    public void handleDocumentWebhook(String zohoId, String operation) {
        try {
            if ("delete".equalsIgnoreCase(operation)) {
                propertyDocumentRepository.findByZohoDocId(zohoId).ifPresent(doc -> {
                    if (doc.getFileName() != null) {
                        r2StorageService.deleteObject(r2StorageService.generateFileKey(doc.getZohoDocId(), doc.getFileName()));
                    }
                    propertyDocumentRepository.delete(doc);
                    log.info("Webhook: deleted PropertyDocument {} from DB and R2", zohoId);
                });
                return;
            }

            Map<String, Object> record = fetchRecordById("Property_Documents", zohoId);
            if (record == null) {
                log.warn("Webhook: PropertyDocument {} not found in Zoho", zohoId);
                return;
            }

            String docPropertyId = getNestedId(record, "Property");
            if (docPropertyId != null && propertyRepository.findByZohoPropertyId(docPropertyId).isEmpty()) {
                log.info("Webhook: PropertyDocument {} belongs to unknown property {} — skipping", zohoId, docPropertyId);
                return;
            }

            Set<String> allowedPropertyIds = getAllValidPropertyIds();
            savePropertyDocumentRecord(record, zohoId, allowedPropertyIds, false);
            log.info("Webhook: processed PropertyDocument {} ({})", zohoId, operation);
        } catch (Exception e) {
            log.error("Webhook: failed to handle PropertyDocument {} ({}): {}", zohoId, operation, e.getMessage());
        }
    }

    public void handleAssignmentWebhook(String zohoId, String operation) {
        try {
            if ("delete".equalsIgnoreCase(operation)) {
                assignmentRepository.findByZohoAssignmentId(zohoId).ifPresent(assignment -> {
                    assignmentRepository.delete(assignment);
                    log.info("Webhook: deleted Assignment {} from DB", zohoId);
                });
                return;
            }

            Map<String, Object> record = fetchRecordById("Client_Management", zohoId);
            if (record == null) {
                log.warn("Webhook: Assignment {} not found in Zoho", zohoId);
                return;
            }

            saveAssignmentRecord(record, zohoId, new HashMap<>());
            log.info("Webhook: processed Assignment {} ({})", zohoId, operation);
        } catch (Exception e) {
            log.error("Webhook: failed to handle Assignment {} ({}): {}", zohoId, operation, e.getMessage());
        }
    }

    public void handlePropertyWebhook(String zohoId, String operation) {
        try {
            if ("delete".equalsIgnoreCase(operation)) {
                deletePropertyWithCascade(zohoId);
                log.info("Webhook: cascade deleted Property {}", zohoId);
                return;
            }

            Map<String, Object> record = fetchRecordById("Properties", zohoId);
            if (record == null) {
                log.warn("Webhook: Property {} not found in Zoho", zohoId);
                return;
            }

            savePropertyRecord(record, zohoId, true);
            log.info("Webhook: processed Property {} ({})", zohoId, operation);
        } catch (Exception e) {
            log.error("Webhook: failed to handle Property {} ({}): {}", zohoId, operation, e.getMessage());
        }
    }

    public void handleBuyerBriefWebhook(String zohoId, String operation) {
        try {
            if ("delete".equalsIgnoreCase(operation)) {
                buyerBriefRepository.findByZohoBriefId(zohoId).ifPresent(brief -> {
                    buyerBriefRepository.delete(brief);
                    log.info("Webhook: deleted BuyerBrief {} from DB", zohoId);
                });
                return;
            }

            Map<String, Object> record = fetchRecordById("Buyer_Briefs", zohoId);
            if (record == null) {
                log.warn("Webhook: BuyerBrief {} not found in Zoho", zohoId);
                return;
            }

            saveBuyerBriefRecord(record, zohoId);
            log.info("Webhook: processed BuyerBrief {} ({})", zohoId, operation);
        } catch (Exception e) {
            log.error("Webhook: failed to handle BuyerBrief {} ({}): {}", zohoId, operation, e.getMessage());
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> fetchRecordById(String module, String id) {
        try {
            String url = baseUrl + "/" + module + "/" + id;
            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.GET, new HttpEntity<>(getZohoHeaders()), Map.class);
            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                List<Map<String, Object>> data = (List<Map<String, Object>>) response.getBody().get("data");
                return (data != null && !data.isEmpty()) ? data.get(0) : null;
            }
        } catch (Exception e) {
            log.error("Failed to fetch {} record {}: {}", module, id, e.getMessage());
        }
        return null;
    }

    // -------------------------------------------------------------------------
    // SCHEDULER — runs every 5 minutes
    // -------------------------------------------------------------------------

    @Scheduled(fixedDelay = 300000)
    public void scheduledDataSync() {
        log.info("Scheduled data sync started");
        runDataSync();
    }

    // -------------------------------------------------------------------------
    // SCHEDULER — media sync every 10 minutes (safety net for missed uploads)
    // -------------------------------------------------------------------------

    @Scheduled(fixedDelay = 600000)
    public void scheduledMediaSync() {
        log.info("Scheduled media sync started");
        runMediaSync();
    }

    // -------------------------------------------------------------------------
    // SCHEDULER — runs daily at 9 AM Sydney time
    // -------------------------------------------------------------------------

    @Scheduled(cron = "0 0 9 * * *", zone = "Australia/Sydney")
    public void checkRevaluations() {
        log.info("Checking revaluation notifications");
        try {
            notificationService.createRevaluationNotifications();
        } catch (Exception e) {
            log.error("Revaluation check failed: {}", e.getMessage());
        }
    }
}
