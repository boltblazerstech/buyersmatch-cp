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
    // DOCUMENT TYPE NORMALIZATION
    // -------------------------------------------------------------------------

    private String normalizeDocumentType(String raw) {
        if (raw == null) return "DOCUMENT";
        return switch (raw.trim()) {
            case "Property Image", "Property Images" -> "PROPERTY_IMAGE";
            case "Due Diligence Image"               -> "DUE_DILIGENCE_IMAGE";
            case "Property Video"                    -> "VIDEO";
            case "Suburb / Region Report"            -> "REGION_REPORT";
            case "Core Logic Document"               -> "CORE_LOGIC";
            case "CMA Document"                      -> "CMA";
            case "Cash Flow Calculator"              -> "CASHFLOW";
            case "Insurance Estimate"                -> "INSURANCE";
            case "Contract Document"                 -> "CONTRACT";
            case "Stash Document"                    -> "STASH";
            default                                  -> "DOCUMENT";
        };
    }

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

    /**
     * Fetches all records modified after `since` using Zoho's search API
     * with a Modified_Time:greater_than criteria filter.
     *
     * This is used instead of the If-Modified-Since HTTP header because Zoho CRM
     * custom modules (Buyer_Briefs, Properties, etc.) return 304 Not Modified
     * unreliably — new records are silently skipped when using the header approach.
     */
    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> fetchModifiedAfter(String moduleName, LocalDateTime since) {
        List<Map<String, Object>> allRecords = new ArrayList<>();
        int page = 1;
        boolean moreRecords = true;

        ZonedDateTime zdt = since.atZone(ZoneId.of("UTC"));
        String dateStr = ZOHO_DATE_FORMAT.format(zdt);
        String rawCriteria = "(Modified_Time:greater_than:" + dateStr + ")";
        String encodedCriteria;
        try {
            encodedCriteria = java.net.URLEncoder.encode(rawCriteria, java.nio.charset.StandardCharsets.UTF_8.toString());
        } catch (java.io.UnsupportedEncodingException e) {
            encodedCriteria = rawCriteria;
        }

        while (moreRecords) {
            String url = baseUrl + "/" + moduleName + "/search?criteria=" + encodedCriteria + "&per_page=200&page=" + page;
            HttpEntity<Void> entity = new HttpEntity<>(getZohoHeaders(null));
            try {
                ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.GET, entity, Map.class);

                if (response.getStatusCode().value() == 204) {
                    log.debug("fetchModifiedAfter({}): no records modified after {}", moduleName, dateStr);
                    break;
                }

                if (response.getStatusCode() != HttpStatus.OK || response.getBody() == null) {
                    log.warn("fetchModifiedAfter({}): unexpected status {} on page {}", moduleName, response.getStatusCode(), page);
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
                log.error("fetchModifiedAfter({}) page {} error: {}", moduleName, page, e.getMessage());
                break;
            }
        }

        log.info("fetchModifiedAfter({}): found {} records modified after {}", moduleName, allRecords.size(), dateStr);
        return allRecords;
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
                    : (since != null ? fetchModifiedAfter("Buyer_Briefs", since) : fetchAllPages("/Buyer_Briefs", null));

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

                    BuyerBrief brief = buyerBriefRepository.findByZohoBriefId(zohoBriefId)
                            .orElse(BuyerBrief.builder().build());

                    brief.setZohoBriefId(zohoBriefId);
                    brief.setZohoContactId(getNestedId(r, "Buyer_Name"));
                    brief.setZohoName(getNestedName(r, "Buyer_Name"));
                    brief.setFullName(getNestedName(r, "Buyer_Name")); // Map fullName from Buyer_Name nested name
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
                    : (since != null ? fetchModifiedAfter("Properties", since) : fetchAllPages("/Properties", null));

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

                    Property property = propertyRepository.findByZohoPropertyId(zohoPropertyId)
                            .orElse(Property.builder().build());

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
                    property.setStatus(r.get("Status") != null ? r.get("Status").toString() : null);
                    property.setSaleType(r.get("Sale_Type") != null ? r.get("Sale_Type").toString() : null);
                    property.setRentalSituation(r.get("Rental_Situation") != null ? r.get("Rental_Situation").toString() : null);
                    property.setLgaRegion(r.get("LGA_Region") != null ? r.get("LGA_Region").toString() : null);
                    property.setRentalAppraisal(r.get("Rental_Appraisal") != null ? r.get("Rental_Appraisal").toString() : null);
                    property.setDateOfListing(r.get("Date_Of_Listing") != null ? r.get("Date_Of_Listing").toString() : null);
                    property.setLinkToListing(r.get("Link_To_Listing") != null ? r.get("Link_To_Listing").toString() : null);
                    property.setStashLink(r.get("Stash_Link") != null ? r.get("Stash_Link").toString() : null);
                    property.setCmaLink(r.get("CMA_Link1") != null ? r.get("CMA_Link1").toString() : null);
                    property.setCoreLogicLink(r.get("Core_Logic_Link") != null ? r.get("Core_Logic_Link").toString() : null);
                    property.setAgentName(getNestedName(r, "Agent_Name"));
                    property.setZohoCreatedAt(r.get("Created_Time") != null ? r.get("Created_Time").toString() : null);
                    property.setZohoModifiedAt(r.get("Modified_Time") != null ? r.get("Modified_Time").toString() : null);
                    property.setSyncedAt(LocalDateTime.now());

                    propertyRepository.save(property);
                    count++;
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
        String syncType = fullSync ? (limit != null ? "FULL (LIMIT " + limit + ")" : "FULL") : "DELTA";
        SyncLog syncLog = startLog("PropertyDocuments", syncType);
        int count = 0;

        try {
            LocalDateTime since = fullSync ? null : getLastSyncedAt("PropertyDocuments");
            List<Map<String, Object>> records = (fullSync && limit != null)
                    ? fetchNewest("/Property_Documents", limit)
                    : (since != null ? fetchModifiedAfter("Property_Documents", since) : fetchAllPages("/Property_Documents", null));

            if (records.isEmpty()) {
                log.info("PropertyDocuments: no records returned");
                endLog(syncLog, 0, "SUCCESS");
                updateSyncState("PropertyDocuments", false);
                return;
            }

            Set<String> allowedPropertyIds = getPortalClientPropertyIds();

            for (Map<String, Object> r : records) {
                try {
                    String zohoDocId = r.get("id") != null ? r.get("id").toString() : null;
                    if (zohoDocId == null) continue;

                    PropertyDocument doc = propertyDocumentRepository.findByZohoDocId(zohoDocId)
                            .orElse(PropertyDocument.builder().build());

                    doc.setZohoDocId(zohoDocId);
                    doc.setZohoPropertyId(getNestedId(r, "Property"));
                    doc.setDocumentType(normalizeDocumentType(r.get("Document_Type") != null ? r.get("Document_Type").toString() : null));
                    doc.setCaption(r.get("Document_Caption") != null ? r.get("Document_Caption").toString() : null);
                    doc.setDownloadLink(r.get("Download_Link") != null ? r.get("Download_Link").toString() : null);
                    doc.setPropertyVideoUrl(r.get("Property_Video_URL") != null ? r.get("Property_Video_URL").toString() : null);

                    Object uploadObj = r.get("Document_Upload");
                    if (uploadObj instanceof List) {
                        @SuppressWarnings("unchecked")
                        List<Map<String, Object>> uploads = (List<Map<String, Object>>) uploadObj;
                        if (!uploads.isEmpty()) {
                            Map<String, Object> first = uploads.get(0);
                            doc.setFileName(first.get("file_Name") != null ? first.get("file_Name").toString() : null);
                            doc.setFileExtension(first.get("extn") != null ? first.get("extn").toString() : null);
                            doc.setFileSizeBytes(first.get("original_Size_Byte") != null ? first.get("original_Size_Byte").toString() : null);

                            // Build Zoho CRM REST API download URL — works with OAuth token
                            Object entityIdObj = first.get("entity_Id");
                            Object attachmentIdObj = first.get("attachment_Id");
                            if (entityIdObj != null && attachmentIdObj != null) {
                                String apiDownloadUrl = baseUrl + "/Property_Documents/"
                                        + entityIdObj.toString()
                                        + "/attachments/"
                                        + attachmentIdObj.toString();
                                doc.setCrmDownloadUrl(apiDownloadUrl);
                                log.debug("Constructed CRM download URL: {}", apiDownloadUrl);
                            } else {
                                log.warn("Missing entity_Id or attachment_Id for doc {}, cannot build CRM download URL", zohoDocId);
                            }
                        }
                    }

                    String zohoPropertyId = doc.getZohoPropertyId();
                    if (!allowedPropertyIds.contains(zohoPropertyId)) {
                        log.debug("Skipping R2 upload for property {} - not assigned to any portal client", zohoPropertyId);
                        // Save metadata only; preserve any existing r2Url
                        propertyDocumentRepository.save(doc);
                        count++;
                        continue;
                    }

                    String fileName = doc.getFileName();
                    String fileExtension = doc.getFileExtension();
                    String fileKey = r2StorageService.generateFileKey(zohoDocId, fileName);
                    String contentType = r2StorageService.getContentType(fileExtension);

                    if (r2StorageService.fileExists(fileKey)) {
                        doc.setR2Url(r2StorageService.getPublicUrl(fileKey));
                        log.info("Already in R2, skipping: {}", fileKey);
                    } else {
                        String r2Url = tryUploadWithFallback(doc, fileKey, contentType);
                        if (r2Url != null) {
                            doc.setR2Url(r2Url);
                            log.info("Uploaded to R2: {}", fileKey);
                        } else {
                            doc.setR2Url(null);
                            log.warn("Failed to upload to R2: {}", fileKey);
                        }
                    }

                    propertyDocumentRepository.save(doc);
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

        try {
            LocalDateTime since = fullSync ? null : getLastSyncedAt("ClientManagement");
            List<Map<String, Object>> records = (fullSync && limit != null)
                    ? fetchNewest("/Client_Management", limit)
                    : (since != null ? fetchModifiedAfter("Client_Management", since) : fetchAllPages("/Client_Management", null));

            if (records.isEmpty() && since != null) {
                log.info("ClientManagement: no changes since {}", since);
                endLog(syncLog, 0, "SUCCESS");
                updateSyncState("ClientManagement", false);
                return;
            }

            for (Map<String, Object> r : records) {
                try {
                    String zohoAssignmentId = r.get("id") != null ? r.get("id").toString() : null;
                    if (zohoAssignmentId == null) continue;

                    boolean isNew = assignmentRepository.findByZohoAssignmentId(zohoAssignmentId).isEmpty();
                    Assignment assignment = assignmentRepository.findByZohoAssignmentId(zohoAssignmentId)
                            .orElse(Assignment.builder().build());

                    assignment.setZohoAssignmentId(zohoAssignmentId);
                    assignment.setZohoContactId(getNestedId(r, "Buyer"));
                    assignment.setZohoPropertyId(getNestedId(r, "Property"));
                    assignment.setZohoBriefId(getNestedId(r, "Buyer_Brief"));

                    String zohoStatus = r.get("Status") != null ? r.get("Status").toString() : null;
                    assignment.setZohoStatus(zohoStatus);
                    // Only set portalStatus on first creation — never overwrite client portal choices
                    if (isNew) {
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
                    assignment.setZohoCreatedAt(r.get("Created_Time") != null ? r.get("Created_Time").toString() : null);
                    assignment.setZohoModifiedAt(r.get("Modified_Time") != null ? r.get("Modified_Time").toString() : null);
                    assignment.setSyncedAt(LocalDateTime.now());

                    assignmentRepository.save(assignment);
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
    // METHOD 6: Delta Sync
    // -------------------------------------------------------------------------

    public void runDeltaSync() {
        log.info("Starting delta sync");
        syncBuyerBriefs(false, null);
        syncProperties(false, null);
        syncPropertyDocuments(false, null);
        syncClientManagement(false, null);
        uploadMissingR2Documents();
        log.info("Delta sync completed");
    }

    // -------------------------------------------------------------------------
    // PORTAL CLIENT PROPERTY ID HELPER
    // -------------------------------------------------------------------------

    /**
     * Returns the set of zohoPropertyIds assigned to at least one client portal user.
     * Resolves contact IDs from both ClientPortalUser.zohoContactId and the
     * linked BuyerBrief.zohoContactId so no portal user is missed.
     */
    private Set<String> getPortalClientPropertyIds() {
        List<String> contactIds = clientPortalUserRepository.findAllResolvedZohoContactIds();
        log.info("getPortalClientPropertyIds: {} contact IDs resolved from portal users", contactIds.size());
        if (contactIds.isEmpty()) return Collections.emptySet();
        Set<String> propertyIds = assignmentRepository.findAllByZohoContactIdIn(contactIds)
                .stream()
                .map(Assignment::getZohoPropertyId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        log.info("getPortalClientPropertyIds: {} allowed property IDs", propertyIds.size());
        return propertyIds;
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

        Set<String> allowedPropertyIds = getPortalClientPropertyIds();

        int uploaded = 0;
        for (PropertyDocument doc : missing) {
            try {
                if (!allowedPropertyIds.contains(doc.getZohoPropertyId())) {
                    log.info("Skipping R2 upload for doc {} property {} - not assigned to any portal user", doc.getZohoDocId(), doc.getZohoPropertyId());
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
        return uploaded;
    }

    // -------------------------------------------------------------------------
    // SCHEDULER — runs every 5 minutes
    // -------------------------------------------------------------------------

    @Scheduled(fixedRate = 300000)
    public void scheduledDeltaSync() {
        log.info("Scheduled delta sync started");
        runDeltaSync(); // uploadMissingR2Documents is called at end of runDeltaSync
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
