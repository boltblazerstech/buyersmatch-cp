package com.buyersmatch.services;

import com.buyersmatch.dto.AuthLoginRequest;
import com.buyersmatch.dto.AuthLoginResponse;
import com.buyersmatch.entities.ClientPortalUser;
import com.buyersmatch.repositories.ClientPortalUserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;

@Service
@Slf4j
@RequiredArgsConstructor
public class AuthService {

    private final ClientPortalUserRepository clientPortalUserRepository;
    private final BCryptPasswordEncoder passwordEncoder;

    @Transactional(readOnly = true)
    public AuthLoginResponse login(AuthLoginRequest request) {
        String email = request.getEmail() != null ? request.getEmail().toLowerCase().trim() : "";

        // Strictly check client_portal_users. Do NOT fall back to admin_users here.
        Optional<ClientPortalUser> clientOpt = clientPortalUserRepository.findByLoginEmail(email);

        if (clientOpt.isPresent()) {
            ClientPortalUser user = clientOpt.get();

            if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
                log.warn("Failed client login attempt (wrong password): {}", email);
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
            }

            if ("deactivated".equals(user.getStatus())) {
                log.warn("Attempt to login deactivated account: {}", email);
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                        "Account is deactivated. Contact your agent.");
            }

            log.info("Client successfully logged in: {}", email);

            return AuthLoginResponse.builder()
                    .id(user.getId())
                    .email(user.getLoginEmail())
                    .fullName(
                            user.getBuyerBrief() != null
                                    ? (user.getBuyerBrief().getFullName() != null ? user.getBuyerBrief().getFullName()
                                            : user.getBuyerBrief().getZohoName())
                                    : null)
                    .greetingName(user.getBuyerBrief() != null ? user.getBuyerBrief().getGreetingName() : null)
                    .role("CLIENT")
                    .clientId(user.getBuyerBrief() != null ? user.getBuyerBrief().getId() : null)
                    .zohoContactId(user.getZohoContactId())
                    .build();
        }

        log.warn("Failed login attempt (email not found): {}", email);
        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
    }
}
