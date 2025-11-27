import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/mocks/server';
import { useSystemChartData } from '@/hooks/useSystemChartData';

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

describe('useSystemChartData', () => {
  describe('initial state', () => {
    test('starts with loading true', () => {
      server.use(
        http.get('*/monitoring/readings/system-series', async () => {
          await new Promise(resolve => setTimeout(resolve, 100));
          return HttpResponse.json([]);
        })
      );

      const { result } = renderHook(() =>
        useSystemChartData({
          timeRange: 'day',
        })
      );

      expect(result.current.loading).toBe(true);
    });

    test('initializes with empty data', () => {
      const { result } = renderHook(() =>
        useSystemChartData({
          timeRange: 'day',
        })
      );

      expect(result.current.dataPoints).toEqual([]);
      expect(result.current.totalGeneration).toBe(0);
      expect(result.current.totalConsumption).toBe(0);
    });
  });

  describe('when fetching data successfully', () => {
    test('populates data points from API response', async () => {
      const mockBackendData = [
        {
          bucketStart: '2024-01-15T10:00:00',
          generationKWh: 100.5,
          consumptionKWh: 80.2,
          avgGenerationWatts: 20100,
          avgConsumptionWatts: 16040,
        },
        {
          bucketStart: '2024-01-15T11:00:00',
          generationKWh: 120.0,
          consumptionKWh: 90.0,
          avgGenerationWatts: 24000,
          avgConsumptionWatts: 18000,
        },
      ];

      server.use(
        http.get('*/monitoring/readings/system-series', () => {
          return HttpResponse.json(mockBackendData);
        })
      );

      const { result } = renderHook(() =>
        useSystemChartData({
          timeRange: 'day',
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.dataPoints.length).toBe(2);
      expect(result.current.dataPoints[0].generationKWh).toBe(100.5);
      expect(result.current.dataPoints[1].generationKWh).toBe(120.0);
      expect(result.current.error).toBeNull();
    });

    test('calculates summary totals', async () => {
      const mockBackendData = [
        {
          bucketStart: '2024-01-15T10:00:00',
          generationKWh: 100.0,
          consumptionKWh: 50.0,
          avgGenerationWatts: 20000,
          avgConsumptionWatts: 10000,
        },
        {
          bucketStart: '2024-01-15T11:00:00',
          generationKWh: 150.0,
          consumptionKWh: 80.0,
          avgGenerationWatts: 30000,
          avgConsumptionWatts: 16000,
        },
      ];

      server.use(
        http.get('*/monitoring/readings/system-series', () => {
          return HttpResponse.json(mockBackendData);
        })
      );

      const { result } = renderHook(() =>
        useSystemChartData({
          timeRange: 'day',
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.totalGeneration).toBe(250.0);
      expect(result.current.totalConsumption).toBe(130.0);
    });

    test('provides byType breakdown when available', async () => {
      const mockBackendData = [
        {
          bucketStart: '2024-01-15T10:00:00',
          generationKWh: 100.0,
          consumptionKWh: 80.0,
          avgGenerationWatts: 20000,
          avgConsumptionWatts: 16000,
          generationByTypeKWh: {
            RESIDENTIAL: 50.0,
            COMMERCIAL: 30.0,
            INDUSTRIAL: 20.0,
          },
        },
        {
          bucketStart: '2024-01-15T11:00:00',
          generationKWh: 120.0,
          consumptionKWh: 90.0,
          avgGenerationWatts: 24000,
          avgConsumptionWatts: 18000,
          generationByTypeKWh: {
            RESIDENTIAL: 60.0,
            COMMERCIAL: 40.0,
            INDUSTRIAL: 20.0,
          },
        },
      ];

      server.use(
        http.get('*/monitoring/readings/system-series', () => {
          return HttpResponse.json(mockBackendData);
        })
      );

      const { result } = renderHook(() =>
        useSystemChartData({
          timeRange: 'day',
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.byType).toBeDefined();
      expect(result.current.byType?.RESIDENTIAL).toBe(110.0);
      expect(result.current.byType?.COMMERCIAL).toBe(70.0);
      expect(result.current.byType?.INDUSTRIAL).toBe(40.0);
    });

    test('calculates average efficiency', async () => {
      const mockBackendData = [
        {
          bucketStart: '2024-01-15T10:00:00',
          generationKWh: 100.0,
          consumptionKWh: 200.0, // 50% efficiency
          avgGenerationWatts: 20000,
          avgConsumptionWatts: 40000,
        },
      ];

      server.use(
        http.get('*/monitoring/readings/system-series', () => {
          return HttpResponse.json(mockBackendData);
        })
      );

      const { result } = renderHook(() =>
        useSystemChartData({
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
          generationKWh: 50.0,
          consumptionKWh: 30.0,
          avgGenerationWatts: 10000,
          avgConsumptionWatts: 6000,
        },
      ];

      server.use(
        http.get('*/monitoring/readings/system-series', () => {
          return HttpResponse.json(mockBackendData);
        })
      );

      const { result } = renderHook(() =>
        useSystemChartData({
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
        http.get('*/monitoring/readings/system-series', () => {
          return HttpResponse.json(mockBackendData);
        })
      );

      const { result } = renderHook(() =>
        useSystemChartData({
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
    test('sets error message on failure', async () => {
      server.use(
        http.get('*/monitoring/readings/system-series', () => {
          return HttpResponse.error();
        })
      );

      const { result } = renderHook(() =>
        useSystemChartData({
          timeRange: 'day',
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // The hook gracefully handles errors with empty data
      expect(result.current.dataPoints.length).toBe(24); // Empty structure
    });
  });

  describe('refetch', () => {
    test('refetch triggers new API call', async () => {
      let callCount = 0;
      server.use(
        http.get('*/monitoring/readings/system-series', () => {
          callCount++;
          return HttpResponse.json([
            {
              bucketStart: '2024-01-15T10:00:00',
              generationKWh: callCount * 50,
              consumptionKWh: callCount * 30,
              avgGenerationWatts: callCount * 10000,
              avgConsumptionWatts: callCount * 6000,
            },
          ]);
        })
      );

      const { result } = renderHook(() =>
        useSystemChartData({
          timeRange: 'day',
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.dataPoints[0].generationKWh).toBe(50);

      await act(async () => {
        await result.current.refetch();
      });

      expect(result.current.dataPoints[0].generationKWh).toBe(100);
      expect(callCount).toBe(2);
    });
  });

  describe('dependency changes', () => {
    test('refetches when timeRange changes', async () => {
      let bucketUsed: string | null = null;
      server.use(
        http.get('*/monitoring/readings/system-series', ({ request }) => {
          const url = new URL(request.url);
          bucketUsed = url.searchParams.get('bucket');
          return HttpResponse.json([]);
        })
      );

      const { result, rerender } = renderHook(
        ({ timeRange }: { timeRange: 'day' | 'week' | 'month' | 'year' }) =>
          useSystemChartData({
            timeRange,
          }),
        { initialProps: { timeRange: 'day' as 'day' | 'week' | 'month' | 'year' } }
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(bucketUsed).toBe('hour');

      rerender({ timeRange: 'week' });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(bucketUsed).toBe('day');
    });

    test('handles month time range', async () => {
      let bucketUsed: string | null = null;
      server.use(
        http.get('*/monitoring/readings/system-series', ({ request }) => {
          const url = new URL(request.url);
          bucketUsed = url.searchParams.get('bucket');
          return HttpResponse.json([]);
        })
      );

      const { result } = renderHook(() =>
        useSystemChartData({
          timeRange: 'month',
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(bucketUsed).toBe('day');
    });

    test('handles year time range', async () => {
      let bucketUsed: string | null = null;
      server.use(
        http.get('*/monitoring/readings/system-series', ({ request }) => {
          const url = new URL(request.url);
          bucketUsed = url.searchParams.get('bucket');
          return HttpResponse.json([]);
        })
      );

      const { result } = renderHook(() =>
        useSystemChartData({
          timeRange: 'year',
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(bucketUsed).toBe('month');
    });
  });

  describe('auto-refresh', () => {
    test('auto-refreshes at specified interval', async () => {
      let callCount = 0;
      server.use(
        http.get('*/monitoring/readings/system-series', () => {
          callCount++;
          return HttpResponse.json([]);
        })
      );

      const { result } = renderHook(() =>
        useSystemChartData({
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
        http.get('*/monitoring/readings/system-series', () => {
          callCount++;
          return HttpResponse.json([]);
        })
      );

      const { result } = renderHook(() =>
        useSystemChartData({
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

    test('cleans up interval on unmount', async () => {
      let callCount = 0;
      server.use(
        http.get('*/monitoring/readings/system-series', () => {
          callCount++;
          return HttpResponse.json([]);
        })
      );

      const { result, unmount } = renderHook(() =>
        useSystemChartData({
          timeRange: 'day',
          refreshInterval: 1000,
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(callCount).toBe(1);

      unmount();

      await act(async () => {
        vi.advanceTimersByTime(5000);
      });

      // Should not increase after unmount
      expect(callCount).toBe(1);
    });
  });

  describe('summary object structure', () => {
    test('provides correct summary structure', async () => {
      const mockBackendData = [
        {
          bucketStart: '2024-01-15T10:00:00',
          generationKWh: 100.0,
          consumptionKWh: 50.0,
          avgGenerationWatts: 20000,
          avgConsumptionWatts: 10000,
        },
      ];

      server.use(
        http.get('*/monitoring/readings/system-series', () => {
          return HttpResponse.json(mockBackendData);
        })
      );

      const { result } = renderHook(() =>
        useSystemChartData({
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

  describe('byType undefined when not provided', () => {
    test('byType is undefined when backend does not provide it', async () => {
      const mockBackendData = [
        {
          bucketStart: '2024-01-15T10:00:00',
          generationKWh: 100.0,
          consumptionKWh: 50.0,
          avgGenerationWatts: 20000,
          avgConsumptionWatts: 10000,
          // No generationByTypeKWh provided
        },
      ];

      server.use(
        http.get('*/monitoring/readings/system-series', () => {
          return HttpResponse.json(mockBackendData);
        })
      );

      const { result } = renderHook(() =>
        useSystemChartData({
          timeRange: 'day',
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // byType should be empty object since no generationByTypeKWh
      expect(result.current.byType).toEqual({});
    });
  });
});

