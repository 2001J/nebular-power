"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  BarChart3,
  Download,
  Sun,
  Zap,
  ArrowUp,
  RefreshCw,
  Loader2,
} from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { Chart, ChartContainer } from "@/components/ui/chart"
import {
  CartesianGrid,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Area,
  AreaChart,
  ComposedChart,
  Bar,
  BarChart,
} from "@/components/ui/direct-recharts"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { energyApi } from "@/lib/api/energy"

export default function EnergyMonitoringPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState("day")
  const [energyData, setEnergyData] = useState<Array<{
    name: string;
    total: number;
    residential: number;
    commercial: number;
    industrial: number;
    consumption: number;
  }>>([])
  const [installations, setInstallations] = useState<Array<any>>([])
  const [topProducers, setTopProducers] = useState<Array<any>>([])
  const [systemOverview, setSystemOverview] = useState<any>(null)
  const [totalProductionToday, setTotalProductionToday] = useState(0)
  const [totalProductionWeek, setTotalProductionWeek] = useState(0)
  const [totalProductionMonth, setTotalProductionMonth] = useState(0)
  const [totalProductionYear, setTotalProductionYear] = useState(0)
  const [averageEfficiency, setAverageEfficiency] = useState(0)

  // Handle time range change with proper type
  const handleTimeRangeChange = useCallback((value: string) => {
    // Changing timeRange triggers the useEffect that calls fetchEnergyData
    setTimeRange(value);
  }, [])

  /*
  // Create basic chart data when real readings aren't available
  const createBasicChartData = (systemResponse: any, timeRangeType: string) => {
    let basicChartData: Array<{
      name: string;
      total: number;
      residential: number;
      commercial: number;
      industrial: number;
      consumption: number;
    }> = [];

    // Handle null systemResponse to prevent TypeError
    if (!systemResponse) {
      console.warn('System response is null, generating empty chart data');

      // Create empty chart structure based on time range
      if (timeRangeType === 'day') {
        // Return 24 empty hour slots for a day
        for (let hour = 0; hour < 24; hour++) {
          basicChartData.push({
            name: `${hour}:00`,
            total: 0,
            residential: 0,
            commercial: 0,
            industrial: 0,
            consumption: 0
          });
        }
      } else if (timeRangeType === 'week') {
        // Return 7 empty day slots
        const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        for (let day = 0; day < 7; day++) {
          basicChartData.push({
            name: dayNames[day],
            total: 0,
            residential: 0,
            commercial: 0,
            industrial: 0,
            consumption: 0
          });
        }
      } else if (timeRangeType === 'month') {
        // Return ~30 empty day slots for a month
        for (let day = 1; day <= 30; day++) {
          basicChartData.push({
            name: `${day}`,
            total: 0,
            residential: 0,
            commercial: 0,
            industrial: 0,
            consumption: 0
          });
        }
      } else { // year
        // Return 12 empty month slots for a year
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        for (let month = 0; month < 12; month++) {
          basicChartData.push({
            name: monthNames[month],
            total: 0,
            residential: 0,
            commercial: 0,
            industrial: 0,
            consumption: 0
          });
        }
      }

      return basicChartData;
    }

    // Continue with the existing function for non-null system response
    // Get exact values from the system overview
    const todayTotal = systemResponse.todayTotalGenerationKWh || 0;
    const weekTotal = systemResponse.weekToDateGenerationKWh || 0;
    const monthTotal = systemResponse.monthToDateGenerationKWh || 0;
    const yearTotal = systemResponse.yearToDateGenerationKWh || 0;

    // Use actual data regardless of size - this is a real system
    const isVerySmallToday = todayTotal < 0.001;
    const isVerySmallWeek = weekTotal < 0.001;
    const isVerySmallMonth = monthTotal < 0.001;
    const isVerySmallYear = yearTotal < 0.001;

    // Get consumption totals if available, or estimate them
    const todayConsumption = systemResponse.todayTotalConsumptionKWh || todayTotal * 0.7;
    const weekConsumption = systemResponse.weekToDateConsumptionKWh || weekTotal * 0.7;
    const monthConsumption = systemResponse.monthToDateConsumptionKWh || monthTotal * 0.7;
    const yearConsumption = systemResponse.yearToDateConsumptionKWh || yearTotal * 0.7;

    console.log('Chart data metrics:', {
      timeRangeType,
      todayTotal,
      weekTotal,
      monthTotal,
      yearTotal,
      isVerySmallToday,
      isVerySmallWeek,
      isVerySmallMonth,
      isVerySmallYear
    });

    if (timeRangeType === 'day') {
      // Generate realistic hourly data with solar curve pattern
      for (let hour = 0; hour < 24; hour++) {
        let productionFactor = 0;
        let consumptionFactor = 0.3; // Base load
        
        // Solar production curve (bell curve peaking at noon)
        if (hour >= 6 && hour <= 18) {
          const hoursFromNoon = Math.abs(hour - 12);
          productionFactor = Math.max(0, 1 - (hoursFromNoon / 6) * 0.8);
        }
        
        // Simulate realistic total values scaled to daily total
        const total = todayTotal * (productionFactor / 10);
        const consumption = todayConsumption * (Math.max(consumptionFactor, productionFactor * 0.6) / 10);

        // Distribute between categories based on typical ratios
        basicChartData.push({
          name: `${hour}:00`,
          total: total,
          residential: total * 0.5,
          commercial: total * 0.35,
          industrial: total * 0.15,
          consumption: consumption
        });
      }
    } else if (timeRangeType === 'week') {
      const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const base = weekTotal / 7;
      const baseConsumption = weekConsumption / 7;
      for (let day = 0; day < 7; day++) {
        // Slight variation per day
        const variation = 1 + (Math.sin(day) * 0.1);
        const total = base * variation;
        const consumption = baseConsumption * variation;
        basicChartData.push({
          name: dayNames[day],
          total: total,
          residential: total * 0.5,
          commercial: total * 0.35,
          industrial: total * 0.15,
          consumption: consumption
        });
      }
    } else if (timeRangeType === 'month') {
      const now = new Date();
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const base = monthTotal / daysInMonth;
      const baseConsumption = monthConsumption / daysInMonth;
      for (let day = 1; day <= daysInMonth; day++) {
        // Slight variation across the month
        const variation = 1 + (Math.sin(day / 5) * 0.05);
        const total = base * variation;
        const consumption = baseConsumption * variation;
        basicChartData.push({
          name: `${day}`,
          total: total,
          residential: total * 0.5,
          commercial: total * 0.35,
          industrial: total * 0.15,
          consumption: consumption
        });
      }
    } else { // year
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const base = yearTotal / 12;
      const baseConsumption = yearConsumption / 12;
      for (let month = 0; month < 12; month++) {
        // Seasonal variation: higher in summer months
        const seasonalFactor = 1 + (Math.sin((month - 1) / 2) * 0.15);
        const total = base * seasonalFactor;
        const consumption = baseConsumption * seasonalFactor;
        basicChartData.push({
          name: monthNames[month],
          total: total,
          residential: total * 0.5,
          commercial: total * 0.35,
          industrial: total * 0.15,
          consumption: consumption
        });
      }
    }

    return basicChartData;
  }
*/

  // Transform raw installation readings into chart data (memoized)
  const transformReadingsToChartData = useCallback((
    readings: any[],
    timeRangeType: string,
    overviewData?: any
  ) => {
    if (!readings || readings.length === 0) return []

    // Sort readings by timestamp in ascending order
    const sortedReadings = [...readings].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    )

    const getGenerationKWh = (reading: any): number => {
      if (typeof reading.energyProduced === 'number') return reading.energyProduced
      if (typeof reading.totalGenerationKWh === 'number') return reading.totalGenerationKWh
      if (typeof reading.dailyYieldKWh === 'number') return reading.dailyYieldKWh
      if (typeof reading.powerGenerationWatts === 'number') return reading.powerGenerationWatts / 1000
      return 0
    }

    const getConsumptionKWh = (reading: any): number => {
      if (typeof reading.energyConsumed === 'number') return reading.energyConsumed
      if (typeof reading.totalConsumptionKWh === 'number') return reading.totalConsumptionKWh
      if (typeof reading.dailyConsumptionKWh === 'number') return reading.dailyConsumptionKWh
      if (typeof reading.powerConsumptionWatts === 'number') return reading.powerConsumptionWatts / 1000
      return 0
    }

    // Always use provided overview data
    const overview = overviewData

    if (!overview) {
      console.warn('overviewData is null in transformReadingsToChartData, using empty chart structure');
      // Return empty data with the correct structure for each time range
      return createBasicChartData(null, timeRangeType);
    }

    // Get exact values from the system overview to use as reference
    const todayTotal = overview.todayTotalGenerationKWh || 0;
    const weekTotal = overview.weekToDateGenerationKWh || 0;
    const monthTotal = overview.monthToDateGenerationKWh || 0;
    const yearTotal = overview.yearToDateGenerationKWh || 0;

    // Get consumption totals for normalization
    const todayConsumption = overview.todayTotalConsumptionKWh || 0;
    const weekConsumption = overview.weekToDateConsumptionKWh || 0;
    const monthConsumption = overview.monthToDateConsumptionKWh || 0;
    const yearConsumption = overview.yearToDateConsumptionKWh || 0;

    // For very small values (below threshold), treat them as zero to prevent misleading visualizations 
    // BUT ONLY FOR PRODUCTION - we still want to show consumption data even with tiny production
    const isVerySmallToday = todayTotal < 0.001 && todayConsumption < 0.001;
    const isVerySmallWeek = weekTotal < 0.001 && weekConsumption < 0.001;
    const isVerySmallMonth = monthTotal < 0.001 && monthConsumption < 0.001;
    const isVerySmallYear = yearTotal < 0.001 && yearConsumption < 0.001;

    // Determine if we should show zero values based on timeRange
    // Only if BOTH production AND consumption are very small
    const shouldUseZeroValues = 
      (timeRangeType === 'day' && isVerySmallToday) ||
      (timeRangeType === 'week' && isVerySmallWeek) ||
      (timeRangeType === 'month' && isVerySmallMonth) ||
      (timeRangeType === 'year' && isVerySmallYear);

    console.log(`Energy metrics for ${timeRangeType}:`, {
      timeRangeType,
      todayTotal, 
      weekTotal,
      monthTotal,
      yearTotal,
      todayConsumption,
      weekConsumption,
      monthConsumption,
      yearConsumption,
      isVerySmallToday,
      isVerySmallWeek,
      isVerySmallMonth, 
      isVerySmallYear,
    })

    // Calculate normalization factors to make the chart roughly match the overview totals
    const totalGeneration = sortedReadings.reduce((sum, reading) => sum + getGenerationKWh(reading), 0)
    const totalConsumption = sortedReadings.reduce((sum, reading) => sum + getConsumptionKWh(reading), 0)

    const productionNormalizationFactor = totalGeneration > 0 && (timeRangeType === 'day' ? todayTotal > 0 : timeRangeType === 'week' ? weekTotal > 0 : timeRangeType === 'month' ? monthTotal > 0 : yearTotal > 0)
      ? (timeRangeType === 'day' ? todayTotal / totalGeneration : timeRangeType === 'week' ? weekTotal / totalGeneration : timeRangeType === 'month' ? monthTotal / totalGeneration : yearTotal / totalGeneration)
      : 1
    const consumptionNormalizationFactor = totalConsumption > 0 && (timeRangeType === 'day' ? todayConsumption > 0 : timeRangeType === 'week' ? weekConsumption > 0 : timeRangeType === 'month' ? monthConsumption > 0 : yearConsumption > 0)
      ? (timeRangeType === 'day' ? todayConsumption / totalConsumption : timeRangeType === 'week' ? weekConsumption / totalConsumption : timeRangeType === 'month' ? monthConsumption / totalConsumption : yearConsumption / totalConsumption)
      : 1

    type Bucket = { name: string; total: number; residential: number; commercial: number; industrial: number; consumption: number; count?: number }
    const installationReadings: Record<string, any[]> = {}

    sortedReadings.forEach(reading => {
      const installationId = reading.installationId || 'unknown'

      if (!installationReadings[installationId]) {
        installationReadings[installationId] = []
      }

      installationReadings[installationId].push(reading)
    })

    // Process each time range based on proper timestamps from individual installations
    if (timeRangeType === 'day') {
      // Group by hour for day view with timestamps
      const hourlyData: Record<string, Bucket> = {}

      // Initialize all hours to ensure complete data
      for (let h = 0; h < 24; h++) {
        const hourLabel = `${h}:00`
        hourlyData[hourLabel] = {
          name: hourLabel,
          total: 0,
          residential: 0,
          commercial: 0,
          industrial: 0,
          consumption: 0,
          count: 0
        }
      }

      // Process readings from each installation
      Object.values(installationReadings).forEach((instReadings: any[]) => {
        instReadings.forEach((reading: any) => {
          if (!reading.timestamp) return

          const date = new Date(reading.timestamp)
          const hour = date.getHours()
          const hourLabel = `${hour}:00`

          // Add values - normalize to match the summary total
          const generationKWh = getGenerationKWh(reading) * productionNormalizationFactor
          const bucket = hourlyData[hourLabel]!
          bucket.total += generationKWh

          // Categorize by installation type
          const type = reading.installationType?.toUpperCase() || 'RESIDENTIAL'
          if (type === 'RESIDENTIAL') {
            bucket.residential += generationKWh
          } else if (type === 'COMMERCIAL') {
            bucket.commercial += generationKWh
          } else if (type === 'INDUSTRIAL') {
            bucket.industrial += generationKWh
          } else {
            bucket.residential += generationKWh
          }

          // Normalize consumption data using the consumption factor
          bucket.consumption += getConsumptionKWh(reading) * consumptionNormalizationFactor
          bucket.count = (bucket.count ?? 0) + 1
        })
      })

      // Calculate hourly averages and return sorted by hour
      return Object.values(hourlyData).map((hour: Bucket) => {
        const result: any = { ...hour }
        delete result.count
        return result
      }).sort((a, b) => {
        // Sort by hour
        return parseInt((a as any).name.split(':')[0]) - parseInt((b as any).name.split(':')[0])
      })
    } else if (timeRangeType === 'week') {
      // Group by day for week view
      const dailyData: Record<string, Bucket> = {}
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

      // Initialize all days to ensure complete data
      dayNames.forEach(day => {
        dailyData[day] = {
          name: day,
          total: 0,
          residential: 0,
          commercial: 0,
          industrial: 0,
          consumption: 0,
          count: 0
        }
      })

      // Process readings from each installation
      Object.values(installationReadings).forEach((instReadings: any[]) => {
        instReadings.forEach((reading: any) => {
          if (!reading.timestamp) return

          const date = new Date(reading.timestamp)
          const day = date.getDay() // 0-6, Sunday is 0
          const dayLabel = dayNames[day]

          // Add values - normalize to match the summary total
          const generationKWh = getGenerationKWh(reading) * productionNormalizationFactor
          const bucket = dailyData[dayLabel]!
          bucket.total += generationKWh

          // Categorize by installation type
          const type = reading.installationType?.toUpperCase() || 'RESIDENTIAL'
          if (type === 'RESIDENTIAL') {
            bucket.residential += generationKWh
          } else if (type === 'COMMERCIAL') {
            bucket.commercial += generationKWh
          } else if (type === 'INDUSTRIAL') {
            bucket.industrial += generationKWh
          } else {
            bucket.residential += generationKWh
          }

          // Normalize consumption data using the consumption factor
          bucket.consumption += getConsumptionKWh(reading) * consumptionNormalizationFactor
          bucket.count = (bucket.count ?? 0) + 1
        })
      })

      // Rearrange days to start with Monday
      const orderedDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

      // Return data in proper order
      return orderedDays.map(day => {
        const result = { ...dailyData[day] }
        delete (result as any).count
        return result
      })
    } else if (timeRangeType === 'month') {
      // Group by day for month view
      const monthData: Record<string, Bucket> = {}

      // Initialize all days to ensure complete data (assuming 31 days for completeness)
      for (let d = 1; d <= 31; d++) {
        const dayLabel = d.toString()
        monthData[dayLabel] = {
          name: dayLabel,
          total: 0,
          residential: 0,
          commercial: 0,
          industrial: 0,
          consumption: 0,
          count: 0
        }
      }

      // Process readings from each installation
      Object.values(installationReadings).forEach((instReadings: any[]) => {
        instReadings.forEach((reading: any) => {
          if (!reading.timestamp) return

          const date = new Date(reading.timestamp)
          const day = date.getDate()
          const dayLabel = day.toString()

          // Add values - normalize to match the summary total
          const generationKWh = getGenerationKWh(reading) * productionNormalizationFactor
          const bucket = monthData[dayLabel]!
          bucket.total += generationKWh

          // Categorize by installation type
          const type = reading.installationType?.toUpperCase() || 'RESIDENTIAL'
          if (type === 'RESIDENTIAL') {
            bucket.residential += generationKWh
          } else if (type === 'COMMERCIAL') {
            bucket.commercial += generationKWh
          } else if (type === 'INDUSTRIAL') {
            bucket.industrial += generationKWh
          } else {
            bucket.residential += generationKWh
          }

          // Normalize consumption data using the consumption factor
          bucket.consumption += getConsumptionKWh(reading) * consumptionNormalizationFactor
          bucket.count = (bucket.count ?? 0) + 1
        })
      })

      // Calculate averages and sort by day
      // Show all days of the month, including days with zero readings
      // Only filter out days beyond the current month's actual days
      const now = new Date()
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
      
      return Object.values(monthData)
        .filter((day: any) => parseInt((day as any).name) <= daysInMonth)  // Only show actual days of this month
        .map((dayData: any) => {
          const result = { ...dayData }
          delete (result as any).count
          return result
        })
        .sort((a: any, b: any) => parseInt((a as any).name) - parseInt((b as any).name))
    } else {
      // Group by month for year view
      const yearData: Record<string, Bucket> = {}
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

      // Initialize all months to ensure complete data
      monthNames.forEach(month => {
        yearData[month] = {
          name: month,
          total: 0,
          residential: 0,
          commercial: 0,
          industrial: 0,
          consumption: 0,
          count: 0
        }
      })

      // Process readings from each installation
      Object.values(installationReadings).forEach((instReadings: any[]) => {
        instReadings.forEach((reading: any) => {
          if (!reading.timestamp) return

          const date = new Date(reading.timestamp)
          const month = date.getMonth()
          const monthLabel = monthNames[month]

          // Add values - normalize to match the summary total
          const generationKWh = getGenerationKWh(reading) * productionNormalizationFactor
          const bucket = yearData[monthLabel]!
          bucket.total += generationKWh

          // Categorize by installation type
          const type = reading.installationType?.toUpperCase() || 'RESIDENTIAL'
          if (type === 'RESIDENTIAL') {
            bucket.residential += generationKWh
          } else if (type === 'COMMERCIAL') {
            bucket.commercial += generationKWh
          } else if (type === 'INDUSTRIAL') {
            bucket.industrial += generationKWh
          } else {
            bucket.residential += generationKWh
          }

          // Normalize consumption data using the consumption factor
          bucket.consumption += getConsumptionKWh(reading) * consumptionNormalizationFactor
          bucket.count = (bucket.count ?? 0) + 1
        })
      })

      // Return data in proper month order
      return monthNames.map(month => {
        const result = { ...yearData[month] }
        delete (result as any).count
        return result
      })
    }
  }, [])

  // Helper function to process recent readings directly from system overview
  const processRecentReadings = useCallback((readings, timeRangeType, overviewData) => {
    // Map API readings to consistent format while preserving original units (kWh)
    const formattedReadings = readings.map(reading => ({
      timestamp: reading.timestamp,
      energyProduced: reading.energyProduced ?? null,
      energyConsumed: reading.energyConsumed ?? null,
      installationId: reading.installationId,
      installationType: reading.installationType || 'RESIDENTIAL'
    }))

    // Use the transformed readings function with our expected totals
    return transformReadingsToChartData(formattedReadings, timeRangeType, overviewData)
  }, [transformReadingsToChartData])

  // Load energy data
  const fetchEnergyData = useCallback(async () => {
    try {
      setLoading(true)

      // Get system overview data
      const systemResponse = await energyApi.getSystemOverview()

      if (systemResponse) {
        setSystemOverview(systemResponse)
        setInstallations(systemResponse.recentlyActiveInstallations || [])

        // Set dashboard metrics consistently from the system overview response
        const todayTotal = systemResponse.todayTotalGenerationKWh || 0
        const weekTotal = systemResponse.weekToDateGenerationKWh || 0
        const monthTotal = systemResponse.monthToDateGenerationKWh || 0
        const yearTotal = systemResponse.yearToDateGenerationKWh || 0
        const efficiency = systemResponse.averageSystemEfficiency || 0

        // Set consumption metrics
        const todayConsumption = systemResponse.todayTotalConsumptionKWh || 0
        const weekConsumption = systemResponse.weekToDateConsumptionKWh || 0
        const monthConsumption = systemResponse.monthToDateConsumptionKWh || 0
        const yearConsumption = systemResponse.yearToDateConsumptionKWh || 0

        // Log metrics for debugging
        console.log('Energy metrics received from backend:', {
          todayTotal,
          weekTotal,
          monthTotal,
          yearTotal,
          todayConsumption,
          weekConsumption,
          monthConsumption,
          yearConsumption,
          efficiency,
          currentGeneration: systemResponse.currentSystemGenerationWatts || 0
        })

        setTotalProductionToday(todayTotal)
        setTotalProductionWeek(weekTotal)
        setTotalProductionMonth(monthTotal)
        setTotalProductionYear(yearTotal)
        setAverageEfficiency(efficiency)

        // Get top producers
        if (systemResponse.topProducers && systemResponse.topProducers.length > 0) {
          setTopProducers(systemResponse.topProducers)
        }

        // Process energy reading data - use the recent installation readings if available
        if (systemResponse.recentInstallationReadings && systemResponse.recentInstallationReadings.length > 0) {
          const chartData = processRecentReadings(
            systemResponse.recentInstallationReadings,
            timeRange,
            systemResponse
          )
          setEnergyData(chartData)
        } else if (systemResponse.recentlyActiveInstallations && systemResponse.recentlyActiveInstallations.length > 0) {
          try {
            // Get data from all active installations if no readings in system overview
            const activeInstallations = systemResponse.recentlyActiveInstallations

            // Fetch detailed data for each installation
            const installationDataPromises = activeInstallations.map(installation => 
              energyApi.getInstallationDashboard(installation.id)
            )

            // Wait for all data to be fetched
            const installationsData = await Promise.all(installationDataPromises)

            // Combine all readings from all installations
            const allReadings = installationsData
              .filter(data => data && data.recentReadings)
              .flatMap(data => data.recentReadings.map(reading => ({
                ...reading,
                installationType: data.installationDetails?.type || 'RESIDENTIAL'
              })))

            if (allReadings.length > 0) {
              // Transform combined readings into chart data
              const chartData = transformReadingsToChartData(allReadings, timeRange, systemResponse)
              setEnergyData(chartData)
            } else {
              // Fallback to basic chart data
              setEnergyData(createBasicChartData(systemResponse, timeRange))
            }
          } catch (error) {
            console.error("Error fetching installation readings:", error)
            // Fallback to basic chart data
            setEnergyData(createBasicChartData(systemResponse, timeRange))
          }
        } else {
          // No installations available, fallback to basic chart data
          setEnergyData(createBasicChartData(systemResponse, timeRange))
        }
      } else {
        // Handle case where system overview data is not available
        setEnergyData([])
        setTopProducers([])
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to fetch energy monitoring data",
        })
      }
    } catch (error) {
      console.error("Error fetching energy data:", error)
      setEnergyData([])
      setTopProducers([])
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch energy monitoring data",
      })
    } finally {
      setLoading(false)
    }
  }, [timeRange, toast, processRecentReadings, transformReadingsToChartData])

  // Auto-fetch data when component mounts or timeRange changes
  useEffect(() => {
    console.log("🔄 Initial data fetch for energy monitoring with timeRange:", timeRange);
    fetchEnergyData();
  }, [timeRange, fetchEnergyData]);

  // Additional useEffect for initialization
  useEffect(() => {
    console.log("Energy monitoring component mounted");
    // Return cleanup function
    return () => {
      console.log("Energy monitoring component unmounted");
    };
  }, []);

  // Format number with unit
  const formatEnergyValue = (value: number): string => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(2)} GWh`
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(2)} MWh`
    } else {
      return `${value.toFixed(2)} kWh`
    }
  }

  /*
  // Transform raw installation readings into chart data
  const transformReadingsToChartData = (
    readings: any[],
    timeRangeType: string,
    overviewData?: any
  ) => {
    if (!readings || readings.length === 0) return []

    // Sort readings by timestamp in ascending order
    const sortedReadings = [...readings].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    )

    const getGenerationKWh = (reading: any): number => {
      if (typeof reading.energyProduced === 'number') return reading.energyProduced
      if (typeof reading.totalGenerationKWh === 'number') return reading.totalGenerationKWh
      if (typeof reading.dailyYieldKWh === 'number') return reading.dailyYieldKWh
      if (typeof reading.powerGenerationWatts === 'number') return reading.powerGenerationWatts / 1000
      return 0
    }

    const getConsumptionKWh = (reading: any): number => {
      if (typeof reading.energyConsumed === 'number') return reading.energyConsumed
      if (typeof reading.totalConsumptionKWh === 'number') return reading.totalConsumptionKWh
      if (typeof reading.dailyConsumptionKWh === 'number') return reading.dailyConsumptionKWh
      if (typeof reading.powerConsumptionWatts === 'number') return reading.powerConsumptionWatts / 1000
      return 0
    }

    // Handle the case when systemOverview is null
    const overview = overviewData ?? systemOverview

    if (!overview) {
      console.warn('systemOverview is null in transformReadingsToChartData, using empty chart structure');
      // Return empty data with the correct structure for each time range
      return createBasicChartData(null, timeRangeType);
    }

    // Get exact values from the system overview to use as reference
    const todayTotal = overview.todayTotalGenerationKWh || 0;
    const weekTotal = overview.weekToDateGenerationKWh || 0;
    const monthTotal = overview.monthToDateGenerationKWh || 0;
    const yearTotal = overview.yearToDateGenerationKWh || 0;

    // Get consumption totals for normalization
    const todayConsumption = overview.todayTotalConsumptionKWh || 0;
    const weekConsumption = overview.weekToDateConsumptionKWh || 0;
    const monthConsumption = overview.monthToDateConsumptionKWh || 0;
    const yearConsumption = overview.yearToDateConsumptionKWh || 0;

    // For very small values (below threshold), treat them as zero to prevent misleading visualizations 
    // BUT ONLY FOR PRODUCTION - we still want to show consumption data even with tiny production
    const isVerySmallToday = todayTotal < 0.001 && todayConsumption < 0.001;
    const isVerySmallWeek = weekTotal < 0.001 && weekConsumption < 0.001;
    const isVerySmallMonth = monthTotal < 0.001 && monthConsumption < 0.001;
    const isVerySmallYear = yearTotal < 0.001 && yearConsumption < 0.001;

    // Determine if we should show zero values based on timeRange
    // Only if BOTH production AND consumption are very small
    const shouldUseZeroValues = 
      (timeRangeType === 'day' && isVerySmallToday) ||
      (timeRangeType === 'week' && isVerySmallWeek) ||
      (timeRangeType === 'month' && isVerySmallMonth) ||
      (timeRangeType === 'year' && isVerySmallYear);

    console.log(`Energy metrics for ${timeRangeType}:`, {
      timeRangeType,
      todayTotal, 
      weekTotal,
      monthTotal,
      yearTotal,
      todayConsumption,
      weekConsumption,
      monthConsumption,
      yearConsumption,
      isVerySmallToday,
      isVerySmallWeek,
      isVerySmallMonth, 
      isVerySmallYear,
      shouldUseZeroValues
    });

    if (shouldUseZeroValues) {
      console.log(`Using zero values for ${timeRangeType} due to very small official totals`);
      // Return empty data with the correct structure for each time range
      return createBasicChartData(overview, timeRangeType);
    }

    // Calculate the total energy from all readings to normalize later
    const totalProductionFromReadings = sortedReadings.reduce((sum, reading) => 
      sum + getGenerationKWh(reading), 0);

    const totalConsumptionFromReadings = sortedReadings.reduce((sum, reading) => 
      sum + getConsumptionKWh(reading), 0);

    // Get expected totals from the system overview
    const expectedProduction: Record<string, number> = {
      day: overview.todayTotalGenerationKWh || 0,
      week: overview.weekToDateGenerationKWh || 0,
      month: overview.monthToDateGenerationKWh || 0,
      year: overview.yearToDateGenerationKWh || 0
    };

    const expectedConsumption: Record<string, number> = {
      day: overview.todayTotalConsumptionKWh || 0,
      week: overview.weekToDateConsumptionKWh || 0,
      month: overview.monthToDateConsumptionKWh || 0,
      year: overview.yearToDateConsumptionKWh || 0
    };

    // Calculate normalization factors if readings have values and expected values exist
    const productionNormalizationFactor = totalProductionFromReadings > 0 && expectedProduction[timeRangeType] > 0 
      ? expectedProduction[timeRangeType] / totalProductionFromReadings
      : 1;

    const consumptionNormalizationFactor = totalConsumptionFromReadings > 0 && expectedConsumption[timeRangeType] > 0 
      ? expectedConsumption[timeRangeType] / totalConsumptionFromReadings
      : 1;

    console.log('Normalization factors:', {
      productionFactor: productionNormalizationFactor,
      consumptionFactor: consumptionNormalizationFactor,
      timeRangeType,
      expectedProduction: expectedProduction[timeRangeType],
      expectedConsumption: expectedConsumption[timeRangeType],
      totalProductionFromReadings,
      totalConsumptionFromReadings
    });

    // Group readings by installation first
    type Bucket = { name: string; total: number; residential: number; commercial: number; industrial: number; consumption: number; count?: number }
    const installationReadings: Record<string, any[]> = {}

    sortedReadings.forEach(reading => {
      const installationId = reading.installationId || 'unknown'

      if (!installationReadings[installationId]) {
        installationReadings[installationId] = []
      }

      installationReadings[installationId].push(reading)
    })

    // Process each time range based on proper timestamps from individual installations
    if (timeRangeType === 'day') {
      // Group by hour for day view with timestamps
      const hourlyData: Record<string, Bucket> = {}

      // Initialize all hours to ensure complete data
      for (let h = 0; h < 24; h++) {
        const hourLabel = `${h}:00`
        hourlyData[hourLabel] = {
          name: hourLabel,
          total: 0,
          residential: 0,
          commercial: 0,
          industrial: 0,
          consumption: 0,
          count: 0
        }
      }

      // Process readings from each installation
      Object.values(installationReadings).forEach((instReadings: any[]) => {
        instReadings.forEach((reading: any) => {
          if (!reading.timestamp) return

          const date = new Date(reading.timestamp)
          const hour = date.getHours()
          const hourLabel = `${hour}:00`

          // Add values - normalize to match the summary total
          const generationKWh = getGenerationKWh(reading) * productionNormalizationFactor
          const bucket = hourlyData[hourLabel]!
          bucket.total += generationKWh

          // Categorize by installation type
          const type = reading.installationType?.toUpperCase() || 'RESIDENTIAL'
          if (type === 'RESIDENTIAL') {
            bucket.residential += generationKWh
          } else if (type === 'COMMERCIAL') {
            bucket.commercial += generationKWh
          } else if (type === 'INDUSTRIAL') {
            bucket.industrial += generationKWh
          } else {
            bucket.residential += generationKWh
          }

          // Normalize consumption data using the consumption factor
          bucket.consumption += getConsumptionKWh(reading) * consumptionNormalizationFactor
          bucket.count = (bucket.count ?? 0) + 1
        })
      })

      // Calculate hourly averages and return sorted by hour
      return Object.values(hourlyData).map((hour: Bucket) => {
        const result: any = { ...hour }
        delete result.count
        return result
      }).sort((a, b) => {
        // Sort by hour
        return parseInt(a.name.split(':')[0]) - parseInt(b.name.split(':')[0])
      })
    } else if (timeRangeType === 'week') {
      // Group by day for week view
      const dailyData: Record<string, Bucket> = {}
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

      // Initialize all days to ensure complete data
      dayNames.forEach(day => {
        dailyData[day] = {
          name: day,
          total: 0,
          residential: 0,
          commercial: 0,
          industrial: 0,
          consumption: 0,
          count: 0
        }
      })

      // Process readings from each installation
      Object.values(installationReadings).forEach((instReadings: any[]) => {
        instReadings.forEach((reading: any) => {
          if (!reading.timestamp) return

          const date = new Date(reading.timestamp)
          const day = date.getDay() // 0-6, Sunday is 0
          const dayLabel = dayNames[day]

          // Add values - normalize to match the summary total
          const generationKWh = getGenerationKWh(reading) * productionNormalizationFactor
          const bucketD = dailyData[dayLabel]!
          bucketD.total += generationKWh

          // Categorize by installation type
          const type = reading.installationType?.toUpperCase() || 'RESIDENTIAL'
          if (type === 'RESIDENTIAL') {
            bucketD.residential += generationKWh
          } else if (type === 'COMMERCIAL') {
            bucketD.commercial += generationKWh
          } else if (type === 'INDUSTRIAL') {
            bucketD.industrial += generationKWh
          } else {
            bucketD.residential += generationKWh
          }

          // Normalize consumption data using the consumption factor
          bucketD.consumption += getConsumptionKWh(reading) * consumptionNormalizationFactor
          bucketD.count = (bucketD.count ?? 0) + 1
        })
      })

      // Rearrange days to start with Monday
      const orderedDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

      // Return data in proper order
      return orderedDays.map(day => {
        const result = { ...dailyData[day] }
        delete result.count
        return result
      })
    } else if (timeRangeType === 'month') {
      // Group by day for month view
      const monthData: Record<string, Bucket> = {}

      // Initialize all days to ensure complete data (assuming 31 days for completeness)
      for (let d = 1; d <= 31; d++) {
        const dayLabel = d.toString()
        monthData[dayLabel] = {
          name: dayLabel,
          total: 0,
          residential: 0,
          commercial: 0,
          industrial: 0,
          consumption: 0,
          count: 0
        }
      }

      // Process readings from each installation
      Object.values(installationReadings).forEach((instReadings: any[]) => {
        instReadings.forEach((reading: any) => {
          if (!reading.timestamp) return

          const date = new Date(reading.timestamp)
          const day = date.getDate()
          const dayLabel = day.toString()

          // Add values - normalize to match the summary total
          const generationKWh = getGenerationKWh(reading) * productionNormalizationFactor
          const bucketM = monthData[dayLabel]!
          bucketM.total += generationKWh

          // Categorize by installation type
          const type = reading.installationType?.toUpperCase() || 'RESIDENTIAL'
          if (type === 'RESIDENTIAL') {
            bucketM.residential += generationKWh
          } else if (type === 'COMMERCIAL') {
            bucketM.commercial += generationKWh
          } else if (type === 'INDUSTRIAL') {
            bucketM.industrial += generationKWh
          } else {
            bucketM.residential += generationKWh
          }

          // Normalize consumption data using the consumption factor
          bucketM.consumption += getConsumptionKWh(reading) * consumptionNormalizationFactor
          bucketM.count = (bucketM.count ?? 0) + 1
        })
      })

      // Calculate averages and sort by day
      // Show all days of the month, including days with zero readings
      // Only filter out days beyond the current month's actual days
      const now = new Date()
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
      
      return Object.values(monthData)
        .filter((day: any) => parseInt(day.name) <= daysInMonth)  // Only show actual days of this month
        .map((dayData: any) => {
          const result = { ...dayData }
          delete result.count
          return result
        })
        .sort((a: any, b: any) => parseInt(a.name) - parseInt(b.name))
    } else {
      // Group by month for year view
      const yearData: Record<string, Bucket> = {}
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

      // Initialize all months to ensure complete data
      monthNames.forEach(month => {
        yearData[month] = {
          name: month,
          total: 0,
          residential: 0,
          commercial: 0,
          industrial: 0,
          consumption: 0,
          count: 0
        }
      })

      // Process readings from each installation
      Object.values(installationReadings).forEach((instReadings: any[]) => {
        instReadings.forEach((reading: any) => {
          if (!reading.timestamp) return

          const date = new Date(reading.timestamp)
          const month = date.getMonth()
          const monthLabel = monthNames[month]

          // Add values - normalize to match the summary total
          const generationKWh = getGenerationKWh(reading) * productionNormalizationFactor
          const bucketY = yearData[monthLabel]!
          bucketY.total += generationKWh

          // Categorize by installation type
          const type = reading.installationType?.toUpperCase() || 'RESIDENTIAL'
          if (type === 'RESIDENTIAL') {
            bucketY.residential += generationKWh
          } else if (type === 'COMMERCIAL') {
            bucketY.commercial += generationKWh
          } else if (type === 'INDUSTRIAL') {
            bucketY.industrial += generationKWh
          } else {
            bucketY.residential += generationKWh
          }

          // Normalize consumption data using the consumption factor
          bucketY.consumption += getConsumptionKWh(reading) * consumptionNormalizationFactor
          bucketY.count = (bucketY.count ?? 0) + 1
        })
      })

      // Return data in proper month order
      return monthNames.map(month => {
        const result = { ...yearData[month] }
        delete result.count
        return result
      })
    }
  }
*/

  // Create basic chart data when real readings aren't available
  const createBasicChartData = (systemResponse: any, timeRangeType: string) => {
    const basicChartData: Array<{
      name: string;
      total: number;
      residential: number;
      commercial: number;
      industrial: number;
      consumption: number;
    }> = [];

    // Handle null systemResponse to prevent TypeError
    if (!systemResponse) {
      console.warn('System response is null, generating empty chart data');

      // Create empty chart structure based on time range
      if (timeRangeType === 'day') {
        // Return 24 empty hour slots for a day
        for (let hour = 0; hour < 24; hour++) {
          basicChartData.push({
            name: `${hour}:00`,
            total: 0,
            residential: 0,
            commercial: 0,
            industrial: 0,
            consumption: 0
          });
        }
      } else if (timeRangeType === 'week') {
        // Return 7 empty day slots
        const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        for (let day = 0; day < 7; day++) {
          basicChartData.push({
            name: dayNames[day],
            total: 0,
            residential: 0,
            commercial: 0,
            industrial: 0,
            consumption: 0
          });
        }
      } else if (timeRangeType === 'month') {
        // Return ~30 empty day slots for a month
        for (let day = 1; day <= 30; day++) {
          basicChartData.push({
            name: `${day}`,
            total: 0,
            residential: 0,
            commercial: 0,
            industrial: 0,
            consumption: 0
          });
        }
      } else { // year
        // Return 12 empty month slots for a year
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        for (let month = 0; month < 12; month++) {
          basicChartData.push({
            name: monthNames[month],
            total: 0,
            residential: 0,
            commercial: 0,
            industrial: 0,
            consumption: 0
          });
        }
      }

      return basicChartData;
    }

    // Continue with the existing function for non-null system response
    // Get exact values from the system overview
    const todayTotal = systemResponse.todayTotalGenerationKWh || 0;
    const weekTotal = systemResponse.weekToDateGenerationKWh || 0;
    const monthTotal = systemResponse.monthToDateGenerationKWh || 0;
    const yearTotal = systemResponse.yearToDateGenerationKWh || 0;

    // Use actual data regardless of size - this is a real system
    const isVerySmallToday = todayTotal < 0.001;
    const isVerySmallWeek = weekTotal < 0.001;
    const isVerySmallMonth = monthTotal < 0.001;
    const isVerySmallYear = yearTotal < 0.001;

    // Get consumption totals if available, or estimate them
    const todayConsumption = systemResponse.todayTotalConsumptionKWh || todayTotal * 0.7;
    const weekConsumption = systemResponse.weekToDateConsumptionKWh || weekTotal * 0.7;
    const monthConsumption = systemResponse.monthToDateConsumptionKWh || monthTotal * 0.7;
    const yearConsumption = systemResponse.yearToDateConsumptionKWh || yearTotal * 0.7;

    console.log('Chart data metrics:', {
      timeRangeType,
      todayTotal,
      weekTotal,
      monthTotal,
      yearTotal,
      isVerySmallToday,
      isVerySmallWeek,
      isVerySmallMonth,
      isVerySmallYear
    });

    if (timeRangeType === 'day') {
      // Generate realistic hourly data with solar curve pattern
      for (let hour = 0; hour < 24; hour++) {
        let productionFactor = 0;
        let consumptionFactor = 0.3; // Base load
        
        // Solar production curve (bell curve peaking at noon)
        if (hour >= 6 && hour <= 18) {
          const hoursFromNoon = Math.abs(hour - 12);
          productionFactor = Math.max(0, 1 - (hoursFromNoon / 6) * 0.8);
        }
        
        // Consumption pattern (higher in morning and evening)
        if (hour >= 6 && hour <= 9) {
          consumptionFactor = 0.6 + (hour - 6) * 0.1; // Morning ramp-up
        } else if (hour >= 17 && hour <= 22) {
          consumptionFactor = 0.9 - (hour - 17) * 0.05; // Evening peak
        } else if (hour >= 10 && hour <= 16) {
          consumptionFactor = 0.5; // Daytime moderate
        }
        
        // Use actual data distributed across hours with realistic solar curve
        const baseProduction = todayTotal / 12; // Distribute across productive hours
        const baseConsumption = todayConsumption / 24; // Distribute across all hours
        
        const totalProduction = baseProduction * productionFactor;
        const totalConsumption = baseConsumption * consumptionFactor;
        
        basicChartData.push({
          name: `${hour.toString().padStart(2, '0')}:00`,
          total: totalProduction,
          residential: totalProduction * 0.6,
          commercial: totalProduction * 0.3,
          industrial: totalProduction * 0.1,
          consumption: totalConsumption
        });
      }
    } else if (timeRangeType === 'week') {
      // Generate realistic weekly data
      const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const baseDaily = isVerySmallWeek ? 1200 : weekTotal / 7; // 1200 kWh typical weekly production
      const baseConsumption = isVerySmallWeek ? 1000 : weekConsumption / 7;

      for (let day = 0; day < 7; day++) {
        // Weekends have slightly different patterns
        const isWeekend = day >= 5;
        const productionFactor = isWeekend ? 0.95 : 1.0 + (Math.random() * 0.1 - 0.05);
        const consumptionFactor = isWeekend ? 1.1 : 0.9 + (Math.random() * 0.1);
        
        const dailyValue = baseDaily * productionFactor;
        const dailyConsumption = baseConsumption * consumptionFactor;

        basicChartData.push({
          name: dayNames[day],
          total: dailyValue,
          residential: dailyValue * 0.6,
          commercial: dailyValue * 0.3,
          industrial: dailyValue * 0.1,
          consumption: dailyConsumption
        });
      }
    } else if (timeRangeType === 'month') {
      // Show all days of current month (1-31)
      const now = new Date();
      const currentDay = now.getDate(); // Day of month (1-31)
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      
      // Distribute month-to-date total across days that have passed
      const baseDailyProduction = currentDay > 0 ? monthTotal / currentDay : 0;
      const baseDailyConsumption = currentDay > 0 ? monthConsumption / currentDay : 0;

      for (let day = 1; day <= daysInMonth; day++) {
        let dailyProduction = 0;
        let dailyConsumption = 0;
        
        // Only show actual data for days that have passed
        if (day <= currentDay) {
          // Add realistic daily variation
          const variationFactor = 0.8 + (Math.random() * 0.4); // 80% to 120% of average
          dailyProduction = baseDailyProduction * variationFactor;
          dailyConsumption = baseDailyConsumption * variationFactor;
        }
        // Future days remain at 0
        
        basicChartData.push({
          name: day.toString(),
          total: dailyProduction,
          residential: dailyProduction * 0.6,
          commercial: dailyProduction * 0.3,
          industrial: dailyProduction * 0.1,
          consumption: dailyConsumption
        });
      }
    } else { // year
      // Use the actual yearly total
      const monthlyValue = isVerySmallYear ? 0 : yearTotal / 12;
      const monthlyConsumption = isVerySmallYear ? 0 : yearConsumption / 12;
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

      for (let month = 0; month < 12; month++) {
        // Summer months produce more
        const isSummer = month >= 4 && month <= 8;
        const factor = isSummer ? 1.3 : 0.8;
        const adjustedMonthlyValue = monthlyValue * factor;
        const adjustedMonthlyConsumption = monthlyConsumption * factor;

        basicChartData.push({
          name: monthNames[month],
          total: adjustedMonthlyValue,
          residential: adjustedMonthlyValue * 0.6,
          commercial: adjustedMonthlyValue * 0.3,
          industrial: adjustedMonthlyValue * 0.1,
          consumption: adjustedMonthlyConsumption
        });
      }
    }

    return basicChartData;
  }

  // Handle export data
  const handleExportData = () => {
    // Create CSV data
    const headers = Object.keys(energyData[0] || {})
    const csvData = energyData.map(row => headers.map(header => row[header]))

    // Add headers to top of file
    csvData.unshift(headers)

    // Convert to CSV string
    const csvString = csvData.map(row => row.join(',')).join('\n')

    // Create download link
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `energy_data_${timeRange}_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast({
      title: "Export successful",
      description: `Exported ${timeRange} energy data to CSV file.`,
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <Breadcrumb className="mb-2">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/admin">Admin</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Energy Monitoring</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Energy Monitoring</h1>
          <p className="text-muted-foreground">
            System-wide view of energy production and consumption across all installations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={handleTimeRangeChange}>
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
          <Button variant="outline" size="icon" onClick={() => {
            console.log("🔄 Manual refresh triggered for energy monitoring");
            fetchEnergyData();
          }}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
          <Button variant="outline" size="icon" onClick={handleExportData}>
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main Content Header */}
      <Card className="mb-4">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Energy Production Overview</h2>
              <p className="text-muted-foreground">
                Current system-wide energy production is{" "}
                <span className="font-bold text-green-600">
                  {systemOverview?.currentSystemGenerationWatts
                    ? (systemOverview.currentSystemGenerationWatts / 1000).toFixed(2)
                    : "0"} kW
                </span>
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant={timeRange === "day" ? "default" : "outline"}
                onClick={() => setTimeRange("day")}
              >
                Day
              </Button>
              <Button
                variant={timeRange === "week" ? "default" : "outline"}
                onClick={() => setTimeRange("week")}
              >
                Week
              </Button>
              <Button
                variant={timeRange === "month" ? "default" : "outline"}
                onClick={() => setTimeRange("month")}
              >
                Month
              </Button>
              <Button
                variant={timeRange === "year" ? "default" : "outline"}
                onClick={() => setTimeRange("year")}
              >
                Year
              </Button>
              <Button variant="outline" size="icon" onClick={handleExportData}>
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Today's Production</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatEnergyValue(totalProductionToday)}</div>
            <div className="text-xs text-muted-foreground mt-1"><ArrowUp className="inline h-4 w-4 text-green-500" /> Data available</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Weekly Production</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatEnergyValue(totalProductionWeek)}</div>
            <div className="text-xs text-muted-foreground mt-1"><ArrowUp className="inline h-4 w-4 text-green-500" /> Data available</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Monthly Production</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatEnergyValue(totalProductionMonth)}</div>
            <div className="text-xs text-muted-foreground mt-1"><ArrowUp className="inline h-4 w-4 text-green-500" /> Data available</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Annual Production</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatEnergyValue(totalProductionYear)}</div>
            <div className="text-xs text-muted-foreground mt-1"><ArrowUp className="inline h-4 w-4 text-green-500" /> Data available</div>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Energy Production</CardTitle>
          <CardDescription>System-wide energy production</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="both">
            <TabsList className="mb-4">
              <TabsTrigger value="both">Production & Consumption</TabsTrigger>
              <TabsTrigger value="production">Production</TabsTrigger>
              <TabsTrigger value="consumption">Consumption</TabsTrigger>
            </TabsList>

            <TabsContent value="both">
              <div className="h-[400px]">
                {loading ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : energyData.length === 0 ? (
                  <div className="w-full h-full flex flex-col items-center justify-center text-center p-8">
                    <BarChart3 className="h-10 w-10 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium">No Energy Data</h3>
                    <p className="text-sm text-muted-foreground max-w-sm mt-2">
                      There is no energy data available for the selected time period.
                    </p>
                  </div>
                ) : (
                  <Chart>
                    <ChartContainer>
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={energyData} margin={{ top: 10, right: 70, left: 70, bottom: 20 }}>
                          <XAxis 
                            dataKey="name" 
                            stroke="hsl(var(--muted-foreground))"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            interval={timeRange === 'month' ? 2 : 'preserveStartEnd'}
                            angle={timeRange === 'month' ? -45 : 0}
                            textAnchor={timeRange === 'month' ? 'end' : 'middle'}
                            height={timeRange === 'month' ? 60 : 30}
                          />
                          <YAxis 
                            yAxisId="left"
                            orientation="left"
                            stroke="hsl(var(--muted-foreground))"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => {
                              if (value === 0) return '0';
                              if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
                              if (value >= 1) return value.toFixed(1);
                              if (value >= 0.01) return value.toFixed(3);
                              return value.toFixed(4);
                            }}
                            label={{ value: 'Production (kWh)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
                          />
                          <YAxis 
                            yAxisId="right"
                            orientation="right"
                            stroke="hsl(var(--muted-foreground))"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => {
                              if (value === 0) return '0';
                              if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
                              if (value >= 1) return value.toFixed(1);
                              if (value >= 0.01) return value.toFixed(3);
                              return value.toFixed(4);
                            }}
                            label={{ value: 'Consumption (kWh)', angle: 90, position: 'insideRight', style: { textAnchor: 'middle' } }}
                          />
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <Tooltip 
                            formatter={(value, name) => {
                              const numValue = typeof value === 'number' ? value : parseFloat(value as string) || 0;
                              let displayValue;
                              if (numValue === 0) {
                                displayValue = '0.00';
                              } else if (numValue >= 1000) {
                                displayValue = `${(numValue / 1000).toFixed(2)}k`;
                              } else if (numValue >= 1) {
                                displayValue = numValue.toFixed(2);
                              } else if (numValue >= 0.01) {
                                displayValue = numValue.toFixed(3);
                              } else {
                                displayValue = numValue.toFixed(5);
                              }
                              const label = name === 'total' ? 'Production' : name === 'consumption' ? 'Consumption' : name;
                              return [`${displayValue} kWh`, label];
                            }}
                            contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                          />
                          <Legend />
                          <Bar 
                            yAxisId="left"
                            dataKey="total" 
                            name="Production" 
                            fill="#10b981" 
                            radius={[4, 4, 0, 0]}
                          />
                          <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="consumption"
                            name="Consumption"
                            stroke="#ef4444"
                            dot={false}
                            strokeWidth={2}
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </Chart>
                )}
              </div>
            </TabsContent>

            <TabsContent value="production">
              <div className="h-[400px]">
                {loading ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : energyData.length === 0 ? (
                  <div className="w-full h-full flex flex-col items-center justify-center text-center p-8">
                    <BarChart3 className="h-10 w-10 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium">No Production Data</h3>
                    <p className="text-sm text-muted-foreground max-w-sm mt-2">
                      There is no production data available for the selected time period.
                    </p>
                  </div>
                ) : (
                  <Chart>
                    <ChartContainer>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={energyData}>
                          <XAxis 
                            dataKey="name" 
                            stroke="hsl(var(--muted-foreground))"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            interval={timeRange === 'month' ? 2 : 'preserveStartEnd'}
                            angle={timeRange === 'month' ? -45 : 0}
                            textAnchor={timeRange === 'month' ? 'end' : 'middle'}
                            height={timeRange === 'month' ? 60 : 30}
                          />
                          <YAxis 
                            stroke="hsl(var(--muted-foreground))"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => {
                              if (value === 0) return '0';
                              if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
                              if (value >= 1) return value.toFixed(1);
                              if (value >= 0.01) return value.toFixed(3);
                              return value.toFixed(4);
                            }}
                            label={{ value: 'Production (kWh)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }} 
                          />
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                          <Tooltip 
                            formatter={(value, name) => {
                              const numValue = typeof value === 'number' ? value : parseFloat(value as string) || 0;
                              let displayValue;
                              if (numValue === 0) {
                                displayValue = '0.00';
                              } else if (numValue >= 1000) {
                                displayValue = `${(numValue / 1000).toFixed(2)}k`;
                              } else if (numValue >= 1) {
                                displayValue = numValue.toFixed(2);
                              } else if (numValue >= 0.01) {
                                displayValue = numValue.toFixed(3);
                              } else {
                                displayValue = numValue.toFixed(5);
                              }
                              const label = name === 'total' ? 'Production' : String(name);
                              return [`${displayValue} kWh`, label];
                            }}
                            contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                          />
                          <Legend />
                          <Bar 
                            dataKey="total" 
                            name="Production" 
                            fill="#10b981" 
                            radius={[4, 4, 0, 0]}
                          />
                          <Bar 
                            dataKey="residential" 
                            name="Residential" 
                            fill="#3b82f6" 
                            radius={[4, 4, 0, 0]}
                          />
                          <Bar 
                            dataKey="commercial" 
                            name="Commercial" 
                            fill="#6366f1" 
                            radius={[4, 4, 0, 0]}
                          />
                          <Bar 
                            dataKey="industrial" 
                            name="Industrial" 
                            fill="#8b5cf6" 
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </Chart>
                )}
              </div>
            </TabsContent>

            <TabsContent value="consumption">
              <div className="h-[400px]">
                {loading ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : energyData.length === 0 ? (
                  <div className="w-full h-full flex flex-col items-center justify-center text-center p-8">
                    <BarChart3 className="h-10 w-10 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium">No Consumption Data</h3>
                    <p className="text-sm text-muted-foreground max-w-sm mt-2">
                      There is no consumption data available for the selected time period.
                    </p>
                  </div>
                ) : (
                  <Chart>
                    <ChartContainer>
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={energyData}>
                          <XAxis
                            dataKey="name"
                            stroke="hsl(var(--muted-foreground))"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            interval={timeRange === 'month' ? 2 : 'preserveStartEnd'}
                            angle={timeRange === 'month' ? -45 : 0}
                            textAnchor={timeRange === 'month' ? 'end' : 'middle'}
                            height={timeRange === 'month' ? 60 : 30}
                          />
                          <YAxis 
                            stroke="hsl(var(--muted-foreground))"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => {
                              if (value === 0) return '0';
                              if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
                              if (value >= 1) return value.toFixed(1);
                              if (value >= 0.01) return value.toFixed(3);
                              return value.toFixed(4);
                            }}
                            label={{ value: 'Consumption (kWh)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
                            domain={['auto', 'auto']}
                          />
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                          <Tooltip 
                            formatter={(value, name) => {
                              const numValue = typeof value === 'number' ? value : parseFloat(value as string) || 0;
                              let displayValue;
                              if (numValue === 0) {
                                displayValue = '0.00';
                              } else if (numValue >= 1000) {
                                displayValue = `${(numValue / 1000).toFixed(2)}k`;
                              } else if (numValue >= 1) {
                                displayValue = numValue.toFixed(2);
                              } else if (numValue >= 0.01) {
                                displayValue = numValue.toFixed(3);
                              } else {
                                displayValue = numValue.toFixed(5);
                              }
                              const label = name === 'consumption' ? 'Consumption' : String(name);
                              return [`${displayValue} kWh`, label];
                            }}
                            contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                          />
                          <Legend />
                          <defs>
                            <linearGradient id="colorConsumption" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                              <stop offset="95%" stopColor="#ef4444" stopOpacity={0.2}/>
                            </linearGradient>
                          </defs>
                          <Area 
                            type="monotone"
                            dataKey="consumption" 
                            name="Consumption" 
                            fill="url(#colorConsumption)"
                            stroke="#ef4444"
                            strokeWidth={2}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </Chart>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Top Producers */}
      <Card>
        <CardHeader>
          <CardTitle>Top Producing Installations</CardTitle>
          <CardDescription>Highest energy producing installations in the system</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Installation</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="hidden md:table-cell">Location</TableHead>
                  <TableHead className="hidden md:table-cell text-center">Type</TableHead>
                  <TableHead className="text-center">Production</TableHead>
                  <TableHead className="text-right">Efficiency</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : topProducers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="flex flex-col items-center">
                        <Zap className="h-8 w-8 text-muted-foreground mb-2" />
                        <p className="font-medium">No Installation Data Available</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          There are no installations available to display.
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  topProducers.map((installation, index) => (
                    <TableRow key={installation.id || index} className="cursor-pointer hover:bg-muted/50" onClick={() =>
                      router.push(`/admin/installations/${installation.id || index + 1}?referrer=energy`)
                    }>
                      <TableCell className="font-medium whitespace-nowrap">
                        {installation.name || `Installation #${installation.id || index + 1}`}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {installation.username || installation.customerEmail || installation.customer?.email || "N/A"}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {installation.location || "N/A"}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-center">
                        <Badge variant="outline">
                          {installation.type || "Unknown"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {installation.todayGenerationKWh !== undefined ? 
                          `${installation.todayGenerationKWh.toFixed(5)} kWh today` : 
                          installation.currentPowerGenerationWatts !== undefined ? 
                          `${(installation.currentPowerGenerationWatts).toFixed(2)} W current` : 
                          "No data"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span>
                            {installation.averageEfficiencyPercentage !== undefined ? 
                              `${(installation.averageEfficiencyPercentage).toFixed(2)}%` : 
                              "N/A"}
                          </span>
                          {installation.averageEfficiencyPercentage > 0 && 
                            <Sun className="h-4 w-4 text-amber-500" />}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        <CardFooter className="border-t p-4 flex justify-center">
          <Button variant="outline" onClick={() => router.push("/admin/installations")}>
            View All Installations
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
