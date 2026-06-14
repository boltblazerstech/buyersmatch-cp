package com.buyersmatch.services;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.*;

import java.net.URI;

@Service
@Slf4j
public class R2StorageService {

    @Value("${r2.account.id}")
    private String accountId;

    @Value("${r2.access.key}")
    private String accessKey;

    @Value("${r2.secret.key}")
    private String secretKey;

    @Value("${r2.bucket.name}")
    private String bucketName;

    @Value("${r2.public.url}")
    private String publicUrl;

    private S3Client s3;

    private final RestTemplate restTemplate;

    public R2StorageService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    @PostConstruct
    public void init() {
        URI endpoint = URI.create("https://" + accountId + ".r2.cloudflarestorage.com");
        AwsBasicCredentials credentials = AwsBasicCredentials.create(accessKey, secretKey);
        s3 = S3Client.builder()
                .endpointOverride(endpoint)
                .credentialsProvider(StaticCredentialsProvider.create(credentials))
                .region(Region.of("auto"))
                .build();
    }

    // -------------------------------------------------------------------------
    // MAIN UPLOAD METHOD
    // -------------------------------------------------------------------------

    /**
     * Downloads file from sourceUrl (handling Zoho 302 redirects to CDN),
     * validates it's a real binary file, then uploads to Cloudflare R2.
     */
    public String uploadFromUrl(String sourceUrl, String fileKey, String contentType, HttpHeaders zohoHeaders) {
        if (sourceUrl == null || sourceUrl.isBlank()) {
            return null;
        }
        try {
            // Step 1: Download with redirect handling
            byte[] bytes = downloadWithRedirectSupport(sourceUrl, zohoHeaders);
            if (bytes == null || bytes.length == 0) {
                log.error("Download returned empty/null bytes for key {}", fileKey);
                return null;
            }

            // Step 2: Validate it's actual binary content (not HTML/JSON error pages)
            if (!isValidBinary(bytes, fileKey)) {
                log.error("Aborting upload for {} — content is NOT valid binary. Hex: [{}] Text: [{}]",
                        fileKey, toHexPreview(bytes, 8), toTextPreview(bytes, 64));
                return null;
            }

            // Step 3: Diagnostic log — confirms what we're uploading
            log.info("Uploading to R2: key={}, size={} bytes, contentType={}, magic=[{}]",
                    fileKey, bytes.length, contentType, toHexPreview(bytes, 4));

            // Step 4: Upload to R2
            PutObjectRequest request = PutObjectRequest.builder()
                    .bucket(bucketName)
                    .key(fileKey)
                    .contentType(contentType)
                    .build();
            s3.putObject(request, RequestBody.fromBytes(bytes));
            return publicUrl + "/" + fileKey;

        } catch (Exception e) {
            log.error("Failed to upload file from URL {} to R2 key {}: {}", sourceUrl, fileKey, e.getMessage());
            return null;
        }
    }

    // -------------------------------------------------------------------------
    // REDIRECT-AWARE DOWNLOAD
    // -------------------------------------------------------------------------

    /**
     * Downloads bytes from a Zoho URL using a 3-step fallback strategy.
     *
     * Step 1: Request with Accept: application/octet-stream to force binary download.
     * Step 2: If still HTML, try appending ?isdownload=true to the URL.
     * Step 3: If still HTML, parse the page to find the embedded direct download URL.
     * Also handles HTTP 302 redirects to CDN (strips Zoho auth header for CDN requests).
     */
    private byte[] downloadWithRedirectSupport(String url, HttpHeaders zohoHeaders) {
        try {
            // ---- STEP 1: Force binary with Accept header ----
            HttpHeaders binaryHeaders = new HttpHeaders();
            if (zohoHeaders != null) binaryHeaders.addAll(zohoHeaders);
            binaryHeaders.set(HttpHeaders.ACCEPT, "application/octet-stream, image/*, */*");

            byte[] attempt1 = tryDownload(url, binaryHeaders);
            if (attempt1 != null && !isHtmlContent(attempt1)) {
                log.debug("Step 1 download OK ({} bytes) for {}", attempt1.length, url);
                return attempt1;
            }
            log.info("Step 1 returned HTML for {}. Trying step 2...", url);

            // ---- STEP 2: Append ?isdownload=true ----
            String url2 = url.contains("?") ? url + "&isdownload=true" : url + "?isdownload=true";
            byte[] attempt2 = tryDownload(url2, binaryHeaders);
            if (attempt2 != null && !isHtmlContent(attempt2)) {
                log.debug("Step 2 download OK ({} bytes) for {}", attempt2.length, url2);
                return attempt2;
            }
            log.info("Step 2 still returned HTML for {}. Trying step 3 (HTML parse)...", url);

            // ---- STEP 3: Parse HTML to find embedded direct download URL ----
            byte[] htmlBytes = (attempt1 != null) ? attempt1 : attempt2;
            if (htmlBytes != null) {
                String directUrl = extractDirectUrlFromHtml(new String(htmlBytes, java.nio.charset.StandardCharsets.UTF_8));
                if (directUrl != null) {
                    log.info("Step 3: extracted direct URL from HTML: {}", directUrl);
                    byte[] attempt3 = tryDownload(directUrl, null); // CDN URLs — no auth needed
                    if (attempt3 != null && !isHtmlContent(attempt3)) {
                        log.info("Step 3 download OK ({} bytes)", attempt3.length);
                        return attempt3;
                    }
                }
            }

            log.error("All 3 download steps failed for URL: {}", url);
            return null;

        } catch (Exception e) {
            log.error("Network error downloading from {}: {}", url, e.getMessage());
            return null;
        }
    }

