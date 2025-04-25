"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  BarChart3,
  Download,
  Calendar,
  Sun,
  Zap,
  Battery,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Filter,
  MapPin,
  AlertTriangle,
  User,
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
  LineChart,
  Pie,
  PieChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Area,
  AreaChart,
  ComposedChart,
  Bar,
} from "recharts"
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
import { Progress } from "@/components/ui/progress"
import { energyApi, installationApi } from "@/lib/api"
import { energyWebSocket } from "@/lib/energyWebSocket"

export default function EnergyMonitoringPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState("week")
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
  const handleTimeRangeChange = (value: string) => {
    setTimeRange(value);
    // Trigger data fetch when time range changes
    fetchEnergyData();
  };

  // Load energy data
  const fetchEnergyData = async () => {
    try {
      setLoading(true)

      // Get system overview data
      const systemResponse = await energyApi.getSystemOverview()

      if (systemResponse) {
        setSystemOverview(systemResponse)
        setInstallations(systemResponse.recentlyActiveInstallations || [])

        // Set dashboard metrics consistently
        const todayTotal = systemResponse.todayTotalGenerationKWh || 0
        const weekTotal = systemResponse.weekToDateGenerationKWh || 0
        const monthTotal = systemResponse.monthToDateGenerationKWh || 0
        const yearTotal = systemResponse.yearToDateGenerationKWh || 0
        const efficiency = systemResponse.averageSystemEfficiency || 0
        
        // Log metrics for debugging
        console.log('Energy metrics received from backend:', {
          todayTotal,
          weekTotal,
          monthTotal,
          yearTotal,
          efficiency,
          currentGeneration: systemResponse.currentSystemGenerationWatts || 0
        })
        
        setTotalProductionToday(todayTotal)
        setTotalProductionWeek(weekTotal)
        setTotalProductionMonth(monthTotal)
        setTotalProductionYear(yearTotal)
        setAverageEfficiency(efficiency)

        // Extract energy data from the system overview - ensuring consistency with summary metrics
        if (systemResponse.energyData && systemResponse.energyData[timeRange]) {
          // We have pre-formatted data from the API
          setEnergyData(systemResponse.energyData[timeRange])
        } else if (systemResponse.energyDataByTimeRange && systemResponse.energyDataByTimeRange[timeRange]) {
          // Alternative property name
          setEnergyData(systemResponse.energyDataByTimeRange[timeRange])
        } else if (todayTotal > 0 || monthTotal > 0) {
          // We have energy data but no formatted time series - fetch raw readings
          
          // If we have active installations, fetch their readings
          if (systemResponse.recentlyActiveInstallations && systemResponse.recentlyActiveInstallations.length > 0) {
            try {
              // Get data from all active installations
              const activeInstallations = systemResponse.recentlyActiveInstallations
              
              // Create an array to hold all readings
              let allReadings = []
              
              // Fetch and combine readings from all installations 
              const readingsPromises = activeInstallations.map(installation => 
                energyApi.getRecentReadings(installation.id, 50)
                  .then(readings => {
                    if (readings && readings.length > 0) {
                      // Add installation type info to each reading for better charts
                      const enhancedReadings = readings.map(reading => ({
                        ...reading,
                        installationType: installation.type || 'RESIDENTIAL'
                      }))
                      return enhancedReadings
                    }
                    return []
                  })
                  .catch(error => {
                    console.error(`Error fetching readings for installation ${installation.id}:`, error)
                    return []
                  })
              )
              
              // Wait for all readings to be fetched
              const installationReadings = await Promise.all(readingsPromises)
              
              // Combine all readings
              allReadings = installationReadings.flat()
              
              if (allReadings.length > 0) {
                // Transform combined readings into chart data - ensuring consistency with summary metrics
                const chartData = transformReadingsToChartData(allReadings, timeRange)
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
          // No energy data available
          setEnergyData([])
        }

        // Get active installations to use as top producers if needed
        const activeInstallations = systemResponse.recentlyActiveInstallations || [];
        
        // Get and fetch dashboard data for each installation 
        // First get the IDs of installations to check (either from topProducers or active installations)
        let installationIdsToFetch = [];
        
        // Use top producers from system overview if available
        if (systemResponse.topProducers && Array.isArray(systemResponse.topProducers) && systemResponse.topProducers.length > 0) {
          installationIdsToFetch = systemResponse.topProducers.slice(0, 5).map(prod => prod.id);
        } 
        // Otherwise use active installations 
        else if (activeInstallations.length > 0) {
          installationIdsToFetch = activeInstallations.slice(0, 5).map(inst => inst.id);
        }
        
        // If we have IDs to fetch, get dashboard data for each
        if (installationIdsToFetch.length > 0) {
          try {
            // Fetch dashboard data for each installation and calculate their average efficiency
            const dashboardPromises = installationIdsToFetch.map(async id => {
              try {
                // Get dashboard data
                const dashboard = await energyApi.getInstallationDashboard(id);
                
                // Also calculate average efficiency
                const averageEfficiency = await energyApi.calculateInstallationAverageEfficiency(id);
                
                return {
                  ...dashboard,
                  averageEfficiencyPercentage: averageEfficiency
                };
              } catch (error) {
                console.error(`Error fetching dashboard for installation ${id}:`, error);
                return null;
              }
            });
            
            // Wait for all dashboards to be fetched
            const dashboardResults = await Promise.all(dashboardPromises);
            
            // Filter out null results and create enriched top producers
            const enrichedProducers = dashboardResults
              .filter(dashboard => dashboard !== null)
              .map(dashboard => {
                // Find matching installation from active installations to get additional metadata
                const matchingInstallation = activeInstallations.find(
                  inst => inst.id === dashboard.installationId
                );
                
                // Return combined data with dashboard values - prioritizing stable daily metrics over fluctuating real-time values
                return {
                  id: dashboard.installationId,
                  name: dashboard.installationDetails?.name || 
                        matchingInstallation?.name || 
                        `Installation ${dashboard.installationId}`,
                  username: dashboard.installationDetails?.username || 
                          matchingInstallation?.username || 
                          dashboard.installationDetails?.customer?.email || "N/A",
                  location: dashboard.installationDetails?.location || 
                          matchingInstallation?.location || "N/A",
                  type: dashboard.installationDetails?.type || 
                        matchingInstallation?.type || "RESIDENTIAL",
                  // Use more stable daily metrics instead of real-time values that change every 15 seconds
                  todayGenerationKWh: dashboard.todayGenerationKWh,
                  currentPowerGenerationWatts: dashboard.currentPowerGenerationWatts, // Keep as fallback
                  currentEfficiencyPercentage: dashboard.currentEfficiencyPercentage,
                  // Add average efficiency for more stable metric
                  averageEfficiencyPercentage: dashboard.averageEfficiencyPercentage || dashboard.currentEfficiencyPercentage
                };
              });
            
            // Set the enriched producers as top producers
            if (enrichedProducers.length > 0) {
              setTopProducers(enrichedProducers);
              console.log("Fetched dashboard data with average efficiency for top producers:", enrichedProducers);
            } else {
              // Fall back to active installations if no dashboard data
              setTopProducers(activeInstallations.slice(0, 5));
            }
          } catch (error) {
            console.error("Error fetching installation dashboards:", error);
            // Fall back to active installations
            setTopProducers(activeInstallations.slice(0, 5));
          }
        } else {
          // No installations to fetch, use what we have
          setTopProducers(activeInstallations.slice(0, 5));
        }
      } else {
        setSystemOverview(null)
        setInstallations([])
        setEnergyData([])
        setTopProducers([])
        setTotalProductionToday(0)
        setTotalProductionMonth(0)
        setTotalProductionYear(0)
        setAverageEfficiency(0)
      }
    } catch (error) {
      console.error("Error fetching energy data:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load energy monitoring data from the server.",
      })

      // Reset data on error instead of using sample data
      setSystemOverview(null)
      setInstallations([])
      setEnergyData([])
      setTopProducers([])
      setTotalProductionToday(0)
      setTotalProductionMonth(0)
      setTotalProductionYear(0)
      setAverageEfficiency(0)
    } finally {
      setLoading(false)
    }
  }

  // Auto-fetch data when component mounts or timeRange changes
  useEffect(() => {
    console.log("🔄 Initial data fetch for energy monitoring with timeRange:", timeRange);
    fetchEnergyData();
  }, [timeRange]);

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

  // Transform raw installation readings into chart data
  const transformReadingsToChartData = (readings: any[], timeRangeType: string) => {
    if (!readings || readings.length === 0) return []
    
    // Sort readings by timestamp in ascending order
    const sortedReadings = [...readings].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    )
    
    // Handle the case when systemOverview is null
    if (!systemOverview) {
      console.warn('systemOverview is null in transformReadingsToChartData, using empty chart structure');
      // Return empty data with the correct structure for each time range
      return createBasicChartData(null, timeRangeType);
    }
    
    // Get exact values from the system overview to use as reference
    const todayTotal = systemOverview.todayTotalGenerationKWh || 0;
    const weekTotal = systemOverview.weekToDateGenerationKWh || 0;
    const monthTotal = systemOverview.monthToDateGenerationKWh || 0;
    const yearTotal = systemOverview.yearToDateGenerationKWh || 0;
    
    // For very small values (below threshold), treat them as zero to prevent misleading visualizations
    const isVerySmallToday = todayTotal < 0.001;
    const isVerySmallWeek = weekTotal < 0.001;
    const isVerySmallMonth = monthTotal < 0.001;
    const isVerySmallYear = yearTotal < 0.001;
    
    // Determine if we should show zero values based on timeRange
    const shouldUseZeroValues = 
      (timeRangeType === 'day' && isVerySmallToday) ||
      (timeRangeType === 'week' && isVerySmallWeek) ||
      (timeRangeType === 'month' && isVerySmallMonth) ||
      (timeRangeType === 'year' && isVerySmallYear);
    
    if (shouldUseZeroValues) {
      console.log(`Using zero values for ${timeRangeType} due to very small official totals:`, {
        timeRangeType,
        todayTotal, 
        weekTotal,
        monthTotal,
        yearTotal
      });
      // Return empty data with the correct structure for each time range
      return createBasicChartData(systemOverview, timeRangeType);
    }
    
    // Calculate the total energy from all readings to normalize later
    const totalEnergyFromReadings = sortedReadings.reduce((sum, reading) => 
      sum + (reading.powerGenerationWatts / 1000), 0);
    
    // Get expected totals from the system overview
    const totalEnergyExpected: Record<string, number> = {
      day: systemOverview.todayTotalGenerationKWh || 0,
      week: systemOverview.weekToDateGenerationKWh || 0,
      month: systemOverview.monthToDateGenerationKWh || 0,
      year: systemOverview.yearToDateGenerationKWh || 0
    };
    
    // Calculate normalization factor if readings have values
    const normalizationFactor = totalEnergyFromReadings > 0 && totalEnergyExpected[timeRangeType] > 0 
      ? totalEnergyExpected[timeRangeType] / totalEnergyFromReadings
      : 1;
    
    // Group readings by installation first
    const installationReadings = {}
    
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
      const hourlyData = {}
      
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
      Object.values(installationReadings).forEach(instReadings => {
        instReadings.forEach(reading => {
          if (!reading.timestamp) return
          
          const date = new Date(reading.timestamp)
          const hour = date.getHours()
          const hourLabel = `${hour}:00`
          
          // Add values - normalize to match the summary total
          const powerGen = (reading.powerGenerationWatts / 1000) * normalizationFactor // Convert to kW and normalize
          hourlyData[hourLabel].total += powerGen
          
          // Categorize by installation type
          const type = reading.installationType?.toUpperCase() || 'RESIDENTIAL'
          if (type === 'RESIDENTIAL') {
            hourlyData[hourLabel].residential += powerGen
          } else if (type === 'COMMERCIAL') {
            hourlyData[hourLabel].commercial += powerGen
          } else if (type === 'INDUSTRIAL') {
            hourlyData[hourLabel].industrial += powerGen
          } else {
            // Default to residential if unknown
            hourlyData[hourLabel].residential += powerGen
          }
          
          hourlyData[hourLabel].consumption += (reading.powerConsumptionWatts / 1000) * normalizationFactor
          hourlyData[hourLabel].count += 1
        })
      })
      
      // Calculate hourly averages and return sorted by hour
      return Object.values(hourlyData).map(hour => {
        const result = { ...hour }
        delete result.count
        return result
      }).sort((a, b) => {
        // Sort by hour
        return parseInt(a.name.split(':')[0]) - parseInt(b.name.split(':')[0])
      })
    } else if (timeRangeType === 'week') {
      // Group by day for week view
      const dailyData = {}
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
      Object.values(installationReadings).forEach(instReadings => {
        instReadings.forEach(reading => {
          if (!reading.timestamp) return
          
          const date = new Date(reading.timestamp)
          const day = date.getDay() // 0-6, Sunday is 0
          const dayLabel = dayNames[day]
          
          // Add values - normalize to match the summary total
          const powerGen = (reading.powerGenerationWatts / 1000) * normalizationFactor // Convert to kW and normalize
          dailyData[dayLabel].total += powerGen
          
          // Categorize by installation type
          const type = reading.installationType?.toUpperCase() || 'RESIDENTIAL'
          if (type === 'RESIDENTIAL') {
            dailyData[dayLabel].residential += powerGen
          } else if (type === 'COMMERCIAL') {
            dailyData[dayLabel].commercial += powerGen
          } else if (type === 'INDUSTRIAL') {
            dailyData[dayLabel].industrial += powerGen
          } else {
            // Default to residential if unknown
            dailyData[dayLabel].residential += powerGen
          }
          
          dailyData[dayLabel].consumption += (reading.powerConsumptionWatts / 1000) * normalizationFactor
          dailyData[dayLabel].count += 1
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
      const monthData = {}
      
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
      Object.values(installationReadings).forEach(instReadings => {
        instReadings.forEach(reading => {
          if (!reading.timestamp) return
          
          const date = new Date(reading.timestamp)
          const day = date.getDate()
          const dayLabel = day.toString()
          
          // Add values - normalize to match the summary total
          const powerGen = (reading.powerGenerationWatts / 1000) * normalizationFactor // Convert to kW and normalize
          monthData[dayLabel].total += powerGen
          
          // Categorize by installation type
          const type = reading.installationType?.toUpperCase() || 'RESIDENTIAL'
          if (type === 'RESIDENTIAL') {
            monthData[dayLabel].residential += powerGen
          } else if (type === 'COMMERCIAL') {
            monthData[dayLabel].commercial += powerGen
          } else if (type === 'INDUSTRIAL') {
            monthData[dayLabel].industrial += powerGen
          } else {
            // Default to residential if unknown
            monthData[dayLabel].residential += powerGen
          }
          
          monthData[dayLabel].consumption += (reading.powerConsumptionWatts / 1000) * normalizationFactor
          monthData[dayLabel].count += 1
        })
      })
      
      // Calculate averages and sort by day
      // Filter out days with no data (especially for days beyond current month)
      return Object.values(monthData)
        .filter(day => day.count > 0)
        .map(dayData => {
          const result = { ...dayData }
          delete result.count
          return result
        })
        .sort((a, b) => parseInt(a.name) - parseInt(b.name))
    } else {
      // Group by month for year view
      const yearData = {}
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
      Object.values(installationReadings).forEach(instReadings => {
        instReadings.forEach(reading => {
          if (!reading.timestamp) return
          
          const date = new Date(reading.timestamp)
          const month = date.getMonth()
          const monthLabel = monthNames[month]
          
          // Add values - normalize to match the summary total
          const powerGen = (reading.powerGenerationWatts / 1000) * normalizationFactor // Convert to kW and normalize
          yearData[monthLabel].total += powerGen
          
          // Categorize by installation type
          const type = reading.installationType?.toUpperCase() || 'RESIDENTIAL'
          if (type === 'RESIDENTIAL') {
            yearData[monthLabel].residential += powerGen
          } else if (type === 'COMMERCIAL') {
            yearData[monthLabel].commercial += powerGen
          } else if (type === 'INDUSTRIAL') {
            yearData[monthLabel].industrial += powerGen
          } else {
            // Default to residential if unknown
            yearData[monthLabel].residential += powerGen
          }
          
          yearData[monthLabel].consumption += (reading.powerConsumptionWatts / 1000) * normalizationFactor
          yearData[monthLabel].count += 1
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
    
    // For very small values (below certain threshold, e.g., 0.001), 
    // treat them as zero to prevent misleading visualizations
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
      // Use the actual daily total from summary metrics
      // Create simple hourly data - spread the day's total over daylight hours
      const hourCount = 12; // Assume 12 hours of activity
      const hourlyValue = isVerySmallToday ? 0 : todayTotal / hourCount;
      const hourlyConsumption = isVerySmallToday ? 0 : todayConsumption / hourCount;
      
      for (let hour = 0; hour < 24; hour++) {
        // More generation during daylight hours (6am-6pm)
        const isDaylight = hour >= 6 && hour <= 18;
        basicChartData.push({
          name: `${hour}:00`,
          total: isDaylight ? hourlyValue : 0,
          residential: isDaylight ? hourlyValue * 0.6 : 0, 
          commercial: isDaylight ? hourlyValue * 0.3 : 0,
          industrial: isDaylight ? hourlyValue * 0.1 : 0,
          consumption: isDaylight ? hourlyConsumption : 0
        });
      }
    } else if (timeRangeType === 'week') {
      // Use the actual weekly total
      const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const weeklyPerDay = isVerySmallWeek ? 0 : weekTotal / 7;
      const consumptionPerDay = isVerySmallWeek ? 0 : weekConsumption / 7;
      
      for (let day = 0; day < 7; day++) {
        // Weekend days slightly lower, weekdays similar
        const factor = day >= 5 ? 0.8 : 1.0;
        const dailyValue = weeklyPerDay * factor;
        const dailyConsumption = consumptionPerDay * factor;
        
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
      // Use the actual monthly total and distribute it evenly
      const daysInMonth = 30;
      const dailyValue = isVerySmallMonth ? 0 : monthTotal / daysInMonth;
      const dailyConsumption = isVerySmallMonth ? 0 : monthConsumption / daysInMonth;
      
      for (let day = 1; day <= daysInMonth; day++) {
        basicChartData.push({
          name: `${day}`,
          total: dailyValue,
          residential: dailyValue * 0.6,
          commercial: dailyValue * 0.3,
          industrial: dailyValue * 0.1,
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
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Today's Production</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProductionToday > 0 ? totalProductionToday.toFixed(2) : '0.0'} kWh</div>
            <p className="text-xs text-muted-foreground">
              <span className={`flex items-center ${totalProductionToday > 0 ? 'text-emerald-500' : 'text-gray-400'}`}>
                <ArrowUp className="mr-1 h-4 w-4" />
                {systemOverview?.dailyChangePercentage ? `+${systemOverview.dailyChangePercentage}%` : 
                 totalProductionToday > 0 ? "Data available" : "Data unavailable"}
              </span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Weekly Production</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProductionWeek > 0 ? totalProductionWeek.toFixed(2) : '0.0'} kWh</div>
            <p className="text-xs text-muted-foreground">
              <span className={`flex items-center ${totalProductionWeek > 0 ? 'text-emerald-500' : 'text-gray-400'}`}>
                <ArrowUp className="mr-1 h-4 w-4" />
                {systemOverview?.weeklyChangePercentage ? `+${systemOverview.weeklyChangePercentage}%` : 
                 totalProductionWeek > 0 ? "Data available" : "Data unavailable"}
              </span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Monthly Production</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProductionMonth > 0 ? totalProductionMonth.toFixed(2) : '0.0'} kWh</div>
            <p className="text-xs text-muted-foreground">
              <span className={`flex items-center ${totalProductionMonth > 0 ? 'text-emerald-500' : 'text-gray-400'}`}>
                <ArrowUp className="mr-1 h-4 w-4" />
                {systemOverview?.monthlyChangePercentage ? `+${systemOverview.monthlyChangePercentage}%` : 
                 totalProductionMonth > 0 ? "Data available" : "Data unavailable"}
              </span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Annual Production</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProductionYear > 0 ? totalProductionYear.toFixed(2) : '0.0'} kWh</div>
            <p className="text-xs text-muted-foreground">
              <span className={`flex items-center ${totalProductionYear > 0 ? 'text-emerald-500' : 'text-gray-400'}`}>
                <ArrowUp className="mr-1 h-4 w-4" />
                {systemOverview?.yearlyChangePercentage ? `+${systemOverview.yearlyChangePercentage}%` : 
                 totalProductionYear > 0 ? "Data available" : "Data unavailable"}
              </span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Energy Production</CardTitle>
            <CardDescription>System-wide energy production</CardDescription>
            <Tabs defaultValue="production" className="w-full">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <TabsList>
                  <TabsTrigger value="production">Production</TabsTrigger>
                  <TabsTrigger value="consumption">Consumption</TabsTrigger>
                </TabsList>
              </div>
              <TabsContent value="production" className="mt-4">
                {loading ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : energyData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <LineChart className="h-16 w-16 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium">No Production Data Available</h3>
                    <p className="text-sm text-muted-foreground max-w-md mt-2">
                      There is no energy production data available for the selected time range.
                    </p>
                  </div>
                ) : (
                  <Chart>
                    <ChartContainer>
                      <ResponsiveContainer width="100%" height={350}>
                        <ComposedChart data={energyData} margin={{ top: 10, right: 10, left: 10, bottom: 40 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="name" />
                          <YAxis tickFormatter={(value) => `${value / 1000}k`} />
                          <Tooltip
                            formatter={(value) => [`${formatEnergyValue(value)}`, ""]}
                            labelFormatter={(label) => `${label} ${timeRange === 'day' ? 'Hour' : ''}`}
                          />
                          <Legend wrapperStyle={{ bottom: 0, left: 25 }} />
                          <Bar
                            dataKey="residential"
                            name="Residential"
                            stackId="a"
                            fill="#3b82f6"
                            barSize={timeRange === 'year' ? 20 : 30}
                          />
                          <Bar
                            dataKey="commercial"
                            name="Commercial"
                            stackId="a"
                            fill="#10b981"
                            barSize={timeRange === 'year' ? 20 : 30}
                          />
                          <Bar
                            dataKey="industrial"
                            name="Industrial"
                            stackId="a"
                            fill="#f59e0b"
                            barSize={timeRange === 'year' ? 20 : 30}
                          />
                          <Line
                            type="monotone"
                            dataKey="total"
                            name="Total Production"
                            stroke="#ef4444"
                            strokeWidth={2}
                            dot={{ r: 4 }}
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </Chart>
                )}
              </TabsContent>
              <TabsContent value="consumption" className="mt-4">
                {loading ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : energyData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <LineChart className="h-16 w-16 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium">No Consumption Data Available</h3>
                    <p className="text-sm text-muted-foreground max-w-md mt-2">
                      There is no energy consumption data available for the selected time range.
                    </p>
                  </div>
                ) : (
                  <Chart>
                    <ChartContainer>
                      <ResponsiveContainer width="100%" height={350}>
                        <AreaChart data={energyData} margin={{ top: 10, right: 10, left: 10, bottom: 40 }}>
                          <defs>
                            <linearGradient id="colorConsumption" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                              <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="name" />
                          <YAxis tickFormatter={(value) => `${value / 1000}k`} />
                          <Tooltip
                            formatter={(value) => [`${formatEnergyValue(value)}`, ""]}
                            labelFormatter={(label) => `${label} ${timeRange === 'day' ? 'Hour' : ''}`}
                          />
                          <Legend wrapperStyle={{ bottom: 0, left: 25 }} />
                          <Area
                            type="monotone"
                            dataKey="consumption"
                            name="Energy Consumption"
                            stroke="#ef4444"
                            fillOpacity={1}
                            fill="url(#colorConsumption)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </Chart>
                )}
              </TabsContent>
            </Tabs>
          </CardHeader>
        </Card>
      </div>

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
                              installation.currentEfficiencyPercentage !== undefined ? 
                              `${(installation.currentEfficiencyPercentage).toFixed(2)}%` : 
                              "N/A"}
                          </span>
                          {(installation.averageEfficiencyPercentage > 0 || installation.currentEfficiencyPercentage > 0) && 
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