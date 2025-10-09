import { apiClient, makeApiRequest, buildQueryString } from './client';
import type {
  Customer,
  CustomerCreateRequest,
  PaginatedResponse,
  CustomerActivityLog,
  ApiResponse,
} from './types';

type ActivityResponse = PaginatedResponse<CustomerActivityLog> | CustomerActivityLog[];

function normalizePaginated<T>(
  data: PaginatedResponse<T> | T[],
  page: number,
  size: number
): PaginatedResponse<T> {
  if (Array.isArray(data)) {
    return {
      content: data,
      totalElements: data.length,
      totalPages: 1,
      size: data.length,
      number: 0,
      first: true,
      last: true,
      empty: data.length === 0,
    };
  }

  return {
    ...data,
    empty: data.empty ?? (Array.isArray(data.content) ? data.content.length === 0 : true),
  };
}

export const customerApi = {
  /**
   * Get all customers with pagination
   */
  async getAllCustomers(
    page: number = 0, 
    size: number = 10, 
    forceRefresh: boolean = false
  ): Promise<PaginatedResponse<Customer>> {
    const params: Record<string, any> = { page, size };
    if (forceRefresh) {
      params['_t'] = Date.now();
    }
    
    const queryString = buildQueryString(params);
    const data = await makeApiRequest<any>(() =>
      apiClient.get(`/api/customers${queryString}`)
    );

    // Normalize backend List<UserProfileResponse> or Page-like responses
    if (!data) {
      return {
        content: [],
        totalElements: 0,
        totalPages: 0,
        size,
        number: page,
        first: page === 0,
        last: true,
        empty: true,
      } as PaginatedResponse<Customer>;
    }

    if (Array.isArray(data)) {
      return {
        content: data as Customer[],
        totalElements: data.length,
        totalPages: 1,
        size: data.length,
        number: 0,
        first: true,
        last: true,
        empty: data.length === 0,
      } as PaginatedResponse<Customer>;
    }

    if (data.content && Array.isArray(data.content)) {
      const pageResp = data as PaginatedResponse<Customer>;
      return {
        ...pageResp,
        empty: pageResp.empty ?? pageResp.content.length === 0,
      };
    }

    // Unknown shape: return empty page to keep UI stable
    return {
      content: [],
      totalElements: 0,
      totalPages: 0,
      size,
      number: page,
      first: page === 0,
      last: true,
      empty: true,
    } as PaginatedResponse<Customer>;
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
      apiClient.get<PaginatedResponse<Customer>>(`/api/customers/search${queryString}`)
    );
  },

  /**
   * Get customer by ID
   */
  async getCustomerById(id: string): Promise<Customer> {
    return makeApiRequest(() =>
      apiClient.get<Customer>(`/api/customers/${id}`)
    );
  },

  /**
   * Create new customer
   */
  async createCustomer(customerData: CustomerCreateRequest): Promise<ApiResponse<Customer>> {
    return makeApiRequest(() =>
      apiClient.post<ApiResponse<Customer>>('/api/customers', customerData)
    );
  },

  /**
   * Update existing customer
   */
  async updateCustomer(id: string, customerData: Partial<Customer>): Promise<ApiResponse<Customer>> {
    return makeApiRequest(() =>
      apiClient.put<ApiResponse<Customer>>(`/api/customers/${id}`, customerData)
    );
  },

  /**
   * Deactivate customer
   */
  async deactivateCustomer(id: string): Promise<ApiResponse<{ message: string }>> {
    return makeApiRequest(() =>
      apiClient.post<ApiResponse<{ message: string }>>(`/api/customers/${id}/deactivate`)
    );
  },

  /**
   * Reactivate customer
   */
  async reactivateCustomer(id: string): Promise<ApiResponse<{ message: string }>> {
    return makeApiRequest(() =>
      apiClient.post<ApiResponse<{ message: string }>>(`/api/customers/${id}/reactivate`)
    );
  },

  async resetCustomerPassword(id: string): Promise<ApiResponse<{ message: string }>> {
    return makeApiRequest(() =>
      apiClient.post<ApiResponse<{ message: string }>>(`/api/customers/${id}/reset-password`)
    );
  },

  /**
   * Delete customer
   */
  async deleteCustomer(id: string): Promise<ApiResponse<{ message: string }>> {
    return makeApiRequest(() =>
      apiClient.delete<ApiResponse<{ message: string }>>(`/api/customers/${id}`)
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
      }>('/api/customers/stats')
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
      apiClient.get<PaginatedResponse<Customer>>(`/api/customers${queryString}`)
    );
  },

  /**
   * Fetch paginated activity logs for a specific customer
   */
  async getCustomerActivityLogs(
    customerId: string,
    page: number = 0,
    size: number = 10
  ): Promise<PaginatedResponse<CustomerActivityLog>> {
    const response = await makeApiRequest<ActivityResponse>(() =>
      apiClient.get<ActivityResponse>(`/api/customers/${customerId}/activity`, {
        params: { page, size },
      })
    );

    return normalizePaginated(response, page, size);
  },
};
