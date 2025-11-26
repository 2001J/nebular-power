import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/mocks/server';
import {
  getInstallationChartData,
  getSystemChartData,
  TimeRange,
} from '@/lib/api/chartData';

// Mock console methods to avoid noisy output in tests
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

beforeEach(() => {
  console.log = vi.fn();
  console.error = vi.fn();
});

afterEach(() => {
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
});

describe('getInstallationChartData', () => {
  describe('when installationId is empty', () => {
    test('returns empty data structure for null installationId', async () => {
      const result = await getInstallationChartData('', 'day');
      
      expect(result.dataPoints).toBeDefined();
      expect(result.dataPoints.length).toBe(24); // Empty day data has 24 hours
      expect(result.summary.totalGenerationKWh).toBe(0);
      expect(result.summary.totalConsumptionKWh).toBe(0);
      expect(result.isSystemWide).toBe(false);
      expect(result.installationId).toBeNull();
    });
  });

  describe('when backend returns data', () => {
    test('transforms day data correctly', async () => {
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

      const result = await getInstallationChartData('inst-123', 'day');

      expect(result.dataPoints.length).toBe(2);
      expect(result.dataPoints[0].label).toBe('10:00');
      expect(result.dataPoints[0].generationKWh).toBe(5.5);
      expect(result.dataPoints[0].consumptionKWh).toBe(3.2);
      expect(result.dataPoints[1].label).toBe('11:00');
      expect(result.summary.totalGenerationKWh).toBe(11.5);
      expect(result.summary.totalConsumptionKWh).toBe(7.2);
      expect(result.isSystemWide).toBe(false);
      expect(result.installationId).toBe('inst-123');
    });

    test('transforms week data correctly', async () => {
      // Test that weekday names are properly mapped
      const mockBackendData = [
        {
          bucketStart: '2024-01-15T00:00:00', // Monday
          generationKWh: 25.5,
          consumptionKWh: 15.2,
          avgGenerationWatts: 1000,
          avgConsumptionWatts: 600,
        },
      ];

      server.use(
        http.get('*/monitoring/readings/series/:id', () => {
          return HttpResponse.json(mockBackendData);
        })
      );

      const result = await getInstallationChartData('inst-123', 'week');

      expect(result.dataPoints.length).toBe(1);
      expect(result.dataPoints[0].label).toBe('Mon');
      expect(result.timeRange).toBe('week');
    });

    test('transforms month data correctly', async () => {
      const mockBackendData = [
        {
          bucketStart: '2024-01-15T00:00:00',
          generationKWh: 100.0,
          consumptionKWh: 80.0,
          avgGenerationWatts: 4166,
          avgConsumptionWatts: 3333,
        },
      ];

      server.use(
        http.get('*/monitoring/readings/series/:id', () => {
          return HttpResponse.json(mockBackendData);
        })
      );

      const result = await getInstallationChartData('inst-123', 'month');

      expect(result.dataPoints.length).toBe(1);
      expect(result.dataPoints[0].label).toBe('15');
      expect(result.timeRange).toBe('month');
    });

    test('transforms year data correctly', async () => {
      const mockBackendData = [
        {
          bucketStart: '2024-01-01T00:00:00', // January
          generationKWh: 1000.0,
          consumptionKWh: 800.0,
          avgGenerationWatts: 1344,
          avgConsumptionWatts: 1075,
        },
        {
          bucketStart: '2024-06-01T00:00:00', // June
          generationKWh: 1500.0,
          consumptionKWh: 900.0,
          avgGenerationWatts: 2016,
          avgConsumptionWatts: 1200,
        },
      ];

      server.use(
        http.get('*/monitoring/readings/series/:id', () => {
          return HttpResponse.json(mockBackendData);
        })
      );

      const result = await getInstallationChartData('inst-123', 'year');

      expect(result.dataPoints.length).toBe(2);
      expect(result.dataPoints[0].label).toBe('Jan');
      expect(result.dataPoints[1].label).toBe('Jun');
      expect(result.timeRange).toBe('year');
    });

    test('calculates efficiency correctly', async () => {
      const mockBackendData = [
        {
          bucketStart: '2024-01-15T10:00:00',
          generationKWh: 10.0,
          consumptionKWh: 20.0, // 50% efficiency
          avgGenerationWatts: 1000,
          avgConsumptionWatts: 2000,
        },
      ];

      server.use(
        http.get('*/monitoring/readings/series/:id', () => {
          return HttpResponse.json(mockBackendData);
        })
      );

      const result = await getInstallationChartData('inst-123', 'day');

      expect(result.dataPoints[0].efficiency).toBe(50);
    });

    test('caps efficiency at 100%', async () => {
      const mockBackendData = [
        {
          bucketStart: '2024-01-15T10:00:00',
          generationKWh: 30.0,
          consumptionKWh: 10.0, // 300% efficiency, should cap at 100
          avgGenerationWatts: 3000,
          avgConsumptionWatts: 1000,
        },
      ];

      server.use(
        http.get('*/monitoring/readings/series/:id', () => {
          return HttpResponse.json(mockBackendData);
        })
      );

      const result = await getInstallationChartData('inst-123', 'day');

      expect(result.dataPoints[0].efficiency).toBe(100);
    });

    test('handles zero consumption (0% efficiency)', async () => {
      const mockBackendData = [
        {
          bucketStart: '2024-01-15T10:00:00',
          generationKWh: 10.0,
          consumptionKWh: 0, // No consumption
          avgGenerationWatts: 1000,
          avgConsumptionWatts: 0,
        },
      ];

      server.use(
        http.get('*/monitoring/readings/series/:id', () => {
          return HttpResponse.json(mockBackendData);
        })
      );

      const result = await getInstallationChartData('inst-123', 'day');

      expect(result.dataPoints[0].efficiency).toBe(0);
    });

    test('sorts data by timestamp', async () => {
      const mockBackendData = [
        {
          bucketStart: '2024-01-15T12:00:00',
          generationKWh: 6.0,
          consumptionKWh: 4.0,
          avgGenerationWatts: 1200,
          avgConsumptionWatts: 800,
        },
        {
          bucketStart: '2024-01-15T10:00:00',
          generationKWh: 5.5,
          consumptionKWh: 3.2,
          avgGenerationWatts: 1100,
          avgConsumptionWatts: 640,
        },
      ];

      server.use(
        http.get('*/monitoring/readings/series/:id', () => {
          return HttpResponse.json(mockBackendData);
        })
      );

      const result = await getInstallationChartData('inst-123', 'day');

      expect(result.dataPoints[0].label).toBe('10:00');
      expect(result.dataPoints[1].label).toBe('12:00');
    });

    test('identifies peak generation time', async () => {
      const mockBackendData = [
        {
          bucketStart: '2024-01-15T10:00:00',
          generationKWh: 5.0,
          consumptionKWh: 3.0,
          avgGenerationWatts: 1000,
          avgConsumptionWatts: 600,
        },
        {
          bucketStart: '2024-01-15T12:00:00',
          generationKWh: 10.0, // Peak
          consumptionKWh: 4.0,
          avgGenerationWatts: 2000,
          avgConsumptionWatts: 800,
        },
        {
          bucketStart: '2024-01-15T14:00:00',
          generationKWh: 7.0,
          consumptionKWh: 5.0,
          avgGenerationWatts: 1400,
          avgConsumptionWatts: 1000,
        },
      ];

      server.use(
        http.get('*/monitoring/readings/series/:id', () => {
          return HttpResponse.json(mockBackendData);
        })
      );

      const result = await getInstallationChartData('inst-123', 'day');

      expect(result.summary.peakGenerationKWh).toBe(10.0);
      expect(result.summary.peakGenerationTime).toBe('12:00');
    });
  });

  describe('when backend returns empty array', () => {
    test('returns empty data points structure for day', async () => {
      server.use(
        http.get('*/monitoring/readings/series/:id', () => {
          return HttpResponse.json([]);
        })
      );

      const result = await getInstallationChartData('inst-123', 'day');

      expect(result.dataPoints.length).toBe(24); // Empty day structure
      expect(result.dataPoints[0].generationKWh).toBe(0);
    });

    test('returns empty data points structure for week', async () => {
      server.use(
        http.get('*/monitoring/readings/series/:id', () => {
          return HttpResponse.json([]);
        })
      );

      const result = await getInstallationChartData('inst-123', 'week');

      expect(result.dataPoints.length).toBe(7); // Empty week structure
    });

    test('returns proper month structure when empty', async () => {
      server.use(
        http.get('*/monitoring/readings/series/:id', () => {
          return HttpResponse.json([]);
        })
      );

      const result = await getInstallationChartData('inst-123', 'month');

      // Days in current month
      expect(result.dataPoints.length).toBeGreaterThanOrEqual(28);
      expect(result.dataPoints.length).toBeLessThanOrEqual(31);
    });

    test('returns proper year structure when empty', async () => {
      server.use(
        http.get('*/monitoring/readings/series/:id', () => {
          return HttpResponse.json([]);
        })
      );

      const result = await getInstallationChartData('inst-123', 'year');

      expect(result.dataPoints.length).toBe(12); // Empty year structure
    });
  });

  describe('when backend returns error', () => {
    test('returns empty data on API error', async () => {
      server.use(
        http.get('*/monitoring/readings/series/:id', () => {
          return HttpResponse.error();
        })
      );

      const result = await getInstallationChartData('inst-123', 'day');

      expect(result.dataPoints.length).toBe(24);
      expect(result.summary.totalGenerationKWh).toBe(0);
      expect(result.installationId).toBe('inst-123');
    });

    test('returns empty data on 500 error', async () => {
      server.use(
        http.get('*/monitoring/readings/series/:id', () => {
          return HttpResponse.json({ error: 'Server error' }, { status: 500 });
        })
      );

      const result = await getInstallationChartData('inst-123', 'day');

      expect(result.dataPoints).toBeDefined();
      expect(result.summary.totalGenerationKWh).toBe(0);
    });
  });

  describe('handles missing fields in backend data', () => {
    test('treats missing generationKWh as 0', async () => {
      const mockBackendData = [
        {
          bucketStart: '2024-01-15T10:00:00',
          consumptionKWh: 3.2,
          avgGenerationWatts: 0,
          avgConsumptionWatts: 640,
        },
      ];

      server.use(
        http.get('*/monitoring/readings/series/:id', () => {
          return HttpResponse.json(mockBackendData);
        })
      );

      const result = await getInstallationChartData('inst-123', 'day');

      expect(result.dataPoints[0].generationKWh).toBe(0);
    });

    test('treats missing consumptionKWh as 0', async () => {
      const mockBackendData = [
        {
          bucketStart: '2024-01-15T10:00:00',
          generationKWh: 5.5,
          avgGenerationWatts: 1100,
          avgConsumptionWatts: 0,
        },
      ];

      server.use(
        http.get('*/monitoring/readings/series/:id', () => {
          return HttpResponse.json(mockBackendData);
        })
      );

      const result = await getInstallationChartData('inst-123', 'day');

      expect(result.dataPoints[0].consumptionKWh).toBe(0);
    });
  });
});

