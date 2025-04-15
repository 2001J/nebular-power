package com.solar.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import io.swagger.v3.oas.models.tags.Tag;
import org.springdoc.core.customizers.OpenApiCustomizer;
import org.springdoc.core.models.GroupedOpenApi;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Configuration
public class OpenApiConfig {
    
    @Bean
    public OpenAPI customOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("Solar Energy Monitoring System API")
                        .version("1.0")
                        .description("API Documentation for Solar Energy Monitoring System"))
                .components(new Components()
                        .addSecuritySchemes("bearerAuth", 
                            new SecurityScheme()
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")))
                .tags(createOrderedTags())
                .security(List.of(
                    new io.swagger.v3.oas.models.security.SecurityRequirement()
                        .addList("bearerAuth")
                ));
    }
    
    @Bean
    public OpenApiCustomizer sortTagsAlphabetically() {
        return openApi -> {
            // Replace the existing tags with our ordered tags
            List<Tag> orderedTags = createOrderedTags();
            
            // Create a map of tag names to positions for sorting
            java.util.Map<String, Integer> tagOrder = new java.util.HashMap<>();
            for (int i = 0; i < orderedTags.size(); i++) {
                tagOrder.put(orderedTags.get(i).getName(), i);
            }
            
            // Sort tags by our predefined order
            openApi.setTags(openApi.getTags().stream()
                    .sorted(Comparator.comparing(tag -> 
                        tagOrder.getOrDefault(tag.getName(), Integer.MAX_VALUE)))
                    .collect(Collectors.toList()));
        };
    }
    
    @Bean
    public GroupedOpenApi allApi() {
        return GroupedOpenApi.builder()
                .group("All APIs")
                .pathsToMatch("/**")
                .addOpenApiCustomizer(sortTagsAlphabetically())
                .build();
    }
    
    @Bean
    public GroupedOpenApi userManagementApi() {
        return GroupedOpenApi.builder()
                .group("1. User Management")
                .pathsToMatch("/api/auth/**", "/api/profile/**", "/api/customers/**")
                .addOpenApiCustomizer(sortTagsAlphabetically())
                .build();
    }
    
    @Bean
    public GroupedOpenApi energyMonitoringApi() {
        return GroupedOpenApi.builder()
                .group("2. Energy Monitoring")
                .pathsToMatch("/monitoring/**")
                .addOpenApiCustomizer(sortTagsAlphabetically())
                .build();
    }
    
    @Bean
    public GroupedOpenApi paymentComplianceApi() {
        return GroupedOpenApi.builder()
                .group("3. Payment Compliance")
                .pathsToMatch("/api/payments/**", "/api/admin/payments/**")
                .addOpenApiCustomizer(sortTagsAlphabetically())
                .build();
    }
    
    @Bean
    public GroupedOpenApi tamperingDetectionApi() {
        return GroupedOpenApi.builder()
                .group("4. Tampering Detection")
                .pathsToMatch("/api/security/**")
                .addOpenApiCustomizer(sortTagsAlphabetically())
                .build();
    }
    
    @Bean
    public GroupedOpenApi serviceControlApi() {
        return GroupedOpenApi.builder()
                .group("5. Service Control")
                .pathsToMatch("/api/service/**")
                .addOpenApiCustomizer(sortTagsAlphabetically())
                .build();
    }
    
    // This is a critical addition - without this, SpringDoc might not scan all the packages
    @Bean
    public GroupedOpenApi.Builder customizer() {
        return GroupedOpenApi.builder()
                .packagesToScan("com.solar.user_management.controller", 
                               "com.solar.core_services.energy_monitoring.controller",
                               "com.solar.core_services.payment_compliance.controller",
                               "com.solar.core_services.tampering_detection.controller",
                               "com.solar.core_services.service_control.controller");
    }
    
    @Bean
    public OpenApiCustomizer addSecurityToApis() {
        return openApi -> {
            // Define path prefixes that should be secured
            List<String> securedPaths = List.of(
                "/monitoring/", 
                "/api/service/", 
                "/api/security/", 
                "/api/profile/", 
                "/api/installations/",
                "/api/payments/",
                "/api/admin/"
            );
            
            // Create a security requirement object for JWT auth
            io.swagger.v3.oas.models.security.SecurityRequirement securityRequirement = 
                new io.swagger.v3.oas.models.security.SecurityRequirement();
            securityRequirement.addList("bearerAuth");
            
            // Apply security to paths matching our prefixes
            if (openApi.getPaths() != null) {
                openApi.getPaths().forEach((path, pathItem) -> {
                    boolean requiresSecurity = securedPaths.stream()
                        .anyMatch(path::startsWith);
                        
                    if (requiresSecurity && pathItem != null) {
                        // Apply to all operation types in the path
                        if (pathItem.getGet() != null) {
                            pathItem.getGet().setSecurity(List.of(securityRequirement));
                        }
                        if (pathItem.getPost() != null) {
                            pathItem.getPost().setSecurity(List.of(securityRequirement));
                        }
                        if (pathItem.getPut() != null) {
                            pathItem.getPut().setSecurity(List.of(securityRequirement));
                        }
                        if (pathItem.getDelete() != null) {
                            pathItem.getDelete().setSecurity(List.of(securityRequirement));
                        }
                        if (pathItem.getPatch() != null) {
                            pathItem.getPatch().setSecurity(List.of(securityRequirement));
                        }
                    }
                });
            }
        };
    }
    
    private List<Tag> createOrderedTags() {
        List<Tag> orderedTags = new ArrayList<>();
        
        // 1. User Management Module
        orderedTags.add(new Tag().name("Authentication").description("Authentication API"));
        orderedTags.add(new Tag().name("User Profile").description("User profile management endpoints"));
        orderedTags.add(new Tag().name("Customer Management").description("APIs for managing customer accounts"));
        
        // 2. Energy Monitoring Module
        orderedTags.add(new Tag().name("Energy Monitoring").description("APIs for energy data monitoring"));
        orderedTags.add(new Tag().name("Solar Installations").description("APIs for managing solar installations"));
        orderedTags.add(new Tag().name("Energy Summaries").description("APIs for energy summary data"));
        
        // 3. Payment Compliance Module
        orderedTags.add(new Tag().name("Customer Payments").description("APIs for customers to manage their payments"));
        orderedTags.add(new Tag().name("Admin Payments").description("APIs for administrators to manage payment systems"));
        orderedTags.add(new Tag().name("Payment Reports").description("APIs for generating payment compliance and financial reports"));
        
        // 4. Tampering Detection Module
        orderedTags.add(new Tag().name("Tamper Detection").description("APIs for managing tamper detection monitoring and simulation"));
        orderedTags.add(new Tag().name("Tamper Events").description("APIs for managing tamper events and alerts"));
        orderedTags.add(new Tag().name("Tamper Responses").description("APIs for managing responses to tamper events"));
        orderedTags.add(new Tag().name("Security Logs").description("APIs for accessing security audit logs"));
        orderedTags.add(new Tag().name("Alert Configurations").description("APIs for managing tampering detection alert configurations"));
        
        // 5. Service Control Module
        orderedTags.add(new Tag().name("Service Status").description("APIs for managing service status operations"));
        orderedTags.add(new Tag().name("Device Commands").description("APIs for managing device commands"));
        orderedTags.add(new Tag().name("Operational Logs").description("APIs for retrieving operational logs"));
        orderedTags.add(new Tag().name("System Integration").description("APIs for system integration with devices"));
        orderedTags.add(new Tag().name("Module Integration").description("APIs for integration with other modules"));
        
        return orderedTags;
    }
} 