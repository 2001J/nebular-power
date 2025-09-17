import { apiClient, makeApiRequest, buildQueryString } from './client';
import type { 
  Customer, 
  CustomerCreateRequest,
  PaginatedResponse,
  ApiResponse 
} from './types';

export const customerApi = {
  /**
   * Get all customers with pagination
   */
  async getAllCustomers(
    page: number = 0, 
    size: number = 10, 
    forceRefresh: boolean = false
  ): Promise<PaginatedResponse<Customer>> {
    const params = { page, size };
    if (forceRefresh) {
      params['_t'] = Date.now();
    }
    
    const queryString = buildQueryString(params);
    return makeApiRequest(() =>
      apiClient.get<PaginatedResponse<Customer>>(`/api/admin/customers${queryString}`)
    );
  },

  /**
   * Search customers by query
   */
  async searchCustomers(
    query: string, 
    page: number = 0, 
    size: number = 10
  ): Promise<PaginatedResponse<Customer>> {
    const queryString = buildQueryString({ q: query, page, size });
    return makeApiRequest(() =>
      apiClient.get<PaginatedResponse<Customer>>(`/api/admin/customers/search${queryString}`)
    );
  },

  /**
   * Get customer by ID
   */
  async getCustomerById(id: string): Promise<Customer> {
    return makeApiRequest(() =>
      apiClient.get<Customer>(`/api/admin/customers/${id}`)
    );
  },

  /**
   * Create new customer
   */
  async createCustomer(customerData: CustomerCreateRequest): Promise<ApiResponse<Customer>> {
    return makeApiRequest(() =>
      apiClient.post<ApiResponse<Customer>>('/api/admin/customers', customerData)
    );
  },

  /**
   * Update existing customer
   */
  async updateCustomer(id: string, customerData: Partial<Customer>): Promise<ApiResponse<Customer>> {
    return makeApiRequest(() =>
      apiClient.put<ApiResponse<Customer>>(`/api/admin/customers/${id}`, customerData)
    );
  },

  /**
   * Deactivate customer
   */
  async deactivateCustomer(id: string): Promise<ApiResponse<{ message: string }>> {
    return makeApiRequest(() =>
      apiClient.post<ApiResponse<{ message: string }>>(`/api/admin/customers/${id}/deactivate`)
    );
  },

  /**
   * Reactivate customer
   */
  async reactivateCustomer(id: string): Promise<ApiResponse<{ message: string }>> {
    return makeApiRequest(() =>
      apiClient.post<ApiResponse<{ message: string }>>(`/api/admin/customers/${id}/activate`)
    );
  },

  /**
   * Delete customer
   */
  async deleteCustomer(id: string): Promise<ApiResponse<{ message: string }>> {
    return makeApiRequest(() =>
      apiClient.delete<ApiResponse<{ message: string }>>(`/api/admin/customers/${id}`)
    );
  },

  /**
   * Get customer statistics
   */
  async getCustomerStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    suspended: number;
  }> {
    return makeApiRequest(() =>
      apiClient.get<{
        total: number;
        active: number;
        inactive: number;
        suspended: number;
      }>('/api/admin/customers/stats')
    );
  },

  /**
   * Get customers by status
   */
  async getCustomersByStatus(
    status: 'active' | 'inactive' | 'suspended',
    page: number = 0,
    size: number = 10
  ): Promise<PaginatedResponse<Customer>> {
    const queryString = buildQueryString({ status, page, size });
    return makeApiRequest(() =>
      apiClient.get<PaginatedResponse<Customer>>(`/api/admin/customers${queryString}`)
    );
  }
};
