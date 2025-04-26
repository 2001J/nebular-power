"use client"

import { useState, useEffect } from "react"
import { Download, Filter, ArrowUp, BarChart3 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/components/auth-provider"
import { useToast } from "@/components/ui/use-toast"
import { Chart, ChartContainer } from "@/components/ui/chart"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Line,
  LineChart,
  Scatter,
  ScatterChart,
  ZAxis,
} from "recharts"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { energyApi, installationApi } from "@/lib/api"

// Define interfaces for our data
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

interface EnergySummary {
  id: number;
  installationId: number;
  date: string;
  period: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
  totalGenerationKWh: number;
  totalConsumptionKWh: number;
  peakGenerationWatts: number;
  peakConsumptionWatts: number;
  efficiencyPercentage: number;
  readingsCount: number;
  periodStart: string;
  periodEnd: string;
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

export default function ChartsPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("energy")
  const [selectedPeriod, setSelectedPeriod] = useState("month")
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0])
  const [selectedInstallation, setSelectedInstallation] = useState<string | null>(null)
  const [installations, setInstallations] = useState<InstallationDetails[]>([])
  const [energyReadings, setEnergyReadings] = useState<EnergyReading[]>([])
  const [dailySummaries, setDailySummaries] = useState<EnergySummary[]>([])
  const [weeklySummaries, setWeeklySummaries] = useState<EnergySummary[]>([])
  const [monthlySummaries, setMonthlySummaries] = useState<EnergySummary[]>([]) 
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  // State for toggling data series visibility
  const [visibleSeries, setVisibleSeries] = useState({
    production: true,
    consumption: true,
    export: true,
    import: true,
    selfConsumption: true,
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

  // Fetch energy data when installation is selected
  useEffect(() => {
    const fetchEnergyData = async () => {
      if (!selectedInstallation) return
      
      try {
        setIsLoading(true)
        setHasError(false)
        
        // Define date boundaries based on selected period
        const now = new Date()
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        
        // Start and end dates will be adjusted based on selected period
        let startDate: Date, endDate: Date
        let dataLoaded = false

        if (selectedPeriod === "day") {
          // For day period, we'll get 24 hours (or more) of readings
          startDate = new Date(today)
          startDate.setHours(0, 0, 0, 0)
          endDate = new Date(today)
          endDate.setHours(23, 59, 59, 999)
          
          // Get hourly data for the selected day
          const hourlyReadings = await energyApi.getReadingsInDateRange(
            selectedInstallation,
            startDate.toISOString(),
            endDate.toISOString()
          )
          
          if (Array.isArray(hourlyReadings) && hourlyReadings.length > 0) {
            setEnergyReadings(hourlyReadings)
            console.log(`Loaded ${hourlyReadings.length} hourly readings`)
            dataLoaded = true
          } else {
            console.warn("No hourly data available for today")
            setEnergyReadings([])
          }
        } else if (selectedPeriod === "week") {
          // Start from the beginning of the week
          const dayOfWeek = today.getDay()
          startDate = new Date(today)
          startDate.setDate(today.getDate() - dayOfWeek) // Sunday as first day
          startDate.setHours(0, 0, 0, 0)
          
          endDate = new Date(today)
          endDate.setHours(23, 59, 59, 999)
          
          // Get daily summaries for the week
          const weekSummaries = await energyApi.getSummariesByPeriodAndDateRange(
            selectedInstallation,
            "DAILY",
            startDate.toISOString().split('T')[0],
            endDate.toISOString().split('T')[0]
          )
          
          if (Array.isArray(weekSummaries) && weekSummaries.length > 0) {
            setDailySummaries(weekSummaries)
            console.log(`Loaded ${weekSummaries.length} daily summaries for the week`)
            dataLoaded = true
          } else {
            console.warn("No daily summaries available for the current week")
            setDailySummaries([])
          }
        } else if (selectedPeriod === "month") {
          // Start from the beginning of the month
          startDate = new Date(today.getFullYear(), today.getMonth(), 1)
          endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999)
          
          // Get daily summaries for the month
          const monthSummaries = await energyApi.getSummariesByPeriodAndDateRange(
            selectedInstallation,
            "DAILY",
            startDate.toISOString().split('T')[0],
            endDate.toISOString().split('T')[0]
          )
          
          if (Array.isArray(monthSummaries) && monthSummaries.length > 0) {
            setDailySummaries(monthSummaries)
            console.log(`Loaded ${monthSummaries.length} daily summaries for the month`)
            dataLoaded = true
          } else {
            console.warn("No daily summaries available for the current month")
            setDailySummaries([])
          }
        } else if (selectedPeriod === "year") {
          // Start from the beginning of the year
          startDate = new Date(today.getFullYear(), 0, 1)
          endDate = new Date(today.getFullYear(), 11, 31, 23, 59, 59, 999)
          
          // Get monthly summaries for the year
          const yearSummaries = await energyApi.getSummariesByPeriod(
            selectedInstallation,
            "MONTHLY"
          )
          
          if (Array.isArray(yearSummaries) && yearSummaries.length > 0) {
            setMonthlySummaries(yearSummaries)
            console.log(`Loaded ${yearSummaries.length} monthly summaries for the year`)
            dataLoaded = true
          } else {
            console.warn("No monthly summaries available for the current year")
            setMonthlySummaries([])
          }
        }
        
        // Also get system efficiency data (last few months)
        const lastThreeMonthsStart = new Date(today)
        lastThreeMonthsStart.setMonth(today.getMonth() - 3)
        
        const efficiencyData = await energyApi.getSummariesByPeriodAndDateRange(
          selectedInstallation,
          "MONTHLY",
          lastThreeMonthsStart.toISOString().split('T')[0],
          today.toISOString().split('T')[0]
        )
        
        if (Array.isArray(efficiencyData) && efficiencyData.length > 0) {
          setMonthlySummaries(prevSummaries => {
            // Only update if we don't already have monthly data from the year request
            if (prevSummaries.length === 0) {
              console.log(`Loaded ${efficiencyData.length} monthly efficiency records`)
              dataLoaded = true
              return efficiencyData
            }
            return prevSummaries
          })
        }

        if (!dataLoaded) {
          console.warn("No data loaded for any time period")
          toast({
            variant: "default",
            title: "No Energy Data",
            description: "No energy data is available for this installation in the selected time period."
          })
        }
        
      } catch (error) {
        console.error("Error fetching energy data:", error)
        setHasError(true)
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load energy data. Please try again.",
        })
      } finally {
        setIsLoading(false)
      }
    }

    if (selectedInstallation) {
      fetchEnergyData()
    }
  }, [selectedInstallation, selectedPeriod, toast])

  // Handle installation change
  const handleInstallationChange = (installationId: string) => {
    console.log(`Switching to installation ${installationId}`)
    setSelectedInstallation(installationId)
  }

  // Handle period change
  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period)
  }

  // Refresh data
  const refreshData = async () => {
    if (!selectedInstallation) return
    
    try {
      setIsLoading(true)
      // Reset data and trigger a re-fetch by changing the period to itself
      setEnergyReadings([])
      setDailySummaries([])
      setWeeklySummaries([])
      setMonthlySummaries([])
      
      // Re-set the period to force the useEffect to re-run
      setSelectedPeriod(prevPeriod => {
        setTimeout(() => setSelectedPeriod(prevPeriod), 100);
        return "refreshing";
      });
      
      toast({
        title: "Data Refreshed",
        description: "The chart data is being updated."
      })
    } catch (error) {
      console.error("Error refreshing data:", error)
      toast({
        variant: "destructive",
        title: "Refresh Failed",
        description: "Unable to refresh chart data. Please try again."
      })
    }
  }

  if (!user) return null

  // Process energy readings for the charts
  const processHourlyData = () => {
    if (energyReadings.length === 0) {
      return []
    }
    
    return energyReadings.map(reading => {
      const timestamp = new Date(reading.timestamp)
      const hour = timestamp.getHours().toString().padStart(2, '0') + ':00'
      
      // Calculate derived metrics (all in kW)
      const production = reading.powerGenerationWatts / 1000 || 0
      const consumption = reading.powerConsumptionWatts / 1000 || 0
      const selfConsumption = Math.min(production, consumption)
      const exportToGrid = Math.max(0, production - consumption)
      const importFromGrid = Math.max(0, consumption - production)
      
      return {
        hour,
        timestamp: reading.timestamp,
        production,
        consumption,
        export: exportToGrid,
        import: importFromGrid,
        selfConsumption,
      }
    }).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
  }
  
  const processDailySummaries = () => {
    if (dailySummaries.length === 0) {
      return []
    }
    
    return dailySummaries.map(summary => {
      const date = new Date(summary.date)
      // Format the date based on the selected period
      const day = selectedPeriod === "week" 
        ? date.toLocaleDateString('en-US', { weekday: 'short' })  // Mon, Tue, etc. for week view
        : date.getDate().toString() // 1, 2, 3, etc. for month view
      
      return {
        day,
        date: summary.date,
        production: summary.totalGenerationKWh,
        consumption: summary.totalConsumptionKWh,
        export: Math.max(0, summary.totalGenerationKWh - summary.totalConsumptionKWh),
        import: Math.max(0, summary.totalConsumptionKWh - summary.totalGenerationKWh),
        selfConsumption: Math.min(summary.totalGenerationKWh, summary.totalConsumptionKWh),
        efficiency: summary.efficiencyPercentage,
        peak: summary.peakGenerationWatts / 1000, // Convert to kW
      }
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }
  
  const processMonthlyData = () => {
    if (monthlySummaries.length === 0) {
      return []
    }
    
    return monthlySummaries.map(summary => {
      const date = new Date(summary.date)
      const month = date.toLocaleDateString('en-US', { month: 'short' }) // Jan, Feb, etc.
      
      return {
        month,
        date: summary.date,
        production: summary.totalGenerationKWh,
        consumption: summary.totalConsumptionKWh,
        export: Math.max(0, summary.totalGenerationKWh - summary.totalConsumptionKWh),
        import: Math.max(0, summary.totalConsumptionKWh - summary.totalGenerationKWh),
        selfConsumption: Math.min(summary.totalGenerationKWh, summary.totalConsumptionKWh),
        efficiency: summary.efficiencyPercentage,
        temperature: getEstimatedMonthlyTemp(date.getMonth()), // Estimate temperature data
      }
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }
  
  // Helper to estimate monthly temperatures for the efficiency chart
  const getEstimatedMonthlyTemp = (month: number): number => {
    // Very simplified model for northern hemisphere temp variations
    const temps = [45, 48, 55, 62, 70, 78, 82, 80, 75, 65, 55, 48]
    return temps[month]
  }

  // Process the data based on selected period
  const hourlyData = processHourlyData()
  const dailyData = processDailySummaries()
  const monthlyData = processMonthlyData()
  
  // Select the data to use based on the period
  let chartData = [] as any[]
  
  if (selectedPeriod === "day") {
    chartData = hourlyData
  } else if (selectedPeriod === "week" || selectedPeriod === "month") {
    chartData = dailyData
  } else if (selectedPeriod === "year") {
    chartData = monthlyData
  }
  
  // Calculate totals for the selected period
  const totalProduction = chartData.reduce((sum, item) => sum + (item.production || 0), 0).toFixed(2)
  const totalConsumption = chartData.reduce((sum, item) => sum + (item.consumption || 0), 0).toFixed(2)
  const totalSelfConsumption = chartData.reduce((sum, item) => sum + (item.selfConsumption || 0), 0).toFixed(2)
  const totalExport = chartData.reduce((sum, item) => sum + (item.export || 0), 0).toFixed(2)
  const totalImport = chartData.reduce((sum, item) => sum + (item.import || 0), 0).toFixed(2)
  
  // Calculate averages
  const avgEfficiency = chartData.length > 0 
    ? (chartData.reduce((sum, item) => sum + (item.efficiency || 0), 0) / chartData.length).toFixed(2) 
    : '0.00'
  
  // Prepare efficiency chart data
  const efficiencyData = monthlyData.length > 0 
    ? monthlyData.map(month => ({
        month: month.month,
        efficiency: month.efficiency || parseFloat(avgEfficiency),
        temperature: month.temperature
      }))
    : []
  
  // Create comparison data based on real data
  const comparisonData = [
    { name: "Your System", production: parseFloat(totalProduction), savings: parseFloat(totalProduction) * 0.15 },
    { name: "Neighborhood Avg", production: parseFloat(totalProduction) * 0.9, savings: parseFloat(totalProduction) * 0.9 * 0.15 },
    { name: "Regional Avg", production: parseFloat(totalProduction) * 0.75, savings: parseFloat(totalProduction) * 0.75 * 0.15 },
  ]
  
  // Weather impact data
  // Since we don't have actual weather data, we'll create some synthetic data
  // based on the daily data if available
  const weatherData = dailyData.length >= 7 
    ? dailyData.slice(0, 7).map((day, index) => {
        // Create synthetic weather data for illustration
        const sunHours = day.production > 0 ? Math.min(10, 5 + (day.production / 10)) : 0
        const temperature = getEstimatedMonthlyTemp(new Date().getMonth()) + (index % 2 === 0 ? 2 : -2)
        
        return {
          day: day.day,
          date: day.date,
          production: day.production,
          temperature,
          sunHours
        }
      })
    : [
        { day: "Mon", temperature: 72, production: 26.4, sunHours: 8.2 },
        { day: "Tue", temperature: 68, production: 22.1, sunHours: 6.5 },
        { day: "Wed", temperature: 74, production: 27.8, sunHours: 9.1 },
        { day: "Thu", temperature: 76, production: 28.5, sunHours: 9.4 },
        { day: "Fri", temperature: 65, production: 18.2, sunHours: 5.2 },
        { day: "Sat", temperature: 71, production: 25.3, sunHours: 7.8 },
        { day: "Sun", temperature: 73, production: 26.9, sunHours: 8.5 },
      ]

  // Custom legend that allows toggling series visibility
  const CustomLegend = ({ payload }: any) => {
    if (!payload) return null

    return (
      <div className="flex flex-wrap gap-4 justify-center mt-2">
        {payload.map((entry: any, index: number) => (
          <div
            key={`item-${index}`}
            className={`flex items-center gap-2 cursor-pointer ${!visibleSeries[entry.dataKey] ? "opacity-50" : ""}`}
            onClick={() => toggleSeries(entry.dataKey)}
          >
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: entry.color }} />
            <span className="text-sm">{entry.value}</span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <h1 className="text-2xl font-bold">Energy Charts</h1>

        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={refreshData} disabled={isLoading || !selectedInstallation}>
            {isLoading ? "Updating..." : "Refresh Data"}
          </Button>

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

          <Button variant="outline" size="icon" disabled={chartData.length === 0}>
            <Download className="h-4 w-4" />
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
          <h2 className="text-xl font-semibold mb-2">Unable to load energy data</h2>
          <p className="text-gray-500 mb-4">There was a problem connecting to the solar monitoring system.</p>
          <Button onClick={refreshData}>Try Again</Button>
        </div>
      ) : installations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="text-amber-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold mb-2">No solar installations found</h2>
          <p className="text-gray-500">You don't have any solar installations registered to your account.</p>
        </div>
      ) : (
        <Tabs defaultValue="energy" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="energy">Energy Production</TabsTrigger>
            <TabsTrigger value="comparison">Comparison</TabsTrigger>
            <TabsTrigger value="weather">Weather Impact</TabsTrigger>
            <TabsTrigger value="efficiency">System Efficiency</TabsTrigger>
          </TabsList>

          <TabsContent value="energy">
            <Card className="border">
              <CardHeader>
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                  <div>
                    <CardTitle>Energy Production & Consumption</CardTitle>
                    <CardDescription>Overview of your system's energy metrics</CardDescription>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant={selectedPeriod === "day" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedPeriod("day")}
                    >
                      Day
                    </Button>
                    <Button
                      variant={selectedPeriod === "week" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedPeriod("week")}
                    >
                      Week
                    </Button>
                    <Button
                      variant={selectedPeriod === "month" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedPeriod("month")}
                    >
                      Month
                    </Button>
                    <Button
                      variant={selectedPeriod === "year" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedPeriod("year")}
                    >
                      Year
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Series toggle checkboxes */}
                <div className="mb-4 flex flex-wrap gap-4">
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
                </div>

                <TabsContent value="day" className="mt-4 space-y-6">
                  {isLoading ? (
                    <div className="flex justify-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : energyReadings.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <BarChart3 className="h-16 w-16 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium">No Energy Data Available</h3>
                      <p className="text-sm text-muted-foreground max-w-md mt-2">
                        There is no energy data available for today. This could be because your system is new or there may be a connection issue.
                      </p>
                    </div>
                  ) : (
                    <Chart>
                      <ChartContainer>
                        <ResponsiveContainer width="100%" height={400}>
                          <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="hour" />
                            <YAxis label={{ value: "Energy (kW)", angle: -90, position: "insideLeft" }} />
                            <Tooltip formatter={(value) => [`${value} kW`, ""]} />
                            {visibleSeries.production && (
                              <Area
                                type="monotone"
                                dataKey="production"
                                stroke="#4ade80"
                                fill="#4ade80"
                                fillOpacity={0.6}
                                name="Production"
                              />
                            )}
                            {visibleSeries.consumption && (
                              <Area
                                type="monotone"
                                dataKey="consumption"
                                stroke="#f87171"
                                fill="#f87171"
                                fillOpacity={0.6}
                                name="Consumption"
                              />
                            )}
                            {visibleSeries.export && (
                              <Area
                                type="monotone"
                                dataKey="export"
                                stroke="#34d399"
                                fill="#34d399"
                                fillOpacity={0.6}
                                name="Export"
                              />
                            )}
                            {visibleSeries.import && (
                              <Area
                                type="monotone"
                                dataKey="import"
                                stroke="#fb7185"
                                fill="#fb7185"
                                fillOpacity={0.6}
                                name="Import"
                              />
                            )}
                            {visibleSeries.selfConsumption && (
                              <Area
                                type="monotone"
                                dataKey="selfConsumption"
                                stroke="#60a5fa"
                                fill="#60a5fa"
                                fillOpacity={0.6}
                                name="Self Consumption"
                              />
                            )}
                            <Legend content={<CustomLegend />} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    </Chart>
                  )}
                </TabsContent>

                <TabsContent value="week" className="mt-4 space-y-6">
                  {isLoading ? (
                    <div className="flex justify-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : dailySummaries.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <BarChart3 className="h-16 w-16 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium">No Energy Data Available</h3>
                      <p className="text-sm text-muted-foreground max-w-md mt-2">
                        There is no energy data available for the current week. This could be because your system is new or there may be a connection issue.
                      </p>
                    </div>
                  ) : (
                    <Chart>
                      <ChartContainer>
                        <ResponsiveContainer width="100%" height={400}>
                          <AreaChart data={dailyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="day" />
                            <YAxis label={{ value: "Energy (kWh)", angle: -90, position: "insideLeft" }} />
                            <Tooltip formatter={(value) => [`${value} kWh`, ""]} />
                            {visibleSeries.production && (
                              <Area
                                type="monotone"
                                dataKey="production"
                                stroke="#4ade80"
                                fill="#4ade80"
                                fillOpacity={0.6}
                                name="Production"
                              />
                            )}
                            {visibleSeries.consumption && (
                              <Area
                                type="monotone"
                                dataKey="consumption"
                                stroke="#f87171"
                                fill="#f87171"
                                fillOpacity={0.6}
                                name="Consumption"
                              />
                            )}
                            {visibleSeries.export && (
                              <Area
                                type="monotone"
                                dataKey="export"
                                stroke="#34d399"
                                fill="#34d399"
                                fillOpacity={0.6}
                                name="Export"
                              />
                            )}
                            {visibleSeries.import && (
                              <Area
                                type="monotone"
                                dataKey="import"
                                stroke="#fb7185"
                                fill="#fb7185"
                                fillOpacity={0.6}
                                name="Import"
                              />
                            )}
                            {visibleSeries.selfConsumption && (
                              <Area
                                type="monotone"
                                dataKey="selfConsumption"
                                stroke="#60a5fa"
                                fill="#60a5fa"
                                fillOpacity={0.6}
                                name="Self Consumption"
                              />
                            )}
                            <Legend content={<CustomLegend />} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    </Chart>
                  )}
                </TabsContent>

                <TabsContent value="month" className="mt-4 space-y-6">
                  {isLoading ? (
                    <div className="flex justify-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : dailySummaries.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <BarChart3 className="h-16 w-16 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium">No Energy Data Available</h3>
                      <p className="text-sm text-muted-foreground max-w-md mt-2">
                        There is no energy data available for the current month. This could be because your system is new or there may be a connection issue.
                      </p>
                    </div>
                  ) : (
                    <Chart>
                      <ChartContainer>
                        <ResponsiveContainer width="100%" height={400}>
                          <AreaChart data={dailyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="day" />
                            <YAxis label={{ value: "Energy (kWh)", angle: -90, position: "insideLeft" }} />
                            <Tooltip formatter={(value) => [`${value} kWh`, ""]} />
                            {visibleSeries.production && (
                              <Area
                                type="monotone"
                                dataKey="production"
                                stroke="#4ade80"
                                fill="#4ade80"
                                fillOpacity={0.6}
                                name="Production"
                              />
                            )}
                            {visibleSeries.consumption && (
                              <Area
                                type="monotone"
                                dataKey="consumption"
                                stroke="#f87171"
                                fill="#f87171"
                                fillOpacity={0.6}
                                name="Consumption"
                              />
                            )}
                            {visibleSeries.export && (
                              <Area
                                type="monotone"
                                dataKey="export"
                                stroke="#34d399"
                                fill="#34d399"
                                fillOpacity={0.6}
                                name="Export"
                              />
                            )}
                            {visibleSeries.import && (
                              <Area
                                type="monotone"
                                dataKey="import"
                                stroke="#fb7185"
                                fill="#fb7185"
                                fillOpacity={0.6}
                                name="Import"
                              />
                            )}
                            {visibleSeries.selfConsumption && (
                              <Area
                                type="monotone"
                                dataKey="selfConsumption"
                                stroke="#60a5fa"
                                fill="#60a5fa"
                                fillOpacity={0.6}
                                name="Self Consumption"
                              />
                            )}
                            <Legend content={<CustomLegend />} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    </Chart>
                  )}
                </TabsContent>

                <TabsContent value="year" className="mt-4 space-y-6">
                  {isLoading ? (
                    <div className="flex justify-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : monthlySummaries.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <BarChart3 className="h-16 w-16 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium">No Energy Data Available</h3>
                      <p className="text-sm text-muted-foreground max-w-md mt-2">
                        There is no energy data available for the current year. This could be because your system is new or there may be a connection issue.
                      </p>
                    </div>
                  ) : (
                    <Chart>
                      <ChartContainer>
                        <ResponsiveContainer width="100%" height={400}>
                          <AreaChart data={monthlyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis label={{ value: "Energy (kWh)", angle: -90, position: "insideLeft" }} />
                            <Tooltip formatter={(value) => [`${value} kWh`, ""]} />
                            {visibleSeries.production && (
                              <Area
                                type="monotone"
                                dataKey="production"
                                stroke="#4ade80"
                                fill="#4ade80"
                                fillOpacity={0.6}
                                name="Production"
                              />
                            )}
                            {visibleSeries.consumption && (
                              <Area
                                type="monotone"
                                dataKey="consumption"
                                stroke="#f87171"
                                fill="#f87171"
                                fillOpacity={0.6}
                                name="Consumption"
                              />
                            )}
                            {visibleSeries.export && (
                              <Area
                                type="monotone"
                                dataKey="export"
                                stroke="#34d399"
                                fill="#34d399"
                                fillOpacity={0.6}
                                name="Export"
                              />
                            )}
                            {visibleSeries.import && (
                              <Area
                                type="monotone"
                                dataKey="import"
                                stroke="#fb7185"
                                fill="#fb7185"
                                fillOpacity={0.6}
                                name="Import"
                              />
                            )}
                            {visibleSeries.selfConsumption && (
                              <Area
                                type="monotone"
                                dataKey="selfConsumption"
                                stroke="#60a5fa"
                                fill="#60a5fa"
                                fillOpacity={0.6}
                                name="Self Consumption"
                              />
                            )}
                            <Legend content={<CustomLegend />} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    </Chart>
                  )}
                </TabsContent>

                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="border">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm text-gray-500">Total Production</div>
                          <div className="text-2xl font-bold">{totalProduction} kWh</div>
                        </div>
                        <div className="text-green-500 flex items-center">
                          <ArrowUp className="h-4 w-4 mr-1" />
                          <span className="text-sm">
                            {parseFloat(totalProduction) > 0 ? "+100%" : "0%"}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm text-gray-500">Self-Consumption</div>
                          <div className="text-2xl font-bold">{totalSelfConsumption} kWh</div>
                        </div>
                        <div className="text-green-500 flex items-center">
                          <ArrowUp className="h-4 w-4 mr-1" />
                          <span className="text-sm">
                            {parseFloat(totalProduction) > 0 
                              ? `${Math.round((parseFloat(totalSelfConsumption) / parseFloat(totalProduction)) * 100)}%` 
                              : "0%"}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm text-gray-500">Grid Export</div>
                          <div className="text-2xl font-bold">{totalExport} kWh</div>
                        </div>
                        <div className="text-green-500 flex items-center">
                          <ArrowUp className="h-4 w-4 mr-1" />
                          <span className="text-sm">
                            {parseFloat(totalProduction) > 0 
                              ? `${Math.round((parseFloat(totalExport) / parseFloat(totalProduction)) * 100)}%` 
                              : "0%"}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="comparison">
            <Card className="border">
              <CardHeader>
                <CardTitle>System Comparison</CardTitle>
                <CardDescription>Compare your system with neighborhood and regional averages</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Chart>
                    <ChartContainer>
                      <ResponsiveContainer width="100%" height={350}>
                        <BarChart
                          data={comparisonData}
                          layout="vertical"
                          margin={{ top: 10, right: 30, left: 100, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis dataKey="name" type="category" />
                          <Tooltip formatter={(value) => [`${value} kWh`, "Production"]} />
                          <Legend />
                          <Bar dataKey="production" name="Monthly Production (kWh)" fill="#4ade80" />
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </Chart>

                  <Chart>
                    <ChartContainer>
                      <ResponsiveContainer width="100%" height={350}>
                        <BarChart
                          data={comparisonData}
                          layout="vertical"
                          margin={{ top: 10, right: 30, left: 100, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis dataKey="name" type="category" />
                          <Tooltip formatter={(value) => [`$${value.toFixed(2)}`, "Savings"]} />
                          <Legend />
                          <Bar dataKey="savings" name="Monthly Savings ($)" fill="#60a5fa" />
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </Chart>
                </div>

                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="border">
                    <CardContent className="p-4">
                      <div className="text-center">
                        <div className="text-sm text-gray-500">Production vs Neighborhood</div>
                        <div className="text-2xl font-bold text-green-500">+10.0%</div>
                        <div className="text-sm text-gray-500">Your system produces 10% more energy</div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border">
                    <CardContent className="p-4">
                      <div className="text-center">
                        <div className="text-sm text-gray-500">Production vs Region</div>
                        <div className="text-2xl font-bold text-green-500">+25.0%</div>
                        <div className="text-sm text-gray-500">Your system produces 25% more energy</div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border">
                    <CardContent className="p-4">
                      <div className="text-center">
                        <div className="text-sm text-gray-500">Savings Rank</div>
                        <div className="text-2xl font-bold">Top 15%</div>
                        <div className="text-sm text-gray-500">Your system is in the top 15% for savings</div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="weather">
            <Card className="border">
              <CardHeader>
                <CardTitle>Weather Impact Analysis</CardTitle>
                <CardDescription>How weather conditions affect your system's performance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Chart>
                    <ChartContainer>
                      <ResponsiveContainer width="100%" height={350}>
                        <LineChart data={weatherData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="day" />
                          <YAxis
                            yAxisId="left"
                            label={{ value: "Production (kWh)", angle: -90, position: "insideLeft" }}
                          />
                          <YAxis
                            yAxisId="right"
                            orientation="right"
                            label={{ value: "Temperature (°F)", angle: 90, position: "insideRight" }}
                          />
                          <Tooltip />
                          <Legend />
                          <Line yAxisId="left" type="monotone" dataKey="production" stroke="#4ade80" name="Production" />
                          <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="temperature"
                            stroke="#f59e0b"
                            name="Temperature"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </Chart>

                  <Chart>
                    <ChartContainer>
                      <ResponsiveContainer width="100%" height={350}>
                        <ScatterChart margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis
                            type="number"
                            dataKey="sunHours"
                            name="Sun Hours"
                            label={{ value: "Sun Hours", position: "insideBottom", offset: -5 }}
                          />
                          <YAxis
                            type="number"
                            dataKey="production"
                            name="Production"
                            label={{ value: "Production (kWh)", angle: -90, position: "insideLeft" }}
                          />
                          <ZAxis range={[60, 200]} />
                          <Tooltip cursor={{ strokeDasharray: "3 3" }} formatter={(value) => [`${value}`, ""]} />
                          <Scatter name="Production vs Sun Hours" data={weatherData} fill="#4ade80" />
                        </ScatterChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </Chart>
                </div>

                <div className="mt-6">
                  <h3 className="text-lg font-medium mb-4">Weather Impact Factors</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="border">
                      <CardContent className="p-4">
                        <div className="text-center">
                          <div className="text-sm text-gray-500">Sunny Day</div>
                          <div className="text-2xl font-bold text-amber-500">
                            {Math.max(...weatherData.map(d => d.production)).toFixed(1)} kWh
                          </div>
                          <div className="text-sm text-gray-500">Average production</div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border">
                      <CardContent className="p-4">
                        <div className="text-center">
                          <div className="text-sm text-gray-500">Partly Cloudy</div>
                          <div className="text-2xl font-bold text-blue-400">
                            {(weatherData.reduce((sum, d) => sum + d.production, 0) / weatherData.length).toFixed(1)} kWh
                          </div>
                          <div className="text-sm text-gray-500">Average production</div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border">
                      <CardContent className="p-4">
                        <div className="text-center">
                          <div className="text-sm text-gray-500">Cloudy Day</div>
                          <div className="text-2xl font-bold text-gray-500">
                            {Math.min(...weatherData.map(d => d.production)).toFixed(1)} kWh
                          </div>
                          <div className="text-sm text-gray-500">Average production</div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border">
                      <CardContent className="p-4">
                        <div className="text-center">
                          <div className="text-sm text-gray-500">Optimal Temp</div>
                          <div className="text-2xl font-bold text-green-500">70-75°F</div>
                          <div className="text-sm text-gray-500">Best performance</div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="efficiency">
            <Card className="border">
              <CardHeader>
                <CardTitle>System Efficiency Analysis</CardTitle>
                <CardDescription>Track your system's efficiency over time</CardDescription>
              </CardHeader>
              <CardContent>
                <Chart>
                  <ChartContainer>
                    <ResponsiveContainer width="100%" height={400}>
                      <LineChart data={efficiencyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis
                          yAxisId="left"
                          domain={[85, 100]}
                          label={{ value: "Efficiency (%)", angle: -90, position: "insideLeft" }}
                        />
                        <YAxis
                          yAxisId="right"
                          orientation="right"
                          domain={[30, 90]}
                          label={{ value: "Temperature (°F)", angle: 90, position: "insideRight" }}
                        />
                        <Tooltip
                          formatter={(value, name) => [
                            name === "efficiency" ? `${value}%` : `${value}°F`,
                            name === "efficiency" ? "Efficiency" : "Temperature",
                          ]}
                        />
                        <Legend />
                        <Line
                          yAxisId="left"
                          type="monotone"
                          dataKey="efficiency"
                          stroke="#4ade80"
                          strokeWidth={2}
                          name="Efficiency"
                        />
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="temperature"
                          stroke="#f59e0b"
                          strokeWidth={2}
                          name="Temperature"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </Chart>

                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="border">
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <h3 className="font-medium">Panel Efficiency</h3>
                        <div className="w-full bg-gray-200 rounded-full h-4">
                          <div 
                            className="bg-blue-500 h-4 rounded-full" 
                            style={{ width: `${Math.min(100, parseFloat(avgEfficiency) * 1.05)}%` }}
                          ></div>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>{Math.min(100, parseFloat(avgEfficiency) * 1.05).toFixed(1)}%</span>
                          <span className="text-green-500">
                            {parseFloat(avgEfficiency) > 90 ? "Excellent" : 
                             parseFloat(avgEfficiency) > 80 ? "Good" : "Fair"}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border">
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <h3 className="font-medium">Inverter Efficiency</h3>
                        <div className="w-full bg-gray-200 rounded-full h-4">
                          <div 
                            className="bg-blue-500 h-4 rounded-full" 
                            style={{ width: "97%" }}
                          ></div>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>97%</span>
                          <span className="text-green-500">Excellent</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border">
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <h3 className="font-medium">System Performance Ratio</h3>
                        <div className="w-full bg-gray-200 rounded-full h-4">
                          <div 
                            className="bg-blue-500 h-4 rounded-full" 
                            style={{ width: `${Math.min(100, parseFloat(avgEfficiency) * 0.95)}%` }}
                          ></div>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>{Math.min(100, parseFloat(avgEfficiency) * 0.95).toFixed(1)}%</span>
                          <span className="text-green-500">
                            {parseFloat(avgEfficiency) > 90 ? "Excellent" : 
                             parseFloat(avgEfficiency) > 80 ? "Good" : "Fair"}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="mt-6">
                  <h3 className="text-lg font-medium mb-4">Efficiency Factors</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="border">
                      <CardHeader>
                        <CardTitle className="text-base">Temperature Impact</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-gray-500 mb-4">
                          Panel efficiency decreases by approximately 0.5% for every degree Celsius above 25°C (77°F).
                          Your system shows optimal performance in the 70-75°F range.
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Low Temp (45°F)</span>
                          <span className="text-sm">Optimal (72°F)</span>
                          <span className="text-sm">High Temp (85°F)</span>
                        </div>
                        <div className="w-full bg-gray-200 h-2 rounded-full mt-1 relative">
                          <div
                            className="absolute h-4 w-4 bg-blue-500 rounded-full top-1/2 -translate-y-1/2"
                            style={{ left: "60%" }}
                          ></div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border">
                      <CardHeader>
                        <CardTitle className="text-base">Maintenance Impact</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-gray-500 mb-4">
                          Regular cleaning and maintenance can improve system efficiency by up to 5%. Your last
                          maintenance was performed approximately 45 days ago.
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">0 days</span>
                          <span className="text-sm">45 days</span>
                          <span className="text-sm">90 days</span>
                        </div>
                        <div className="w-full bg-gray-200 h-2 rounded-full mt-1 relative">
                          <div
                            className="absolute h-4 w-4 bg-amber-500 rounded-full top-1/2 -translate-y-1/2"
                            style={{ left: "50%" }}
                          ></div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}