    /**
     * Single download attempt. Follows HTTP 302 redirects by stripping auth headers (CDN-safe).
     */
    private byte[] tryDownload(String url, HttpHeaders headers) {
        try {
            HttpEntity<Void> entity = headers != null ? new HttpEntity<>(headers) : new HttpEntity<>(new HttpHeaders());
            ResponseEntity<byte[]> response = restTemplate.exchange(url, HttpMethod.GET, entity, byte[].class);

            if (response.getStatusCode().is3xxRedirection()) {
                String location = response.getHeaders().getFirst(HttpHeaders.LOCATION);
                if (location != null) {
                    log.info("Following redirect to: {}", location);
                    return tryDownload(location, null); // Strip auth for CDN redirects
                }
                return null;
            }

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                return response.getBody();
            }

            log.warn("Download attempt failed: HTTP {} for {}", response.getStatusCode(), url);
            return null;
        } catch (Exception e) {
            log.warn("Download attempt error for {}: {}", url, e.getMessage());
            return null;
        }
    }

    /**
     * Returns true if the byte array looks like an HTML page.
     */
    private boolean isHtmlContent(byte[] bytes) {
        if (bytes == null || bytes.length < 16) return false;
        String start = new String(bytes, 0, Math.min(512, bytes.length), java.nio.charset.StandardCharsets.UTF_8).trim().toLowerCase();
        return start.startsWith("<") || start.startsWith("<!doctype") || start.contains("<html");
    }

    /**
     * Parses an HTML WorkDrive page to find a direct binary download URL.
     * Looks for common Zoho WorkDrive JS patterns like:
     * - downloadUrl: "..."
     * - "direct_url":"..."
     * - window.location = "...download..."
     */
    private String extractDirectUrlFromHtml(String html) {
        // Try common Zoho WorkDrive JavaScript variable patterns
        String[] patterns = {
                "\"downloadUrl\"\\s*:\\s*\"([^\"]+)\"",
                "'downloadUrl'\\s*:\\s*'([^']+)'",
                "\"direct_url\"\\s*:\\s*\"([^\"]+)\"",
                "\"download_url\"\\s*:\\s*\"([^\"]+)\"",
                "downloadLink\\s*=\\s*[\"']([^\"']+)[\"']",
                "href=[\"'](https://[^\"']*workdrive[^\"']*download[^\"']*)[\"']",
                "href=[\"'](https://download[^\"']+)[\"']"
        };

        for (String pattern : patterns) {
            java.util.regex.Matcher m = java.util.regex.Pattern.compile(pattern).matcher(html);
            if (m.find()) {
                String found = m.group(1).replace("\\u002F", "/").replace("\\/", "/");
                log.info("Found direct URL via pattern '{}': {}", pattern, found);
                return found;
            }
        }

        log.warn("Could not find direct download URL in WorkDrive HTML page.");
        return null;
    }

    // -------------------------------------------------------------------------
    // MAGIC BYTE VALIDATION
    // -------------------------------------------------------------------------

    /**
     * Validates that bytes are a real binary by checking magic bytes (file signature).
     * Rejects HTML, JSON, XML — common error page formats.
     */
    private boolean isValidBinary(byte[] bytes, String fileKey) {
        if (bytes == null || bytes.length < 4) return false;

        byte first = bytes[0];

        // Text content detection (error pages / API JSON)
        if (first == '<') {
            log.warn("Content for {} starts with '<' — likely HTML/XML error page", fileKey);
            return false;
        }
        if (first == '{' || first == '[') {
            log.warn("Content for {} starts with '{}' — likely JSON response", fileKey, (char) first);
            return false;
        }

        String lowerKey = fileKey.toLowerCase();

        if (lowerKey.endsWith(".png")) {
            boolean valid = bytes.length >= 4
                    && (bytes[0] & 0xFF) == 0x89
                    && bytes[1] == 0x50
                    && bytes[2] == 0x4E
                    && bytes[3] == 0x47;
            if (!valid) log.warn("PNG magic bytes missing for {}", fileKey);
            return valid;
        }

        if (lowerKey.endsWith(".jpg") || lowerKey.endsWith(".jpeg")) {
            boolean valid = bytes.length >= 3
                    && (bytes[0] & 0xFF) == 0xFF
                    && (bytes[1] & 0xFF) == 0xD8
                    && (bytes[2] & 0xFF) == 0xFF;
            if (!valid) log.warn("JPEG magic bytes missing for {}", fileKey);
            return valid;
        }

        if (lowerKey.endsWith(".pdf")) {
            boolean valid = bytes.length >= 4
                    && bytes[0] == 0x25  // %
                    && bytes[1] == 0x50  // P
                    && bytes[2] == 0x44  // D
                    && bytes[3] == 0x46; // F
            if (!valid) log.warn("PDF magic bytes missing for {}", fileKey);
            return valid;
        }

        if (lowerKey.endsWith(".mp4") || lowerKey.endsWith(".mov")
                || lowerKey.endsWith(".movie") || lowerKey.endsWith(".webm")) {
            // MP4/MOV: "ftyp" box can appear at offset 4 OR further in (after a wide-box header).
            // Scan the first 32 bytes for the "ftyp" signature rather than checking a fixed offset.
            String header = new String(bytes, 0, Math.min(32, bytes.length), java.nio.charset.StandardCharsets.ISO_8859_1);
            boolean valid = header.contains("ftyp") || header.contains("moov") || header.contains("mdat");
            if (!valid) log.warn("No MP4/MOV container signature found for {} — uploading anyway", fileKey);
            return true; // never block videos; the HTML/JSON guard above already catches bad downloads
        }

        if (lowerKey.endsWith(".gif")) {
            boolean valid = bytes.length >= 4
                    && bytes[0] == 0x47 // G
                    && bytes[1] == 0x49 // I
                    && bytes[2] == 0x46 // F
                    && bytes[3] == 0x38; // 8
            if (!valid) log.warn("GIF magic bytes missing for {}", fileKey);
            return valid;
        }

        // Unknown extension — allow but warn
        log.warn("No magic byte rule for file key: {} — uploading anyway", fileKey);
        return true;
    }

    // -------------------------------------------------------------------------
    // DIAGNOSTIC HELPERS
    // -------------------------------------------------------------------------

    private String toHexPreview(byte[] bytes, int count) {
        if (bytes == null || bytes.length == 0) return "EMPTY";
        StringBuilder sb = new StringBuilder();
        int n = Math.min(count, bytes.length);
        for (int i = 0; i < n; i++) {
            sb.append(String.format("%02X", bytes[i] & 0xFF));
            if (i < n - 1) sb.append(" ");
        }
        return sb.toString();
    }

    private String toTextPreview(byte[] bytes, int count) {
        if (bytes == null || bytes.length == 0) return "EMPTY";
        int n = Math.min(count, bytes.length);
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < n; i++) {
            char c = (char) (bytes[i] & 0xFF);
            sb.append(Character.isISOControl(c) ? '.' : c);
        }
        return sb.toString();
    }

    // -------------------------------------------------------------------------
    // R2 HELPERS
    // -------------------------------------------------------------------------

    public S3Client getS3Client() { return s3; }
    public String getBucketName() { return bucketName; }

    public boolean fileExists(String fileKey) {
        try {
            s3.headObject(HeadObjectRequest.builder()
                    .bucket(bucketName)
                    .key(fileKey)
                    .build());
            return true;
        } catch (NoSuchKeyException e) {
            return false;
        }
    }

    public String getContentType(String fileExtension) {
        if (fileExtension == null) return "application/octet-stream";
        return switch (fileExtension.toLowerCase()) {
            case "png"          -> "image/png";
            case "jpg", "jpeg"  -> "image/jpeg";
            case "gif"          -> "image/gif";
            case "webp"         -> "image/webp";
            case "pdf"          -> "application/pdf";
            case "mp4", "movie" -> "video/mp4";
            case "mov"          -> "video/quicktime";
            case "webm"         -> "video/webm";
            default             -> "application/octet-stream";
        };
    }

    public String generateFileKey(String zohoDocId, String fileName) {
        return zohoDocId + "/" + fileName;
    }

    public String getPublicUrl(String fileKey) {
        return publicUrl + "/" + fileKey;
    }

    public void deleteObject(String fileKey) {
        try {
            s3.deleteObject(DeleteObjectRequest.builder()
                    .bucket(bucketName)
                    .key(fileKey)
                    .build());
            log.info("Deleted from R2: {}", fileKey);
        } catch (Exception e) {
            log.error("Failed to delete {} from R2: {}", fileKey, e.getMessage());
        }
    }

    public void deleteAllObjects() {
        try {
            ListObjectsV2Request listReq = ListObjectsV2Request.builder()
                    .bucket(bucketName)
                    .build();
            ListObjectsV2Response listRes = s3.listObjectsV2(listReq);

            if (listRes.contents() != null) {
                for (S3Object obj : listRes.contents()) {
                    s3.deleteObject(DeleteObjectRequest.builder()
                            .bucket(bucketName)
                            .key(obj.key())
                            .build());
                    log.info("Deleted from R2: {}", obj.key());
                }
            }
        } catch (Exception e) {
            log.error("Failed to clear R2 bucket {}: {}", bucketName, e.getMessage());
        }
    }
}
