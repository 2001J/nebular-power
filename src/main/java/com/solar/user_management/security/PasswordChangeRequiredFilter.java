package com.solar.user_management.security;

import com.solar.user_management.service.UserService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class PasswordChangeRequiredFilter extends OncePerRequestFilter {

    private final UserService userService;

    public PasswordChangeRequiredFilter(UserService userService) {
        this.userService = userService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String requestPath = request.getRequestURI();

        // Skip for public endpoints and the password change endpoint itself
        if (requestPath.startsWith("/api/auth/") ||
                requestPath.startsWith("/api/public/") ||
                requestPath.contains("/swagger-ui") ||
                requestPath.contains("/v3/api-docs") ||
                requestPath.contains("/h2-console")) {
            filterChain.doFilter(request, response);
            return;
        }

        // Get the current user
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.isAuthenticated() &&
                !(authentication instanceof AnonymousAuthenticationToken)) {

            String email = authentication.getName();
            if (userService.isPasswordChangeRequired(email)) {
                response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                response.setContentType("application/json");
                response.getWriter().write("{\"message\":\"Password change required\",\"passwordChangeRequired\":true}");
                return;
            }
        }

        filterChain.doFilter(request, response);
    }
} 