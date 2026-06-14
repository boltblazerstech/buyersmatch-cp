package com.buyersmatch.services;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@Service
@Slf4j
public class ZohoAuthService {

    @Value("${zoho.client.id}")
    private String clientId;

    @Value("${zoho.client.secret}")
    private String clientSecret;

    @Value("${zoho.refresh.token}")
    private String refreshToken;

    @Value("${zoho.auth.url}")
    private String authUrl;

    private String cachedAccessToken;
    private long tokenExpiryTime;

    private final RestTemplate restTemplate = new RestTemplate();

    public String getAccessToken() {
        if (cachedAccessToken != null && System.currentTimeMillis() < tokenExpiryTime) {
            log.debug("Using cached Zoho access token");
            return cachedAccessToken;
        }

        log.info("Fetching new Zoho access token");

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("refresh_token", refreshToken);
        body.add("client_id", clientId);
        body.add("client_secret", clientSecret);
        body.add("grant_type", "refresh_token");

        HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(body, headers);

        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(authUrl, request, Map.class);

            if (response.getStatusCode() != HttpStatus.OK || response.getBody() == null) {
                throw new RuntimeException("Zoho token request failed with status: " + response.getStatusCode());
            }

            String accessToken = (String) response.getBody().get("access_token");
            if (accessToken == null) {
                throw new RuntimeException("Zoho token response did not contain access_token: " + response.getBody());
            }

            cachedAccessToken = accessToken;
            tokenExpiryTime = System.currentTimeMillis() + (3600 * 1000) - 60000;

            log.info("Zoho access token refreshed successfully");
            return cachedAccessToken;

        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("Failed to fetch Zoho access token: " + e.getMessage(), e);
        }
    }
}
