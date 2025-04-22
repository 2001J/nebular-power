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

  // Calculate performance metrics based on actual installation data
  const calculateActualPerformanceMetrics = (readings: ReadingData[], installation: Installation) => {
    // Default values
    let efficiency = installation.efficiency || 0
    let dailyYield = 0
    let monthlyYield = 0
    let yearlyYield = 0
    let totalYield = installation.totalYield || 0
    let uptimePercent = 98
    
    if (readings && readings.length > 0) {
      // Calculate average efficiency
      const totalGeneration = readings.reduce((sum, r) => sum + (r.powerGenerationWatts || 0), 0)
      const totalConsumption = readings.reduce((sum, r) => sum + (r.powerConsumptionWatts || 0), 0)
      
      if (totalConsumption > 0) {
        efficiency = (totalGeneration / totalConsumption) * 100
        efficiency = Math.min(100, Math.max(0, efficiency))
      }
      
      // Calculate daily yield (kWh)
      const todayReadings = readings.filter(r => {
        const readingDate = new Date(r.timestamp)
        const today = new Date()
        return readingDate.toDateString() === today.toDateString()
      })
      
      if (todayReadings.length > 0) {
        const avgGeneration = todayReadings.reduce((sum, r) => sum + (r.powerGenerationWatts || 0), 0) / todayReadings.length
        dailyYield = (avgGeneration * 24) / 1000 // Convert Wh to kWh
      }
      
      // Calculate monthly yield from readings
      const monthlyReadings = readings.filter(r => {
        const readingDate = new Date(r.timestamp)
        const today = new Date()
        return readingDate.getMonth() === today.getMonth() && 
               readingDate.getFullYear() === today.getFullYear()
      })
      
      if (monthlyReadings.length > 0) {
        const avgMonthlyGeneration = monthlyReadings.reduce((sum, r) => sum + (r.powerGenerationWatts || 0), 0) / monthlyReadings.length
        monthlyYield = (avgMonthlyGeneration * 24 * 30) / 1000 // Convert Wh to kWh for 30 days
      } else {
        monthlyYield = dailyYield * 30 // Estimate based on daily
      }
      
      // Calculate yearly yield from readings or estimate from monthly
      yearlyYield = monthlyYield * 12
      
      // Use total yield from installation data if available
      if (installation.totalYield) {
        totalYield = installation.totalYield
      }
    }
    
    return {
      efficiency: Math.round(efficiency),
      dailyYield: Math.round(dailyYield * 100) / 100,
      monthlyYield: Math.round(monthlyYield * 100) / 100,
      yearlyYield: Math.round(yearlyYield * 100) / 100,
      totalYield: Math.round(totalYield * 100) / 100,
      uptimePercent: uptimePercent
    }
  }

  // Load installation data
  useEffect(() => {
    const fetchInstallationData = async () => {
      try {
        setLoading(true)
        
        // Fetch installation details using the API
        const installationData = await installationApi.getInstallationDetails(id)
        
        if (installationData) {
          console.log('Installation data:', installationData)
          
          // Set installation with all properties from the API response
          setInstallation(installationData)
          
          // Store customer info separately if available
          if (installationData.username) {
            setCustomerInfo({
              email: installationData.username,
              userId: installationData.userId
            })
          }
          
          // Fetch installation energy readings
          let readings: ReadingData[] = []
          try {
            // Try to get recent readings first
            const recentReadings = await energyApi.getRecentReadings(id, 100)
            
            if (Array.isArray(recentReadings) && recentReadings.length > 0) {
              readings = recentReadings
            } else {
              // Fall back to readings history with a date range if recent readings fail
              const now = new Date()
              const oneMonthAgo = new Date()
              oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)
              
              const startDate = oneMonthAgo.toISOString().split('T')[0]
              const endDate = now.toISOString().split('T')[0]
              
              const historyReadings = await energyApi.getReadingsHistory(id, startDate, endDate)
              if (Array.isArray(historyReadings)) {
                readings = historyReadings
              }
            }
          } catch (readingsError) {
            console.error('Error fetching installation readings:', readingsError)
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
          
          // Always use actual readings data, even if empty
          setRecentReadings(readings.slice(0, 10))
          
          // Transform readings to chart data
          if (readings.length > 0) {
            const chartData = transformReadingsToChartData(readings, timeRange)
            setEnergyData(chartData)
          } else {
            // Set empty chart data instead of generating sample data
            setEnergyData([])
          }
          
          // Always use actual installation data for performance metrics
          const perfMetrics = calculateActualPerformanceMetrics(readings, installationData)
          setPerformance(perfMetrics)
          
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
  const transformReadingsToChartData = (readings: ReadingData[], timeRangeType: string): ChartDataPoint[] => {
    if (!readings || readings.length === 0) {
      // Return empty data points for each time period based on selected range
      if (timeRangeType === 'day') {
        // Return 24 empty hour slots for a day
        return Array.from({ length: 24 }, (_, i) => ({
          name: `${i}:00`,
          generation: 0,
          consumption: 0
        }));
      } else if (timeRangeType === 'week') {
        // Return 7 empty day slots
        const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        return dayNames.map(day => ({
          name: day,
          generation: 0,
          consumption: 0
        }));
      } else if (timeRangeType === 'month') {
        // Return ~30 empty day slots for a month
        return Array.from({ length: 30 }, (_, i) => ({
          name: (i + 1).toString(),
          generation: 0,
          consumption: 0
        }));
      } else {
        // Return 12 empty month slots for a year
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return monthNames.map(month => ({
          name: month,
          generation: 0,
          consumption: 0
        }));
      }
    }
    
    // Sort readings by timestamp
    const sortedReadings = [...readings].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    )
    
    if (timeRangeType === 'day') {
      // Group by hour
      const hourlyData: Record<string, { name: string; generation: number; consumption: number; count: number }> = {}
      
      // Initialize all 24 hours with zero values
      for (let i = 0; i < 24; i++) {
        const hourLabel = `${i}:00`;
        hourlyData[hourLabel] = {
          name: hourLabel,
          generation: 0,
          consumption: 0,
          count: 0
        };
      }
      
      sortedReadings.forEach(reading => {
        const date = new Date(reading.timestamp)
        const hour = date.getHours()
        const hourLabel = `${hour}:00`
        
        if (!hourlyData[hourLabel]) {
          hourlyData[hourLabel] = {
            name: hourLabel,
            generation: 0,
            consumption: 0,
            count: 0
          }
        }
        
        hourlyData[hourLabel].generation += reading.powerGenerationWatts / 1000
        hourlyData[hourLabel].consumption += reading.powerConsumptionWatts / 1000
        hourlyData[hourLabel].count += 1
      })
      
      // Calculate hourly averages
      return Object.values(hourlyData).map(hour => {
        const avgGeneration = hour.count > 0 ? hour.generation / hour.count : 0
        const avgConsumption = hour.count > 0 ? hour.consumption / hour.count : 0
        
        return {
          name: hour.name,
          generation: avgGeneration,
          consumption: avgConsumption
        }
      }).sort((a, b) => {
        return parseInt(a.name.split(':')[0]) - parseInt(b.name.split(':')[0])
      })
    } else if (timeRangeType === 'week') {
      // Group by day
      const dailyData: Record<string, { name: string; generation: number; consumption: number; count: number }> = {}
      const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
      
      // Initialize all days with zero values
      dayNames.forEach(day => {
        dailyData[day] = {
          name: day,
          generation: 0,
          consumption: 0,
          count: 0
        };
      });
      
      sortedReadings.forEach(reading => {
        const date = new Date(reading.timestamp)
        const day = date.getDay()
        // Convert from Sunday-based (0) to Monday-based (0)
        const adjustedDay = day === 0 ? 6 : day - 1
        const dayLabel = dayNames[adjustedDay]
        
        dailyData[dayLabel].generation += reading.powerGenerationWatts / 1000
        dailyData[dayLabel].consumption += reading.powerConsumptionWatts / 1000
        dailyData[dayLabel].count += 1
      })
      
      // Calculate daily averages
      return dayNames.map(day => {
        const dayData = dailyData[day]
        
        return {
          name: day,
          generation: dayData.count > 0 ? dayData.generation / dayData.count : 0,
          consumption: dayData.count > 0 ? dayData.consumption / dayData.count : 0
        }
      })
    } else if (timeRangeType === 'month') {
      // Group by day of month
      const monthData: Record<string, { name: string; generation: number; consumption: number; count: number }> = {}
      
      // Initialize all days with zero values
      for (let i = 1; i <= 31; i++) {
        const dayLabel = i.toString();
        monthData[dayLabel] = {
          name: dayLabel,
          generation: 0,
          consumption: 0,
          count: 0
        };
      }
      
      sortedReadings.forEach(reading => {
        const date = new Date(reading.timestamp)
        const day = date.getDate()
        const dayLabel = day.toString()
        
        monthData[dayLabel].generation += reading.powerGenerationWatts / 1000
        monthData[dayLabel].consumption += reading.powerConsumptionWatts / 1000
        monthData[dayLabel].count += 1
      })
      
      // Calculate daily averages
      return Object.values(monthData)
        .filter(day => parseInt(day.name) <= 31) // Only include valid days
        .map(day => {
          return {
            name: day.name,
            generation: day.count > 0 ? day.generation / day.count : 0,
            consumption: day.count > 0 ? day.consumption / day.count : 0
          }
        }).sort((a, b) => parseInt(a.name) - parseInt(b.name))
    } else {
      // Group by month
      const yearData: Record<string, { name: string; generation: number; consumption: number; count: number }> = {}
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      
      // Initialize all months with zero values
      monthNames.forEach(month => {
        yearData[month] = {
          name: month,
          generation: 0,
          consumption: 0,
          count: 0
        };
      });
      
      sortedReadings.forEach(reading => {
        const date = new Date(reading.timestamp)
        const month = date.getMonth()
        const monthLabel = monthNames[month]
        
        yearData[monthLabel].generation += reading.powerGenerationWatts / 1000
        yearData[monthLabel].consumption += reading.powerConsumptionWatts / 1000
        yearData[monthLabel].count += 1
      })
      
      // Calculate monthly averages
      return monthNames.map(month => {
        const monthData = yearData[month]
        
        return {
          name: month,
          generation: monthData.count > 0 ? monthData.generation / monthData.count : 0,
          consumption: monthData.count > 0 ? monthData.consumption / monthData.count : 0
        }
      })
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
          <Select value={timeRange} onValueChange={setTimeRange}>
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
            setLoading(true)
            setTimeout(() => setLoading(false), 500)
          }}>
            <RefreshCw className="h-4 w-4" />
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
                <div className="pt-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Current Output</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Zap className="h-5 w-5 text-amber-500" />
                    <p className="text-xl font-bold">
                      {recentReadings.length > 0 
                        ? `${(recentReadings[0].powerGenerationWatts / 1000).toFixed(2)} kW` 
                        : "0.00 kW"}
                    </p>
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
                      <Tooltip formatter={(value: any) => [`${typeof value === 'number' ? value.toFixed(2) : value} kW`, "Generation"]} />
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
                      />
                      <Tooltip formatter={(value: any) => [`${typeof value === 'number' ? value.toFixed(2) : value} kW`, "Consumption"]} />
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