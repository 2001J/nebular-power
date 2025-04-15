"use client"

import { useState, useEffect } from "react"
import { ArrowUp, Calendar, Download, Filter, CloudSun, Sun, Moon } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/components/auth-provider"
import { Chart, ChartContainer } from "@/components/ui/chart"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts"
import { Checkbox } from "@/components/ui/checkbox"
import { useTheme } from "next-themes"
import axios from "axios"

// API service for energy monitoring
const energyService = {
  getDashboard: async (customerId) => {
    try {
      const response = await axios.get(`/monitoring/dashboard/customer/${customerId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      return response.data
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
      throw error
    }
  },

  getHistoricalData: async (installationId, period = "day") => {
    try {
      const response = await axios.get(`/monitoring/readings/history/${installationId}`, {
        params: { period },
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      return response.data
    } catch (error) {
      console.error("Error fetching historical data:", error)
      throw error
    }
  },

  getRecentReadings: async (installationId) => {
    try {
      const response = await axios.get(`/monitoring/readings/recent/${installationId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      return response.data
    } catch (error) {
      console.error("Error fetching recent readings:", error)
      throw error
    }
  },

  getInstallationDetails: async (installationId) => {
    try {
      const response = await axios.get(`/monitoring/installations/${installationId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      return response.data
    } catch (error) {
      console.error("Error fetching installation details:", error)
      throw error
    }
  },
}

export default function AnalyticsPage() {
  const { user } = useAuth()
  const { theme, setTheme } = useTheme()
  const [activeTab, setActiveTab] = useState("overview")
  const [selectedPeriod, setSelectedPeriod] = useState("day")
  const [weatherImpactEnabled, setWeatherImpactEnabled] = useState(false)
  const [installationId, setInstallationId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [dashboardData, setDashboardData] = useState(null)

  // State for toggling data series visibility
  const [visibleSeries, setVisibleSeries] = useState({
    production: true,
    consumption: true,
    selfConsumption: true,
    export: true,
    import: true,
    batteryLevel: true,
    efficiency: true,
    temperature: true,
  })

  // Toggle visibility of a data series
  const toggleSeries = (series) => {
    setVisibleSeries((prev) => ({
      ...prev,
      [series]: !prev[series],
    }))
  }

  // Toggle theme between light and dark mode
  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  // Fetch data when component mounts or when period changes
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return

      try {
        setLoading(true)

        // First get the dashboard data to get the installation ID
        const dashboard = await energyService.getDashboard(user.id)
        setDashboardData(dashboard)

        // Get the first installation ID (or you could let user select one)
        if (dashboard.installations && dashboard.installations.length > 0) {
          setInstallationId(dashboard.installations[0].id)

          // Now fetch historical data for this installation
          await energyService.getHistoricalData(dashboard.installations[0].id, selectedPeriod)
        }
      } catch (error) {
        console.error("Error loading data:", error)
        // Handle error state
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user, selectedPeriod])

  if (!user) return null

  // Generate daily data for the month view
  const generateDailyData = () => {
    return Array.from({ length: 30 }, (_, i) => {
      // Create a pattern with some randomness but following a realistic curve
      // Higher values in the middle of the month, with some daily fluctuation
      const dayFactor = Math.sin((i / 30) * Math.PI) * 0.5 + 0.5
      const randomFactor = Math.random() * 0.3 + 0.85

      const baseProduction = 20 + dayFactor * 15
      const production = Math.round(baseProduction * randomFactor * 10) / 10

      // Consumption is more consistent but with some peaks
      const baseConsumption = 25 + Math.random() * 10
      const consumption = Math.round(baseConsumption * 10) / 10

      // Calculate derived values
      const selfConsumption = Math.min(production, consumption)
      const export_ = Math.max(0, production - consumption)
      const import_ = Math.max(0, consumption - production)

      // Temperature follows a similar pattern to production (sunny days)
      const baseTemp = 18 + dayFactor * 10
      const temperature = Math.round(baseTemp * 10) / 10

      return {
        day: i + 1,
        production,
        consumption,
        selfConsumption,
        export: export_,
        import: import_,
        temperature,
      }
    })
  }

  // Generate hourly data for the day view
  const generateHourlyData = () => {
    return Array.from({ length: 24 }, (_, i) => {
      // Solar production follows a bell curve during daylight hours
      let production = 0
      if (i >= 6 && i <= 18) {
        production = Math.sin(((i - 6) / 12) * Math.PI) * 5
      }

      // Consumption has morning and evening peaks
      let consumption = 0.5
      if (i >= 6 && i <= 9) {
        consumption = 1.5 + Math.random() * 0.5
      } else if (i >= 17 && i <= 22) {
        consumption = 2.0 + Math.random() * 1.0
      } else {
        consumption = 0.5 + Math.random() * 0.3
      }

      // Calculate derived values
      const selfConsumption = Math.min(production, consumption)
      const export_ = Math.max(0, production - consumption)
      const import_ = Math.max(0, consumption - production)

      // Temperature follows a similar pattern to production
      const baseTemp = 18 + (i >= 10 && i <= 16 ? 8 : 0)
      const temperature = baseTemp + Math.random() * 2

      return {
        hour: `${i}:00`,
        production: Math.round(production * 10) / 10,
        consumption: Math.round(consumption * 10) / 10,
        selfConsumption: Math.round(selfConsumption * 10) / 10,
        export: Math.round(export_ * 10) / 10,
        import: Math.round(import_ * 10) / 10,
        temperature: Math.round(temperature * 10) / 10,
      }
    })
  }

  // Calculate battery levels based on energy balance
  const calculateBatteryLevels = (data) => {
    let batteryLevel = 80 // Starting at 80%

    return data.map((hour) => {
      const energyBalance = hour.production - hour.consumption
      // Battery charges when production > consumption, discharges otherwise
      // Limited to 0-100% range
      batteryLevel = Math.min(100, Math.max(0, batteryLevel + energyBalance * 2))

      return {
        ...hour,
        batteryLevel: Math.round(batteryLevel),
      }
    })
  }

  // Generate weekly data
  const generateWeeklyData = () => {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    return days.map((day, i) => {
      // Weekend has higher production (assuming better weather)
      const isWeekend = i >= 5
      const production = isWeekend ? 120 + Math.random() * 30 : 100 + Math.random() * 40

      // Weekend has higher consumption too
      const consumption = isWeekend ? 140 + Math.random() * 30 : 120 + Math.random() * 20

      // Calculate derived values
      const selfConsumption = Math.min(production, consumption)
      const export_ = Math.max(0, production - consumption)
      const import_ = Math.max(0, consumption - production)

      // Temperature follows a similar pattern to production
      const temperature = (isWeekend ? 25 : 22) + Math.random() * 3

      return {
        day,
        production: Math.round(production * 10) / 10,
        consumption: Math.round(consumption * 10) / 10,
        selfConsumption: Math.round(selfConsumption * 10) / 10,
        export: Math.round(export_ * 10) / 10,
        import: Math.round(import_ * 10) / 10,
        temperature: Math.round(temperature * 10) / 10,
      }
    })
  }

  // Generate yearly data
  const generateYearlyData = () => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    return months.map((month, i) => {
      // Summer months have higher production
      const seasonFactor = Math.sin(((i + 3) / 12) * 2 * Math.PI) * 0.5 + 0.5
      const production = 300 + seasonFactor * 350

      // Winter months have higher consumption
      const winterFactor = Math.cos(((i + 3) / 12) * 2 * Math.PI) * 0.5 + 0.5
      const consumption = 250 + winterFactor * 150 + seasonFactor * 100

      // Calculate derived values
      const selfConsumption = Math.min(production, consumption)
      const export_ = Math.max(0, production - consumption)
      const import_ = Math.max(0, consumption - production)

      // Temperature follows seasonal pattern
      const temperature = 10 + seasonFactor * 25

      // Efficiency data - similar to the screenshot
      const efficiency = 89 + Math.sin((i / 12) * 2 * Math.PI) * 4

      return {
        month,
        production: Math.round(production),
        consumption: Math.round(consumption),
        selfConsumption: Math.round(selfConsumption),
        export: Math.round(export_),
        import: Math.round(import_),
        temperature: Math.round(temperature),
        efficiency: Math.round(efficiency * 10) / 10,
      }
    })
  }

  // Get the appropriate data based on selected period
  const getChartData = () => {
    let data, xKey, xLabel, yLabel, unit

    switch (selectedPeriod) {
      case "day":
        data = calculateBatteryLevels(generateHourlyData())
        xKey = "hour"
        xLabel = "Hour"
        yLabel = "Power"
        unit = "kW"
        break
      case "week":
        data = generateWeeklyData()
        xKey = "day"
        xLabel = "Day"
        yLabel = "Energy"
        unit = "kWh"
        break
      case "year":
        data = generateYearlyData()
        xKey = "month"
        xLabel = "Month"
        yLabel = "Energy"
        unit = "kWh"
        break
      case "month":
      default:
        data = generateDailyData()
        xKey = "day"
        xLabel = "Day"
        yLabel = "Energy"
        unit = "kWh"
    }

    return { data, xKey, xLabel, yLabel, unit }
  }

  const chartData = getChartData()

  // Calculate current production and other metrics
  const currentProduction = 26.1
  const todaysGeneration = 12.5
  const systemEfficiency = 94

  // Calculate totals for the selected period
  const totalProduction = chartData.data.reduce((sum, item) => sum + item.production, 0).toFixed(2)
  const totalConsumption = chartData.data.reduce((sum, item) => sum + item.consumption, 0).toFixed(2)
  const totalSelfConsumption = chartData.data.reduce((sum, item) => sum + (item.selfConsumption || 0), 0).toFixed(2)
  const totalExport = chartData.data.reduce((sum, item) => sum + item.export, 0).toFixed(2)
  const totalImport = chartData.data.reduce((sum, item) => sum + item.import, 0).toFixed(2)

  // Calculate self-consumption and self-sufficiency percentages
  const selfConsumptionPercentage = Math.round((Number(totalSelfConsumption) / Number(totalProduction)) * 100) || 0
  const selfSufficiencyPercentage = Math.round((Number(totalSelfConsumption) / Number(totalConsumption)) * 100) || 0

  // Get time range text based on selected period
  const getTimeRangeText = () => {
    switch (selectedPeriod) {
      case "day":
        return "24 Hour"
      case "week":
        return "7 Day"
      case "year":
        return "12 Month"
      case "month":
      default:
        return "30 Day"
    }
  }

  // Dynamic title based on active tab and selected period
  const getDynamicTitle = () => {
    const timeRange = getTimeRangeText()

    switch (activeTab) {
      case "production":
        return `Solar Production Analysis - ${timeRange} View`
      case "system":
        return `System Efficiency Analysis - ${timeRange} View`
      case "weather":
        return `Weather Impact Analysis - ${timeRange} View`
      case "comparison":
        return `System Comparison - ${timeRange} View`
      case "overview":
      default:
        return `Energy Production vs Consumption - ${timeRange} View`
    }
  }

  // Generate system efficiency data for the chart that matches the screenshot
  const efficiencyData = generateYearlyData()

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Energy Charts and Analytics</h1>
        <Button variant="outline" size="icon" onClick={toggleTheme}>
          {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>
      </div>

      {/* Key metrics cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start">
              <div className="mr-4 text-yellow-500">
                <Sun className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Current Production</p>
                <h2 className="text-3xl font-bold">{currentProduction} kW</h2>
                <p className="text-xs text-muted-foreground">Peak at 22:00</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start">
              <div className="mr-4 text-blue-500">
                <svg
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
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                  <polyline points="17 6 23 6 23 12" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Today's Generation</p>
                <h2 className="text-3xl font-bold">{todaysGeneration} kWh</h2>
                <p className="text-xs text-green-500 flex items-center">
                  <ArrowUp className="h-3 w-3 mr-1" />
                  +19.5% from previous
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start">
              <div className="mr-4 text-green-500">
                <svg
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
                  <path d="m12 14 4-4" />
                  <path d="M3.34 19a10 10 0 1 1 17.32 0" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">System Efficiency</p>
                <h2 className="text-3xl font-bold">{systemEfficiency}%</h2>
                <p className="text-xs text-muted-foreground">Based on current conditions</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics section */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col space-y-4">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
              <div className="flex items-center space-x-4">
                <h2 className="text-xl font-bold">Energy Analytics</h2>

                <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="production">Production Analysis</TabsTrigger>
                    <TabsTrigger value="system">System Efficiency</TabsTrigger>
                    <TabsTrigger value="weather">Weather Impact</TabsTrigger>
                    <TabsTrigger value="comparison">Comparison</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              <div className="flex items-center space-x-2 mt-4 md:mt-0">
                <div className="flex bg-muted rounded-md p-0.5">
                  <Button
                    variant={selectedPeriod === "day" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setSelectedPeriod("day")}
                  >
                    Day
                  </Button>
                  <Button
                    variant={selectedPeriod === "week" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setSelectedPeriod("week")}
                  >
                    Week
                  </Button>
                  <Button
                    variant={selectedPeriod === "month" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setSelectedPeriod("month")}
                  >
                    Month
                  </Button>
                  <Button
                    variant={selectedPeriod === "year" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setSelectedPeriod("year")}
                  >
                    Year
                  </Button>
                </div>

                <Button variant="outline" size="icon" className="rounded-md">
                  <Calendar className="h-4 w-4" />
                </Button>

                <Button variant="outline" size="icon" className="rounded-md">
                  <Filter className="h-4 w-4" />
                </Button>

                <Button variant="outline" size="icon" className="rounded-md">
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Weather impact toggle - only show for overview and production tabs */}
            {(activeTab === "overview" || activeTab === "production" || activeTab === "weather") && (
              <Button
                variant="ghost"
                size="sm"
                className={`rounded-full ${weatherImpactEnabled ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" : "bg-muted"} w-fit`}
                onClick={() => setWeatherImpactEnabled(!weatherImpactEnabled)}
              >
                <CloudSun className="h-4 w-4 mr-2" />
                Weather Impact {weatherImpactEnabled ? "(On)" : "(Off)"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Progress bars for self-consumption and self-sufficiency */}
      {activeTab === "overview" && (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Self-consumption</span>
                  <span>{selfConsumptionPercentage}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-4">
                  <div
                    className="bg-blue-500 h-4 rounded-full"
                    style={{ width: `${selfConsumptionPercentage}%` }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Self-sufficiency</span>
                  <span>{selfSufficiencyPercentage}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-4">
                  <div
                    className="bg-green-500 h-4 rounded-full"
                    style={{ width: `${selfSufficiencyPercentage}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Series toggle checkboxes */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-wrap gap-4">
            {activeTab !== "system" && (
              <>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="production"
                    checked={visibleSeries.production}
                    onCheckedChange={() => toggleSeries("production")}
                  />
                  <label
                    htmlFor="production"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    Production
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="consumption"
                    checked={visibleSeries.consumption}
                    onCheckedChange={() => toggleSeries("consumption")}
                  />
                  <label
                    htmlFor="consumption"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    Consumption
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="selfConsumption"
                    checked={visibleSeries.selfConsumption}
                    onCheckedChange={() => toggleSeries("selfConsumption")}
                  />
                  <label
                    htmlFor="selfConsumption"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    Self Consumption
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="export" checked={visibleSeries.export} onCheckedChange={() => toggleSeries("export")} />
                  <label
                    htmlFor="export"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    Export
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="import" checked={visibleSeries.import} onCheckedChange={() => toggleSeries("import")} />
                  <label
                    htmlFor="import"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    Import
                  </label>
                </div>
                {selectedPeriod === "day" && (
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="batteryLevel"
                      checked={visibleSeries.batteryLevel}
                      onCheckedChange={() => toggleSeries("batteryLevel")}
                    />
                    <label
                      htmlFor="batteryLevel"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      Battery Level
                    </label>
                  </div>
                )}
              </>
            )}

            {activeTab === "system" && (
              <>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="efficiency"
                    checked={visibleSeries.efficiency}
                    onCheckedChange={() => toggleSeries("efficiency")}
                  />
                  <label
                    htmlFor="efficiency"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    Efficiency
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="temperature"
                    checked={visibleSeries.temperature}
                    onCheckedChange={() => toggleSeries("temperature")}
                  />
                  <label
                    htmlFor="temperature"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    Temperature
                  </label>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main chart */}
      <Card>
        <CardHeader>
          <CardTitle>{getDynamicTitle()}</CardTitle>
          {activeTab === "system" && <CardDescription>Track your system's efficiency over time</CardDescription>}
        </CardHeader>
        <CardContent className="p-6">
          <TabsContent value="overview" className="mt-0">
            {selectedPeriod === "day" ? (
              <div className="space-y-6">
                {/* Power chart */}
                <div className="w-full">
                  <Chart>
                    <ChartContainer>
                      <ResponsiveContainer width="100%" height={400}>
                        <AreaChart data={chartData.data} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
                          <defs>
                            <linearGradient id="colorProduction" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#4ade80" stopOpacity={0.8} />
                              <stop offset="95%" stopColor="#4ade80" stopOpacity={0.1} />
                            </linearGradient>
                            <linearGradient id="colorConsumption" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#f87171" stopOpacity={0.8} />
                              <stop offset="95%" stopColor="#f87171" stopOpacity={0.1} />
                            </linearGradient>
                            <linearGradient id="colorSelfConsumption" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.8} />
                              <stop offset="95%" stopColor="#60a5fa" stopOpacity={0.1} />
                            </linearGradient>
                            <linearGradient id="colorExport" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#34d399" stopOpacity={0.8} />
                              <stop offset="95%" stopColor="#34d399" stopOpacity={0.1} />
                            </linearGradient>
                            <linearGradient id="colorImport" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#fb7185" stopOpacity={0.8} />
                              <stop offset="95%" stopColor="#fb7185" stopOpacity={0.1} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.1} />
                          <XAxis
                            dataKey={chartData.xKey}
                            tick={{ fontSize: 12 }}
                            tickLine={{ stroke: "currentColor", opacity: 0.2 }}
                            axisLine={{ stroke: "currentColor", opacity: 0.2 }}
                          />
                          <YAxis
                            yAxisId="left"
                            tick={{ fontSize: 12 }}
                            tickLine={{ stroke: "currentColor", opacity: 0.2 }}
                            axisLine={{ stroke: "currentColor", opacity: 0.2 }}
                            label={{
                              value: `Power (${chartData.unit})`,
                              angle: -90,
                              position: "insideLeft",
                              fontSize: 12,
                            }}
                          />
                          {weatherImpactEnabled && (
                            <YAxis
                              yAxisId="right"
                              orientation="right"
                              domain={[0, 36]}
                              tick={{ fontSize: 12 }}
                              tickLine={{ stroke: "currentColor", opacity: 0.2 }}
                              axisLine={{ stroke: "currentColor", opacity: 0.2 }}
                              label={{
                                value: "Temperature (°C)",
                                angle: 90,
                                position: "insideRight",
                                fontSize: 12,
                              }}
                            />
                          )}
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "var(--background)",
                              borderRadius: "6px",
                              border: "1px solid var(--border)",
                              boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                            }}
                            formatter={(value, name) => {
                              if (name === "temperature") return [`${value}°C`, "Temperature"]
                              return [`${value} ${chartData.unit}`, name.charAt(0).toUpperCase() + name.slice(1)]
                            }}
                            labelFormatter={(label) => `Time: ${label}`}
                          />
                          {visibleSeries.production && (
                            <Area
                              yAxisId="left"
                              type="monotone"
                              dataKey="production"
                              stroke="#4ade80"
                              strokeWidth={2}
                              fillOpacity={1}
                              fill="url(#colorProduction)"
                              name="Production"
                            />
                          )}
                          {visibleSeries.consumption && (
                            <Area
                              yAxisId="left"
                              type="monotone"
                              dataKey="consumption"
                              stroke="#f87171"
                              strokeWidth={2}
                              fillOpacity={1}
                              fill="url(#colorConsumption)"
                              name="Consumption"
                            />
                          )}
                          {visibleSeries.selfConsumption && (
                            <Area
                              yAxisId="left"
                              type="monotone"
                              dataKey="selfConsumption"
                              stroke="#60a5fa"
                              strokeWidth={2}
                              fillOpacity={1}
                              fill="url(#colorSelfConsumption)"
                              name="Self Consumption"
                            />
                          )}
                          {visibleSeries.export && (
                            <Area
                              yAxisId="left"
                              type="monotone"
                              dataKey="export"
                              stroke="#34d399"
                              strokeWidth={2}
                              fillOpacity={1}
                              fill="url(#colorExport)"
                              name="Export"
                            />
                          )}
                          {visibleSeries.import && (
                            <Area
                              yAxisId="left"
                              type="monotone"
                              dataKey="import"
                              stroke="#fb7185"
                              strokeWidth={2}
                              fillOpacity={1}
                              fill="url(#colorImport)"
                              name="Import"
                            />
                          )}
                          {weatherImpactEnabled && (
                            <Line
                              yAxisId="right"
                              type="monotone"
                              dataKey="temperature"
                              stroke="#f59e0b"
                              strokeWidth={2}
                              dot={{ r: 2, fill: "#f59e0b" }}
                              name="Temperature"
                            />
                          )}
                        </AreaChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </Chart>
                </div>

                {/* Battery level chart - completely separate card */}
                {visibleSeries.batteryLevel && (
                  <Card className="border mt-8">
                    <CardHeader>
                      <CardTitle className="text-base">Battery Level</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Chart>
                        <ChartContainer>
                          <ResponsiveContainer width="100%" height={200}>
                            <LineChart data={chartData.data} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
                              <CartesianGrid
                                strokeDasharray="3 3"
                                vertical={false}
                                stroke="currentColor"
                                opacity={0.1}
                              />
                              <XAxis
                                dataKey={chartData.xKey}
                                tick={{ fontSize: 12 }}
                                tickLine={{ stroke: "currentColor", opacity: 0.2 }}
                                axisLine={{ stroke: "currentColor", opacity: 0.2 }}
                              />
                              <YAxis
                                domain={[0, 100]}
                                tick={{ fontSize: 12 }}
                                tickLine={{ stroke: "currentColor", opacity: 0.2 }}
                                axisLine={{ stroke: "currentColor", opacity: 0.2 }}
                                label={{
                                  value: "Battery (%)",
                                  angle: -90,
                                  position: "insideLeft",
                                  fontSize: 12,
                                }}
                              />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: "var(--background)",
                                  borderRadius: "6px",
                                  border: "1px solid var(--border)",
                                  boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                                }}
                                formatter={(value) => [`${value}%`, "Battery Level"]}
                                labelFormatter={(label) => `Time: ${label}`}
                              />
                              <Line
                                type="monotone"
                                dataKey="batteryLevel"
                                stroke="#6366f1"
                                strokeWidth={2}
                                dot={{ r: 2, fill: "#6366f1" }}
                                name="Battery Level"
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </ChartContainer>
                      </Chart>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <Chart>
                <ChartContainer>
                  <ResponsiveContainer width="100%" height={400}>
                    <AreaChart data={chartData.data} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
                      <defs>
                        <linearGradient id="colorProduction" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4ade80" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#4ade80" stopOpacity={0.1} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.1} />
                      <XAxis
                        dataKey={chartData.xKey}
                        tick={{ fontSize: 12 }}
                        tickLine={{ stroke: "currentColor", opacity: 0.2 }}
                        axisLine={{ stroke: "currentColor", opacity: 0.2 }}
                      />
                      <YAxis
                        yAxisId="left"
                        tick={{ fontSize: 12 }}
                        tickLine={{ stroke: "currentColor", opacity: 0.2 }}
                        axisLine={{ stroke: "currentColor", opacity: 0.2 }}
                        label={{
                          value: `Energy (${chartData.unit})`,
                          angle: -90,
                          position: "insideLeft",
                          fontSize: 12,
                        }}
                      />
                      {weatherImpactEnabled && (
                        <YAxis
                          yAxisId="right"
                          orientation="right"
                          domain={[0, 36]}
                          tick={{ fontSize: 12 }}
                          tickLine={{ stroke: "currentColor", opacity: 0.2 }}
                          axisLine={{ stroke: "currentColor", opacity: 0.2 }}
                          label={{
                            value: "Temperature (°C)",
                            angle: 90,
                            position: "insideRight",
                            fontSize: 12,
                          }}
                        />
                      )}
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "var(--background)",
                          borderRadius: "6px",
                          border: "1px solid var(--border)",
                          boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                        }}
                        formatter={(value, name) => {
                          if (name === "temperature") return [`${value}°C`, "Temperature"]
                          return [`${value} ${chartData.unit}`, name.charAt(0).toUpperCase() + name.slice(1)]
                        }}
                        labelFormatter={(label) => `${chartData.xLabel}: ${label}`}
                      />
                      {visibleSeries.production && (
                        <Area
                          yAxisId="left"
                          type="monotone"
                          dataKey="production"
                          stroke="#4ade80"
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#colorProduction)"
                          name="Production"
                        />
                      )}
                      {visibleSeries.consumption && (
                        <Line
                          yAxisId="left"
                          type="monotone"
                          dataKey="consumption"
                          stroke="#f87171"
                          strokeWidth={2}
                          dot={{ r: 2, fill: "#f87171" }}
                          name="Consumption"
                        />
                      )}
                      {visibleSeries.selfConsumption && (
                        <Line
                          yAxisId="left"
                          type="monotone"
                          dataKey="selfConsumption"
                          stroke="#60a5fa"
                          strokeWidth={2}
                          dot={{ r: 2, fill: "#60a5fa" }}
                          name="Self Consumption"
                        />
                      )}
                      {visibleSeries.export && (
                        <Line
                          yAxisId="left"
                          type="monotone"
                          dataKey="export"
                          stroke="#34d399"
                          strokeWidth={2}
                          dot={{ r: 2, fill: "#34d399" }}
                          name="Export"
                        />
                      )}
                      {visibleSeries.import && (
                        <Line
                          yAxisId="left"
                          type="monotone"
                          dataKey="import"
                          stroke="#fb7185"
                          strokeWidth={2}
                          dot={{ r: 2, fill: "#fb7185" }}
                          name="Import"
                        />
                      )}
                      {weatherImpactEnabled && (
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="temperature"
                          stroke="#f59e0b"
                          strokeWidth={2}
                          dot={{ r: 2, fill: "#f59e0b" }}
                          name="Temperature"
                        />
                      )}
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </Chart>
            )}
          </TabsContent>

          <TabsContent value="production">
            <Chart>
              <ChartContainer>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={chartData.data} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.1} />
                    <XAxis
                      dataKey={chartData.xKey}
                      tick={{ fontSize: 12 }}
                      tickLine={{ stroke: "currentColor", opacity: 0.2 }}
                      axisLine={{ stroke: "currentColor", opacity: 0.2 }}
                    />
                    <YAxis
                      yAxisId="left"
                      tick={{ fontSize: 12 }}
                      tickLine={{ stroke: "currentColor", opacity: 0.2 }}
                      axisLine={{ stroke: "currentColor", opacity: 0.2 }}
                      label={{
                        value: `Energy (${chartData.unit})`,
                        angle: -90,
                        position: "insideLeft",
                        fontSize: 12,
                      }}
                    />
                    {weatherImpactEnabled && (
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        domain={[0, 36]}
                        tick={{ fontSize: 12 }}
                        tickLine={{ stroke: "currentColor", opacity: 0.2 }}
                        axisLine={{ stroke: "currentColor", opacity: 0.2 }}
                        label={{
                          value: "Temperature (°C)",
                          angle: 90,
                          position: "insideRight",
                          fontSize: 12,
                        }}
                      />
                    )}
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--background)",
                        borderRadius: "6px",
                        border: "1px solid var(--border)",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                      }}
                      formatter={(value, name) => {
                        if (name === "temperature") return [`${value}°C`, "Temperature"]
                        return [`${value} ${chartData.unit}`, name.charAt(0).toUpperCase() + name.slice(1)]
                      }}
                      labelFormatter={(label) => `${chartData.xLabel}: ${label}`}
                    />
                    <Legend />
                    {visibleSeries.production && (
                      <Bar yAxisId="left" dataKey="production" fill="#4ade80" name="Production" />
                    )}
                    {visibleSeries.consumption && (
                      <Bar yAxisId="left" dataKey="consumption" fill="#f87171" name="Consumption" />
                    )}
                    {visibleSeries.selfConsumption && (
                      <Bar yAxisId="left" dataKey="selfConsumption" fill="#60a5fa" name="Self Consumption" />
                    )}
                    {visibleSeries.export && <Bar yAxisId="left" dataKey="export" fill="#34d399" name="Export" />}
                    {visibleSeries.import && <Bar yAxisId="left" dataKey="import" fill="#fb7185" name="Import" />}
                    {weatherImpactEnabled && (
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="temperature"
                        stroke="#f59e0b"
                        strokeWidth={2}
                        dot={{ r: 2, fill: "#f59e0b" }}
                        name="Temperature"
                      />
                    )}
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </Chart>
          </TabsContent>

          <TabsContent value="system">
            <Chart>
              <ChartContainer>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={efficiencyData} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.1} />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 12 }}
                      tickLine={{ stroke: "currentColor", opacity: 0.2 }}
                      axisLine={{ stroke: "currentColor", opacity: 0.2 }}
                    />
                    <YAxis
                      yAxisId="left"
                      domain={[85, 100]}
                      tick={{ fontSize: 12 }}
                      tickLine={{ stroke: "currentColor", opacity: 0.2 }}
                      axisLine={{ stroke: "currentColor", opacity: 0.2 }}
                      label={{
                        value: "Efficiency (%)",
                        angle: -90,
                        position: "insideLeft",
                        fontSize: 12,
                      }}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      domain={[30, 90]}
                      tick={{ fontSize: 12 }}
                      tickLine={{ stroke: "currentColor", opacity: 0.2 }}
                      axisLine={{ stroke: "currentColor", opacity: 0.2 }}
                      label={{
                        value: "Temperature (°F)",
                        angle: 90,
                        position: "insideRight",
                        fontSize: 12,
                      }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--background)",
                        borderRadius: "6px",
                        border: "1px solid var(--border)",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                      }}
                      formatter={(value, name) => {
                        if (name === "temperature") return [`${value}°F`, "Temperature"]
                        return [`${value}%`, "Efficiency"]
                      }}
                      labelFormatter={(label) => `Month: ${label}`}
                    />
                    <Legend />
                    {visibleSeries.efficiency && (
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="efficiency"
                        stroke="#4ade80"
                        strokeWidth={2}
                        dot={{ r: 2, fill: "#4ade80" }}
                        name="Efficiency"
                      />
                    )}
                    {visibleSeries.temperature && (
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="temperature"
                        stroke="#f59e0b"
                        strokeWidth={2}
                        dot={{ r: 2, fill: "#f59e0b" }}
                        name="Temperature"
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </Chart>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium">Panel Efficiency</h4>
                <div className="w-full bg-muted rounded-full h-4">
                  <div className="bg-blue-500 h-4 rounded-full" style={{ width: "94%" }}></div>
                </div>
                <div className="flex justify-between text-sm">
                  <span>94%</span>
                  <span className="text-green-500">Good</span>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Inverter Efficiency</h4>
                <div className="w-full bg-muted rounded-full h-4">
                  <div className="bg-blue-500 h-4 rounded-full" style={{ width: "97%" }}></div>
                </div>
                <div className="flex justify-between text-sm">
                  <span>97%</span>
                  <span className="text-green-500">Excellent</span>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">System Performance Ratio</h4>
                <div className="w-full bg-muted rounded-full h-4">
                  <div className="bg-blue-500 h-4 rounded-full" style={{ width: "88%" }}></div>
                </div>
                <div className="flex justify-between text-sm">
                  <span>88%</span>
                  <span className="text-green-500">Good</span>
                </div>
              </div>
            </div>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Temperature Impact</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Panel efficiency decreases by approximately 0.5% for every degree Celsius above 25°C (77°F). Your
                    system shows optimal performance in the 70-75°F range.
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Low Temp (45°F)</span>
                    <span className="text-sm">Optimal (72°F)</span>
                    <span className="text-sm">High Temp (85°F)</span>
                  </div>
                  <div className="w-full bg-muted h-2 rounded-full mt-1 relative">
                    <div
                      className="absolute h-4 w-4 bg-blue-500 rounded-full top-1/2 -translate-y-1/2"
                      style={{ left: "60%" }}
                    ></div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Maintenance Impact</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Regular cleaning and maintenance can improve system efficiency by up to 5%. Your last maintenance
                    was performed 45 days ago.
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">0 days</span>
                    <span className="text-sm">45 days</span>
                    <span className="text-sm">90 days</span>
                  </div>
                  <div className="w-full bg-muted h-2 rounded-full mt-1 relative">
                    <div
                      className="absolute h-4 w-4 bg-amber-500 rounded-full top-1/2 -translate-y-1/2"
                      style={{ left: "50%" }}
                    ></div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="weather">
            <Chart>
              <ChartContainer>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={chartData.data} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.1} />
                    <XAxis
                      dataKey={chartData.xKey}
                      tick={{ fontSize: 12 }}
                      tickLine={{ stroke: "currentColor", opacity: 0.2 }}
                      axisLine={{ stroke: "currentColor", opacity: 0.2 }}
                    />
                    <YAxis
                      yAxisId="left"
                      tick={{ fontSize: 12 }}
                      tickLine={{ stroke: "currentColor", opacity: 0.2 }}
                      axisLine={{ stroke: "currentColor", opacity: 0.2 }}
                      label={{
                        value: `Production (${chartData.unit})`,
                        angle: -90,
                        position: "insideLeft",
                        fontSize: 12,
                      }}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      domain={[0, 36]}
                      tick={{ fontSize: 12 }}
                      tickLine={{ stroke: "currentColor", opacity: 0.2 }}
                      axisLine={{ stroke: "currentColor", opacity: 0.2 }}
                      label={{
                        value: "Temperature (°C)",
                        angle: 90,
                        position: "insideRight",
                        fontSize: 12,
                      }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--background)",
                        borderRadius: "6px",
                        border: "1px solid var(--border)",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                      }}
                      formatter={(value, name) => {
                        if (name === "temperature") return [`${value}°C`, "Temperature"]
                        return [`${value} ${chartData.unit}`, name.charAt(0).toUpperCase() + name.slice(1)]
                      }}
                      labelFormatter={(label) => `${chartData.xLabel}: ${label}`}
                    />
                    <Legend />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="production"
                      stroke="#4ade80"
                      strokeWidth={2}
                      dot={{ r: 2, fill: "#4ade80" }}
                      name="Production"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="temperature"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      dot={{ r: 2, fill: "#f59e0b" }}
                      name="Temperature"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </Chart>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">Sunny Day</div>
                    <div className="text-2xl font-bold text-amber-500">28.5 kWh</div>
                    <div className="text-sm text-muted-foreground">Average production</div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">Partly Cloudy</div>
                    <div className="text-2xl font-bold text-blue-400">22.1 kWh</div>
                    <div className="text-sm text-muted-foreground">Average production</div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">Cloudy Day</div>
                    <div className="text-2xl font-bold text-gray-500">18.2 kWh</div>
                    <div className="text-sm text-muted-foreground">Average production</div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">Optimal Temp</div>
                    <div className="text-2xl font-bold text-green-500">70-75°F</div>
                    <div className="text-sm text-muted-foreground">Best performance</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="comparison">
            <Chart>
              <ChartContainer>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart
                    data={[
                      { name: "Your System", production: 535, savings: 128 },
                      { name: "Neighborhood Avg", production: 482, savings: 115 },
                      { name: "Regional Avg", production: 410, savings: 98 },
                    ]}
                    margin={{ top: 10, right: 30, left: 10, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.1} />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 12 }}
                      tickLine={{ stroke: "currentColor", opacity: 0.2 }}
                      axisLine={{ stroke: "currentColor", opacity: 0.2 }}
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      tickLine={{ stroke: "currentColor", opacity: 0.2 }}
                      axisLine={{ stroke: "currentColor", opacity: 0.2 }}
                      label={{
                        value: "Energy (kWh)",
                        angle: -90,
                        position: "insideLeft",
                        fontSize: 12,
                      }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--background)",
                        borderRadius: "6px",
                        border: "1px solid var(--border)",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                      }}
                    />
                    <Legend />
                    <Bar dataKey="production" fill="#4ade80" name="Monthly Production (kWh)" />
                    <Bar dataKey="savings" fill="#60a5fa" name="Monthly Savings ($)" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </Chart>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">Production vs Neighborhood</div>
                    <div className="text-2xl font-bold text-green-500">+11.0%</div>
                    <div className="text-sm text-muted-foreground">Your system produces 11% more energy</div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">Production vs Region</div>
                    <div className="text-2xl font-bold text-green-500">+30.5%</div>
                    <div className="text-sm text-muted-foreground">Your system produces 30.5% more energy</div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">Savings Rank</div>
                    <div className="text-2xl font-bold">Top 15%</div>
                    <div className="text-sm text-muted-foreground">Your system is in the top 15% for savings</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </CardContent>
      </Card>

      {/* Bottom cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-medium mb-4">System Performance</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Peak Production Time</p>
                <p className="text-xl font-bold">22:00</p>
                <p className="text-sm text-muted-foreground">26.7 kWh peak generation</p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Current Efficiency</p>
                <p className="text-xl font-bold">94%</p>
                <p className="text-sm text-muted-foreground">Based on current conditions</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-medium mb-4">Production Analysis</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Daily Average</p>
                <p className="text-xl font-bold">12.5 kWh</p>
                <p className="text-sm text-muted-foreground">Based on 30 days</p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Performance Ratio</p>
                <p className="text-xl font-bold">0.47</p>
                <p className="text-sm text-muted-foreground">Actual vs theoretical output</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-medium mb-4">Weather Impact</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Current Conditions</p>
                <p className="text-xl font-bold">sunny, 26.8°C</p>
                <p className="text-sm text-muted-foreground">Current reading</p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Production Forecast</p>
                <p className="text-xl font-bold">28.8 kWh</p>
                <p className="text-sm text-muted-foreground">Expected output based on conditions</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

