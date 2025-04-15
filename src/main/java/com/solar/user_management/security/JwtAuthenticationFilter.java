package com.solar.user_management.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.NonNull;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenProvider tokenProvider;
    private final UserDetailsService userDetailsService;

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain) throws ServletException, IOException {
        final String requestURI = request.getRequestURI();
        boolean isDebugEnabled = logger.isDebugEnabled();
        
        try {
            // Skip processing for certain public paths
            if (shouldSkipAuthentication(requestURI)) {
                if (isDebugEnabled) {
                    logger.debug("Skipping authentication for public path: " + requestURI);
                }
                filterChain.doFilter(request, response);
                return;
            }
            
            String jwt = getJwtFromRequest(request);

            if (StringUtils.hasText(jwt)) {
                if (isDebugEnabled) {
                    logger.debug("Processing authentication for path: " + requestURI);
                }
                
                if (tokenProvider.validateToken(jwt)) {
                    String username = tokenProvider.getUsernameFromJWT(jwt);
                    UserDetails userDetails = userDetailsService.loadUserByUsername(username);

                    UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                            userDetails, null, userDetails.getAuthorities());
                    authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                    SecurityContextHolder.getContext().setAuthentication(authentication);
                    
                    if (isDebugEnabled) {
                        logger.debug("Authentication successful for user: " + username + 
                                    ", authorities: " + userDetails.getAuthorities() + 
                                    ", path: " + requestURI);
                    }
                } else {
                    logger.warn("Invalid JWT token for request: " + requestURI);
                }
            } else if (!isPublicEndpoint(requestURI)) {
                // Only log missing tokens for non-public endpoints that require authentication
                logger.debug("No JWT token found in request headers for path: " + requestURI);
            }
        } catch (Exception ex) {
            logger.error("Authentication error for URI: " + requestURI, ex);
        }

        filterChain.doFilter(request, response);
    }

    private String getJwtFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        return null;
    }

    /**
     * Determine if authentication should be skipped for this path
     */
    private boolean shouldSkipAuthentication(String path) {
        // Skip authentication for Swagger UI and API docs
        return path.contains("/swagger-ui") || 
               path.contains("/v3/api-docs") || 
               path.contains("/h2-console");
    }
    
    /**
     * Check if the endpoint is a public endpoint that doesn't require authentication
     */
    private boolean isPublicEndpoint(String path) {
        return path.startsWith("/api/auth/") || 
               path.startsWith("/api/public/") || 
               path.contains("/reset-request") || 
               path.contains("/reset-confirm") ||
               shouldSkipAuthentication(path);
    }
} 