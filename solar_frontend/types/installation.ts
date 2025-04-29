// Basic installation type definition
export interface Installation {
  id: string;
  name?: string;
  location?: string;
  status?: string;
  customerId?: string;
  installationDate?: string;
  lastMaintenance?: string;
  capacity?: number;
  orientation?: string;
  type?: string;
  tamperDetected?: boolean;
  [key: string]: any; // Allow additional properties
} 