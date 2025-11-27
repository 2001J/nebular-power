"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import dayjs, { Dayjs } from 'dayjs';
import { DateRange } from "react-day-picker"
import { cn } from "@/lib/utils"

type PresetType = 'today' | '7d' | '30d' | '90d' | null

interface MuiDateRangePickerProps {
  className?: string
  date: DateRange | undefined
  setDate: React.Dispatch<React.SetStateAction<DateRange | undefined>>
  showQuickSelectors?: boolean
  onDateChange?: () => void
  // Allow parent to control/reset the selected preset
  selectedPreset?: PresetType
  onPresetChange?: (preset: PresetType) => void
}

// Styling to match app's Input component
const getInputSx = (isDark: boolean) => ({
  borderRadius: '0.75rem',
  backgroundColor: isDark ? 'hsl(222.2 84% 4.9% / 0.8)' : 'hsl(0 0% 100% / 0.8)',
  boxShadow: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
  height: '2.25rem',
  '& .MuiOutlinedInput-input': {
    padding: '0.5rem 0.25rem 0.5rem 0.75rem',
    fontSize: '0.875rem',
    color: isDark ? 'hsl(210 40% 98%)' : 'hsl(222.2 84% 4.9%)',
    '&::placeholder': {
      color: isDark ? 'hsl(215 20.2% 65.1% / 0.8)' : 'hsl(215.4 16.3% 46.9% / 0.8)',
    },
  },
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: isDark ? 'hsl(217.2 32.6% 17.5% / 0.7)' : 'hsl(214.3 31.8% 91.4% / 0.7)',
    borderWidth: '1px',
  },
  '&:hover .MuiOutlinedInput-notchedOutline': {
    borderColor: isDark ? 'hsl(217.2 32.6% 25%)' : 'hsl(214.3 31.8% 80%)',
  },
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderColor: isDark ? 'hsl(212.7 26.8% 83.9%)' : 'hsl(222.2 84% 4.9%)',
    borderWidth: '2px',
  },
  '& .MuiSvgIcon-root': {
    fontSize: '1.125rem',
    color: isDark ? 'hsl(215 20.2% 65.1%)' : 'hsl(215.4 16.3% 46.9%)',
  },
  '& .MuiInputAdornment-root': {
    marginLeft: 0,
  },
});

export function MuiDateRangePicker({
  className,
  date,
  setDate,
  showQuickSelectors = true,
  onDateChange,
  selectedPreset: controlledPreset,
  onPresetChange,
}: MuiDateRangePickerProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  
  // Internal state for preset if not controlled
  const [internalPreset, setInternalPreset] = React.useState<PresetType>(null)
  
  // Use controlled or internal preset
  const activePreset = controlledPreset !== undefined ? controlledPreset : internalPreset
  const setActivePreset = (preset: PresetType) => {
    if (onPresetChange) {
      onPresetChange(preset)
    } else {
      setInternalPreset(preset)
    }
  }

  // Create MUI theme based on resolved theme
  const muiTheme = React.useMemo(() => createTheme({
    palette: {
      mode: isDark ? 'dark' : 'light',
    },
    components: {
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: '0.75rem',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
            border: isDark ? '1px solid hsl(217.2 32.6% 17.5% / 0.5)' : '1px solid hsl(214.3 31.8% 91.4%)',
          },
        },
      },
      MuiButtonBase: {
        styleOverrides: {
          root: {
            borderRadius: '0.5rem',
          },
        },
      },
    },
  }), [isDark]);

  const handleFromChange = (newDate: Dayjs | null) => {
    // Manual date change clears the preset
    setActivePreset(null)
    setDate(prev => ({
      from: newDate ? newDate.toDate() : undefined,
      to: prev?.to,
    }));
    onDateChange?.();
  };

  const handleToChange = (newDate: Dayjs | null) => {
    // Manual date change clears the preset
    setActivePreset(null)
    setDate(prev => ({
      from: prev?.from,
      to: newDate ? newDate.toDate() : undefined,
    }));
    onDateChange?.();
  };

  const setQuickRange = (preset: PresetType) => {
    if (!preset) return
    
    // Set "from" to start of day (00:00:00)
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    
    // Set "to" to end of day (23:59:59)
    const to = new Date();
    to.setHours(23, 59, 59, 999);
    
    if (preset === '7d') {
      from.setDate(from.getDate() - 7);
    } else if (preset === '30d') {
      from.setDate(from.getDate() - 30);
    } else if (preset === '90d') {
      from.setDate(from.getDate() - 90);
    }
    // 'today' keeps from as today
    
    setActivePreset(preset)
    setDate({ from, to });
    onDateChange?.();
  };

  const getButtonClass = (preset: PresetType) => {
    const isActive = activePreset === preset
    return cn(
      "h-7 px-2 text-xs font-medium rounded-lg border transition-all",
      isActive
        ? "border-primary bg-primary text-primary-foreground shadow-sm"
        : "border-border/70 bg-card/40 text-foreground/80 hover:bg-card hover:text-foreground"
    );
  };

  return (
    <ThemeProvider theme={muiTheme}>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <div className={cn("inline-flex items-center gap-2", className)}>
          <div className="inline-flex items-center gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">From</span>
            <DatePicker
              value={date?.from ? dayjs(date.from) : null}
              onChange={handleFromChange}
              maxDate={date?.to ? dayjs(date.to) : undefined}
              slotProps={{
                textField: {
                  size: "small",
                  sx: { width: 130 },
                  InputProps: {
                    sx: getInputSx(isDark),
                  },
                },
              }}
            />
          </div>
          <div className="inline-flex items-center gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">To</span>
            <DatePicker
              value={date?.to ? dayjs(date.to) : null}
              onChange={handleToChange}
              minDate={date?.from ? dayjs(date.from) : undefined}
              slotProps={{
                textField: {
                  size: "small",
                  sx: { width: 130 },
                  InputProps: {
                    sx: getInputSx(isDark),
                  },
                },
              }}
            />
          </div>
          
          {showQuickSelectors && (
            <div className="inline-flex items-center gap-1 ml-1 pl-2 border-l border-border/50">
              <button
                type="button"
                onClick={() => setQuickRange('today')}
                className={getButtonClass('today')}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setQuickRange('7d')}
                className={getButtonClass('7d')}
              >
                7d
              </button>
              <button
                type="button"
                onClick={() => setQuickRange('30d')}
                className={getButtonClass('30d')}
              >
                30d
              </button>
              <button
                type="button"
                onClick={() => setQuickRange('90d')}
                className={getButtonClass('90d')}
              >
                90d
              </button>
            </div>
          )}
        </div>
      </LocalizationProvider>
    </ThemeProvider>
  );
}
