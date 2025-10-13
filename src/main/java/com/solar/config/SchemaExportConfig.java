package com.solar.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * Exports the current H2 database schema (and optionally data) to an SQL file
 * by issuing H2's SCRIPT command. Controlled by properties:
 * - app.schema.export.enabled (default: false)
 * - app.schema.export.file (default: target/schema.sql)
 * - app.schema.export.include-data (default: false)
 */
@Configuration
public class SchemaExportConfig {
    private static final Logger log = LoggerFactory.getLogger(SchemaExportConfig.class);

    @Value("${app.schema.export.enabled:false}")
    private boolean exportEnabled;

    @Value("${app.schema.export.file:target/schema.sql}")
    private String exportFile;

    @Value("${app.schema.export.include-data:false}")
    private boolean includeData;

  @Value("${app.schema.export.exit-after:false}")
  private boolean exitAfter;

    @Bean
    CommandLineRunner exportSchemaRunner(JdbcTemplate jdbcTemplate) {
      return args -> {
        if (!exportEnabled) {
          return;
        }
        try {
          // Use H2's SCRIPT command. Include data if requested.
          String sql = includeData
              ? String.format("SCRIPT TO '%s'", exportFile)
              : String.format("SCRIPT NODATA TO '%s'", exportFile);
          log.info("Exporting H2 schema{} to {}", includeData ? " + data" : "", exportFile);
          jdbcTemplate.execute(sql);
          log.info("H2 schema export completed: {}", exportFile);
        } catch (Exception e) {
          log.error("Failed to export H2 schema to {}", exportFile, e);
        } finally {
          if (exitAfter) {
            log.info("Exiting application after schema export as requested (app.schema.export.exit-after=true)");
            // Ensure logs flush before exit; restore interrupt flag if interrupted
            try {
              Thread.sleep(250);
            } catch (InterruptedException ie) {
              Thread.currentThread().interrupt(); // restore interrupt status
            }
            System.exit(0);
          }
        }
      }; 
    }
}
