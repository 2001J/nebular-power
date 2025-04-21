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
  const [energyData, setEnergyData] = useState([])
  const [installations, setInstallations] = useState([])
  const [topProducers, setTopProducers] = useState([])
  const [systemOverview, setSystemOverview] = useState(null)
  const [totalProductionToday, setTotalProductionToday] = useState(0)
  const [totalProductionMonth, setTotalProductionMonth] = useState(0)
  const [totalProductionYear, setTotalProductionYear] = useState(0)
  const [averageEfficiency, setAverageEfficiency] = useState(0)

  // Load energy data
  useEffect(() => {
    const fetchEnergyData = async () => {
      try {
        setLoading(true)

        // Get system overview data
        const systemResponse = await energyApi.getSystemOverview()

        if (systemResponse) {
          setSystemOverview(systemResponse)
          setInstallations(systemResponse.recentlyActiveInstallations || [])

          // Set dashboard metrics from the response
          setTotalProductionToday(systemResponse.todayTotalGenerationKWh || 0)
          setTotalProductionMonth(systemResponse.monthToDateGenerationKWh || 0)
          setTotalProductionYear(systemResponse.yearToDateGenerationKWh || 0)
          setAverageEfficiency(systemResponse.averageSystemEfficiency || 0)

          // Extract energy data from the system overview
          // This uses the data already available in the system overview response
          // instead of making a separate call to getSystemEnergyData
          if (systemResponse.energyData && systemResponse.energyData[timeRange]) {
            setEnergyData(systemResponse.energyData[timeRange])
          } else if (systemResponse.energyDataByTimeRange && systemResponse.energyDataByTimeRange[timeRange]) {
            // Alternative property name
            setEnergyData(systemResponse.energyDataByTimeRange[timeRange])
          } else {
            // If no specific time range data is available, use a default empty array
            setEnergyData([])
          }

          // Get top producing installations
          // Use data from the system overview instead of making a separate call
          if (systemResponse.topProducingInstallations && Array.isArray(systemResponse.topProducingInstallations)) {
            setTopProducers(systemResponse.topProducingInstallations.slice(0, 5))
          } else {
            // If no top producers in the overview, use the active installations as fallback
            const sortedInstallations = [...(systemResponse.recentlyActiveInstallations || [])]
              .sort((a, b) => (b.totalProduction || 0) - (a.totalProduction || 0))
              .slice(0, 5)
            setTopProducers(sortedInstallations)
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

    fetchEnergyData()

    // Set up websocket connection for real-time updates
    let wsConnection = null

    try {
      wsConnection = energyWebSocket.createSystemMonitor(
        // Message handler
        (data) => {
          if (data.type === 'ENERGY_UPDATE') {
            // Update real-time metrics
            if (data.payload.currentSystemGenerationWatts) {
              setSystemOverview(prev => ({
                ...prev,
                currentSystemGenerationWatts: data.payload.currentSystemGenerationWatts
              }))
            }

            if (data.payload.todayTotalGenerationKWh) {
              setTotalProductionToday(data.payload.todayTotalGenerationKWh)
            }

            // Add new data point to charts if in day view
            if (timeRange === 'day' && data.payload.timestamp) {
              setEnergyData(prev => {
                const newData = [...prev]
                const hour = new Date(data.payload.timestamp).getHours()
                const existingIndex = newData.findIndex(item =>
                  item.time && item.time.includes(`${hour}:`))

                if (existingIndex >= 0) {
                  // Update existing data point
                  newData[existingIndex] = {
                    ...newData[existingIndex],
                    production: data.payload.powerGenerationWatts / 1000,
                    consumption: data.payload.powerConsumptionWatts / 1000
                  }
                }

                return newData
              })
            }
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

    // Clean up WebSocket connection on unmount
    return () => {
      if (wsConnection) {
        wsConnection.close()
      }
    }
  }, [timeRange, toast])

  // Format number with unit
  const formatEnergyValue = (value) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(2)} GWh`
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(2)} MWh`
    } else {
      return `${value.toFixed(2)} kWh`
    }
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
            setLoading(true);
            // Refresh data
            setTimeout(async () => {
              try {
                // Get system overview data
                const systemResponse = await energyApi.getSystemOverview();
                if (systemResponse) {
                  setSystemOverview(systemResponse);
                  setInstallations(systemResponse.recentlyActiveInstallations || []);
                  setTotalProductionToday(systemResponse.todayTotalGenerationKWh || 0);
                  setTotalProductionMonth(systemResponse.monthToDateGenerationKWh || 0);
                  setTotalProductionYear(systemResponse.yearToDateGenerationKWh || 0);
                  setAverageEfficiency(systemResponse.averageSystemEfficiency || 0);

                  // Extract energy data from the system overview
                  if (systemResponse.energyData && systemResponse.energyData[timeRange]) {
                    setEnergyData(systemResponse.energyData[timeRange]);
                  } else if (systemResponse.energyDataByTimeRange && systemResponse.energyDataByTimeRange[timeRange]) {
                    setEnergyData(systemResponse.energyDataByTimeRange[timeRange]);
                  } else {
                    setEnergyData([]);
                  }

                  // Get top producing installations from system overview
                  if (systemResponse.topProducingInstallations && Array.isArray(systemResponse.topProducingInstallations)) {
                    setTopProducers(systemResponse.topProducingInstallations.slice(0, 5));
                  } else {
                    const sortedInstallations = [...(systemResponse.recentlyActiveInstallations || [])]
                      .sort((a, b) => (b.totalProduction || 0) - (a.totalProduction || 0))
                      .slice(0, 5);
                    setTopProducers(sortedInstallations);
                  }
                }

                toast({
                  title: "Data refreshed",
                  description: "Energy monitoring data has been updated."
                });
              } catch (error) {
                console.error("Error refreshing data:", error);
                toast({
                  variant: "destructive",
                  title: "Error",
                  description: "Failed to refresh energy monitoring data."
                });
              } finally {
                setLoading(false);
              }
            }, 300);
          }}>
            <RefreshCw className="h-4 w-4" />
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
            <div className="text-2xl font-bold">{totalProductionToday.toFixed(1)} kWh</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-emerald-500 flex items-center">
                <ArrowUp className="mr-1 h-4 w-4" />
                {systemOverview?.dailyChangePercentage ? `+${systemOverview.dailyChangePercentage}%` : "Data unavailable"}
              </span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Monthly Production</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProductionMonth.toFixed(1)} kWh</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-emerald-500 flex items-center">
                <ArrowUp className="mr-1 h-4 w-4" />
                {systemOverview?.monthlyChangePercentage ? `+${systemOverview.monthlyChangePercentage}%` : "Data unavailable"}
              </span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Annual Production</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProductionYear.toFixed(1)} kWh</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-emerald-500 flex items-center">
                <ArrowUp className="mr-1 h-4 w-4" />
                {systemOverview?.yearlyChangePercentage ? `+${systemOverview.yearlyChangePercentage}%` : "Data unavailable"}
              </span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Average Efficiency</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageEfficiency.toFixed(1)}%</div>
            <div className="mt-2 h-2 w-full bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${averageEfficiency >= 85 ? 'bg-green-500' :
                  averageEfficiency >= 70 ? 'bg-green-400' :
                    averageEfficiency >= 60 ? 'bg-amber-500' : 'bg-red-500'
                  }`}
                style={{ width: `${averageEfficiency}%` }}
              ></div>
            </div>
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
                      router.push(`/admin/energy/installation/${installation.id || index + 1}`)
                    }>
                      <TableCell className="font-medium whitespace-nowrap">
                        {installation.name || `Installation #${installation.id || index + 1}`}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{installation.customerName || "N/A"}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        {installation.location || "N/A"}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-center">
                        <Badge variant="outline">
                          {installation.type || "Unknown"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {installation.totalProduction ? `${installation.totalProduction} kWh` : "No data"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span>{installation.efficiency ? `${installation.efficiency}%` : "N/A"}</span>
                          <Sun className="h-4 w-4 text-amber-500" />
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