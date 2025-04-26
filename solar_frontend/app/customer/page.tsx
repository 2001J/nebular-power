"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { AlertCircle, ArrowRight, Battery, Check, Download, Home, Info, Shield, Sun, Zap, ArrowUp, ArrowDown, RefreshCw } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/components/auth-provider"
import { useToast } from "@/components/ui/use-toast"
import { Chart, ChartContainer } from "@/components/ui/chart"
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Bar,
  BarChart,
  ReferenceLine,
} from "recharts"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { energyApi, installationApi, securityApi } from "@/lib/api"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"

// Define types for our dashboard data to match the actual API response format
interface InstallationDetails {
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
}

interface EnergyReading {
  id: number;
  installationId: number;
  powerGenerationWatts: number;
  powerConsumptionWatts: number;
  timestamp: string;
  dailyYieldKWh?: number;
  totalYieldKWh?: number;
  isSimulated: boolean;
}

interface InstallationDashboard {
  installationId: number;
  currentPowerGenerationWatts: number;
  currentPowerConsumptionWatts: number;
  todayGenerationKWh: number;
  todayConsumptionKWh: number;
  weekToDateGenerationKWh?: number;
  weekToDateConsumptionKWh?: number;
  monthToDateGenerationKWh: number;
  monthToDateConsumptionKWh: number;
  yearToDateGenerationKWh?: number;
  yearToDateConsumptionKWh?: number;
  lifetimeGenerationKWh: number;
  lifetimeConsumptionKWh: number;
  currentEfficiencyPercentage: number;
  lastUpdated: string;
  recentReadings: EnergyReading[];
  installationDetails: InstallationDetails;
  
  // Computed properties for metrics that aren't directly in the API
  environmentalImpact?: {
    co2Saved: number;
    treesEquivalent: number;
    carbonFootprintReduction: number;
  }
}

interface SystemStatus {
  tamperDetected: boolean;
  lastTamperCheck: string;
  systemHealth: "GOOD" | "FAIR" | "POOR" | "UNKNOWN";
  efficiency: number;
  lastMaintenance?: string;
  alerts: SystemAlert[];
  recommendations: string[];
}

interface SystemAlert {
  id: number;
  installationId: number;
  type: string;
  message: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  timestamp: string;
  resolved: boolean;
}