describe('getSystemChartData', () => {
  describe('when backend returns data', () => {
    test('transforms system data correctly', async () => {
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

      const result = await getSystemChartData('day');

      expect(result.dataPoints.length).toBe(2);
      expect(result.summary.totalGenerationKWh).toBe(220.5);
      expect(result.summary.totalConsumptionKWh).toBe(170.2);
      expect(result.isSystemWide).toBe(true);
      expect(result.installationId).toBeNull();
    });

    test('extracts type breakdown when available', async () => {
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

      const result = await getSystemChartData('day');

      expect(result.byType).toBeDefined();
      expect(result.byType?.RESIDENTIAL).toBe(110.0);
      expect(result.byType?.COMMERCIAL).toBe(70.0);
      expect(result.byType?.INDUSTRIAL).toBe(40.0);
    });

    test('handles week time range', async () => {
      const mockBackendData = [
        {
          bucketStart: '2024-01-15T00:00:00',
          generationKWh: 500.0,
          consumptionKWh: 400.0,
          avgGenerationWatts: 20833,
          avgConsumptionWatts: 16666,
        },
      ];

      server.use(
        http.get('*/monitoring/readings/system-series', () => {
          return HttpResponse.json(mockBackendData);
        })
      );

      const result = await getSystemChartData('week');

      expect(result.timeRange).toBe('week');
      expect(result.dataPoints[0].label).toBe('Mon');
    });

    test('handles month time range', async () => {
      const mockBackendData = [
        {
          bucketStart: '2024-01-15T00:00:00',
          generationKWh: 1000.0,
          consumptionKWh: 800.0,
          avgGenerationWatts: 41666,
          avgConsumptionWatts: 33333,
        },
      ];

      server.use(
        http.get('*/monitoring/readings/system-series', () => {
          return HttpResponse.json(mockBackendData);
        })
      );

      const result = await getSystemChartData('month');

      expect(result.timeRange).toBe('month');
      expect(result.dataPoints[0].label).toBe('15');
    });

    test('handles year time range', async () => {
      const mockBackendData = [
        {
          bucketStart: '2024-06-01T00:00:00',
          generationKWh: 10000.0,
          consumptionKWh: 8000.0,
          avgGenerationWatts: 13888,
          avgConsumptionWatts: 11111,
        },
      ];

      server.use(
        http.get('*/monitoring/readings/system-series', () => {
          return HttpResponse.json(mockBackendData);
        })
      );

      const result = await getSystemChartData('year');

      expect(result.timeRange).toBe('year');
      expect(result.dataPoints[0].label).toBe('Jun');
    });
  });

  describe('when backend returns empty data', () => {
    test('returns empty data structure for day', async () => {
      server.use(
        http.get('*/monitoring/readings/system-series', () => {
          return HttpResponse.json([]);
        })
      );

      const result = await getSystemChartData('day');

      expect(result.dataPoints.length).toBe(24);
      expect(result.summary.totalGenerationKWh).toBe(0);
      expect(result.isSystemWide).toBe(true);
    });
  });

  describe('when backend returns error', () => {
    test('returns empty data on network error', async () => {
      server.use(
        http.get('*/monitoring/readings/system-series', () => {
          return HttpResponse.error();
        })
      );

      const result = await getSystemChartData('day');

      expect(result.dataPoints.length).toBe(24);
      expect(result.summary.totalGenerationKWh).toBe(0);
      expect(result.isSystemWide).toBe(true);
    });
  });
});

