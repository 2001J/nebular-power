// Central barrel for modular API clients
// Prefer importing specific clients from '@/lib/api/<module>' when possible.
export { authApi } from './api/auth';
export { userApi } from './api/user';
export { customerApi } from './api/customers';
export { installationApi } from './api/installations';
export { paymentApi } from './api/payments';
export { paymentComplianceApi } from './api/paymentCompliance';
export { complianceApi } from './api/compliance';
export { securityApi } from './api/security';
export { tamperDetectionApi } from './api/tamperDetection';
export { serviceApi } from './api/service';
export { serviceControlApi } from './api/serviceControl';
export { settingsApi } from './api/settings';
export { energyApi } from './api/energy';

export * from './api/types';
