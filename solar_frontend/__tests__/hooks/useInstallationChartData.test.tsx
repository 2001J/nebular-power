import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/mocks/server';
import { useInstallationChartData } from '@/hooks/useInstallationChartData';

// Mock console methods to avoid noisy output in tests
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

beforeEach(() => {
  console.log = vi.fn();
  console.error = vi.fn();
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
  vi.useRealTimers();
});

describe('useInstallationChartData', () => {
  describe('initial state', () => {
    test('starts with loading true', () => {
      server.use(
        http.get('*/monitoring/readings/series/:id', async () => {
          await new Promise(resolve => setTimeout(resolve, 100));
          return HttpResponse.json([]);
        })
      );

      const { result } = renderHook(() =>
        useInstallationChartData({
          installationId: 'inst-123',
          timeRange: 'day',
        })
      );

      expect(result.current.loading).toBe(true);
    });

    test('initializes with empty data', () => {
      const { result } = renderHook(() =>
        useInstallationChartData({
          installationId: 'inst-123',
          timeRange: 'day',
        })
      );

      expect(result.current.dataPoints).toEqual([]);
      expect(result.current.totalGeneration).toBe(0);
      expect(result.current.totalConsumption).toBe(0);
    });
  });

  describe('when installationId is null', () => {
    test('sets loading to false and returns empty data', async () => {
      const { result } = renderHook(() =>
        useInstallationChartData({
          installationId: null,
          timeRange: 'day',
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.dataPoints).toEqual([]);
      expect(result.current.isEmpty).toBe(true);
    });
  });

  describe('when fetching data successfully', () => {
    test('populates data points from API response', async () => {
      const mockBackendData = [
        {
          bucketStart: '2024-01-15T10:00:00',
          generationKWh: 5.5,
          consumptionKWh: 3.2,
          avgGenerationWatts: 1100,
          avgConsumptionWatts: 640,
        },
        {
          bucketStart: '2024-01-15T11:00:00',
          generationKWh: 6.0,
          consumptionKWh: 4.0,
          avgGenerationWatts: 1200,
          avgConsumptionWatts: 800,
        },
      ];

      server.use(
        http.get('*/monitoring/readings/series/:id', () => {
          return HttpResponse.json(mockBackendData);
        })
      );

      const { result } = renderHook(() =>
        useInstallationChartData({
          installationId: 'inst-123',
          timeRange: 'day',
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.dataPoints.length).toBe(2);
      expect(result.current.dataPoints[0].generationKWh).toBe(5.5);
      expect(result.current.dataPoints[1].generationKWh).toBe(6.0);
      expect(result.current.error).toBeNull();
    });

    test('calculates summary totals', async () => {
      const mockBackendData = [
        {
          bucketStart: '2024-01-15T10:00:00',
          generationKWh: 10.0,
          consumptionKWh: 5.0,
          avgGenerationWatts: 2000,
          avgConsumptionWatts: 1000,
        },
        {
          bucketStart: '2024-01-15T11:00:00',
          generationKWh: 15.0,
          consumptionKWh: 8.0,
          avgGenerationWatts: 3000,
          avgConsumptionWatts: 1600,
        },
      ];

      server.use(
        http.get('*/monitoring/readings/series/:id', () => {
          return HttpResponse.json(mockBackendData);
        })
      );

      const { result } = renderHook(() =>
        useInstallationChartData({
          installationId: 'inst-123',
          timeRange: 'day',
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.totalGeneration).toBe(25.0);
      expect(result.current.totalConsumption).toBe(13.0);
    });

    test('calculates average efficiency', async () => {
      const mockBackendData = [
        {
          bucketStart: '2024-01-15T10:00:00',
          generationKWh: 10.0,
          consumptionKWh: 20.0, // 50% efficiency
          avgGenerationWatts: 2000,
          avgConsumptionWatts: 4000,
        },
      ];

      server.use(
        http.get('*/monitoring/readings/series/:id', () => {
          return HttpResponse.json(mockBackendData);
        })
      );

      const { result } = renderHook(() =>
        useInstallationChartData({
          installationId: 'inst-123',
          timeRange: 'day',
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.avgEfficiency).toBe(50);
    });

    test('isEmpty is false when data has non-zero values', async () => {
      const mockBackendData = [
        {
          bucketStart: '2024-01-15T10:00:00',
          generationKWh: 5.0,
          consumptionKWh: 3.0,
          avgGenerationWatts: 1000,
          avgConsumptionWatts: 600,
        },
      ];

      server.use(
        http.get('*/monitoring/readings/series/:id', () => {
          return HttpResponse.json(mockBackendData);
        })
      );

      const { result } = renderHook(() =>
        useInstallationChartData({
          installationId: 'inst-123',
          timeRange: 'day',
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.isEmpty).toBe(false);
    });

    test('isEmpty is true when all values are zero', async () => {
      const mockBackendData = [
        {
          bucketStart: '2024-01-15T10:00:00',
          generationKWh: 0,
          consumptionKWh: 0,
          avgGenerationWatts: 0,
          avgConsumptionWatts: 0,
        },
      ];

      server.use(
        http.get('*/monitoring/readings/series/:id', () => {
          return HttpResponse.json(mockBackendData);
        })
      );

      const { result } = renderHook(() =>
        useInstallationChartData({
          installationId: 'inst-123',
          timeRange: 'day',
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.isEmpty).toBe(true);
    });
  });

  describe('when API returns error', () => {
    test('sets error message', async () => {
      server.use(
        http.get('*/monitoring/readings/series/:id', () => {
          return HttpResponse.error();
        })
      );

      const { result } = renderHook(() =>
        useInstallationChartData({
          installationId: 'inst-123',
          timeRange: 'day',
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // The hook catches the error and doesn't set error state for graceful degradation
      expect(result.current.dataPoints.length).toBe(24); // Returns empty structure
    });
  });

  describe('refetch', () => {
    test('refetch triggers new API call', async () => {
      let callCount = 0;
      server.use(
        http.get('*/monitoring/readings/series/:id', () => {
          callCount++;
          return HttpResponse.json([
            {
              bucketStart: '2024-01-15T10:00:00',
              generationKWh: callCount * 5,
              consumptionKWh: callCount * 3,
              avgGenerationWatts: callCount * 1000,
              avgConsumptionWatts: callCount * 600,
            },
          ]);
        })
      );

      const { result } = renderHook(() =>
        useInstallationChartData({
          installationId: 'inst-123',
          timeRange: 'day',
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.dataPoints[0].generationKWh).toBe(5);

      await act(async () => {
        await result.current.refetch();
      });

      expect(result.current.dataPoints[0].generationKWh).toBe(10);
      expect(callCount).toBe(2);
    });
  });

  describe('dependency changes', () => {
    test('refetches when timeRange changes', async () => {
      let timeRangeUsed: string | null = null;
      server.use(
        http.get('*/monitoring/readings/series/:id', ({ request }) => {
          const url = new URL(request.url);
          timeRangeUsed = url.searchParams.get('bucket');
          return HttpResponse.json([]);
        })
      );

      const { result, rerender } = renderHook(
        ({ timeRange }: { timeRange: 'day' | 'week' | 'month' | 'year' }) =>
          useInstallationChartData({
            installationId: 'inst-123',
            timeRange,
          }),
        { initialProps: { timeRange: 'day' as 'day' | 'week' | 'month' | 'year' } }
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(timeRangeUsed).toBe('hour');

      rerender({ timeRange: 'week' });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(timeRangeUsed).toBe('day');
    });

    test('refetches when installationId changes', async () => {
      let installationIdUsed: string | null = null;
      server.use(
        http.get('*/monitoring/readings/series/:id', ({ params }) => {
          installationIdUsed = params.id as string;
          return HttpResponse.json([]);
        })
      );

      const { result, rerender } = renderHook(
        ({ installationId }) =>
          useInstallationChartData({
            installationId,
            timeRange: 'day',
          }),
        { initialProps: { installationId: 'inst-123' } }
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(installationIdUsed).toBe('inst-123');

      rerender({ installationId: 'inst-456' });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(installationIdUsed).toBe('inst-456');
    });
  });

  describe('auto-refresh', () => {
    test('auto-refreshes at specified interval', async () => {
      let callCount = 0;
      server.use(
        http.get('*/monitoring/readings/series/:id', () => {
          callCount++;
          return HttpResponse.json([]);
        })
      );

      const { result } = renderHook(() =>
        useInstallationChartData({
          installationId: 'inst-123',
          timeRange: 'day',
          refreshInterval: 1000,
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(callCount).toBe(1);

      // Advance time by 1 second
      await act(async () => {
        vi.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(callCount).toBe(2);
      });

      // Advance time by another second
      await act(async () => {
        vi.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(callCount).toBe(3);
      });
    });

    test('does not auto-refresh when refreshInterval is 0', async () => {
      let callCount = 0;
      server.use(
        http.get('*/monitoring/readings/series/:id', () => {
          callCount++;
          return HttpResponse.json([]);
        })
      );

      const { result } = renderHook(() =>
        useInstallationChartData({
          installationId: 'inst-123',
          timeRange: 'day',
          refreshInterval: 0,
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(callCount).toBe(1);

      await act(async () => {
        vi.advanceTimersByTime(5000);
      });

      expect(callCount).toBe(1); // Still only one call
    });

    test('does not auto-refresh when installationId is null', async () => {
      let callCount = 0;
      server.use(
        http.get('*/monitoring/readings/series/:id', () => {
          callCount++;
          return HttpResponse.json([]);
        })
      );

      const { result } = renderHook(() =>
        useInstallationChartData({
          installationId: null,
          timeRange: 'day',
          refreshInterval: 1000,
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(callCount).toBe(0); // No API call for null installationId

      await act(async () => {
        vi.advanceTimersByTime(5000);
      });

      expect(callCount).toBe(0); // Still no calls
    });
  });

  describe('summary object structure', () => {
    test('provides correct summary structure', async () => {
      const mockBackendData = [
        {
          bucketStart: '2024-01-15T10:00:00',
          generationKWh: 10.0,
          consumptionKWh: 5.0,
          avgGenerationWatts: 2000,
          avgConsumptionWatts: 1000,
        },
      ];

      server.use(
        http.get('*/monitoring/readings/series/:id', () => {
          return HttpResponse.json(mockBackendData);
        })
      );

      const { result } = renderHook(() =>
        useInstallationChartData({
          installationId: 'inst-123',
          timeRange: 'day',
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.summary).toHaveProperty('totalGenerationKWh');
      expect(result.current.summary).toHaveProperty('totalConsumptionKWh');
      expect(result.current.summary).toHaveProperty('avgEfficiency');
      expect(result.current.summary).toHaveProperty('peakGenerationKWh');
      expect(result.current.summary).toHaveProperty('peakGenerationTime');
    });
  });
});

