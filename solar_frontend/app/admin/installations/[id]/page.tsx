"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
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
  Clock,
  Shield,
  Info,
  Check,
  X,
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
import { energyApi, installationApi, securityApi } from "@/lib/api"
import { energyWebSocket } from "@/lib/energyWebSocket"

interface Installation {
  id: number;
  userId: number;
  username: string;
  name: string;
  installedCapacityKW: number;
  location: string;
  installationDate: string;
  status: string;
  tamperDetected: boolean;
  lastTamperCheck: string;
  type: string;
  efficiency?: number;
  totalYield?: number;
  currentPowerGenerationWatts?: number;
  currentPowerConsumptionWatts?: number;
  efficiencyPercentage?: number;
  todayGenerationKWh?: number;
  todayConsumptionKWh?: number;
  weekToDateGenerationKWh?: number;
  weekToDateConsumptionKWh?: number;
  monthToDateGenerationKWh?: number;
  monthToDateConsumptionKWh?: number;
  yearToDateGenerationKWh?: number;
  yearToDateConsumptionKWh?: number;
  lifetimeGenerationKWh?: number;
  lifetimeConsumptionKWh?: number;
}

interface ReadingData {
  timestamp: string;
  powerGenerationWatts: number;
  powerConsumptionWatts: number;
}

interface SecurityEvent {
  id: number;
  installationId: number;
  type: string;
  status: string;
  timestamp: string;
  details: string;
}

interface SecurityEventResponse {
  content?: SecurityEvent[];
  [key: string]: any;
}

interface ChartDataPoint {
  name: string;
  generation: number;
  consumption: number;
}

