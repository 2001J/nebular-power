/**
 * Mock data utilities for testing components 
 * when the API is unavailable or during development
 */

export const mockInstallations = [
  {
    id: 1,
    name: "Home Solar Installation",
    capacity: 8.5,
    installedCapacityKW: 8.5,
    location: "123 Main St",
    installationDate: "2023-06-15T10:00:00",
    status: "ACTIVE",
    tamperDetected: false,
    lastTamperCheck: "2023-09-10T14:30:00",
    user: {
      id: 1,
      email: "user@example.com",
      fullName: "John Doe"
    }
  },
  {
    id: 2,
    name: "Beach House Solar",
    capacity: 4.2,
    installedCapacityKW: 4.2,
    location: "456 Ocean Ave",
    installationDate: "2023-07-22T11:30:00",
    status: "ACTIVE",
    tamperDetected: false,
    lastTamperCheck: "2023-09-11T09:15:00",
    user: {
      id: 1,
      email: "user@example.com",
      fullName: "John Doe"
    }
  }
];

export const mockEnergyReadings = [
  // Today's data points - one per hour
  ...Array.from({ length: 24 }).map((_, i) => {
    const hour = i;
    const date = new Date();
    date.setHours(hour, 0, 0, 0);

    // Production curve - peaks midday
    const production = hour >= 6 && hour <= 19
      ? 1000 * Math.sin(Math.PI * (hour - 6) / 13)
      : 0;

    // Consumption - higher in morning and evening
    let consumption = 200;
    if (hour >= 6 && hour <= 9) consumption = 500;  // morning peak
    if (hour >= 17 && hour <= 21) consumption = 700; // evening peak

    return {
      id: i + 1,
      timestamp: date.toISOString(),
      powerGenerationWatts: production,
      powerConsumptionWatts: consumption,
      dailyYieldKWh: (hour * production / 1000).toFixed(2),
      totalYieldKWh: (1000 + hour * production / 100).toFixed(2),
      isSimulated: true,
      installationId: 1
    };
  })
];

export const mockPaymentPlan = {
  id: 1,
  name: "Standard Solar Financing",
  description: "5-year financing plan for residential solar installation",
  totalAmount: 12500.00,
  remainingAmount: 9800.00,
  numberOfPayments: 60,
  installmentAmount: 208.33,
  frequency: "MONTHLY",
  startDate: "2023-01-15T00:00:00",
  endDate: "2028-01-15T00:00:00",
  status: "ACTIVE",
  interestRate: 3.5,
  lateFeeAmount: 25.00,
  gracePeriodDays: 10,
  installationId: 1
};

export const mockPayments = [
  {
    id: 1,
    amount: 208.33,
    paymentDate: "2023-01-15T10:30:00",
    dueDate: "2023-01-15T00:00:00",
    status: "PAID",
    paymentMethod: "BANK_TRANSFER",
    transactionId: "TRX-2023-1001",
    notes: "Initial payment",
    paymentPlanId: 1
  },
  {
    id: 2,
    amount: 208.33,
    paymentDate: "2023-02-16T09:45:00",
    dueDate: "2023-02-15T00:00:00",
    status: "PAID_LATE",
    paymentMethod: "CREDIT_CARD",
    transactionId: "TRX-2023-1002",
    notes: "Paid 1 day late",
    paymentPlanId: 1
  },
  {
    id: 3,
    amount: 208.33,
    paymentDate: null,
    dueDate: "2023-03-15T00:00:00",
    status: "DUE",
    paymentMethod: null,
    transactionId: null,
    notes: null,
    paymentPlanId: 1
  }
];

export const mockAlerts = [
  {
    id: 1,
    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    title: "Tamper Detection Alert",
    description: "Possible physical tampering detected on Installation #1",
    severity: "HIGH",
    status: "UNRESOLVED",
    type: "TAMPER",
    installationId: 1,
    userId: 1
  },
  {
    id: 2,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    title: "Power Outage Detected",
    description: "Installation #2 reported a loss of connection during power outage",
    severity: "MEDIUM",
    status: "RESOLVED",
    type: "CONNECTION",
    installationId: 2,
    userId: 1
  },
  {
    id: 3,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    title: "Payment Overdue",
    description: "Payment overdue for Installation #1 by 5 days",
    severity: "MEDIUM",
    status: "UNRESOLVED",
    type: "PAYMENT",
    installationId: 1,
    userId: 1
  }
];

// Environment for mock API simulation
export const apiEnvironment = {
  shouldMock: false,
  mockDelay: 500, // ms
  errorRate: 0,   // 0-1 probability of error

  // Function to toggle mocking
  enableMocking(enable = true) {
    this.shouldMock = enable;
    console.log(`API mocking ${enable ? 'enabled' : 'disabled'}`);
    return this.shouldMock;
  },

  // Simulate API response with optional delay and errors
  async mockResponse<T>(data: T, options?: {
    delay?: number,
    errorProbability?: number,
    errorMessage?: string
  }): Promise<T> {
    const delay = options?.delay ?? this.mockDelay;
    const errorProbability = options?.errorProbability ?? this.errorRate;

    await new Promise(resolve => setTimeout(resolve, delay));

    if (Math.random() < errorProbability) {
      throw new Error(options?.errorMessage ?? 'Simulated API error');
    }

    return data;
  }
}; 