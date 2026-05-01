package com.buyersmatch.filters;

import com.buyersmatch.services.AdminAuthService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.util.Set;

@Component
@Order(1)
@RequiredArgsConstructor
public class AdminSessionFilter extends OncePerRequestFilter {

    private final AdminAuthService adminAuthService;

    private static final Set<String> PUBLIC_ADMIN_PATHS = Set.of(
            "/api/admin/auth/login",
            "/api/admin/sync/data",
            "/api/admin/sync/media",
            "/api/admin/sync/delta"
    );

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        if (!path.startsWith("/api/admin/")) {
            return true;
        }
        return PUBLIC_ADMIN_PATHS.contains(path);
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String token = request.getHeader("X-Admin-Token");
        try {
            adminAuthService.validateSession(token);
            filterChain.doFilter(request, response);
        } catch (ResponseStatusException ex) {
            response.setStatus(ex.getStatusCode().value());
            response.setContentType("application/json");
            response.getWriter().write("{\"success\":false,\"error\":\"" + ex.getReason() + "\"}");
        }
    }
}
