// Authentication & User types
export interface User {
  id: string;
  email: string;
  name: string;
  fullName?: string;
  role: 'ADMIN' | 'CUSTOMER';
  phoneNumber?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserProfile extends User {
  emailVerified?: boolean;
  lastLogin?: string;
  installationDate?: string;
  installationType?: string;
  passwordChangeRequired?: boolean;
}

export interface ActivityLogEntry {
  id: string;
  activityType: string;
  description?: string;
  details?: string;
  timestamp: string;
  ipAddress?: string;
  performedBy?: string;
  metadata?: Record<string, unknown>;
}

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

// Backend-auth response (AuthResponse on the server)
export interface BackendAuthResponse {
  accessToken: string;
  tokenType?: string; // "Bearer"
  id?: string | number;
  email: string;
  fullName?: string;
  // Server returns role as a string (e.g., "ADMIN" | "CUSTOMER")
  role: string;
  passwordChangeRequired?: boolean;
  lastLogin?: string;
  // Optional/forward-compatible
  refreshToken?: string;
  expiresIn?: number;
}

// App-normalized login response shape used across the frontend and tests
export interface LoginResponse {
  token: string;
  refreshToken: string;
  user: User;
  expiresIn: number;
}

export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
  phoneNumber?: string;
}

// Customer types
export interface Customer {
  id: string;
  email: string;
  fullName: string;
  phoneNumber?: string;
  status: 'active' | 'inactive' | 'suspended';
  role?: string;
  createdAt: string;
  updatedAt?: string;
  joinDate?: string;
}

export interface CustomerCreateRequest {
  email: string;
  fullName: string;
  phoneNumber?: string;
  password?: string;
}

export interface CustomerActivityLog extends ActivityLogEntry {
  customerId?: string;
  installationId?: string;
  status?: string;
}

// Energy types
export interface EnergyReading {
  id?: string;
  installationId: string;
  powerGenerationWatts: number;
  powerConsumptionWatts: number;
  timestamp: string;
  batteryLevel?: number;
  gridPowerWatts?: number;
}

export interface EnergyData {
  date: string;
  generated: number;
  consumed: number;
  exported?: number;
  imported?: number;
  batteryStored?: number;
  batteryUsed?: number;
}

export interface EnergyChart {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    borderColor?: string;
    backgroundColor?: string;
  }>;
}

// Installation types
export interface Installation {
  id: string;
  customerId: string;
  customerName?: string;
  address: string;
  systemSize: number;
  panelCount?: number;
  inverterCount?: number;
  batteryCount?: number;
  status: 'active' | 'inactive' | 'maintenance' | 'suspended';
  installationDate: string;
  lastMaintenanceDate?: string;
  warrantyExpiry?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

export interface InstallationCreateRequest {
  customerId: string;
  address: string;
  systemSize: number;
  panelCount?: number;
  inverterCount?: number;
  batteryCount?: number;
  installationDate: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

// Payment types
export interface Payment {
  id: string;
  customerId: string;
  customerName?: string;
  installationId?: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  paymentDate: string;
  dueDate?: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  description?: string;
  receiptNumber?: string;
  transactionId?: string;
}

export interface PaymentPlan {
  id: string;
  customerId: string;
  installationId?: string;
  amount: number;
  currency: string;
  frequency: 'monthly' | 'quarterly' | 'annually' | 'one-time';
  startDate: string;
  endDate?: string;
  status: 'active' | 'suspended' | 'completed' | 'cancelled';
  nextPaymentDate?: string;
}

export interface PaymentCreateRequest {
  customerId: string;
  installationId?: string;
  amount: number;
  paymentMethod: string;
  description?: string;
}

// Service & Maintenance types
export interface ServiceRecord {
  id: string;
  installationId: string;
  customerId: string;
  serviceType: 'maintenance' | 'repair' | 'inspection' | 'upgrade';
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  scheduledDate: string;
  completedDate?: string;
  technicianName?: string;
  description: string;
  findings?: string;
  recommendations?: string;
  cost?: number;
}

export interface ServiceCommand {
  id: string;
  installationId: string;
  command: string;
  commandType: 'restart' | 'shutdown' | 'maintenance' | 'reset' | 'configure';
  status: 'pending' | 'executing' | 'completed' | 'failed';
  scheduledTime?: string;
  executedTime?: string;
  result?: string;
  error?: string;
}

// Security & Tamper Detection types
export interface SecurityAlert {
  id: string;
  installationId: string;
  customerId: string;
  alertType: 'tamper' | 'unauthorized_access' | 'system_breach' | 'anomaly';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  details?: string;
  timestamp: string;
  status: 'new' | 'acknowledged' | 'investigating' | 'resolved' | 'dismissed';
  resolvedBy?: string;
  resolvedAt?: string;
  location?: {
    component: string;
    coordinates?: { x: number; y: number };
  };
}

export interface TamperEvent {
  id: string;
  installationId: string;
  eventType: 'panel_removal' | 'cable_disconnect' | 'inverter_tamper' | 'box_opened';
  severity: 'low' | 'medium' | 'high';
  timestamp: string;
  location: string;
  description: string;
  evidenceUrls?: string[];
  status: 'detected' | 'investigating' | 'resolved' | 'false_positive';
}

// System & Settings types
export interface SystemHealth {
  overallStatus: 'healthy' | 'warning' | 'error';
  components: Array<{
    name: string;
    status: 'operational' | 'degraded' | 'failed';
    uptime: string;
    lastCheck: string;
    metrics?: Record<string, any>;
  }>;
  lastUpdated: string;
}

export interface SystemSettings {
  maintenance: {
    autoSchedule: boolean;
    notificationEmail: string;
    intervalDays: number;
  };
  monitoring: {
    enabled: boolean;
    interval: number;
    alertThreshold: number;
  };
  security: {
    tamperDetection: boolean;
    alertSeverity: 'low' | 'medium' | 'high';
    autoResponse: boolean;
  };
  notifications: {
    email: boolean;
    sms: boolean;
    push: boolean;
  };
}

// Logging types
export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  source: string;
  message: string;
  details?: Record<string, any>;
  installationId?: string;
  customerId?: string;
  userId?: string;
  sessionId?: string;
  ip?: string;
  userAgent?: string;
}

// API Response types
export interface ApiResponse<T> {
  data: T;
  message?: string;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

// Dashboard & Analytics types
export interface DashboardStats {
  totalCustomers: number;
  totalInstallations: number;
  totalEnergyGenerated: number;
  totalPayments: number;
  activeAlerts: number;
  systemHealth: 'healthy' | 'warning' | 'error';
}

export interface EnergyDashboard {
  totalGeneration: number;
  totalConsumption: number;
  efficiency: number;
  carbonOffset: number;
  monthlyData: EnergyData[];
  recentReadings: EnergyReading[];
}

// Filter & Search types
export interface SearchFilters {
  query?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  customerId?: string;
  installationId?: string;
  category?: string;
}

export interface SortOptions {
  field: string;
  direction: 'asc' | 'desc';
}

// Utility types
export type ApiMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export interface RequestOptions {
  method: ApiMethod;
  headers?: Record<string, string>;
  params?: Record<string, any>;
  timeout?: number;
  retries?: number;
}
