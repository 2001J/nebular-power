import { apiClient, makeApiRequest } from './client';
import type { ActivityLogEntry, UserProfile, PaginatedResponse } from './types';

type ActivityResponse = PaginatedResponse<ActivityLogEntry> | ActivityLogEntry[];

function normalizePaginated<T>(
  data: PaginatedResponse<T> | T[] | null | undefined,
  page: number,
  size: number
): PaginatedResponse<T> {
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
    };
  }

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

export const userApi = {
  async getCurrentUser(): Promise<UserProfile> {
    return makeApiRequest(() => apiClient.get<UserProfile>('/api/profile'));
  },

  async updateProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
    return makeApiRequest(() => apiClient.put<UserProfile>('/api/profile', updates));
  },

  async getActivityLogs(page = 0, size = 10): Promise<PaginatedResponse<ActivityLogEntry>> {
    const data = await makeApiRequest<ActivityResponse>(() =>
      apiClient.get<ActivityResponse>('/api/profile/activity', {
        params: { page, size },
      })
    );

    return normalizePaginated(data, page, size);
  },
};

export default userApi;
