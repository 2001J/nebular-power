"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  Sun,
  Battery,
  Calendar,
  Download,
  LineChart as LineChartIcon,
  AlertTriangle,
  ArrowLeft,
  RefreshCw,
  Zap,
  User,
  MapPin
} from "lucide-react"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { installationApi, energyApi } from "@/lib/api"
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
} from "recharts"
import { formatEnergyValue } from "@/lib/utils"
import { energyWebSocket } from "@/lib/energyWebSocket"

export default function InstallationDetailPage() {
  const params = useParams()
  const installationId = params.id as string
  const router = useRouter()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState("day")
  const [installation, setInstallation] = useState(null)
  const [energyData, setEnergyData] = useState([])

  // Define fetchInstallationData outside of useEffect so it can be called from other places
  const fetchInstallationData = async () => {
    try {
      setLoading(true)

      // Fetch installation details
      const installationData = await installationApi.getInstallationDetails(installationId)
      if (installationData) {
        setInstallation(installationData)
      } else {
        setInstallation(null)
        toast({
          variant: "destructive",
          title: "Installation Not Found",
          description: "The requested installation could not be found.",
        })
        setLoading(false)
        return
      }

      // Fetch energy readings
      const today = new Date()
      let startDate, endDate

      switch (timeRange) {
        case "day":
          startDate = new Date(today)
          startDate.setHours(0, 0, 0, 0)
          endDate = new Date(today)
          endDate.setHours(23, 59, 59, 999)
          break
        case "week":
          startDate = new Date(today)
          startDate.setDate(today.getDate() - 7)
          endDate = new Date(today)
          break
        case "month":
          startDate = new Date(today)
          startDate.setMonth(today.getMonth() - 1)
          endDate = new Date(today)
          break
        case "year":
          startDate = new Date(today)
          startDate.setFullYear(today.getFullYear() - 1)
          endDate = new Date(today)
          break
        default:
          startDate = new Date(today)
          startDate.setHours(0, 0, 0, 0)
          endDate = new Date(today)
          endDate.setHours(23, 59, 59, 999)
      }

      const formattedStartDate = startDate.toISOString().split('T')[0]
      const formattedEndDate = endDate.toISOString().split('T')[0]

      // Fetch energy readings
      const readingsData = await energyApi.getReadingsHistory(
        installationId,
        formattedStartDate,
        formattedEndDate
      )

      if (readingsData && Array.isArray(readingsData)) {
        setEnergyData(readingsData)
      } else {
        // Set empty array if no data available
        setEnergyData([])
      }
    } catch (error) {
      console.error("Error fetching installation data:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load installation data from the server."
      })

      // Set to empty/null values instead of using sample data
      setInstallation(null)
      setEnergyData([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInstallationData()

    // Setup WebSocket for real-time updates
    let wsConnection = null

    try {
      wsConnection = energyWebSocket.createInstallationMonitor(
        installationId,
        // Message handler
        (data) => {
          if (data.type === 'ENERGY_READING') {
            // Update real-time data
            const newReading = {
              timestamp: data.timestamp,
              powerGenerationWatts: data.powerGenerationWatts,
              powerConsumptionWatts: data.powerConsumptionWatts,
              dailyYieldKWh: data.dailyYieldKWh,
              totalYieldKWh: data.totalYieldKWh
            }

            // Add to energy data if in day view
            if (timeRange === 'day' && data.payload.timestamp) {
              setEnergyData(prev => {
                // Find if we have a reading for this hour
                const time = new Date(data.payload.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit'
                })
                const existingIndex = prev.findIndex(item => item.time === time)

                if (existingIndex >= 0) {
                  // Update existing data point
                  const newData = [...prev]
                  newData[existingIndex] = {
                    ...newData[existingIndex],
                    production: data.powerGenerationWatts / 1000,
                    consumption: data.powerConsumptionWatts / 1000
                  }
                  return newData
                } else {
                  // Add new data point
                  return [...prev, {
                    time,
                    production: data.powerGenerationWatts / 1000,
                    consumption: data.powerConsumptionWatts / 1000
                  }].sort((a, b) => {
                    const timeA = new Date(`1970/01/01 ${a.time}`)
                    const timeB = new Date(`1970/01/01 ${b.time}`)
                    return timeA - timeB
                  })
                }
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
  }, [installationId, timeRange, toast])

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
    link.setAttribute('download', `installation_${installationId}_energy_data_${timeRange}_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast({
      title: "Export successful",
      description: `Exported installation ${installationId} energy data to CSV file.`,
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
                <BreadcrumbLink href="/admin/energy">Energy Monitoring</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Installation Details</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => router.back()} className="mr-2">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              {loading ? "Loading..." : installation?.name || `Installation #${installationId}`}
            </h1>
            {installation?.status && (
              <Badge className={
                installation.status === "Active" ? "bg-green-500" :
                  installation.status === "Maintenance" ? "bg-amber-500" :
                    installation.status === "Inactive" ? "bg-red-500" :
                      "bg-gray-500"
              }>
                {installation.status}
              </Badge>
            )}
          </div>
          {installation && (
            <p className="text-muted-foreground flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              {installation.location || "No location data"}
              {installation.customerName && (
                <>
                  <span className="mx-1">•</span>
                  <User className="h-4 w-4" />
                  {installation.customerName}
                </>
              )}
              {installation.capacity && (
                <>
                  <span className="mx-1">•</span>
                  <Zap className="h-4 w-4" />
                  {installation.capacity}
                </>
              )}
            </p>
          )}
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
            setTimeout(() => {
              fetchInstallationData();
            }, 300);
          }}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleExportData} disabled={energyData.length === 0}>
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : installation === null ? (
        <Card>
          <CardContent className="p-16 flex flex-col items-center justify-center text-center">
            <AlertTriangle className="h-16 w-16 text-amber-500 mb-6" />
            <h2 className="text-2xl font-bold mb-2">Installation Not Found</h2>
            <p className="text-muted-foreground mb-6 max-w-md">
              The installation with ID "{installationId}" could not be found or may have been removed.
            </p>
            <div className="flex gap-4">
              <Button variant="outline" onClick={() => router.back()}>
                Go Back
              </Button>
              <Button onClick={() => router.push('/admin/installations/create')}>
                Create New Installation
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Energy Charts */}
          <div className="grid grid-cols-1 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Energy Generation & Consumption</CardTitle>
                <CardDescription>
                  {timeRange === "day" ? "Hourly energy production and consumption for today" :
                    timeRange === "week" ? "Daily energy production and consumption for the past week" :
                      timeRange === "month" ? "Daily energy production and consumption for the past month" :
                        "Monthly energy production and consumption for the past year"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {energyData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <LineChartIcon className="h-16 w-16 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium">No Energy Data Available</h3>
                    <p className="text-sm text-muted-foreground max-w-md mt-2">
                      There is no energy data available for this installation during the selected time range.
                    </p>
                  </div>
                ) : (
                  <Chart>
                    <ChartContainer>
                      <ResponsiveContainer width="100%" height={400}>
                        <AreaChart data={energyData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                          <defs>
                            <linearGradient id="colorProduction" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorConsumption" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                          <XAxis
                            dataKey={timeRange === "day" ? "time" : "name"}
                            tick={{ fontSize: 12 }}
                          />
                          <YAxis
                            label={{ value: 'kW', angle: -90, position: 'insideLeft' }}
                            tick={{ fontSize: 12 }}
                          />
                          <Tooltip />
                          <Legend />
                          <Area
                            type="monotone"
                            dataKey="production"
                            name="Generation"
                            stroke="#10b981"
                            fillOpacity={1}
                            fill="url(#colorProduction)"
                          />
                          <Area
                            type="monotone"
                            dataKey="consumption"
                            name="Consumption"
                            stroke="#3b82f6"
                            fillOpacity={1}
                            fill="url(#colorConsumption)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </Chart>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Installation Details and Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Installation Details</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-1 gap-4">
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">Customer</dt>
                    <dd className="text-base">{installation.customerName || "Not assigned"}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">Location</dt>
                    <dd className="text-base">{installation.location || "No location data"}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">Installation Type</dt>
                    <dd className="text-base">{installation.type || "Not specified"}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">System Capacity</dt>
                    <dd className="text-base">{installation.capacity || "Not specified"}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">Installation Date</dt>
                    <dd className="text-base">{installation.installDate || "Not specified"}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">Last Maintenance</dt>
                    <dd className="text-base">{installation.lastMaintenance || "No maintenance recorded"}</dd>
                  </div>
                </dl>
              </CardContent>
              <CardFooter>
                <Button className="w-full" onClick={() => router.push(`/admin/installations/${installationId}`)}>
                  View Full Details
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-medium text-muted-foreground">System Efficiency</div>
                      <div className="text-sm font-medium">{installation.efficiency ? `${installation.efficiency}%` : "No data"}</div>
                    </div>
                    <div className="h-2 w-full bg-gray-100 rounded-full">
                      <div
                        className={`h-full rounded-full ${!installation.efficiency ? 'bg-gray-200' : installation.efficiency >= 85 ? 'bg-green-500' : installation.efficiency >= 70 ? 'bg-amber-500' : 'bg-red-500'}`}
                        style={{ width: `${installation.efficiency || 0}%` }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-medium text-muted-foreground">Current Output</div>
                      <div className="text-sm font-medium">{installation.currentOutput ? `${installation.currentOutput} kW` : "No data"}</div>
                    </div>
                    <div className="h-2 w-full bg-gray-100 rounded-full">
                      <div
                        className="h-full rounded-full bg-blue-500"
                        style={{ width: `${installation.currentOutput ? (installation.currentOutput / (installation.capacity || 10)) * 100 : 0}%` }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-medium text-muted-foreground">Total Production Today</div>
                      <div className="text-sm font-medium">{installation.todayProduction ? `${installation.todayProduction} kWh` : "No data"}</div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-medium text-muted-foreground">Monthly Production</div>
                      <div className="text-sm font-medium">{installation.monthlyProduction ? `${installation.monthlyProduction} kWh` : "No data"}</div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-medium text-muted-foreground">Lifetime Production</div>
                      <div className="text-sm font-medium">{installation.lifetimeProduction ? `${installation.lifetimeProduction} kWh` : "No data"}</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Status & Alerts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className={`h-3 w-3 rounded-full ${installation.status === 'Active' ? 'bg-green-500' : installation.status === 'Maintenance' ? 'bg-amber-500' : 'bg-red-500'}`}></div>
                      <div className="text-sm font-medium">System Status</div>
                    </div>
                    <div className="text-sm">{installation.status || "Unknown"}</div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className={`h-3 w-3 rounded-full ${installation.connection === 'Online' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      <div className="text-sm font-medium">Connection</div>
                    </div>
                    <div className="text-sm">{installation.connection || "Unknown"}</div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className={`h-3 w-3 rounded-full ${installation.alerts && installation.alerts.length > 0 ? 'bg-amber-500' : 'bg-green-500'}`}></div>
                      <div className="text-sm font-medium">Active Alerts</div>
                    </div>
                    <div className="text-sm">{installation.alerts && installation.alerts.length > 0 ? installation.alerts.length : "None"}</div>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="text-sm font-medium mb-2">Recent Alerts</h4>
                    {installation.alerts && installation.alerts.length > 0 ? (
                      <div className="space-y-2">
                        {installation.alerts.map((alert, index) => (
                          <div key={index} className="p-2 text-xs bg-amber-50 border border-amber-200 rounded-md">
                            <div className="font-medium">{alert.type}</div>
                            <div className="text-muted-foreground">{new Date(alert.timestamp).toLocaleString()}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">No recent alerts</div>
                    )}
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full" onClick={() => router.push(`/admin/energy/alerts`)}>
                  View All Alerts
                </Button>
              </CardFooter>
            </Card>
          </div>
        </>
      )}
    </div>
  )
} 