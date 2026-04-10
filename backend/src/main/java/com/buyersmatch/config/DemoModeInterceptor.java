package com.buyersmatch.config;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
public class DemoModeInterceptor implements HandlerInterceptor {

    @Override
    public boolean preHandle(
            HttpServletRequest request,
            HttpServletResponse response,
            Object handler) throws Exception {

        String demoHeader = request.getHeader("X-Demo-Mode");

        boolean isDemo = "true".equals(demoHeader);
        String method = request.getMethod();

        boolean isWriteMethod =
                method.equals("POST") ||
                method.equals("PUT") ||
                method.equals("PATCH") ||
                method.equals("DELETE");

        // Allow these even in demo mode:
        String path = request.getRequestURI();
        boolean isAllowed =
                path.contains("/api/auth/login") ||
                path.contains("/api/webhooks/");

        if (isDemo && isWriteMethod && !isAllowed) {
            response.setStatus(403);
            response.setContentType("application/json");
            response.getWriter().write(
                "{\"success\":false," +
                "\"error\":\"Write operations are disabled in demo mode.\"}");
            return false;
        }
        return true;
    }
}
