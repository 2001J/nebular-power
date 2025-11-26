/**
 * ChartControls Component
 * Time range selector and action buttons for energy charts
 */

"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Download, RefreshCw, Loader2 } from 'lucide-react';
import type { TimeRange } from '@/src/types/energyTypes';

export interface ChartControlsProps {
  timeRange: TimeRange;
  onTimeRangeChange: (value: TimeRange) => void;
  onRefresh?: () => void;
  onExport?: () => void;
  loading?: boolean;
  showButtonVariant?: boolean;
}

/**
 * ChartControls Component
 */
export function ChartControls({
  timeRange,
  onTimeRangeChange,
  onRefresh,
  onExport,
  loading = false,
  showButtonVariant = false
}: ChartControlsProps) {
  if (showButtonVariant) {
    // Button variant - used in the content header
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={timeRange === 'day' ? 'default' : 'outline'}
          onClick={() => onTimeRangeChange('day')}
          disabled={loading}
        >
          Day
        </Button>
        <Button
          variant={timeRange === 'week' ? 'default' : 'outline'}
          onClick={() => onTimeRangeChange('week')}
          disabled={loading}
        >
          Week
        </Button>
        <Button
          variant={timeRange === 'month' ? 'default' : 'outline'}
          onClick={() => onTimeRangeChange('month')}
          disabled={loading}
        >
          Month
        </Button>
        <Button
          variant={timeRange === 'year' ? 'default' : 'outline'}
          onClick={() => onTimeRangeChange('year')}
          disabled={loading}
        >
          Year
        </Button>
        {onExport && (
          <Button
            variant="outline"
            size="icon"
            onClick={onExport}
            disabled={loading}
            title="Export data"
          >
            <Download className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  }

  // Dropdown variant - used in the top header
  return (
    <div className="flex items-center gap-2">
      <Select
        value={timeRange}
        onValueChange={(value) => onTimeRangeChange(value as TimeRange)}
        disabled={loading}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select time range" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="day">Today</SelectItem>
          <SelectItem value="week">This Week</SelectItem>
          <SelectItem value="month">This Month</SelectItem>
          <SelectItem value="year">This Year</SelectItem>
        </SelectContent>
      </Select>
      
      {onRefresh && (
        <Button
          variant="outline"
          size="icon"
          onClick={onRefresh}
          disabled={loading}
          title="Refresh data"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
        </Button>
      )}
      
      {onExport && (
        <Button
          variant="outline"
          size="icon"
          onClick={onExport}
          disabled={loading}
          title="Export data"
        >
          <Download className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
