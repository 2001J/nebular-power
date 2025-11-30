"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { AlertCircle, Home, Info, Shield, Sun, ArrowUp, RefreshCw } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/components/auth-provider"
import { useToast } from "@/components/ui/use-toast"
import {
  Area,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ComposedChart,
  Line,
} from "@/components/ui/direct-recharts"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { energyApi } from "@/lib/api/energy"
import { installationApi } from "@/lib/api/installations"
import { securityApi } from "@/lib/api/security"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { formatChartYAxis, formatChartTooltip, getMonthlyXAxisConfig } from "@/lib/energyUtils"
import { ChartContainer } from "@/components/ui/chart"

// Feature flag to control sample data fallback in charts
const ENABLE_SAMPLE_DATA = process.env.NEXT_PUBLIC_ENABLE_SAMPLE_DATA === 'true'

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
  // Some backends return 'date' instead of 'timestamp'
  date?: string;
  dailyYieldKWh?: number;
  totalYieldKWh?: number;
  // Summary fields when API returns aggregated rows
  totalGenerationKWh?: number;
  totalConsumptionKWh?: number;
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
  averageEfficiencyPercentage?: number;
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
  }, [user, toast, selectedInstallation])

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
          // Do not bail; we can still render charts from readings or fallbacks
          toast({
            variant: "destructive",
            title: "Limited Data",
            description: "Dashboard metrics are unavailable. Showing recent readings if possible.",
          })
        }

        console.log("Installation dashboard data:", dashboardResponse)
        
        // Calculate environmental impact for initial load (same as in refreshDashboard)
        if (dashboardResponse) {
          const calculatedDashboard = {
            ...dashboardResponse,
            environmentalImpact: {
              co2Saved: dashboardResponse.lifetimeGenerationKWh * 0.85,
              treesEquivalent: Math.max(0.1, (dashboardResponse.lifetimeGenerationKWh * 0.85) / 21),
              carbonFootprintReduction: 
                dashboardResponse.installationDetails?.type === "RESIDENTIAL" 
                  ? Math.min(100, (dashboardResponse.monthToDateGenerationKWh / 600) * 100)
                  : Math.min(100, (dashboardResponse.monthToDateGenerationKWh / 2000) * 100)
            }
          }
          setDashboardData(calculatedDashboard)
        } else {
          setDashboardData(dashboardResponse)
        }

        // FIXED: Use pre-aggregated series data from backend
        // This endpoint returns kWh values that are already properly integrated
        console.log(`Fetching aggregated series for installation ${selectedInstallation}, period: ${selectedPeriod}`)
        
        const seriesData = await energyApi.getInstallationSeriesForTimeRange(
          selectedInstallation,
          selectedPeriod as 'day' | 'week' | 'month' | 'year'
        )
        
        let energyData: any[] = []
        
        if (Array.isArray(seriesData) && seriesData.length > 0) {
          console.log(`Received ${seriesData.length} pre-aggregated data points`)
          // Map to format expected by chart (values are ALREADY in kWh)
          energyData = seriesData.map((point: any) => ({
            timestamp: point.bucketStart,
            // These are kWh values - store as totalGenerationKWh/totalConsumptionKWh
            totalGenerationKWh: point.generationKWh || 0,
            totalConsumptionKWh: point.consumptionKWh || 0,
            // Also keep average power for display
            powerGenerationWatts: point.avgGenerationWatts || 0,
            powerConsumptionWatts: point.avgConsumptionWatts || 0,
            isSimulated: false
          }))
        } else {
          console.warn(`No series data available for ${selectedPeriod} period`)
          energyData = []
        }

        // Set the energy data for charts
        setEnergyReadings(energyData)
        console.log(`Set ${energyData.length} energy readings for charts`)

        // Check for security and system status only if dashboard exists
        if (dashboardResponse) {
          try {
            console.log(`Fetching security status for installation ${selectedInstallation}`)
            const securityResponse = await securityApi.getInstallationSecurityStatus(selectedInstallation)

            if (securityResponse) {
              console.log("Security status response:", securityResponse)

              // Build system status from security data
              // FIXED: Only count unresolved alerts for system health calculation
              const unresolvedAlertCount = securityResponse.alerts?.filter((a: any) => !a.resolved)?.length || 0
              const systemStatusData = {
                tamperDetected: securityResponse.tamperDetected || dashboardResponse.installationDetails?.tamperDetected || false,
                lastTamperCheck: securityResponse.lastCheck || dashboardResponse.installationDetails?.lastTamperCheck || new Date().toISOString(),
                systemHealth: determineSystemHealth(
                  (dashboardResponse?.averageEfficiencyPercentage ?? dashboardResponse?.currentEfficiencyPercentage ?? 0), 
                  securityResponse.tamperDetected || false,
                  unresolvedAlertCount
                ),
                efficiency: (dashboardResponse?.averageEfficiencyPercentage ?? dashboardResponse?.currentEfficiencyPercentage ?? 0),
                lastMaintenance: securityResponse.lastMaintenance || null,
                alerts: securityResponse.alerts || [],
                recommendations: generateRecommendations(
                  (dashboardResponse?.averageEfficiencyPercentage ?? dashboardResponse?.currentEfficiencyPercentage ?? 0),
                  securityResponse.tamperDetected || false,
                  // FIXED: Only pass unresolved alerts for recommendations
                  (securityResponse.alerts || []).filter((a: any) => !a.resolved)
                )
              }

              setSystemStatus(systemStatusData)
            }
          } catch (error) {
            console.error("Error fetching security status:", error)
            // Create minimal system status from dashboard data
            setSystemStatus({
              tamperDetected: dashboardResponse.installationDetails?.tamperDetected || false,
              lastTamperCheck: dashboardResponse.installationDetails?.lastTamperCheck || new Date().toISOString(),
              systemHealth: determineSystemHealth(
                (dashboardResponse?.averageEfficiencyPercentage ?? dashboardResponse?.currentEfficiencyPercentage ?? 0),
                dashboardResponse.installationDetails?.tamperDetected || false,
                0
              ),
              efficiency: (dashboardResponse?.averageEfficiencyPercentage ?? dashboardResponse?.currentEfficiencyPercentage ?? 0),
              alerts: [],
              recommendations: generateRecommendations(
                (dashboardResponse?.averageEfficiencyPercentage ?? dashboardResponse?.currentEfficiencyPercentage ?? 0),
                dashboardResponse.installationDetails?.tamperDetected || false,
                []
              )
            })
          }
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error)
        setHasError(true)
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load your energy data. Please try again.",
        })
      } finally {
        setIsLoading(false)
      }
    }

    if (selectedInstallation) {
      fetchDashboardData()
    }
  }, [selectedInstallation, selectedPeriod, toast])

  // Determine system health based ONLY on alerts and tampering
  // This is about actual system problems, NOT production levels
  // Production efficiency is displayed separately as an informational metric
  const determineSystemHealth = (efficiency: number, tamperDetected: boolean, alertCount: number): "GOOD" | "FAIR" | "POOR" | "UNKNOWN" => {
    // Tamper detection is a critical system problem
    if (tamperDetected) return "POOR"
    
    // Alert-based health (the only thing that matters for "system health")
    if (alertCount > 5) return "POOR"
    if (alertCount > 2) return "FAIR"
    if (alertCount > 0) return "FAIR"
    
    // No alerts, no tampering = system is healthy
    return "GOOD"
  }

  // Generate practical recommendations for customers
  const generateRecommendations = (efficiency: number, tamperDetected: boolean, alerts: SystemAlert[]): string[] => {
    const recommendations: string[] = []
    const unresolvedAlerts = alerts.filter(a => !a.resolved)

    if (unresolvedAlerts.length > 0) {
      // There are issues - give practical customer guidance
      recommendations.push("Our team has been notified and is looking into the issue.")
      recommendations.push("You can check the System Alerts page for more details.")
      recommendations.push("If you have questions, contact support at support@nebulapower.com")
    } else {
      // No issues - helpful tips
      recommendations.push("Your system is running smoothly.")
      recommendations.push("Keep panels clean and free of debris for optimal performance.")
      recommendations.push("Check your energy production regularly to spot any changes.")
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

      // FIXED: Use pre-aggregated series data (same as initial load)
      // This ensures consistent chart display between initial load and refresh
      console.log(`Refresh: Fetching aggregated series for installation ${selectedInstallation}, period: ${selectedPeriod}`)
      
      const seriesData = await energyApi.getInstallationSeriesForTimeRange(
        selectedInstallation,
        selectedPeriod as 'day' | 'week' | 'month' | 'year'
      )
      
      let energyData: any[] = []
      
      if (Array.isArray(seriesData) && seriesData.length > 0) {
        console.log(`Refresh: Received ${seriesData.length} pre-aggregated data points`)
        // Map to format expected by chart (values are ALREADY in kWh)
        energyData = seriesData.map((point: any) => ({
          timestamp: point.bucketStart,
          totalGenerationKWh: point.generationKWh || 0,
          totalConsumptionKWh: point.consumptionKWh || 0,
          powerGenerationWatts: point.avgGenerationWatts || 0,
          powerConsumptionWatts: point.avgConsumptionWatts || 0,
          isSimulated: false
        }))
      } else {
        console.warn(`Refresh: No series data available for ${selectedPeriod} period`)
        energyData = []
      }

      setEnergyReadings(energyData)
      console.log(`Refresh: Set ${energyData.length} energy readings for charts`)

      // FIXED: Also re-fetch security status to update alerts and system health
      try {
        console.log(`Refresh: Fetching security status for installation ${selectedInstallation}`)
        const securityResponse = await securityApi.getInstallationSecurityStatus(selectedInstallation)

        if (securityResponse) {
          console.log("Refresh: Security status response:", securityResponse)

          // Build system status from fresh security data
          const systemStatusData = {
            tamperDetected: securityResponse.tamperDetected || calculatedDashboard.installationDetails?.tamperDetected || false,
            lastTamperCheck: securityResponse.lastCheck || calculatedDashboard.installationDetails?.lastTamperCheck || new Date().toISOString(),
            systemHealth: determineSystemHealth(
              (calculatedDashboard?.averageEfficiencyPercentage ?? calculatedDashboard?.currentEfficiencyPercentage ?? 0), 
              securityResponse.tamperDetected || false,
              securityResponse.alerts?.filter((a: any) => !a.resolved)?.length || 0
            ),
            efficiency: (calculatedDashboard?.averageEfficiencyPercentage ?? calculatedDashboard?.currentEfficiencyPercentage ?? 0),
            lastMaintenance: securityResponse.lastMaintenance || null,
            alerts: securityResponse.alerts || [],
            recommendations: generateRecommendations(
              (calculatedDashboard?.averageEfficiencyPercentage ?? calculatedDashboard?.currentEfficiencyPercentage ?? 0),
              securityResponse.tamperDetected || false,
              // Pass only unresolved alerts for recommendations
              (securityResponse.alerts || []).filter((a: any) => !a.resolved)
            )
          }

          setSystemStatus(systemStatusData)
          console.log("Refresh: Updated system status with fresh security data")
        }
      } catch (securityError) {
        console.error("Refresh: Error fetching security status:", securityError)
        // Security refresh failed, but energy data refresh succeeded - don't fail the whole refresh
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
  function generateSampleData(period: string, dashboardData?: InstallationDashboard): any[] {
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
  // FIXED: Data from getInstallationSeriesForTimeRange is already in kWh - NO normalization needed!
  const getProcessedChartData = () => {
    if (energyReadings.length === 0) {
      return []
    }

    const chartData: { time: string; production: number; consumption: number }[] = []

    // Data is already in kWh from the backend - use directly
    const getGenerationKWh = (reading: any): number => {
      // Priority: pre-aggregated kWh values
      if (typeof reading.totalGenerationKWh === 'number') return reading.totalGenerationKWh
      if (typeof reading.generationKWh === 'number') return reading.generationKWh
      return 0
    }

    const getConsumptionKWh = (reading: any): number => {
      // Priority: pre-aggregated kWh values
      if (typeof reading.totalConsumptionKWh === 'number') return reading.totalConsumptionKWh
      if (typeof reading.consumptionKWh === 'number') return reading.consumptionKWh
      return 0
    }

    // Get bucket label from timestamp
    // Backend sends LocalDateTime (no timezone) - display as-is
    const getBucketLabel = (timestamp: string, period: string): string => {
      const date = new Date(timestamp)
      switch (period) {
        case 'day':
          return `${date.getHours()}:00`
        case 'week':
          return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()]
        case 'month':
          return date.getDate().toString()
        case 'year':
          return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][date.getMonth()]
        default:
          return timestamp
      }
    }

    // Log totals for debugging
    const totalGen = energyReadings.reduce((sum, r) => sum + getGenerationKWh(r), 0)
    const totalCon = energyReadings.reduce((sum, r) => sum + getConsumptionKWh(r), 0)
    console.log('Chart data totals:', {
      selectedPeriod,
      dataPoints: energyReadings.length,
      totalGeneration: totalGen.toFixed(3) + ' kWh',
      totalConsumption: totalCon.toFixed(3) + ' kWh'
    })

    if (selectedPeriod === "day") {
      // Group hourly data
      const hourlyData: Record<string, { time: string; production: number; consumption: number; count: number }> = {}

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

      // Process readings - data is ALREADY in kWh
      energyReadings.forEach(reading => {
        if (!reading.timestamp) return
        const hourLabel = getBucketLabel(reading.timestamp, 'day')

        hourlyData[hourLabel].production += getGenerationKWh(reading)
        hourlyData[hourLabel].consumption += getConsumptionKWh(reading)
        hourlyData[hourLabel].count += 1
      })

      // Convert to array
      for (const hour in hourlyData) {
        chartData.push({
          time: hour,
          production: hourlyData[hour].production,
          consumption: hourlyData[hour].consumption
        })
      }

      // Sort by hour
      chartData.sort((a, b) => {
        return parseInt(a.time.split(':')[0]) - parseInt(b.time.split(':')[0])
      })
    } else if (selectedPeriod === "week") {
      // Group by day for week - data is already in kWh
      const dayData: Record<string, { time: string; production: number; consumption: number }> = {}
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

      // Initialize all days
      dayNames.forEach(day => {
        dayData[day] = {
          time: day,
          production: 0,
          consumption: 0
        }
      })

      // Process readings - data is ALREADY in kWh
      energyReadings.forEach(reading => {
        if (!reading.timestamp) return
        const dayName = getBucketLabel(reading.timestamp, 'week')

        dayData[dayName].production += getGenerationKWh(reading)
        dayData[dayName].consumption += getConsumptionKWh(reading)
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
      // Group by day for month - data is already in kWh
      const monthData: Record<string, { time: string; production: number; consumption: number }> = {}

      // Process readings - data is ALREADY in kWh
      energyReadings.forEach(reading => {
        if (!reading.timestamp) return
        const dayLabel = getBucketLabel(reading.timestamp, 'month')

        if (!monthData[dayLabel]) {
          monthData[dayLabel] = {
            time: dayLabel,
            production: 0,
            consumption: 0
          }
        }

        monthData[dayLabel].production += getGenerationKWh(reading)
        monthData[dayLabel].consumption += getConsumptionKWh(reading)
      })

      // Show all days of the month, including days with zero readings
      const now = new Date()
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
      
      // Convert to array with all days of the month
      for (let d = 1; d <= daysInMonth; d++) {
        const dayLabel = d.toString()
        if (monthData[dayLabel]) {
          chartData.push({
            time: dayLabel,
            production: monthData[dayLabel].production,
            consumption: monthData[dayLabel].consumption
          })
        } else {
          // Add zero entry for days without data
          chartData.push({
            time: dayLabel,
            production: 0,
            consumption: 0
          })
        }
      }

      // Already sorted since we loop from 1 to daysInMonth
    } else if (selectedPeriod === "year") {
      // Group by month for year - data is already in kWh
      const yearData: Record<string, { time: string; production: number; consumption: number; monthIndex: number }> = {}
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

      // Initialize all months
      monthNames.forEach((month, index) => {
        yearData[month] = {
          time: month,
          production: 0,
          consumption: 0,
          monthIndex: index
        }
      })

      // Process readings - data is ALREADY in kWh
      energyReadings.forEach(reading => {
        if (!reading.timestamp) return
        const monthLabel = getBucketLabel(reading.timestamp, 'year')

        yearData[monthLabel].production += getGenerationKWh(reading)
        yearData[monthLabel].consumption += getConsumptionKWh(reading)
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

  // Get the processed chart data
  const chartData = getProcessedChartData()

  // Calculate totals for the charts
  const totalProduction = chartData.reduce((sum, item) => sum + item.production, 0)
  const totalConsumption = chartData.reduce((sum, item) => sum + item.consumption, 0)

  // Get X-axis config based on time range (matches admin style)
  const getXAxisConfig = () => {
    if (selectedPeriod === 'day') {
      return { interval: 2 }; // Show every 3rd hour
    }
    if (selectedPeriod === 'month') {
      return getMonthlyXAxisConfig();
    }
    return {}; // Default for week and year
  };

  // Custom tooltip component (matches admin style)
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border bg-background/95 backdrop-blur-sm p-3 shadow-lg">
          <p className="font-semibold text-sm mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 mb-1">
              <div
                className="w-3 h-3 rounded-full"
                style={{
                  backgroundColor: entry.color,
                  boxShadow: `0 0 8px ${entry.color}40`
                }}
              />
              <span className="text-xs text-muted-foreground">{entry.name}:</span>
              <span className="text-sm font-medium">
                {formatChartTooltip(entry.value)}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  // Render energy chart - matches admin style exactly
  const renderEnergyChart = () => {
    if (chartData.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-full py-12">
          <div className="text-muted-foreground mb-4">
            <Sun className="h-16 w-16" />
          </div>
          <h3 className="text-lg font-medium">No Energy Data Available</h3>
          <p className="text-sm text-muted-foreground max-w-md mt-2 text-center">
            Energy data will appear here once your installation starts generating power.
          </p>
        </div>
      )
    }

    // Use ComposedChart for all time ranges (same as admin)
    return (
      <ChartContainer className="h-[350px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
            <defs>
              <linearGradient id="productionGradientCustomer" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(142, 76%, 46%)" stopOpacity={0.9} />
                <stop offset="50%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.8} />
                <stop offset="100%" stopColor="hsl(142, 76%, 26%)" stopOpacity={0.6} />
              </linearGradient>
              <filter id="glowCustomer">
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" vertical={false} />
            <XAxis 
              dataKey="time"
              className="text-xs"
              tickLine={false}
              axisLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
              {...getXAxisConfig()}
            />
            <YAxis 
              yAxisId="left"
              orientation="left"
              width={60}
              className="text-xs"
              tickLine={false}
              axisLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
              tickFormatter={formatChartYAxis}
            />
            <YAxis 
              yAxisId="right"
              orientation="right"
              width={60}
              className="text-xs"
              tickLine={false}
              axisLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
              tickFormatter={formatChartYAxis}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="circle"
            />
            {visibleSeries.production && (
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="production"
                name="Generation"
                fill="url(#productionGradientCustomer)"
                stroke="hsl(142, 76%, 36%)"
                strokeWidth={2}
                fillOpacity={0.7}
                style={{ filter: 'url(#glowCustomer)' }}
              />
            )}
            {visibleSeries.consumption && (
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="consumption" 
                name="Consumption" 
                stroke="hsl(0, 84%, 60%)" 
                strokeWidth={3}
                dot={{ 
                  fill: "hsl(0, 84%, 60%)", 
                  strokeWidth: 2, 
                  r: 4,
                  filter: 'drop-shadow(0 0 4px rgba(255, 100, 100, 0.6))'
                }}
                activeDot={{ 
                  r: 6, 
                  fill: "hsl(0, 84%, 60%)",
                  stroke: 'white',
                  strokeWidth: 2,
                  filter: 'drop-shadow(0 0 8px rgba(255, 100, 100, 0.8))'
                }}
                style={{ 
                  stroke: "hsl(0, 84%, 60%)",
                  filter: 'drop-shadow(0 0 2px rgba(255, 100, 100, 0.4))'
                }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </ChartContainer>
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
          {/* Alert banner - shows when there are unresolved alerts */}
          {systemStatus && systemStatus.alerts.filter(a => !a.resolved).length > 0 && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>System Alert</AlertTitle>
              <AlertDescription>
                {(() => {
                  const unresolvedAlerts = systemStatus.alerts.filter(a => !a.resolved);
                  if (unresolvedAlerts.length === 1) {
                    return `${unresolvedAlerts[0].message || 'An issue has been detected'}. Our team has been notified.`;
                  }
                  return `${unresolvedAlerts.length} issues detected with your installation. Our team has been notified.`;
                })()}
              </AlertDescription>
            </Alert>
          )}

          {/* Production summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-white dark:bg-[#111318] border-gray-200 dark:border-white/10 rounded-2xl shadow-sm dark:shadow-none">
              <CardHeader className="pb-3 px-6 pt-6">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-white/70">Current Generation</CardTitle>
              </CardHeader>
              <CardContent className="px-6 pb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sun className="h-5 w-5 text-orange-600 dark:text-orange-400" strokeWidth={2} />
                  <div className="text-2xl font-semibold text-gray-900 dark:text-white/90">{((dashboardData?.currentPowerGenerationWatts ?? 0) / 1000).toFixed(2)} kW</div>
                </div>
                  {(dashboardData?.currentPowerGenerationWatts ?? 0) > 0 && 
                    <ArrowUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" strokeWidth={2} />
                  }
                </div>
                <p className="text-xs text-gray-500 dark:text-white/50 mt-2">
                  {dashboardData?.lastUpdated ? 
                    `Last updated: ${new Date(dashboardData.lastUpdated).toLocaleTimeString()}` : 
                    'No recent updates'}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-[#111318] border-gray-200 dark:border-white/10 rounded-2xl shadow-sm dark:shadow-none">
              <CardHeader className="pb-3 px-6 pt-6">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-white/70">Today's Production</CardTitle>
              </CardHeader>
              <CardContent className="px-6 pb-6">
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-semibold text-gray-900 dark:text-white/90">
                    {dashboardData?.todayGenerationKWh?.toFixed(2) || '0.00'} kWh
                </div>
                  {(dashboardData?.todayGenerationKWh ?? 0) > 0 && 
                    <ArrowUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" strokeWidth={2} />
                  }
                </div>
                <Progress 
                  className="h-2 mt-3" 
                  value={(dashboardData?.installationDetails?.installedCapacityKW ?? 0) > 0 ? 
                    Math.min(100, ((dashboardData?.todayGenerationKWh ?? 0) / (((dashboardData?.installationDetails?.installedCapacityKW ?? 0) * 4))) * 100) : 0} 
                />
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-[#111318] border-gray-200 dark:border-white/10 rounded-2xl shadow-sm dark:shadow-none">
              <CardHeader className="pb-3 px-6 pt-6">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-white/70">Monthly Production</CardTitle>
              </CardHeader>
              <CardContent className="px-6 pb-6">
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-semibold text-gray-900 dark:text-white/90">
                  {dashboardData?.monthToDateGenerationKWh?.toFixed(2) || '0.00'} kWh
                </div>
                  {(dashboardData?.monthToDateGenerationKWh ?? 0) > 0 && 
                    <ArrowUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" strokeWidth={2} />
                  }
                </div>
                <p className="text-xs text-gray-500 dark:text-white/50 mt-2">
                  Month to date
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-[#111318] border-gray-200 dark:border-white/10 rounded-2xl shadow-sm dark:shadow-none">
              <CardHeader className="pb-3 px-6 pt-6">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-white/70">System Efficiency</CardTitle>
              </CardHeader>
              <CardContent className="px-6 pb-6">
                <div className="text-2xl font-semibold text-gray-900 dark:text-white/90">
                  {dashboardData?.averageEfficiencyPercentage !== undefined ? 
                    `${(dashboardData.averageEfficiencyPercentage).toFixed(1)}%` : 
                    dashboardData?.currentEfficiencyPercentage !== undefined ? 
                    `${(dashboardData.currentEfficiencyPercentage).toFixed(1)}%` : 
                    "0.0%"}
                </div>
                <Progress 
                  className="h-2 mt-3" 
                  value={dashboardData?.averageEfficiencyPercentage !== undefined ? 
                    dashboardData.averageEfficiencyPercentage : 
                    dashboardData?.currentEfficiencyPercentage || 0} 
                />
              </CardContent>
            </Card>
          </div>

          {/* Energy Flow summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-white dark:bg-[#111318] border-gray-200 dark:border-white/10 rounded-2xl shadow-sm dark:shadow-none col-span-2">
              <CardHeader className="pb-4 px-6 pt-6 flex flex-row items-center justify-between">
                <CardTitle className="text-gray-900 dark:text-white/90">Energy Production</CardTitle>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant={selectedPeriod === 'day' ? 'default' : 'outline'}
                    onClick={() => handlePeriodChange('day')}
                    disabled={isLoading}
                    size="sm"
                  >
                    Day
                  </Button>
                  <Button
                    variant={selectedPeriod === 'week' ? 'default' : 'outline'}
                    onClick={() => handlePeriodChange('week')}
                    disabled={isLoading}
                    size="sm"
                  >
                    Week
                  </Button>
                  <Button
                    variant={selectedPeriod === 'month' ? 'default' : 'outline'}
                    onClick={() => handlePeriodChange('month')}
                    disabled={isLoading}
                    size="sm"
                  >
                    Month
                  </Button>
                  <Button
                    variant={selectedPeriod === 'year' ? 'default' : 'outline'}
                    onClick={() => handlePeriodChange('year')}
                    disabled={isLoading}
                    size="sm"
                  >
                    Year
                  </Button>
                </div>
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

            <Card className="bg-white dark:bg-[#111318] border-gray-200 dark:border-white/10 rounded-2xl shadow-sm dark:shadow-none">
              <CardHeader className="pb-4 px-6 pt-6">
                <CardTitle className="text-gray-900 dark:text-white/90">Energy Flow</CardTitle>
              </CardHeader>
              <CardContent className="px-6 pb-6">
                {/* Energy flow metrics */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-white/10">
                    <div className="flex items-center">
                      <Sun className="h-4 w-4 text-orange-600 dark:text-orange-400 mr-2" strokeWidth={2} />
                      <span className="text-gray-700 dark:text-white/70">Production</span>
                    </div>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {selectedPeriod === 'day' 
                        ? `${totalProduction.toFixed(2)} kWh` 
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
                        ? `${totalConsumption.toFixed(2)} kWh` 
                        : `${totalConsumption.toFixed(2)} kWh`}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-2">
                    <div className="flex items-center">
                      <Info className="h-4 w-4 text-blue-500 mr-2" />
                      <span>Efficiency</span>
                    </div>
                    <span className="font-bold text-blue-500">
                      {dashboardData?.averageEfficiencyPercentage !== undefined ? 
                        `${(dashboardData.averageEfficiencyPercentage).toFixed(1)}%` : 
                        dashboardData?.currentEfficiencyPercentage !== undefined ? 
                        `${(dashboardData.currentEfficiencyPercentage).toFixed(1)}%` : 
                        "0.0%"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* System Status Card */}
          <Card className="bg-white dark:bg-[#111318] border-gray-200 dark:border-white/10 rounded-2xl shadow-sm dark:shadow-none">
            <CardHeader className="pb-4 px-6 pt-6">
              <CardTitle className="text-gray-900 dark:text-white/90">System Status</CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              {systemStatus ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors duration-150">
                      <div className="text-xs font-medium text-gray-500 dark:text-white/50 uppercase tracking-wide">System Efficiency</div>
                      <div className="text-2xl font-semibold text-gray-900 dark:text-white/90 mt-2">{systemStatus.efficiency.toFixed(1)}%</div>
                      <div className="w-full bg-gray-200 dark:bg-white/10 rounded-full h-2 mt-3">
                        <div 
                          className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full transition-all duration-300" 
                          style={{ width: `${Math.min(100, systemStatus.efficiency)}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="p-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors duration-150">
                      <div className="text-xs font-medium text-gray-500 dark:text-white/50 uppercase tracking-wide">Security Status</div>
                      <div className="flex items-center mt-2">
                        <Shield className={`h-5 w-5 mr-2 ${systemStatus.tamperDetected ? 'text-red-500 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`} strokeWidth={2} />
                        <span className="text-base font-semibold text-gray-900 dark:text-white/90">
                          {systemStatus.tamperDetected ? 'Tamper Detected' : 'Secure'}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-white/50 mt-2">
                        Last check: {new Date(systemStatus.lastTamperCheck).toLocaleDateString()}
                      </div>
                    </div>

                    <div className="p-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors duration-150">
                      <div className="text-xs font-medium text-gray-500 dark:text-white/50 uppercase tracking-wide">Active Alerts</div>
                      <div className="text-2xl font-semibold text-gray-900 dark:text-white/90 mt-2">{systemStatus.alerts.filter(alert => !alert.resolved).length}</div>
                      <div className="flex gap-1 mt-3">
                        {systemStatus.alerts.filter(alert => !alert.resolved).length > 0 ? (
                          systemStatus.alerts.filter(alert => !alert.resolved).slice(0, 4).map((alert, i) => (
                            <div 
                              key={i}
                              className={`w-6 h-2 rounded-full ${getAlertSeverityColor(alert.severity)}`}
                              title={alert.message}
                            ></div>
                          ))
                        ) : (
                          <span className="text-xs text-gray-500 dark:text-white/50">No active alerts</span>
                        )}
                      </div>
                    </div>

                    <div className="p-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors duration-150">
                      <div className="text-xs font-medium text-gray-500 dark:text-white/50 uppercase tracking-wide">Last Reading</div>
                      <div className="text-base font-semibold text-gray-900 dark:text-white/90 truncate mt-2">
                        {dashboardData?.lastUpdated 
                          ? new Date(dashboardData.lastUpdated).toLocaleString() 
                          : 'No data'}
                      </div>
                    </div>
                  </div>

                  {systemStatus.recommendations.length > 0 && (
                    <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-xl p-4">
                      <div className="flex items-center text-sm font-medium text-gray-900 dark:text-white/90 mb-3">
                        <Info className="h-4 w-4 mr-2 text-blue-600 dark:text-blue-400" strokeWidth={2} />
                        Recommendations
                      </div>
                      <ul className="space-y-2 text-sm text-gray-700 dark:text-white/70">
                        {systemStatus.recommendations.map((rec, i) => (
                          <li key={i} className="flex items-start">
                            <span className="text-blue-600 dark:text-blue-400 mr-2 font-medium">•</span>
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-sm text-gray-500 dark:text-white/50">
                  System status information not available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Environmental Impact */}
          <Card className="bg-white dark:bg-[#111318] border-gray-200 dark:border-white/10 rounded-2xl shadow-sm dark:shadow-none">
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