export default function DashboardPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [selectedPeriod, setSelectedPeriod] = useState("day")
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0])
  const [selectedInstallation, setSelectedInstallation] = useState<string | null>(null)
  const [installations, setInstallations] = useState<InstallationDetails[]>([])
  const [dashboardData, setDashboardData] = useState<InstallationDashboard | null>(null)
  const [energyReadings, setEnergyReadings] = useState<EnergyReading[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null)

  // State for toggling data series visibility
  const [visibleSeries, setVisibleSeries] = useState({
    production: true,
    consumption: true
  })

  // Toggle visibility of a data series
  const toggleSeries = (series: string) => {
    setVisibleSeries((prev) => ({
      ...prev,
      [series]: !prev[series],
    }))
  }

  // Fetch user's installations
  useEffect(() => {
    const fetchInstallations = async () => {
      if (!user?.id) return
      
      try {
        setIsLoading(true)
        setHasError(false)
        console.log("Fetching installations for user ID:", user.id)
        const response = await installationApi.getCustomerInstallations(user.id.toString())
        
        if (Array.isArray(response) && response.length > 0) {
          setInstallations(response)
          console.log(`Found ${response.length} installations for the user`)
          
          // Select the first installation by default if none is selected
          if (!selectedInstallation) {
            setSelectedInstallation(response[0].id.toString())
            console.log(`Selected installation ${response[0].id} by default`)
          }
        } else {
          console.warn("No installations found for this user or invalid response format")
          setInstallations([])
        }
      } catch (error) {
        console.error("Error fetching installations:", error)
        setHasError(true)
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load your solar installations. Please try again.",
        })
      } finally {
        setIsLoading(false)
      }
    }

    if (user) {
      fetchInstallations()
    }
  }, [user, toast])

  // Fetch dashboard data when installation is selected
  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!selectedInstallation) return
      
      try {
        setIsLoading(true)
        setHasError(false)
        console.log(`Fetching dashboard data for installation ${selectedInstallation} for period ${selectedPeriod}`)

        // Fetch installation dashboard data
        const dashboardResponse = await energyApi.getInstallationDashboard(selectedInstallation)
        
        if (!dashboardResponse) {
          setHasError(true)
          toast({
            variant: "destructive",
            title: "Data Unavailable",
            description: "No dashboard data is available for this installation at the moment.",
          })
          setIsLoading(false)
          return
        }
        
        // Set dashboard data
        setDashboardData(dashboardResponse)
        console.log("Dashboard data loaded successfully")

        // Define time parameters based on selected period
        const now = new Date()
        let dataLoaded = false
        let readingsResponse = []
        
        try {
          if (selectedPeriod === "day") {
            // Get hourly readings for today
            const startDate = new Date(now)
            startDate.setHours(0, 0, 0, 0)
            const endDate = new Date(now)
            endDate.setHours(23, 59, 59, 999)
            
            readingsResponse = await energyApi.getReadingsInDateRange(
              selectedInstallation,
              startDate.toISOString(),
              endDate.toISOString()
            )
          } else if (selectedPeriod === "week") {
            // Get daily summaries for the week
            const startDate = new Date(now)
            startDate.setDate(startDate.getDate() - 6) // Last 7 days including today
            const endDate = new Date(now)
            
            readingsResponse = await energyApi.getSummariesByPeriodAndDateRange(
              selectedInstallation,
              "DAILY",
              startDate.toISOString().split('T')[0],
              endDate.toISOString().split('T')[0]
            )
          } else if (selectedPeriod === "month") {
            // Get daily summaries for the month
            const startDate = new Date(now.getFullYear(), now.getMonth(), 1)
            const endDate = new Date(now)
            
            readingsResponse = await energyApi.getSummariesByPeriodAndDateRange(
              selectedInstallation,
              "DAILY", 
              startDate.toISOString().split('T')[0],
              endDate.toISOString().split('T')[0]
            )
          } else if (selectedPeriod === "year") {
            // Get monthly summaries for the year
            readingsResponse = await energyApi.getSummariesByPeriod(
              selectedInstallation,
              "MONTHLY"
            )
          }
          
          if (Array.isArray(readingsResponse) && readingsResponse.length > 0) {
            console.log(`Loaded ${readingsResponse.length} readings/summaries for ${selectedPeriod}`)
            dataLoaded = true
        } else {
            console.warn(`No data available for ${selectedPeriod}`)
          }
        } catch (error) {
          console.error(`Error fetching energy data for ${selectedPeriod}:`, error)
        }
        
        // If no data loaded, use sample data
        if (!dataLoaded) {
          console.log(`Using sample data for ${selectedPeriod}`)
          readingsResponse = generateSampleData(selectedPeriod, dashboardResponse)
        }
        
        // Set energy readings with either real or sample data
        setEnergyReadings(readingsResponse)
        
        // Fetch system status
        try {
          // Get tamper status from the installation details
          const tamperInfo = dashboardResponse.installationDetails
          
          // Get recent alerts from the security API
          const alertsResponse = await securityApi.getInstallationAlerts(selectedInstallation)
          const activeAlerts = Array.isArray(alertsResponse) ? alertsResponse.filter(a => !a.resolved) : []
          
          // Build system status information
          const status: SystemStatus = {
            tamperDetected: tamperInfo.tamperDetected,
            lastTamperCheck: tamperInfo.lastTamperCheck,
            systemHealth: determineSystemHealth(dashboardResponse.currentEfficiencyPercentage, tamperInfo.tamperDetected, activeAlerts.length),
            efficiency: dashboardResponse.currentEfficiencyPercentage,
            alerts: activeAlerts,
            recommendations: generateRecommendations(dashboardResponse.currentEfficiencyPercentage, tamperInfo.tamperDetected, activeAlerts)
          }
          
          setSystemStatus(status)
          console.log("System status loaded successfully")
        } catch (error) {
          console.error("Error loading system status:", error)
          // Create a basic system status with available data
          const status: SystemStatus = {
            tamperDetected: dashboardResponse.installationDetails?.tamperDetected || false,
            lastTamperCheck: dashboardResponse.installationDetails?.lastTamperCheck || new Date().toISOString(),
            systemHealth: determineSystemHealth(dashboardResponse.currentEfficiencyPercentage, false, 0),
            efficiency: dashboardResponse.currentEfficiencyPercentage,
            alerts: [],
            recommendations: ["System monitoring data is limited. Regular maintenance is recommended."]
          }
          setSystemStatus(status)
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error)
        setHasError(true)
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load dashboard data. Please try again.",
        })
      } finally {
        setIsLoading(false)
      }
    }

    if (selectedInstallation) {
      fetchDashboardData()
    }
  }, [selectedInstallation, selectedPeriod, toast])

  // Determine system health based on efficiency and other factors
  const determineSystemHealth = (efficiency: number, tamperDetected: boolean, alertCount: number): "GOOD" | "FAIR" | "POOR" | "UNKNOWN" => {
    if (tamperDetected) return "POOR"
    if (alertCount > 3) return "POOR"
    if (alertCount > 0) return "FAIR"
    if (efficiency >= 90) return "GOOD"
    if (efficiency >= 75) return "FAIR"
    if (efficiency < 75) return "POOR"
    return "UNKNOWN"
  }
  
  // Generate recommendations based on system state
  const generateRecommendations = (efficiency: number, tamperDetected: boolean, alerts: SystemAlert[]): string[] => {
    const recommendations: string[] = []
    
    if (tamperDetected) {
      recommendations.push("Contact support immediately: potential tampering detected")
    }
    
    if (alerts.some(a => a.severity === "CRITICAL" || a.severity === "HIGH")) {
      recommendations.push("Address high-priority system alerts")
    }
    
    if (efficiency < 75) {
      recommendations.push("Schedule a maintenance check to improve system efficiency")
    } else if (efficiency < 90) {
      recommendations.push("Consider panel cleaning to optimize performance")
    }
    
    if (recommendations.length === 0) {
      recommendations.push("Your system is performing well. Continue regular monitoring.")
    }
    
    return recommendations
  }

  // Handle installation change
  const handleInstallationChange = (installationId: string) => {
    console.log(`Switching to installation ${installationId}`)
    setSelectedInstallation(installationId)
  }

  // Handle period change
  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period)
  }

  // Refresh dashboard data
  const refreshDashboard = async () => {
    if (!selectedInstallation) return
    
    try {
      setIsLoading(true)
      // Re-fetch the dashboard data for the selected installation
      const dashboardResponse = await energyApi.getInstallationDashboard(selectedInstallation)
      
      if (!dashboardResponse) {
        throw new Error("Failed to refresh dashboard data")
      }
      
      // Calculate environmental impact values
      const calculatedDashboard = {
        ...dashboardResponse,
        environmentalImpact: {
          co2Saved: dashboardResponse.lifetimeGenerationKWh * 0.85,
          treesEquivalent: Math.max(0.1, (dashboardResponse.lifetimeGenerationKWh * 0.85) / 21),
          carbonFootprintReduction: 
            dashboardResponse.installationDetails.type === "RESIDENTIAL" 
              ? Math.min(100, (dashboardResponse.monthToDateGenerationKWh / 600) * 100)
              : Math.min(100, (dashboardResponse.monthToDateGenerationKWh / 2000) * 100)
        }
      }
      
      setDashboardData(calculatedDashboard)
      
      // Refresh energy readings
      const readingsResponse = await energyApi.getRecentReadings(selectedInstallation, 24)
      
      if (Array.isArray(readingsResponse)) {
        setEnergyReadings(readingsResponse)
      }
      
      toast({
        title: "Dashboard Updated",
        description: "The latest solar data has been loaded."
      })
    } catch (error) {
      console.error("Error refreshing dashboard:", error)
      toast({
        variant: "destructive",
        title: "Refresh Failed",
        description: "Unable to refresh dashboard data. Please try again."
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Format energy value with appropriate units
  const formatEnergyValue = (value: number): string => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(2)} GWh`
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(2)} MWh`
    } else {
      return `${value.toFixed(2)} kWh`
    }
  }

  // Update the generateSampleData function for week view
  function generateSampleData(period: string, dashboardData: InstallationDashboard): any[] {
    console.log('Generating sample data for period:', period);
    const now = new Date();
    const sampleData: any[] = [];
    
    if (period === 'day') {
      // Generate hourly data for today
      for (let hour = 0; hour < 24; hour++) {
        const date = new Date(now);
        date.setHours(hour, 0, 0, 0);
        
        // Production peaks during midday, consumption more consistent
        const isDaylight = hour >= 6 && hour <= 18;
        const middayFactor = 1 - Math.abs((hour - 12) / 6);
        const production = isDaylight ? (3 + middayFactor * 4) * (0.8 + Math.random() * 0.4) : 0;
        const consumption = 1 + Math.random() * 2 + (hour >= 17 && hour <= 21 ? 2 : 0);
        
        sampleData.push({
          timestamp: date.toISOString(),
          powerGenerationWatts: production * 1000,
          powerConsumptionWatts: consumption * 1000
        });
      }
    } else if (period === 'week') {
      // Generate 7 days of data
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const dayToGenerate = 7;
      
      for (let i = dayToGenerate - 1; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        
        // Weekend vs weekday patterns
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
        const weatherFactor = 0.7 + Math.random() * 0.6;
        
        const production = (isWeekend ? 18 : 20) * weatherFactor;
        const consumption = (isWeekend ? 25 : 20) * (0.9 + Math.random() * 0.2);
        
        sampleData.push({
          date: date.toISOString().split('T')[0],
          totalGenerationKWh: production,
          totalConsumptionKWh: consumption,
          period: 'DAILY'
        });
      }
    } else if (period === 'month') {
      // Generate daily data for the month
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      
      for (let day = 1; day <= daysInMonth; day++) {
        // Only include days up to today
        if (day > now.getDate()) continue;
        
        const date = new Date(now.getFullYear(), now.getMonth(), day);
        
        // Weather variations throughout month
        const weatherCycle = 0.7 + 0.3 * Math.sin(day / 5);
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
        
        const production = (isWeekend ? 18 : 20) * weatherCycle * (0.8 + Math.random() * 0.4);
        const consumption = (isWeekend ? 25 : 20) * (0.9 + Math.random() * 0.2);
        
        sampleData.push({
          date: date.toISOString().split('T')[0],
          totalGenerationKWh: production,
          totalConsumptionKWh: consumption,
          period: 'DAILY'
        });
      }
    } else if (period === 'year') {
      // Generate monthly data
      for (let month = 0; month < 12; month++) {
        // Only include months up to current month
        if (month > now.getMonth()) continue;
        
        const date = new Date(now.getFullYear(), month, 15);
        
        // Seasonal variations
        const seasonFactor = 0.6 + 0.8 * Math.sin((month - 2) * Math.PI / 6);
        
        const production = 500 * seasonFactor * (0.9 + Math.random() * 0.2);
        const consumption = 600 * (0.8 + 0.4 * Math.cos((month - 6) * Math.PI / 6)) * (0.9 + Math.random() * 0.2);
        
        sampleData.push({
          date: date.toISOString().split('T')[0],
          totalGenerationKWh: production,
          totalConsumptionKWh: consumption,
          period: 'MONTHLY'
        });
      }
    }
    
    return sampleData;
  }

  if (!user) return null

  // Process data for chart display based on period
  const getProcessedChartData = () => {
    if (energyReadings.length === 0) {
      return []
    }
    
    const chartData = []
    
    if (selectedPeriod === "day") {
      // Group hourly data
      const hourlyData = {}
      
      // Initialize all hours
      for (let hour = 0; hour < 24; hour++) {
        const hourLabel = `${hour}:00`
        hourlyData[hourLabel] = {
          time: hourLabel,
          production: 0,
          consumption: 0,
          count: 0
        }
      }
      
      // Process readings
      energyReadings.forEach(reading => {
        if (!reading.timestamp) return
        
        const date = new Date(reading.timestamp)
        const hour = date.getHours()
        const hourLabel = `${hour}:00`
        
        hourlyData[hourLabel].production += reading.powerGenerationWatts / 1000 || 0 // kW
        hourlyData[hourLabel].consumption += reading.powerConsumptionWatts / 1000 || 0 // kW
        hourlyData[hourLabel].count += 1
      })
      
      // Convert to array and calculate averages
      for (const hour in hourlyData) {
        if (hourlyData[hour].count > 0) {
          chartData.push({
            time: hour,
            production: hourlyData[hour].production / hourlyData[hour].count,
            consumption: hourlyData[hour].consumption / hourlyData[hour].count
          })
        } else {
          chartData.push({
            time: hour,
            production: 0,
            consumption: 0
          })
        }
      }
      
      // Sort by hour
      chartData.sort((a, b) => {
        return parseInt(a.time.split(':')[0]) - parseInt(b.time.split(':')[0])
      })
    } else if (selectedPeriod === "week") {
      // Group by day for week
      const dayData = {}
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      
      // Initialize all days
      dayNames.forEach(day => {
        dayData[day] = {
          time: day,
          production: 0,
          consumption: 0,
          count: 0
        }
      })
      
      // Process readings
      energyReadings.forEach(reading => {
        let readingDate
        let dayName
        
        if (reading.timestamp) {
          readingDate = new Date(reading.timestamp)
          dayName = dayNames[readingDate.getDay()]
        } else if (reading.date) {
          readingDate = new Date(reading.date)
          dayName = dayNames[readingDate.getDay()]
        } else {
          return // Skip if no valid date
        }
        
        // For daily summaries
        if (reading.totalGenerationKWh !== undefined) {
          dayData[dayName].production += reading.totalGenerationKWh || 0
          dayData[dayName].consumption += reading.totalConsumptionKWh || 0
        } else {
          // For hourly readings
          dayData[dayName].production += reading.powerGenerationWatts / 1000 || 0
          dayData[dayName].consumption += reading.powerConsumptionWatts / 1000 || 0
        }
        
        dayData[dayName].count += 1
      })
      
      // Use default order: Mon-Sun
      const orderedDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
      
      // Convert to array
      orderedDays.forEach(day => {
        chartData.push({
          time: day,
          production: dayData[day].production,
          consumption: dayData[day].consumption
        })
      })
    } else if (selectedPeriod === "month") {
      // Group by day for month
      const monthData = {}
      
      // Process readings
      energyReadings.forEach(reading => {
        let readingDate
        let day
        
        if (reading.timestamp) {
          readingDate = new Date(reading.timestamp)
          day = readingDate.getDate()
        } else if (reading.date) {
          readingDate = new Date(reading.date)
          day = readingDate.getDate()
        } else {
          return // Skip if no valid date
        }
        
        const dayLabel = day.toString()
        
        if (!monthData[dayLabel]) {
          monthData[dayLabel] = {
            time: dayLabel,
            production: 0,
            consumption: 0,
            count: 0,
            actualDate: readingDate
          }
        }
        
        // For daily summaries
        if (reading.totalGenerationKWh !== undefined) {
          monthData[dayLabel].production += reading.totalGenerationKWh || 0
          monthData[dayLabel].consumption += reading.totalConsumptionKWh || 0
        } else {
          // For hourly readings
          monthData[dayLabel].production += reading.powerGenerationWatts / 1000 || 0
          monthData[dayLabel].consumption += reading.powerConsumptionWatts / 1000 || 0
        }
        
        monthData[dayLabel].count += 1
      })
      
      // Convert to array and sort by day
      Object.values(monthData).forEach(day => {
        chartData.push({
          time: day.time,
          production: day.production,
          consumption: day.consumption
        })
      })
      
      // Sort by day number
      chartData.sort((a, b) => parseInt(a.time) - parseInt(b.time))
    } else if (selectedPeriod === "year") {
      // Group by month for year
      const yearData = {}
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      
      // Initialize all months
      monthNames.forEach((month, index) => {
        yearData[month] = {
          time: month,
          production: 0,
          consumption: 0,
          count: 0,
          monthIndex: index
        }
      })
      
      // Process readings
      energyReadings.forEach(reading => {
        let readingDate
        let month
        
        if (reading.timestamp) {
          readingDate = new Date(reading.timestamp)
          month = readingDate.getMonth()
        } else if (reading.date) {
          readingDate = new Date(reading.date)
          month = readingDate.getMonth()
        } else {
          return // Skip if no valid date
        }
        
        const monthLabel = monthNames[month]
        
        // For monthly summaries
        if (reading.totalGenerationKWh !== undefined) {
          yearData[monthLabel].production += reading.totalGenerationKWh || 0
          yearData[monthLabel].consumption += reading.totalConsumptionKWh || 0
        } else {
          // For hourly readings
          yearData[monthLabel].production += reading.powerGenerationWatts / 1000 || 0
          yearData[monthLabel].consumption += reading.powerConsumptionWatts / 1000 || 0
        }
        
        yearData[monthLabel].count += 1
      })
      
      // Convert to array and sort by month
      Object.values(yearData).forEach(month => {
        chartData.push({
          time: month.time,
          production: month.production,
          consumption: month.consumption
        })
      })
      
      // Sort by month index
      chartData.sort((a, b) => {
        const monthA = monthNames.indexOf(a.time)
        const monthB = monthNames.indexOf(b.time)
        return monthA - monthB
      })
    }
    
    return chartData
  }

  // Use the processed data for charts
  const powerData = getProcessedChartData()

  // Calculate totals as numbers first
  const totalProduction = powerData.reduce((sum, item) => sum + item.production, 0)
  const totalConsumption = powerData.reduce((sum, item) => sum + item.consumption, 0)

  // Determine the right chart type based on selectedPeriod
  const renderEnergyChart = () => {
    if (powerData.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-full py-12">
          <p className="text-gray-500">No energy data available for the selected period</p>
        </div>
      )
    }

    // Unit based on period
    const unit = selectedPeriod === 'day' ? 'kW' : 'kWh'
    const yAxisLabel = selectedPeriod === 'day' ? 'Power (kW)' : 'Energy (kWh)'
    
    if (selectedPeriod === 'day') {
      // Area chart for day view - shows continuous time series
      return (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={powerData}
            margin={{
              top: 10,
              right: 10,
              left: 0,
              bottom: 20,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="time" />
            <YAxis 
              label={{ value: yAxisLabel, angle: -90, position: "insideLeft" }} 
              tickFormatter={(value) => `${value}`} 
            />
            <Tooltip 
              formatter={(value) => [`${value.toFixed(2)} ${unit}`, ""]}
              labelFormatter={(label) => `Time: ${label}`}
            />
            <Legend content={<CustomLegend />} />
            {visibleSeries.production && (
              <Area
                type="monotone"
                dataKey="production"
                name="Production"
                stroke="#10b981"
                fill="#10b981"
                fillOpacity={0.5}
              />
            )}
            {visibleSeries.consumption && (
              <Area
                type="monotone"
                dataKey="consumption"
                name="Consumption"
                stroke="#ef4444"
                fill="#ef4444"
                fillOpacity={0.5}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      )
    } else {
      // Bar chart for week/month/year views
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={powerData}
            margin={{
              top: 10,
              right: 10,
              left: 0,
              bottom: 20,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="time" />
            <YAxis 
              label={{ value: yAxisLabel, angle: -90, position: "insideLeft" }} 
            />
            <Tooltip 
              formatter={(value) => [`${value.toFixed(2)} ${unit}`, ""]}
              labelFormatter={(label) => {
                if (selectedPeriod === 'week') return `Day: ${label}`
                if (selectedPeriod === 'month') return `Date: ${label}`
                if (selectedPeriod === 'year') return `Month: ${label}`
                return label
              }}
            />
            <Legend content={<CustomLegend />} />
            {visibleSeries.production && (
              <Bar
                dataKey="production"
                name="Production"
                fill="#10b981"
                radius={[4, 4, 0, 0]}
                barSize={selectedPeriod === 'year' ? 20 : 30}
              />
            )}
            {visibleSeries.consumption && (
              <Bar
                dataKey="consumption"
                name="Consumption"
                fill="#ef4444"
                radius={[4, 4, 0, 0]}
                barSize={selectedPeriod === 'year' ? 20 : 30}
              />
            )}
          </BarChart>
        </ResponsiveContainer>
      )
    }
  }

  // Custom legend that allows toggling series visibility
  const CustomLegend = ({ payload }: any) => {
    if (!payload) return null

    return (
      <div className="flex flex-wrap gap-4 justify-center mt-2">
        {payload.map((entry: any, index: number) => (
          <div
            key={`item-${index}`}
            className={`flex items-center gap-2 cursor-pointer ${!visibleSeries[entry.dataKey as keyof typeof visibleSeries] ? "opacity-50" : ""}`}
            onClick={() => toggleSeries(entry.dataKey)}
          >
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: entry.color }} />
            <span className="text-sm">{entry.value}</span>
          </div>
        ))}
      </div>
    )
  }

  // Get system health status color
  const getHealthColor = (health: string) => {
    switch (health) {
      case "GOOD": return "bg-green-500"
      case "FAIR": return "bg-amber-500"
      case "POOR": return "bg-red-500"
      default: return "bg-gray-500"
    }
  }
  
  // Get alert severity color
  const getAlertSeverityColor = (severity: string) => {
    switch (severity) {
      case "CRITICAL": return "bg-red-500"
      case "HIGH": return "bg-orange-500"
      case "MEDIUM": return "bg-amber-500"
      case "LOW": return "bg-blue-500"
      default: return "bg-gray-500"
    }
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Top navigation with breadcrumbs and controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
        <div className="flex items-center">
          <h1 className="text-2xl font-bold">Solar Energy Dashboard</h1>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <Select
            value={selectedInstallation || ""}
            onValueChange={handleInstallationChange}
            disabled={installations.length === 0 || isLoading}
          >
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Choose an installation" />
            </SelectTrigger>
            <SelectContent>
              {installations.map((installation) => (
                <SelectItem
                  key={installation.id}
                  value={installation.id.toString()}
                >
                  {installation.name || `Installation #${installation.id}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={refreshDashboard} disabled={isLoading || !selectedInstallation}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {isLoading ? "Updating..." : "Refresh Data"}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : hasError ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold mb-2">Unable to load dashboard data</h2>
          <p className="text-gray-500 mb-4">There was a problem connecting to the solar monitoring system.</p>
          <Button onClick={refreshDashboard}>Try Again</Button>
        </div>
      ) : installations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="text-amber-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold mb-2">No solar installations found</h2>
          <p className="text-gray-500">You don't have any solar installations registered to your account.</p>
        </div>
      ) : (
        <>
          {/* System status alert for critical issues */}
          {systemStatus?.tamperDetected && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Critical Security Alert</AlertTitle>
              <AlertDescription>
                Potential tampering detected with your solar installation. Please contact support immediately.
              </AlertDescription>
            </Alert>
          )}
          
          {/* Production summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Current Generation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Sun className="h-5 w-5 text-orange-500 mr-2" />
                    <div className="text-2xl font-bold">{dashboardData?.currentPowerGenerationWatts ? (dashboardData.currentPowerGenerationWatts / 1000).toFixed(2) : '0.00'} kW</div>
                </div>
                  {dashboardData?.currentPowerGenerationWatts > 0 && 
                    <ArrowUp className="h-4 w-4 text-green-500" />
                  }
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {dashboardData?.lastUpdated ? 
                    `Last updated: ${new Date(dashboardData.lastUpdated).toLocaleTimeString()}` : 
                    'No recent updates'}
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Today's Production</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold">
                    {dashboardData?.todayGenerationKWh?.toFixed(2) || '0.00'} kWh
                </div>
                  {dashboardData?.todayGenerationKWh > 0 && 
                    <ArrowUp className="h-4 w-4 text-green-500" />
                  }
                </div>
                <Progress 
                  className="h-2 mt-2" 
                  value={dashboardData?.installedCapacityKW > 0 ? 
                    Math.min(100, (dashboardData?.todayGenerationKWh / (dashboardData?.installedCapacityKW * 4)) * 100) : 0} 
                />
              </CardContent>
            </Card>
            
            <Card className="bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Monthly Production</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold">
                  {dashboardData?.monthToDateGenerationKWh?.toFixed(2) || '0.00'} kWh
                </div>
                  {dashboardData?.monthToDateGenerationKWh > 0 && 
                    <ArrowUp className="h-4 w-4 text-green-500" />
                  }
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Month to date
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">System Efficiency</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold">
                    {dashboardData?.currentEfficiencyPercentage?.toFixed(1) || '0.0'}%
                </div>
                  {systemStatus && (
                    <Badge className={`${getHealthColor(systemStatus.systemHealth)}`}>
                      {systemStatus.systemHealth}
                    </Badge>
                  )}
                </div>
                <Progress 
                  className="h-2 mt-2" 
                  value={dashboardData?.currentEfficiencyPercentage || 0} 
                />
              </CardContent>
            </Card>
          </div>

          {/* Energy Flow summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-white col-span-2">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle>Energy Production</CardTitle>
                <Select 
                  value={selectedPeriod} 
                  onValueChange={handlePeriodChange}
                >
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Today (Hourly)</SelectItem>
                    <SelectItem value="week">This Week (Daily)</SelectItem>
                    <SelectItem value="month">This Month (Daily)</SelectItem>
                    <SelectItem value="year">This Year (Monthly)</SelectItem>
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="h-80">
                  {isLoading ? (
                    <div className="flex justify-center items-center h-full">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
                  ) : (
                    renderEnergyChart()
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white">
              <CardHeader className="pb-2">
                <CardTitle>Energy Flow</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Energy flow metrics */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b">
                    <div className="flex items-center">
                      <Sun className="h-4 w-4 text-orange-500 mr-2" />
                      <span>Production</span>
                </div>
                    <span className="font-bold text-green-500">
                      {selectedPeriod === 'day' 
                        ? `${totalProduction.toFixed(2)} kW` 
                        : `${totalProduction.toFixed(2)} kWh`}
                    </span>
                </div>
                  
                  <div className="flex justify-between items-center py-2 border-b">
                    <div className="flex items-center">
                      <Home className="h-4 w-4 text-gray-500 mr-2" />
                      <span>Consumption</span>
                </div>
                    <span className="font-bold text-red-500">
                      {selectedPeriod === 'day' 
                        ? `${totalConsumption.toFixed(2)} kW` 
                        : `${totalConsumption.toFixed(2)} kWh`}
                    </span>
                </div>
                  
                  <div className="flex justify-between items-center py-2">
                    <div className="flex items-center">
                      <Info className="h-4 w-4 text-blue-500 mr-2" />
                      <span>Efficiency</span>
                    </div>
                    <span className="font-bold text-blue-500">
                      {dashboardData?.currentEfficiencyPercentage?.toFixed(1) || '0.0'}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* System Status Card */}
          <Card className="bg-white">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between">
                <span>System Status</span>
                {systemStatus && (
                  <Badge className={`${getHealthColor(systemStatus.systemHealth)} text-white`}>
                    {systemStatus.systemHealth}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {systemStatus ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="p-3 border rounded-md">
                      <div className="text-sm text-gray-500">System Efficiency</div>
                      <div className="text-lg font-semibold">{systemStatus.efficiency.toFixed(1)}%</div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-1.5">
                        <div 
                          className="bg-blue-500 h-2 rounded-full" 
                          style={{ width: `${Math.min(100, systemStatus.efficiency)}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    <div className="p-3 border rounded-md">
                      <div className="text-sm text-gray-500">Security Status</div>
                      <div className="flex items-center mt-1">
                        <Shield className={`h-5 w-5 mr-2 ${systemStatus.tamperDetected ? 'text-red-500' : 'text-green-500'}`} />
                        <span className="text-lg font-semibold">
                          {systemStatus.tamperDetected ? 'Tamper Detected' : 'Secure'}
                        </span>
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        Last check: {new Date(systemStatus.lastTamperCheck).toLocaleDateString()}
                      </div>
                    </div>
                    
                    <div className="p-3 border rounded-md">
                      <div className="text-sm text-gray-500">Active Alerts</div>
                      <div className="text-lg font-semibold">{systemStatus.alerts.length}</div>
                      <div className="flex gap-1 mt-1.5">
                        {systemStatus.alerts.length > 0 ? (
                          systemStatus.alerts.slice(0, 4).map((alert, i) => (
                            <div 
                              key={i}
                              className={`w-6 h-2 rounded-full ${getAlertSeverityColor(alert.severity)}`}
                              title={alert.message}
                            ></div>
                          ))
                        ) : (
                          <span className="text-xs text-gray-400">No active alerts</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="p-3 border rounded-md">
                      <div className="text-sm text-gray-500">Last Reading</div>
                      <div className="text-lg font-semibold truncate">
                        {dashboardData?.lastUpdated 
                          ? new Date(dashboardData.lastUpdated).toLocaleString() 
                          : 'No data'}
                      </div>
                    </div>
                  </div>
                  
                  {systemStatus.recommendations.length > 0 && (
                    <div className="border rounded-md p-3">
                      <div className="flex items-center text-sm font-medium mb-2">
                        <Info className="h-4 w-4 mr-1 text-blue-500" />
                        Recommendations
                      </div>
                      <ul className="space-y-1 text-sm">
                        {systemStatus.recommendations.map((rec, i) => (
                          <li key={i} className="flex items-start">
                            <span className="text-blue-500 mr-2">•</span>
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500">
                  System status information not available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Environmental Impact */}
          <Card className="bg-white">
            <CardHeader className="pb-2">
              <CardTitle>Environmental Impact</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
                    <Cloud className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-green-600">
                    {dashboardData?.environmentalImpact?.co2Saved?.toFixed(2) || '0.00'} kg
                  </h3>
                  <p className="text-gray-500 mt-2">CO2 emissions saved</p>
                </div>

                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-4">
                    <Factory className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-blue-600">
                    {dashboardData?.environmentalImpact?.carbonFootprintReduction?.toFixed(2) || '0.00'}%
                  </h3>
                  <p className="text-gray-500 mt-2">Carbon footprint reduction</p>
                </div>

                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-100 mb-4">
                    <Tree className="w-8 h-8 text-amber-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-amber-600">
                    {dashboardData?.environmentalImpact?.treesEquivalent?.toFixed(1) || '0.0'}
                  </h3>
                  <p className="text-gray-500 mt-2">Equivalent trees planted</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

// Additional components needed for the dashboard
function Cloud(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
    </svg>
  )
}

function Factory(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
      <path d="M17 18h1" />
      <path d="M12 18h1" />
      <path d="M7 18h1" />
    </svg>
  )
}

function Tree(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22v-7l-2-2" />
      <path d="M17 8v4h4" />
      <path d="M19 4a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
      <path d="M12 22c3 0 5-1 5-6V8c0-3.5 3.1-5 6-5.1A7.9 7.9 0 0 0 12 2a8 8 0 0 0-11 7c0 3 2 4 5 4h1v3c0 5 2 6 5 6z" />
      <path d="M7 15h1" />
    </svg>
  )
}

