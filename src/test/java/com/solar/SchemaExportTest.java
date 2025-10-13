package com.solar;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest(properties = {
    "spring.main.web-application-type=none"
})
class SchemaExportTest {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void exportSchemaToSql() throws Exception {
        String out = "target/schema.sql";
        // Export schema only (no data)
        jdbcTemplate.execute("SCRIPT NODATA TO '" + out + "'");
        // Verify file exists and is not empty
        Path p = Path.of(out);
        assertTrue(Files.exists(p) && Files.size(p) > 0, "Schema SQL file should exist and be non-empty: " + p.toAbsolutePath());
        System.out.println("Schema exported to: " + p.toAbsolutePath());
    }
}