export default function InstallationDetailPage() {
  const router = useRouter()
  const { id } = useParams() as { id: string }
  const { toast } = useToast()
  
  // Extract referrer from URL query parameters to know where the user came from
  const [referrer, setReferrer] = useState<string | null>(null)
  
  useEffect(() => {
    // Check URL for referrer parameter
    const urlParams = new URLSearchParams(window.location.search)
    const ref = urlParams.get('referrer')
    if (ref) {
      setReferrer(ref)
    }
  }, [])
  
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState("week")
  const [installation, setInstallation] = useState<Installation | null>(null)
  const [energyData, setEnergyData] = useState<ChartDataPoint[]>([])
  const [recentReadings, setRecentReadings] = useState<ReadingData[]>([])
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([])
  const [customerInfo, setCustomerInfo] = useState<{email: string, userId: number} | null>(null)
  const [performance, setPerformance] = useState({
    efficiency: 0,
    dailyYield: 0,
    monthlyYield: 0,
    yearlyYield: 0,
    totalYield: 0,
    uptimePercent: 0
  })

  // Load installation data
  useEffect(() => {
    const fetchInstallationData = async () => {
      try {
        setLoading(true)
        
        // First fetch installation dashboard data (contains all the most accurate metrics)
        const dashboardData = await energyApi.getInstallationDashboard(id)
        
        console.log('Installation dashboard data:', dashboardData)
        
        // Calculate the average efficiency for this installation
        const averageEfficiency = await energyApi.calculateInstallationAverageEfficiency(id)
        console.log('Average efficiency for installation:', averageEfficiency)
        
        // Then get additional installation details if needed
        const installationData = await installationApi.getInstallationDetails(id)
        
        if (dashboardData && installationData) {
          console.log('Installation details:', installationData)
          
          // Combine dashboard data with installation details
          const combinedData = {
            ...installationData,
            // Add metrics from dashboard that might not be in the installation details
            currentPowerGenerationWatts: dashboardData.currentPowerGenerationWatts,
            currentPowerConsumptionWatts: dashboardData.currentPowerConsumptionWatts,
            efficiencyPercentage: dashboardData.currentEfficiencyPercentage,
            totalYield: dashboardData.lifetimeGenerationKWh,
            // Also include specific period data
            todayGenerationKWh: dashboardData.todayGenerationKWh,
            todayConsumptionKWh: dashboardData.todayConsumptionKWh,
            weekToDateGenerationKWh: dashboardData.weekToDateGenerationKWh,
            weekToDateConsumptionKWh: dashboardData.weekToDateConsumptionKWh,
            monthToDateGenerationKWh: dashboardData.monthToDateGenerationKWh,
            monthToDateConsumptionKWh: dashboardData.monthToDateConsumptionKWh,
            yearToDateGenerationKWh: dashboardData.yearToDateGenerationKWh,
            yearToDateConsumptionKWh: dashboardData.yearToDateConsumptionKWh,
            lifetimeGenerationKWh: dashboardData.lifetimeGenerationKWh,
            lifetimeConsumptionKWh: dashboardData.lifetimeConsumptionKWh
          }
          
          // Set the combined installation data
          setInstallation(combinedData)
          
          // Store customer info separately if available
          if (installationData.username) {
            setCustomerInfo({
              email: installationData.username,
              userId: installationData.userId
            })
          }
          
          // Use readings from the dashboard if available
          setRecentReadings(dashboardData.recentReadings || [])
          
          // Calculate performance metrics from dashboard data
          // Use the dashboard data for more accurate performance metrics
          const perfMetrics = {
            efficiency: averageEfficiency || dashboardData.currentEfficiencyPercentage || 0,
            dailyYield: dashboardData.todayGenerationKWh || 0,
            monthlyYield: dashboardData.monthToDateGenerationKWh || 0,
            yearlyYield: dashboardData.yearToDateGenerationKWh || 0,
            totalYield: dashboardData.lifetimeGenerationKWh || 0,
            uptimePercent: 98 // Default value
          }
          
          setPerformance(perfMetrics)
          
          // Transform readings to chart data if available
          if (dashboardData.recentReadings && dashboardData.recentReadings.length > 0) {
            const chartData = processEnergyData(dashboardData.recentReadings, timeRange, dashboardData)
            setEnergyData(chartData)
          } else {
            // Set empty chart data
            setEnergyData([])
          }
          
          // Fetch recent security events
          let recentEvents: SecurityEvent[] = []
          try {
            const eventsResponse = await securityApi.getInstallationEvents(id) as SecurityEventResponse
            
            // Handle both array response and paged response
            if (eventsResponse) {
              if (Array.isArray(eventsResponse)) {
                recentEvents = eventsResponse
              } else if (eventsResponse.content && Array.isArray(eventsResponse.content)) {
                recentEvents = eventsResponse.content
              }
            }
          } catch (eventsError) {
            console.error('Error fetching security events:', eventsError)
          }
          
          // Use actual security events or empty array
          if (Array.isArray(recentEvents) && recentEvents.length > 0) {
            setSecurityEvents(recentEvents.slice(0, 5))
          } else {
            setSecurityEvents([])
          }
        } else {
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to fetch installation data. The installation may not exist.",
          })
          router.push("/admin/installations")
        }
      } catch (error) {
        console.error("Error fetching installation data:", error)
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to fetch installation data. Please try again later.",
        })
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      console.log(`🔄 Loading installation ${id} data with timeRange: ${timeRange}`);
      fetchInstallationData()
    }
    
    // Set up WebSocket connection
    let wsConnection = null
    
    try {
      wsConnection = energyWebSocket.createInstallationMonitor(
        id,
        // Message handler
        (data) => {
          if (data.type === 'ENERGY_READING') {
            // Update real-time readings
            setRecentReadings(prev => {
              const updated = [data.payload, ...prev.slice(0, 9)]
              return updated
            })
            
            // Update energy data charts
            setEnergyData(prev => {
              if (timeRange === 'day') {
                const hour = new Date(data.payload.timestamp).getHours()
                const newData = [...prev]
                const existingIndex = newData.findIndex(item => 
                  item.name && item.name.includes(`${hour}:`))
                
                if (existingIndex >= 0) {
                  newData[existingIndex] = {
                    ...newData[existingIndex],
                    generation: data.payload.powerGenerationWatts / 1000,
                    consumption: data.payload.powerConsumptionWatts / 1000
                  }
                }
                return newData
              }
              return prev
            })
          } else if (data.type === 'SECURITY_EVENT') {
            // Add new security event
            setSecurityEvents(prev => [data.payload, ...prev.slice(0, 4)])
          }
        },
        // Error handler
        (error) => {
          console.error('WebSocket error:', error)
        }
      )
    } catch (error) {
      console.error('Error setting up WebSocket:', error)
    }
    
    // Clean up WebSocket connection
    return () => {
      if (wsConnection) {
        wsConnection.close()
      }
    }
  }, [id, timeRange, toast, router])
  
  // Transform readings to chart data
  const processEnergyData = (
    readings: any[],
    timeRangeType: string,
    dashboardData: any
  ) => {
    if (!readings || readings.length === 0) {
      return []
    }

    // Sort readings by timestamp
    const sortedReadings = [...readings].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    )

    // Get expected totals from the dashboard data for normalization
    const expectedProduction = {
      day: dashboardData?.todayGenerationKWh || 0,
      week: dashboardData?.weekToDateGenerationKWh || 0,
      month: dashboardData?.monthToDateGenerationKWh || 0,
      year: dashboardData?.yearToDateGenerationKWh || 0
    }
    
    const expectedConsumption = {
      day: dashboardData?.todayConsumptionKWh || 0,
      week: dashboardData?.weekToDateConsumptionKWh || 0,
      month: dashboardData?.monthToDateConsumptionKWh || 0,
      year: dashboardData?.yearToDateConsumptionKWh || 0
    }
    
    // Calculate the total energy from readings to normalize later
    const totalProductionFromReadings = sortedReadings.reduce(
      (sum, reading) => sum + (reading.powerGenerationWatts / 1000), 0
    )
    
    const totalConsumptionFromReadings = sortedReadings.reduce(
      (sum, reading) => sum + (reading.powerConsumptionWatts / 1000), 0
    )
    
    // Calculate normalization factors
    const productionNormalizationFactor = 
      totalProductionFromReadings > 0 && expectedProduction[timeRangeType] > 0 
        ? expectedProduction[timeRangeType] / totalProductionFromReadings
        : 1
        
    const consumptionNormalizationFactor = 
      totalConsumptionFromReadings > 0 && expectedConsumption[timeRangeType] > 0 
        ? expectedConsumption[timeRangeType] / totalConsumptionFromReadings
        : 1
    
    console.log('Installation normalization factors:', {
      timeRangeType,
      productionFactor: productionNormalizationFactor,
      consumptionFactor: consumptionNormalizationFactor,
      expectedProduction: expectedProduction[timeRangeType],
      expectedConsumption: expectedConsumption[timeRangeType],
      totalProductionFromReadings,
      totalConsumptionFromReadings
    })

    // Process data based on time range
    if (timeRangeType === "day") {
      // Group by hour for day
      const hourlyData: Record<string, { name: string; generation: number; consumption: number; count: number }> = {}

      // Initialize all hours
      for (let h = 0; h < 24; h++) {
        hourlyData[`${h}:00`] = {
          name: `${h}:00`,
          generation: 0,
          consumption: 0,
          count: 0,
        }
      }

      sortedReadings.forEach((reading) => {
        if (!reading.timestamp) return

        const date = new Date(reading.timestamp)
        const hour = date.getHours()
        const hourKey = `${hour}:00`

        if (hourlyData[hourKey]) {
          // Normalize the values using the calculated factors
          const normalizedGeneration = (reading.powerGenerationWatts / 1000) * productionNormalizationFactor
          const normalizedConsumption = (reading.powerConsumptionWatts / 1000) * consumptionNormalizationFactor
          
          hourlyData[hourKey].generation += normalizedGeneration
          hourlyData[hourKey].consumption += normalizedConsumption
          hourlyData[hourKey].count += 1
        }
      })

      return Object.values(hourlyData)
        .map((hourData) => ({
          name: hourData.name,
          generation: hourData.count > 0 ? hourData.generation : 0,
          consumption: hourData.count > 0 ? hourData.consumption : 0
        }))
        .sort((a, b) => {
          const hourA = parseInt(a.name.split(":")[0])
          const hourB = parseInt(b.name.split(":")[0])
          return hourA - hourB
        })
    } else if (timeRangeType === "week") {
      // Group by day of week
      const dailyData: Record<string, { name: string; generation: number; consumption: number; count: number }> = {}
      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

      // Initialize all days
      dayNames.forEach((day) => {
        dailyData[day] = {
          name: day,
          generation: 0,
          consumption: 0,
          count: 0,
        }
      })

      sortedReadings.forEach((reading) => {
        if (!reading.timestamp) return

        const date = new Date(reading.timestamp)
        const day = date.getDay() // 0-6, Sunday is 0
        const dayName = dayNames[day]

        // Normalize the values using the calculated factors
        const normalizedGeneration = (reading.powerGenerationWatts / 1000) * productionNormalizationFactor
        const normalizedConsumption = (reading.powerConsumptionWatts / 1000) * consumptionNormalizationFactor
        
        dailyData[dayName].generation += normalizedGeneration
        dailyData[dayName].consumption += normalizedConsumption
        dailyData[dayName].count += 1
      })

      // Rearrange days to start with Monday
      const orderedDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
      return orderedDays.map((day) => ({
        name: day,
        generation: dailyData[day].count > 0 ? dailyData[day].generation : 0,
        consumption: dailyData[day].count > 0 ? dailyData[day].consumption : 0
      }))
    } else if (timeRangeType === "month") {
      // Group by day of month
      const monthData: Record<string, { name: string; generation: number; consumption: number; count: number }> = {}

      // Initialize for a 31-day month
      for (let d = 1; d <= 31; d++) {
        monthData[d.toString()] = {
          name: d.toString(),
          generation: 0,
          consumption: 0,
          count: 0,
        }
      }

      sortedReadings.forEach((reading) => {
        if (!reading.timestamp) return

        const date = new Date(reading.timestamp)
        const day = date.getDate()
        const dayStr = day.toString()

        // Normalize the values using the calculated factors
        const normalizedGeneration = (reading.powerGenerationWatts / 1000) * productionNormalizationFactor
        const normalizedConsumption = (reading.powerConsumptionWatts / 1000) * consumptionNormalizationFactor
        
        monthData[dayStr].generation += normalizedGeneration
        monthData[dayStr].consumption += normalizedConsumption
        monthData[dayStr].count += 1
      })

      return Object.entries(monthData)
        .filter(([_, data]) => data.count > 0)
        .map(([_, data]) => ({
          name: data.name,
          generation: data.generation,
          consumption: data.consumption
        }))
        .sort((a, b) => parseInt(a.name) - parseInt(b.name))
    } else {
      // Group by month for year
      const yearData: Record<string, { name: string; generation: number; consumption: number; count: number }> = {}
      const monthNames = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
      ]

      // Initialize all months
      monthNames.forEach((month) => {
        yearData[month] = {
          name: month,
          generation: 0,
          consumption: 0,
          count: 0,
        }
      })

      sortedReadings.forEach((reading) => {
        if (!reading.timestamp) return

        const date = new Date(reading.timestamp)
        const month = date.getMonth()
        const monthName = monthNames[month]

        // Normalize the values using the calculated factors
        const normalizedGeneration = (reading.powerGenerationWatts / 1000) * productionNormalizationFactor
        const normalizedConsumption = (reading.powerConsumptionWatts / 1000) * consumptionNormalizationFactor
        
        yearData[monthName].generation += normalizedGeneration
        yearData[monthName].consumption += normalizedConsumption
        yearData[monthName].count += 1
      })

      return monthNames.map((month) => ({
        name: month,
        generation: yearData[month].count > 0 ? yearData[month].generation : 0,
        consumption: yearData[month].count > 0 ? yearData[month].consumption : 0
      }))
    }
  }
  
  // Format energy value
  const formatEnergyValue = (value: number) => {
    if (!value) return "0 kWh"
    
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(2)} GWh`
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(2)} MWh`
    } else {
      return `${value.toFixed(2)} kWh`
    }
  }
  
  // Format date
  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A"
    
    const date = new Date(dateString)
    return date.toLocaleString()
  }
  
  // Installation type badge color
  const getTypeColor = (type: string) => {
    if (!type) return "bg-gray-500"
    
    switch (type.toUpperCase()) {
      case 'RESIDENTIAL':
        return "bg-blue-500"
      case 'COMMERCIAL':
        return "bg-green-500"
      case 'INDUSTRIAL':
        return "bg-amber-500"
      default:
        return "bg-gray-500"
    }
  }
  
  // Event status badge
  const getEventStatusBadge = (status: string) => {
    if (!status) return <Badge variant="outline">Unknown</Badge>
    
    switch (status.toUpperCase()) {
      case 'SUCCESS':
        return <Badge className="bg-green-500">Success</Badge>
      case 'WARNING':
        return <Badge className="bg-amber-500">Warning</Badge>
      case 'ERROR':
        return <Badge className="bg-red-500">Error</Badge>
      case 'CRITICAL':
        return <Badge className="bg-red-700">Critical</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }
  
  // Event type icon
  const getEventTypeIcon = (type: string) => {
    if (!type) return <Info className="h-4 w-4" />
    
    switch (type.toUpperCase()) {
      case 'SYSTEM_CHECK':
        return <Check className="h-4 w-4" />
      case 'CONNECTION_CHECK':
        return <Zap className="h-4 w-4" />
      case 'FIRMWARE_UPDATE':
        return <RefreshCw className="h-4 w-4" />
      case 'TAMPER_CHECK':
        return <Shield className="h-4 w-4" />
      case 'BATTERY_CHECK':
        return <Battery className="h-4 w-4" />
      case 'TAMPER_DETECTED':
        return <AlertTriangle className="h-4 w-4" />
      default:
        return <Info className="h-4 w-4" />
    }
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
              {referrer === 'energy' ? (
                <>
                  <BreadcrumbItem>
                    <BreadcrumbLink href="/admin/energy">Energy Monitoring</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                </>
              ) : (
                <>
                  <BreadcrumbItem>
                    <BreadcrumbLink href="/admin/installations">Installations</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                </>
              )}
              <BreadcrumbItem>
                <BreadcrumbPage>Installation {id}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{installation?.name || `Installation ${id}`}</h1>
          <p className="text-muted-foreground">
            Detailed energy production and monitoring for this installation
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={(value) => {
            console.log(`Changing time range to: ${value}`);
            setTimeRange(value);
            // Data will refresh automatically due to timeRange dependency in useEffect
          }}>
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
            console.log("🔄 Manual refresh triggered for installation details");
            // Use the existing fetchInstallationData function
            if (id) {
              setLoading(true)
              const fetchInstallationData = async () => {
                try {
                  // First fetch installation dashboard data
                  const dashboardData = await energyApi.getInstallationDashboard(id)
                  
                  // Calculate the average efficiency for this installation
                  const averageEfficiency = await energyApi.calculateInstallationAverageEfficiency(id)
                  
                  // Then get additional installation details if needed
                  const installationData = await installationApi.getInstallationDetails(id)
                  
                  if (dashboardData && installationData) {
                    // Process data here (same as in useEffect)
                    // Combine dashboard data with installation details
                    const combinedData = {
                      ...installationData,
                      currentPowerGenerationWatts: dashboardData.currentPowerGenerationWatts,
                      currentPowerConsumptionWatts: dashboardData.currentPowerConsumptionWatts,
                      efficiencyPercentage: dashboardData.currentEfficiencyPercentage,
                      totalYield: dashboardData.lifetimeGenerationKWh,
                      todayGenerationKWh: dashboardData.todayGenerationKWh,
                      todayConsumptionKWh: dashboardData.todayConsumptionKWh,
                      weekToDateGenerationKWh: dashboardData.weekToDateGenerationKWh,
                      weekToDateConsumptionKWh: dashboardData.weekToDateConsumptionKWh,
                      monthToDateGenerationKWh: dashboardData.monthToDateGenerationKWh,
                      monthToDateConsumptionKWh: dashboardData.monthToDateConsumptionKWh,
                      yearToDateGenerationKWh: dashboardData.yearToDateGenerationKWh,
                      yearToDateConsumptionKWh: dashboardData.yearToDateConsumptionKWh,
                      lifetimeGenerationKWh: dashboardData.lifetimeGenerationKWh,
                      lifetimeConsumptionKWh: dashboardData.lifetimeConsumptionKWh
                    }
                    
                    // Update state with the new data
                    setInstallation(combinedData)
                    
                    // Store customer info separately if available
                    if (installationData.username) {
                      setCustomerInfo({
                        email: installationData.username,
                        userId: installationData.userId
                      })
                    }
                    
                    // Use readings from the dashboard if available
                    setRecentReadings(dashboardData.recentReadings || [])
                    
                    // Calculate performance metrics from dashboard data
                    const perfMetrics = {
                      efficiency: averageEfficiency || dashboardData.currentEfficiencyPercentage || 0,
                      dailyYield: dashboardData.todayGenerationKWh || 0,
                      monthlyYield: dashboardData.monthToDateGenerationKWh || 0,
                      yearlyYield: dashboardData.yearToDateGenerationKWh || 0,
                      totalYield: dashboardData.lifetimeGenerationKWh || 0,
                      uptimePercent: 98 // Default value
                    }
                    
                    setPerformance(perfMetrics)
                    
                    // Transform readings to chart data if available
                    if (dashboardData.recentReadings && dashboardData.recentReadings.length > 0) {
                      const chartData = processEnergyData(dashboardData.recentReadings, timeRange, dashboardData)
                      setEnergyData(chartData)
                    }
                  }
                } catch (error) {
                  console.error("Error refreshing installation data:", error)
                  toast({
                    variant: "destructive",
                    title: "Error",
                    description: "Failed to refresh installation data. Please try again later.",
                  })
                } finally {
                  setLoading(false)
                }
              }
              
              fetchInstallationData()
            }
          }}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Installation Overview */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        {/* Installation Details Card */}
        <Card className="col-span-1 md:col-span-2">
          <CardHeader>
            <CardTitle>Installation Details</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="animate-pulse space-y-4">
                <div className="h-4 w-3/4 bg-gray-200 rounded"></div>
                <div className="h-4 w-1/2 bg-gray-200 rounded"></div>
                <div className="h-4 w-5/6 bg-gray-200 rounded"></div>
                <div className="h-4 w-2/3 bg-gray-200 rounded"></div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Customer</h3>
                    <p className="text-base">{installation?.username || "N/A"}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Installation Date</h3>
                    <p className="text-base">{installation?.installationDate ? new Date(installation.installationDate).toLocaleDateString() : "N/A"}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Location</h3>
                    <p className="text-base">{installation?.location || "N/A"}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Type</h3>
                    <div className="flex items-center mt-1">
                      <div className={`h-2 w-2 rounded-full mr-2 ${getTypeColor(installation?.type || '')}`}></div>
                      <p className="text-base">{installation?.type || "Unknown"}</p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Capacity</h3>
                    <p className="text-base">{installation?.installedCapacityKW ? `${installation.installedCapacityKW} kW` : "N/A"}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Status</h3>
                    <Badge className={`mt-1 ${installation?.status === 'ACTIVE' ? 'bg-green-500' : 
                           installation?.status === 'MAINTENANCE' ? 'bg-amber-500' : 
                           installation?.status === 'SUSPENDED' ? 'bg-red-500' : 'bg-gray-500'}`}>
                      {installation?.status || "Unknown"}
                    </Badge>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Customer ID</h3>
                    <p className="text-base">{installation?.userId || "N/A"}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Last Tamper Check</h3>
                    <div className="flex items-center gap-2 mt-1">
                      {installation?.tamperDetected ? (
                        <><AlertTriangle className="h-4 w-4 text-red-500" />
                        <p className="text-base text-red-500">Tamper Detected!</p></>
                      ) : (
                        <p className="text-base">{installation?.lastTamperCheck ? new Date(installation.lastTamperCheck).toLocaleString() : "N/A"}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Performance Metrics Card */}
        <Card className="col-span-1 md:col-span-2">
          <CardHeader>
            <CardTitle>Performance Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="animate-pulse space-y-4">
                <div className="h-4 w-3/4 bg-gray-200 rounded"></div>
                <div className="h-4 w-1/2 bg-gray-200 rounded"></div>
                <div className="h-4 w-5/6 bg-gray-200 rounded"></div>
                <div className="h-4 w-2/3 bg-gray-200 rounded"></div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Efficiency</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xl font-bold">{performance.efficiency}%</p>
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${
                            performance.efficiency >= 85 ? 'bg-green-500' :
                            performance.efficiency >= 70 ? 'bg-green-400' :
                            performance.efficiency >= 60 ? 'bg-amber-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${performance.efficiency}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Uptime</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xl font-bold">{performance.uptimePercent}%</p>
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${
                            performance.uptimePercent >= 98 ? 'bg-green-500' :
                            performance.uptimePercent >= 95 ? 'bg-green-400' :
                            performance.uptimePercent >= 90 ? 'bg-amber-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${performance.uptimePercent}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Today's Yield</h3>
                    <p className="text-xl font-bold">{performance.dailyYield.toFixed(2)} kWh</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Monthly Yield</h3>
                    <p className="text-xl font-bold">{formatEnergyValue(performance.monthlyYield)}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Yearly Yield</h3>
                    <p className="text-xl font-bold">{formatEnergyValue(performance.yearlyYield)}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Total Yield</h3>
                    <p className="text-xl font-bold">{formatEnergyValue(performance.totalYield)}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Energy Charts */}
      <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
        {/* Energy Production Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Energy Production</CardTitle>
            <CardDescription>
              {timeRange === "day" ? "Hourly energy production" :
               timeRange === "week" ? "Daily energy production" :
               timeRange === "month" ? "Daily energy production" : "Monthly energy production"}
            </CardDescription>
          </CardHeader>
          <CardContent>
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
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={energyData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                      <defs>
                        <linearGradient id="colorGeneration" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" />
                      <YAxis 
                        tickFormatter={(value) => `${value.toFixed(1)}`}
                        label={{ value: 'kW', angle: -90, position: 'insideLeft', offset: 0 }}
                      />
                      <Tooltip formatter={(value: any) => [`${typeof value === 'number' ? value.toFixed(4) : value} kW`, "Generation"]} />
                      <Area 
                        type="monotone" 
                        dataKey="generation" 
                        stroke="#10b981" 
                        fillOpacity={1} 
                        fill="url(#colorGeneration)" 
                        name="Energy Generation"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </Chart>
            )}
          </CardContent>
        </Card>

        {/* Energy Consumption Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Energy Consumption</CardTitle>
            <CardDescription>
              {timeRange === "day" ? "Hourly energy consumption" :
               timeRange === "week" ? "Daily energy consumption" :
               timeRange === "month" ? "Daily energy consumption" : "Monthly energy consumption"}
            </CardDescription>
          </CardHeader>
          <CardContent>
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
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={energyData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                      <defs>
                        <linearGradient id="colorConsumption" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" />
                      <YAxis 
                        tickFormatter={(value) => `${value.toFixed(1)}`}
                        label={{ value: 'kW', angle: -90, position: 'insideLeft', offset: 0 }}
                        domain={['auto', 'auto']}
                      />
                      <Tooltip formatter={(value: any) => [`${typeof value === 'number' ? value.toFixed(4) : value} kW`, "Consumption"]} />
                      <Area 
                        type="monotone" 
                        dataKey="consumption" 
                        stroke="#ef4444" 
                        fillOpacity={1} 
                        fill="url(#colorConsumption)" 
                        name="Energy Consumption"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </Chart>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Combined Production and Consumption Chart */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Combined Energy Data</CardTitle>
          <CardDescription>
            Production and consumption comparison
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : energyData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <LineChart className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No Energy Data Available</h3>
              <p className="text-sm text-muted-foreground max-w-md mt-2">
                There is no energy data available for the selected time range.
              </p>
            </div>
          ) : (
            <Chart>
              <ChartContainer>
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={energyData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis 
                      yAxisId="left"
                      orientation="left"
                      tickFormatter={(value) => `${value.toFixed(2)}`}
                      label={{ value: 'Production (kW)', angle: -90, position: 'insideLeft', offset: 10 }}
                    />
                    <YAxis 
                      yAxisId="right"
                      orientation="right"
                      tickFormatter={(value) => `${value.toFixed(2)}`}
                      label={{ value: 'Consumption (kW)', angle: 90, position: 'insideRight', offset: 10 }}
                    />
                    <Tooltip formatter={(value: any, name: string) => {
                      return [`${typeof value === 'number' ? value.toFixed(4) : value} kW`, name === 'generation' ? 'Production' : 'Consumption']
                    }} />
                    <Legend />
                    <Bar 
                      yAxisId="left"
                      dataKey="generation" 
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
                      strokeWidth={2}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </ChartContainer>
            </Chart>
          )}
        </CardContent>
      </Card>

      {/* Status and Events */}
      <Card>
        <CardHeader>
          <div className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Status and Alerts</CardTitle>
              <CardDescription>Recent events and alerts for this installation</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : securityEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Shield className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No Events Available</h3>
              <p className="text-sm text-muted-foreground max-w-md mt-2">
                There are no security events or alerts available for this installation.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {securityEvents.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getEventTypeIcon(event.type)}
                          <span>{event.type}</span>
                        </div>
                      </TableCell>
                      <TableCell>{getEventStatusBadge(event.status)}</TableCell>
                      <TableCell>{formatDate(event.timestamp)}</TableCell>
                      <TableCell>{event.details}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between border-t p-4">
          {referrer === 'energy' ? (
            <Button variant="outline" onClick={() => router.push("/admin/energy")}>
              Back to Energy Monitoring
            </Button>
          ) : (
            <Button variant="outline" onClick={() => router.push("/admin/installations")}>
              Back to Installations
            </Button>
          )}
          <Button
            variant="default"
            className={`${installation?.tamperDetected ? 'bg-red-500 hover:bg-red-600' : ''}`}
            onClick={() => router.push("/admin/security")}
          >
            {installation?.tamperDetected ? (
              <>
                <AlertTriangle className="mr-2 h-4 w-4" />
                Tamper Detected
              </>
            ) : (
              "Security Dashboard"
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}