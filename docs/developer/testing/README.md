# Testing Documentation

This document provides detailed information about the testing approach, test coverage, and procedures for running tests in the Solar Energy Monitoring and Financing System.

## Table of Contents

1. [Testing Approach](#testing-approach)
2. [Test Types](#test-types)
3. [Test Coverage](#test-coverage)
4. [Running Tests](#running-tests)
5. [Continuous Integration](#continuous-integration)
6. [Test Data Management](#test-data-management)
7. [Mocking Strategies](#mocking-strategies)
8. [Test Reports](#test-reports)

## Testing Approach

The Solar Energy Monitoring and Financing System follows a comprehensive testing strategy that combines different testing techniques to ensure the quality, reliability, and correctness of the software. The testing approach is based on the following principles:

### Test Pyramid

We follow the test pyramid approach, which suggests having:

- Many unit tests (testing individual components in isolation)
- Fewer integration tests (testing interactions between components)
- Even fewer end-to-end tests (testing the entire system)

```
    /\
   /  \
  /    \      E2E Tests
 /      \
/        \
----------     Integration Tests
|        |
|        |
|        |     Unit Tests
|        |
----------
```

### Test-Driven Development (TDD)

For critical components, we follow the Test-Driven Development approach:

1. Write a failing test that defines the expected behavior
2. Implement the minimum code necessary to make the test pass
3. Refactor the code while ensuring the tests still pass

### Behavior-Driven Development (BDD)

For user-facing features, we use a BDD approach with Cucumber to define scenarios in a human-readable format:

```gherkin
Feature: Energy Summary Generation

  Scenario: Generate daily energy summary
    Given a solar installation with ID 1
    And energy data exists for the installation on "2023-05-20"
    When I request a daily summary for installation 1 on "2023-05-20"
    Then the summary should contain total generation and consumption values
    And the summary period should be "DAILY"
```

## Test Types

### Unit Tests

Unit tests verify the functionality of individual components in isolation. We use JUnit 5 as our testing framework and Mockito for mocking dependencies.

Example unit test for the `EnergySummaryService`:

```java
@ExtendWith(MockitoExtension.class)
class EnergySummaryServiceTest {

    @Mock
    private EnergySummaryRepository summaryRepository;

    @Mock
    private EnergyDataRepository dataRepository;

    @Mock
    private SolarInstallationRepository installationRepository;

    @InjectMocks
    private EnergySummaryServiceImpl energySummaryService;

    @Test
    void testGenerateDailySummary_Success() {
        // Arrange
        Long installationId = 1L;
        LocalDate date = LocalDate.of(2023, 5, 20);

        SolarInstallation installation = new SolarInstallation();
        installation.setId(installationId);

        LocalDateTime startOfDay = date.atStartOfDay();
        LocalDateTime endOfDay = date.atTime(LocalTime.MAX);

        List<EnergyData> energyDataList = createSampleEnergyData();

        when(installationRepository.findById(installationId))
            .thenReturn(Optional.of(installation));

        when(summaryRepository.findByInstallationAndPeriodAndDate(
                installation, EnergySummary.SummaryPeriod.DAILY, date))
            .thenReturn(Optional.empty());

        when(dataRepository.findByInstallationAndTimestampBetween(
                installation, startOfDay, endOfDay))
            .thenReturn(energyDataList);

        when(summaryRepository.save(any(EnergySummary.class)))
            .thenAnswer(invocation -> invocation.getArgument(0));

        // Act
        EnergySummaryDTO result = energySummaryService.generateDailySummary(installationId, date);

        // Assert
        assertNotNull(result);
        assertEquals(date, result.getDate());
        assertEquals("DAILY", result.getPeriod());
        assertEquals(10.5, result.getTotalGenerationKwh());
        assertEquals(7.2, result.getTotalConsumptionKwh());

        verify(installationRepository).findById(installationId);
        verify(summaryRepository).findByInstallationAndPeriodAndDate(
                installation, EnergySummary.SummaryPeriod.DAILY, date);
        verify(dataRepository).findByInstallationAndTimestampBetween(
                installation, startOfDay, endOfDay);
        verify(summaryRepository).save(any(EnergySummary.class));
    }

    @Test
    void testGenerateDailySummary_InstallationNotFound() {
        // Arrange
        Long installationId = 1L;
        LocalDate date = LocalDate.of(2023, 5, 20);

        when(installationRepository.findById(installationId))
            .thenReturn(Optional.empty());

        // Act & Assert
        assertThrows(ResourceNotFoundException.class, () -> 
            energySummaryService.generateDailySummary(installationId, date));

        verify(installationRepository).findById(installationId);
        verifyNoInteractions(summaryRepository);
        verifyNoInteractions(dataRepository);
    }

    // Helper methods
    private List<EnergyData> createSampleEnergyData() {
        List<EnergyData> dataList = new ArrayList<>();

        EnergyData data1 = new EnergyData();
        data1.setEnergyGeneratedKwh(5.2);
        data1.setEnergyConsumedKwh(3.5);
        data1.setPowerOutputKw(2.1);
        data1.setEfficiencyPercentage(18.5);

        EnergyData data2 = new EnergyData();
        data2.setEnergyGeneratedKwh(5.3);
        data2.setEnergyConsumedKwh(3.7);
        data2.setPowerOutputKw(2.2);
        data2.setEfficiencyPercentage(18.7);

        dataList.add(data1);
        dataList.add(data2);

        return dataList;
    }
}
```

### Integration Tests

Integration tests verify that different components work together correctly. We use Spring Boot Test for integration testing, which provides a testing framework that can load a full Spring application context.

Example integration test for the `EnergySummaryController`:

```java
@SpringBootTest
@AutoConfigureMockMvc
class EnergySummaryControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private EnergySummaryService energySummaryService;

    @MockBean
    private SecurityService securityService;

    @Test
    @WithMockUser(roles = "ADMIN")
    void testGetDailySummaries() throws Exception {
        // Arrange
        Long installationId = 1L;
        List<EnergySummaryDTO> summaries = createSampleSummaries();

        when(energySummaryService.getSummariesByPeriod(
                eq(installationId), eq(EnergySummary.SummaryPeriod.DAILY)))
            .thenReturn(summaries);

        // Act & Assert
        mockMvc.perform(get("/monitoring/summaries/{installationId}/daily", installationId)
                .contentType(MediaType.APPLICATION_JSON))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$", hasSize(2)))
            .andExpect(jsonPath("$[0].installationId", is(installationId.intValue())))
            .andExpect(jsonPath("$[0].period", is("DAILY")))
            .andExpect(jsonPath("$[0].totalGenerationKwh", is(45.2)))
            .andExpect(jsonPath("$[1].installationId", is(installationId.intValue())))
            .andExpect(jsonPath("$[1].period", is("DAILY")))
            .andExpect(jsonPath("$[1].totalGenerationKwh", is(42.8)));

        verify(energySummaryService).getSummariesByPeriod(
                eq(installationId), eq(EnergySummary.SummaryPeriod.DAILY));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void testGenerateDailySummary() throws Exception {
        // Arrange
        Long installationId = 1L;
        LocalDate date = LocalDate.of(2023, 5, 20);
        EnergySummaryDTO summary = createSampleSummary(installationId, date);

        when(energySummaryService.generateDailySummary(eq(installationId), eq(date)))
            .thenReturn(summary);

        // Act & Assert
        mockMvc.perform(post("/monitoring/summaries/{installationId}/generate/daily", installationId)
                .param("date", date.toString())
                .contentType(MediaType.APPLICATION_JSON))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.installationId", is(installationId.intValue())))
            .andExpect(jsonPath("$.period", is("DAILY")))
            .andExpect(jsonPath("$.date", is(date.toString())))
            .andExpect(jsonPath("$.totalGenerationKwh", is(45.2)));

        verify(energySummaryService).generateDailySummary(eq(installationId), eq(date));
    }

    // Helper methods
    private List<EnergySummaryDTO> createSampleSummaries() {
        List<EnergySummaryDTO> summaries = new ArrayList<>();

        EnergySummaryDTO summary1 = EnergySummaryDTO.builder()
            .id(1L)
            .installationId(1L)
            .period("DAILY")
            .date(LocalDate.of(2023, 5, 20))
            .totalGenerationKwh(45.2)
            .totalConsumptionKwh(32.5)
            .peakPowerKw(9.1)
            .averagePowerKw(5.6)
            .efficiencyPercentage(18.7)
            .build();

        EnergySummaryDTO summary2 = EnergySummaryDTO.builder()
            .id(2L)
            .installationId(1L)
            .period("DAILY")
            .date(LocalDate.of(2023, 5, 21))
            .totalGenerationKwh(42.8)
            .totalConsumptionKwh(30.2)
            .peakPowerKw(8.9)
            .averagePowerKw(5.3)
            .efficiencyPercentage(18.5)
            .build();

        summaries.add(summary1);
        summaries.add(summary2);

        return summaries;
    }

    private EnergySummaryDTO createSampleSummary(Long installationId, LocalDate date) {
        return EnergySummaryDTO.builder()
            .id(1L)
            .installationId(installationId)
            .period("DAILY")
            .date(date)
            .totalGenerationKwh(45.2)
            .totalConsumptionKwh(32.5)
            .peakPowerKw(9.1)
            .averagePowerKw(5.6)
            .efficiencyPercentage(18.7)
            .build();
    }
}
```

### Database Tests

Database tests verify the correct interaction with the database. We use TestContainers to provide a real database instance for testing.

Example database test for the `EnergySummaryRepository`:

```java
@DataJpaTest
@Testcontainers
class EnergySummaryRepositoryTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:14")
        .withDatabaseName("testdb")
        .withUsername("test")
        .withPassword("test");

    @DynamicPropertySource
    static void registerPgProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired
    private EnergySummaryRepository summaryRepository;

    @Autowired
    private SolarInstallationRepository installationRepository;

    @Test
    void testFindByInstallationAndPeriodOrderByDateDesc() {
        // Arrange
        SolarInstallation installation = createAndSaveInstallation();
        createAndSaveSummaries(installation);

        // Act
        List<EnergySummary> summaries = summaryRepository.findByInstallationAndPeriodOrderByDateDesc(
            installation, EnergySummary.SummaryPeriod.DAILY);

        // Assert
        assertEquals(2, summaries.size());
        assertEquals(LocalDate.of(2023, 5, 21), summaries.get(0).getDate());
        assertEquals(LocalDate.of(2023, 5, 20), summaries.get(1).getDate());
    }

    @Test
    void testFindByInstallationAndPeriodAndDate() {
        // Arrange
        SolarInstallation installation = createAndSaveInstallation();
        createAndSaveSummaries(installation);
        LocalDate date = LocalDate.of(2023, 5, 20);

        // Act
        Optional<EnergySummary> summary = summaryRepository.findByInstallationAndPeriodAndDate(
            installation, EnergySummary.SummaryPeriod.DAILY, date);

        // Assert
        assertTrue(summary.isPresent());
        assertEquals(date, summary.get().getDate());
        assertEquals(EnergySummary.SummaryPeriod.DAILY, summary.get().getPeriod());
        assertEquals(45.2, summary.get().getTotalGenerationKwh());
    }

    // Helper methods
    private SolarInstallation createAndSaveInstallation() {
        User owner = new User();
        owner.setUsername("testuser");
        owner.setEmail("test@example.com");
        owner.setPassword("password");
        owner.setFirstName("Test");
        owner.setLastName("User");

        SolarInstallation installation = new SolarInstallation();
        installation.setName("Test Installation");
        installation.setLocation("Test Location");
        installation.setCapacityKw(new BigDecimal("10.5"));
        installation.setInstallationDate(LocalDate.of(2022, 1, 1));
        installation.setStatus(SolarInstallation.InstallationStatus.ACTIVE);
        installation.setOwner(owner);

        return installationRepository.save(installation);
    }

    private void createAndSaveSummaries(SolarInstallation installation) {
        EnergySummary summary1 = new EnergySummary();
        summary1.setInstallation(installation);
        summary1.setPeriod(EnergySummary.SummaryPeriod.DAILY);
        summary1.setDate(LocalDate.of(2023, 5, 20));
        summary1.setTotalGenerationKwh(45.2);
        summary1.setTotalConsumptionKwh(32.5);
        summary1.setPeakPowerKw(9.1);
        summary1.setAveragePowerKw(5.6);
        summary1.setEfficiencyPercentage(18.7);

        EnergySummary summary2 = new EnergySummary();
        summary2.setInstallation(installation);
        summary2.setPeriod(EnergySummary.SummaryPeriod.DAILY);
        summary2.setDate(LocalDate.of(2023, 5, 21));
        summary2.setTotalGenerationKwh(42.8);
        summary2.setTotalConsumptionKwh(30.2);
        summary2.setPeakPowerKw(8.9);
        summary2.setAveragePowerKw(5.3);
        summary2.setEfficiencyPercentage(18.5);

        summaryRepository.saveAll(List.of(summary1, summary2));
    }
}
```

### End-to-End Tests

End-to-end tests verify the entire system works correctly from the user's perspective. We use Selenium for browser-based testing.

Example end-to-end test:

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class EnergySummaryE2ETest {

    @LocalServerPort
    private int port;

    private WebDriver driver;

    @BeforeEach
    void setUp() {
        WebDriverManager.chromedriver().setup();
        ChromeOptions options = new ChromeOptions();
        options.addArguments("--headless");
        driver = new ChromeDriver(options);
    }

    @AfterEach
    void tearDown() {
        if (driver != null) {
            driver.quit();
        }
    }

    @Test
    void testViewEnergySummaries() {
        // Login
        driver.get("http://localhost:" + port + "/login");
        driver.findElement(By.id("username")).sendKeys("admin@example.com");
        driver.findElement(By.id("password")).sendKeys("admin123");
        driver.findElement(By.id("login-button")).click();

        // Navigate to energy summaries
        driver.findElement(By.id("monitoring-menu")).click();
        driver.findElement(By.id("energy-summaries-link")).click();

        // Select installation
        Select installationSelect = new Select(driver.findElement(By.id("installation-select")));
        installationSelect.selectByIndex(0);

        // Select period
        Select periodSelect = new Select(driver.findElement(By.id("period-select")));
        periodSelect.selectByValue("DAILY");

        // Wait for data to load
        WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(10));
        wait.until(ExpectedConditions.visibilityOfElementLocated(By.className("summary-table")));

        // Verify summaries are displayed
        List<WebElement> summaryRows = driver.findElements(By.cssSelector(".summary-table tbody tr"));
        assertTrue(summaryRows.size() > 0);

        // Verify summary details
        WebElement firstRow = summaryRows.get(0);
        assertTrue(firstRow.getText().contains("kWh"));
    }
}
```

## Test Coverage

We aim for high test coverage to ensure the quality and reliability of the system. Our coverage targets are:

- **Unit Tests**: 80% line coverage
- **Integration Tests**: Key integration points covered
- **End-to-End Tests**: Critical user journeys covered

### Coverage Reports

We use JaCoCo to generate test coverage reports. The reports are generated during the build process and are available in the `target/site/jacoco` directory.

Example coverage report:

```
-------------------------------------------------------------------------------
- JACOCO COVERAGE REPORT
-------------------------------------------------------------------------------
Package                                     Class Coverage    Line Coverage
-------------------------------------------------------------------------------
com.solar.core_services.energy_monitoring   92% (23/25)       87% (523/601)
com.solar.core_services.financial           88% (15/17)       82% (312/380)
com.solar.security                          95% (19/20)       91% (287/315)
com.solar.user_management                   90% (9/10)        85% (170/200)
-------------------------------------------------------------------------------
TOTAL                                       91% (66/72)       86% (1292/1496)
-------------------------------------------------------------------------------
```

### Coverage Enforcement

We enforce minimum coverage thresholds in our build process. If the coverage falls below the threshold, the build fails.

```xml
<plugin>
    <groupId>org.jacoco</groupId>
    <artifactId>jacoco-maven-plugin</artifactId>
    <version>0.8.8</version>
    <executions>
        <execution>
            <id>prepare-agent</id>
            <goals>
                <goal>prepare-agent</goal>
            </goals>
        </execution>
        <execution>
            <id>report</id>
            <phase>test</phase>
            <goals>
                <goal>report</goal>
            </goals>
        </execution>
        <execution>
            <id>check</id>
            <goals>
                <goal>check</goal>
            </goals>
            <configuration>
                <rules>
                    <rule>
                        <element>BUNDLE</element>
                        <limits>
                            <limit>
                                <counter>LINE</counter>
                                <value>COVEREDRATIO</value>
                                <minimum>0.80</minimum>
                            </limit>
                        </limits>
                    </rule>
                </rules>
            </configuration>
        </execution>
    </executions>
</plugin>
```

## Running Tests

### Running Tests Locally

To run the tests locally, you can use Maven:

```bash
# Run all tests
mvn test

# Run a specific test class
mvn test -Dtest=EnergySummaryServiceTest

# Run a specific test method
mvn test -Dtest=EnergySummaryServiceTest#testGenerateDailySummary_Success

# Run tests with a specific tag
mvn test -Dgroups=unit
```

### Running Tests in the IDE

You can also run tests directly from your IDE:

- **IntelliJ IDEA**: Right-click on a test class or method and select "Run"
- **Eclipse**: Right-click on a test class or method and select "Run As > JUnit Test"
- **VS Code**: Click the "Run Test" link above the test method

### Test Configuration

Tests can be configured using properties in the `application-test.properties` file:

```properties
# Test database configuration
spring.datasource.url=jdbc:h2:mem:testdb
spring.datasource.username=sa
spring.datasource.password=
spring.datasource.driver-class-name=org.h2.Driver

# Hibernate configuration
spring.jpa.hibernate.ddl-auto=create-drop
spring.jpa.properties.hibernate.format_sql=true

# Logging configuration
logging.level.org.hibernate.SQL=DEBUG
logging.level.org.hibernate.type.descriptor.sql.BasicBinder=TRACE

# Test-specific configuration
test.admin.username=admin@example.com
test.admin.password=admin123
```

## Continuous Integration

We use GitHub Actions for continuous integration. The CI pipeline runs all tests on every push and pull request.

Example GitHub Actions workflow:

```yaml
name: Java CI

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3
    - name: Set up JDK 21
      uses: actions/setup-java@v3
      with:
        java-version: '21'
        distribution: 'temurin'
        cache: maven
    - name: Build with Maven
      run: mvn -B package --file pom.xml
    - name: Test Coverage
      run: mvn jacoco:report
    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v3
```

## Test Data Management

### Test Data Strategies

We use different strategies for managing test data:

1. **In-memory database**: For unit and integration tests, we use H2 in-memory database
2. **Test containers**: For database tests, we use TestContainers to provide a real PostgreSQL instance
3. **Test fixtures**: Predefined data sets for specific test scenarios
4. **Factories**: Test data factories to create test objects with sensible defaults

Example test data factory:

```java
public class TestDataFactory {

    public static SolarInstallation createSolarInstallation() {
        return SolarInstallation.builder()
            .name("Test Installation")
            .location("Test Location")
            .capacityKw(new BigDecimal("10.5"))
            .installationDate(LocalDate.of(2022, 1, 1))
            .status(SolarInstallation.InstallationStatus.ACTIVE)
            .build();
    }

    public static EnergySummary createEnergySummary(SolarInstallation installation) {
        return EnergySummary.builder()
            .installation(installation)
            .period(EnergySummary.SummaryPeriod.DAILY)
            .date(LocalDate.now())
            .totalGenerationKwh(45.2)
            .totalConsumptionKwh(32.5)
            .peakPowerKw(9.1)
            .averagePowerKw(5.6)
            .efficiencyPercentage(18.7)
            .build();
    }

    public static List<EnergyData> createEnergyDataList(SolarInstallation installation, LocalDate date) {
        List<EnergyData> dataList = new ArrayList<>();

        LocalDateTime startTime = date.atTime(8, 0);

        for (int i = 0; i < 10; i++) {
            LocalDateTime timestamp = startTime.plusMinutes(i * 30);

            EnergyData data = EnergyData.builder()
                .installation(installation)
                .timestamp(timestamp)
                .powerOutputKw(5.0 + Math.random())
                .energyGeneratedKwh(2.0 + Math.random())
                .energyConsumedKwh(1.5 + Math.random())
                .temperatureCelsius(40.0 + Math.random() * 5)
                .irradianceWM2(900.0 + Math.random() * 100)
                .efficiencyPercentage(18.0 + Math.random())
                .build();

            dataList.add(data);
        }

        return dataList;
    }
}
```

### Database Cleanup

To ensure test isolation, we clean up the database before or after each test:

```java
@SpringBootTest
class EnergySummaryServiceIntegrationTest {

    @Autowired
    private EnergySummaryRepository summaryRepository;

    @Autowired
    private SolarInstallationRepository installationRepository;

    @BeforeEach
    void setUp() {
        // Clean up the database before each test
        summaryRepository.deleteAll();
        installationRepository.deleteAll();
    }

    // Test methods...
}
```

## Mocking Strategies

We use different mocking strategies depending on the test type:

### Mockito

For unit tests, we use Mockito to mock dependencies:

```java
@ExtendWith(MockitoExtension.class)
class EnergySummaryServiceTest {

    @Mock
    private EnergySummaryRepository summaryRepository;

    @Mock
    private EnergyDataRepository dataRepository;

    @InjectMocks
    private EnergySummaryServiceImpl energySummaryService;

    @Test
    void testGenerateDailySummary() {
        // Arrange
        when(summaryRepository.save(any(EnergySummary.class)))
            .thenAnswer(invocation -> invocation.getArgument(0));

        // Act & Assert
        // ...
    }
}
```

### MockMvc

For controller tests, we use MockMvc to simulate HTTP requests:

```java
@WebMvcTest(EnergySummaryController.class)
class EnergySummaryControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private EnergySummaryService energySummaryService;

    @Test
    void testGetDailySummaries() throws Exception {
        // Arrange
        when(energySummaryService.getSummariesByPeriod(anyLong(), any()))
            .thenReturn(List.of(/* sample data */));

        // Act & Assert
        mockMvc.perform(get("/monitoring/summaries/1/daily"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$", hasSize(1)));
    }
}
```

### WireMock

For external API tests, we use WireMock to simulate external services:

```java
@SpringBootTest
class WeatherServiceTest {

    @Autowired
    private WeatherService weatherService;

    private WireMockServer wireMockServer;

    @BeforeEach
    void setUp() {
        wireMockServer = new WireMockServer(WireMockConfiguration.options().dynamicPort());
        wireMockServer.start();
        WireMock.configureFor("localhost", wireMockServer.port());
    }

    @AfterEach
    void tearDown() {
        wireMockServer.stop();
    }

    @Test
    void testGetWeatherData() {
        // Arrange
        stubFor(get(urlPathMatching("/weather/.*"))
            .willReturn(aResponse()
                .withStatus(200)
                .withHeader("Content-Type", "application/json")
                .withBody("{\"temperature\": 25.5, \"condition\": \"SUNNY\"}")));

        // Act
        WeatherData weatherData = weatherService.getWeatherData("New York");

        // Assert
        assertEquals(25.5, weatherData.getTemperature());
        assertEquals("SUNNY", weatherData.getCondition());
    }
}
```

## Test Reports

We generate comprehensive test reports to provide visibility into test results and coverage.

### JUnit Reports

JUnit XML reports are generated during the test execution and can be used by CI systems to display test results.

```xml
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-surefire-plugin</artifactId>
    <version>3.0.0</version>
    <configuration>
        <reportFormat>plain</reportFormat>
        <includes>
            <include>**/*Test.java</include>
        </includes>
    </configuration>
</plugin>
```

### HTML Reports

We also generate HTML reports for better readability:

```xml
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-surefire-report-plugin</artifactId>
    <version>3.0.0</version>
    <executions>
        <execution>
            <phase>test</phase>
            <goals>
                <goal>report</goal>
            </goals>
        </execution>
    </executions>
</plugin>
```

The HTML reports are available in the `target/site/surefire-report.html` file.

### Coverage Reports

As mentioned earlier, we use JaCoCo to generate coverage reports. The reports are available in HTML, XML, and CSV formats:

```xml
<plugin>
    <groupId>org.jacoco</groupId>
    <artifactId>jacoco-maven-plugin</artifactId>
    <version>0.8.8</version>
    <executions>
        <execution>
            <id>prepare-agent</id>
            <goals>
                <goal>prepare-agent</goal>
            </goals>
        </execution>
        <execution>
            <id>report</id>
            <phase>test</phase>
            <goals>
                <goal>report</goal>
            </goals>
        </execution>
    </executions>
</plugin>
```

The coverage reports are available in the `target/site/jacoco` directory.

## Conclusion

This testing documentation provides a comprehensive overview of the testing approach, test types, coverage, and procedures for running tests in the Solar Energy Monitoring and Financing System. By following these guidelines, developers can ensure that the system is thoroughly tested and maintains high quality standards.

For any questions or suggestions regarding testing, please contact the development team.