describe('TimeRange bucket size mapping', () => {
  test('day uses hour bucket', async () => {
    let capturedParams: URLSearchParams | null = null;
    
    server.use(
      http.get('*/monitoring/readings/series/:id', ({ request }) => {
        const url = new URL(request.url);
        capturedParams = url.searchParams;
        return HttpResponse.json([]);
      })
    );

    await getInstallationChartData('inst-123', 'day');

    expect(capturedParams?.get('bucket')).toBe('hour');
  });

  test('week uses day bucket', async () => {
    let capturedParams: URLSearchParams | null = null;
    
    server.use(
      http.get('*/monitoring/readings/series/:id', ({ request }) => {
        const url = new URL(request.url);
        capturedParams = url.searchParams;
        return HttpResponse.json([]);
      })
    );

    await getInstallationChartData('inst-123', 'week');

    expect(capturedParams?.get('bucket')).toBe('day');
  });

  test('month uses day bucket', async () => {
    let capturedParams: URLSearchParams | null = null;
    
    server.use(
      http.get('*/monitoring/readings/series/:id', ({ request }) => {
        const url = new URL(request.url);
        capturedParams = url.searchParams;
        return HttpResponse.json([]);
      })
    );

    await getInstallationChartData('inst-123', 'month');

    expect(capturedParams?.get('bucket')).toBe('day');
  });

  test('year uses month bucket', async () => {
    let capturedParams: URLSearchParams | null = null;
    
    server.use(
      http.get('*/monitoring/readings/series/:id', ({ request }) => {
        const url = new URL(request.url);
        capturedParams = url.searchParams;
        return HttpResponse.json([]);
      })
    );

    await getInstallationChartData('inst-123', 'year');

    expect(capturedParams?.get('bucket')).toBe('month');
  });
});

