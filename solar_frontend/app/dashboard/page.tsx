"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { ArrowRight, Battery, Check, Download, Home, Sun, Zap } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
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
} from "recharts"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { energyApi, installationApi } from "@/lib/api"

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

interface InstallationDashboard {
  installationId: number;
  currentPowerGenerationWatts: number;
  currentPowerConsumptionWatts: number;
  todayGenerationKWh: number;
  todayConsumptionKWh: number;
  monthToDateGenerationKWh: number;
  monthToDateConsumptionKWh: number;
  lifetimeGenerationKWh: number;
  lifetimeConsumptionKWh: number;
  currentEfficiencyPercentage: number;
  lastUpdated: string;
  recentReadings: any[];
  installationDetails: InstallationDetails;
  
  // We'll add computed properties for metrics that aren't directly in the API
  // These will be calculated based on the available data
}

export default function DashboardPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [selectedPeriod, setSelectedPeriod] = useState("day")
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0])
  const [selectedInstallation, setSelectedInstallation] = useState<string | null>(null)
  const [installations, setInstallations] = useState<any[]>([])
  const [dashboardData, setDashboardData] = useState<any>(null)
  const [energyReadings, setEnergyReadings] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // State for toggling data series visibility
  const [visibleSeries, setVisibleSeries] = useState({
    production: true,
    consumption: true,
    selfConsumption: true,
    export: true,
    import: true,
    batteryLevel: true,
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
      if (!user) return

      try {
        setIsLoading(true)
        const response = await installationApi.getCustomerInstallations(user.id)
        setInstallations(response)

        // Select the first installation by default
        if (response.length > 0 && !selectedInstallation) {
          setSelectedInstallation(response[0].id.toString())
        }
      } catch (error) {
        console.error("Error fetching installations:", error)
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load your solar installations. Please try again.",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchInstallations()
  }, [user, toast])

  // Fetch dashboard data when installation is selected
  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!selectedInstallation || !user) return

      try {
        setIsLoading(true)

        // Fetch installation dashboard data
        const dashboardResponse = await energyApi.getInstallationDashboard(selectedInstallation)
        
        // Add calculated environmental impact values
        const calculatedDashboard = {
          ...dashboardResponse,
          environmentalImpact: {
            // Standard calculation: 0.85kg of CO2 saved per kWh of solar energy
            co2Saved: dashboardResponse.lifetimeGenerationKWh * 0.85,
            // Approximately 21kg of CO2 per year per tree
            treesEquivalent: (dashboardResponse.lifetimeGenerationKWh * 0.85) / 21,
            // Estimate carbon footprint reduction (varies by household size)
            carbonFootprintReduction: 
              dashboardResponse.installationDetails.type === "RESIDENTIAL" 
                ? Math.min(100, (dashboardResponse.monthToDateGenerationKWh / 600) * 100) // Average home uses ~600 kWh/month
                : Math.min(100, (dashboardResponse.monthToDateGenerationKWh / 2000) * 100) // Commercial estimate
          }
        }
        
        setDashboardData(calculatedDashboard)

        // Fetch recent energy readings
        const readingsResponse = await energyApi.getRecentReadings(selectedInstallation, 24) // Last 24 readings
        setEnergyReadings(readingsResponse)
      } catch (error) {
        console.error("Error fetching dashboard data:", error)
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load dashboard data. Please try again.",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchDashboardData()
  }, [selectedInstallation, user, toast, selectedPeriod])

  // Handle installation change
  const handleInstallationChange = (installationId: string) => {
    setSelectedInstallation(installationId)
  }

  // Handle period change
  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period)
  }

  if (!user) return null

  // Process energy readings for chart display
  const processedEnergyData = energyReadings.map((reading) => ({
    time: new Date(reading.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    production: reading.powerGenerationWatts / 1000 || 0, // Convert watts to kW
    consumption: reading.powerConsumptionWatts / 1000 || 0, // Convert watts to kW
    selfConsumption: Math.min(reading.powerGenerationWatts / 1000 || 0, reading.powerConsumptionWatts / 1000 || 0),
    export: Math.max(0, (reading.powerGenerationWatts / 1000 || 0) - (reading.powerConsumptionWatts / 1000 || 0)),
    import: Math.max(0, (reading.powerConsumptionWatts / 1000 || 0) - (reading.powerGenerationWatts / 1000 || 0)),
    batteryLevel: reading.batteryLevel || 0,
  }))

  // Use processed data or fallback to empty array
  const powerData = processedEnergyData.length > 0 ? processedEnergyData : [];

  // Calculate totals
  const totalProduction = powerData.reduce((sum, item) => sum + item.production, 0).toFixed(2)
  const totalConsumption = powerData.reduce((sum, item) => sum + item.consumption, 0).toFixed(2)
  const totalSelfConsumption = powerData.reduce((sum, item) => sum + item.selfConsumption, 0).toFixed(2)
  const totalExport = powerData.reduce((sum, item) => sum + item.export, 0).toFixed(2)
  const totalImport = powerData.reduce((sum, item) => sum + item.import, 0).toFixed(2)

  // Current values (last non-zero values)
  const currentProduction = powerData.filter((item) => item.production > 0).slice(-1)[0]?.production || 0
  const currentConsumption = powerData.slice(-1)[0]?.consumption || 0
  const currentExport = powerData.filter((item) => item.export > 0).slice(-1)[0]?.export || 0
  const currentBatteryLevel = powerData.slice(-1)[0]?.batteryLevel || 0

  // Environmental benefits from dashboard data
  const co2Saved = dashboardData?.environmentalImpact?.co2Saved?.toFixed(2) ||
    (Number.parseFloat(totalProduction) * 0.85 || 0).toFixed(2) // Fallback calculation with zero safety
  const treesEquivalent = dashboardData?.environmentalImpact?.treesEquivalent?.toFixed(2) ||
    ((Number.parseFloat(co2Saved) / 21) || 0).toFixed(2) // Fallback calculation with zero safety

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

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Top navigation bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">Solar Monitoring Dashboard</h1>
        </div>

        <div className="flex items-center gap-4">
          <Select value={selectedDate} onValueChange={setSelectedDate}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select date" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={new Date().toISOString().split("T")[0]}>Today</SelectItem>
              <SelectItem value={new Date(Date.now() - 86400000).toISOString().split("T")[0]}>Yesterday</SelectItem>
              <SelectItem value={new Date(Date.now() - 172800000).toISOString().split("T")[0]}>2 days ago</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={selectedInstallation || ""}
            onValueChange={handleInstallationChange}
            disabled={installations.length === 0}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Choose a site" />
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
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : (
        <>
          {/* Energy summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border">
              <CardContent className="p-4">
                <div className="text-sm text-gray-500">Energy today</div>
                <div className="text-3xl font-bold text-green-500">
                  {dashboardData?.todayGenerationKWh?.toFixed(2) || '0.00'} kWh
                </div>
              </CardContent>
            </Card>
            <Card className="border">
              <CardContent className="p-4">
                <div className="text-sm text-gray-500">Energy this month</div>
                <div className="text-3xl font-bold text-green-500">
                  {dashboardData?.monthToDateGenerationKWh?.toFixed(2) || '0.00'} kWh
                </div>
              </CardContent>
            </Card>
            <Card className="border">
              <CardContent className="p-4">
                <div className="text-sm text-gray-500">Lifetime energy</div>
                <div className="text-3xl font-bold text-green-500">
                  {dashboardData?.lifetimeGenerationKWh ?
                    (dashboardData.lifetimeGenerationKWh >= 1000 ?
                      (dashboardData.lifetimeGenerationKWh / 1000).toFixed(2) + ' MWh' :
                      dashboardData.lifetimeGenerationKWh.toFixed(2) + ' kWh') :
                    '0.00 kWh'}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Power flow diagram */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border">
              <CardContent className="p-4 flex flex-col items-center">
                <div className="text-xl font-bold">
                  {(dashboardData?.currentPowerGenerationWatts / 1000 || 0).toFixed(2)} kW
                </div>
                <div className="my-4">
                  <Sun className="h-16 w-16 text-green-500" />
                </div>
                <div className="text-sm text-gray-500">Production</div>
              </CardContent>
            </Card>

            <Card className="border">
              <CardContent className="p-4 flex flex-col items-center">
                <div className="text-xl font-bold">
                  {(dashboardData?.currentPowerConsumptionWatts / 1000 || 0).toFixed(2)} kW
                </div>
                <div className="my-4 flex items-center">
                  <ArrowRight className="h-8 w-8 text-green-500 mr-2" />
                  <Home className="h-16 w-16 text-gray-700" />
                </div>
                <div className="text-sm text-gray-500">Consumption</div>
              </CardContent>
            </Card>

            <Card className="border">
              <CardContent className="p-4 flex flex-col items-center">
                <div className="text-xl font-bold">
                  {Math.max(0, 
                    (dashboardData?.currentPowerGenerationWatts - dashboardData?.currentPowerConsumptionWatts) / 1000 || 0
                  ).toFixed(2)} kW
                </div>
                <div className="my-4 flex items-center">
                  <ArrowRight className="h-8 w-8 text-green-500 mr-2" />
                  <Zap className="h-16 w-16 text-blue-500" />
                </div>
                <div className="text-sm text-gray-500">Grid Export</div>
              </CardContent>
            </Card>
          </div>

          <Card className="border">
            <CardContent className="p-4 flex flex-col items-center">
              <div className="text-xl font-bold">{currentBatteryLevel}%</div>
              <div className="my-4">
                <Battery className="h-16 w-16 text-green-500" />
              </div>
              <div className="text-sm text-gray-500">Battery Level</div>
            </CardContent>
          </Card>

          {/* Power and Energy section */}
          <Card className="border">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold">Power and Energy</h2>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export Data
              </Button>
            </div>

            <div className="p-4">
              <Tabs defaultValue="day" value={selectedPeriod} onValueChange={handlePeriodChange}>
                <TabsList className="mb-4">
                  <TabsTrigger value="day">Day</TabsTrigger>
                  <TabsTrigger value="week">Week</TabsTrigger>
                  <TabsTrigger value="month">Month</TabsTrigger>
                  <TabsTrigger value="year">Year</TabsTrigger>
                </TabsList>

                <div className="mb-4 p-2 border rounded-md">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex justify-between p-2 border-b">
                      <span>System Production:</span>
                      <span className="font-bold text-green-500">{totalProduction} kWh</span>
                    </div>
                    <div className="flex justify-between p-2 border-b">
                      <span>Consumption:</span>
                      <span className="font-bold text-red-500">{totalConsumption} kWh</span>
                    </div>
                    <div className="flex justify-between p-2">
                      <span>Self-consumption:</span>
                      <span className="font-bold">{totalSelfConsumption} kWh</span>
                    </div>
                    <div className="flex justify-between p-2">
                      <span>Export:</span>
                      <span className="font-bold text-green-500">{totalExport} kWh</span>
                    </div>
                    <div className="flex justify-between p-2">
                      <span>Import:</span>
                      <span className="font-bold text-red-500">{totalImport} kWh</span>
                    </div>
                  </div>

                  {/* Progress bars */}
                  <div className="mt-4 space-y-2">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Self-consumption</span>
                        <span>
                          {Number.parseFloat(totalProduction) > 0
                            ? Math.round((Number.parseFloat(totalSelfConsumption) / Number.parseFloat(totalProduction)) * 100)
                            : 0}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-4">
                        <div
                          className="bg-green-500 h-4 rounded-full"
                          style={{
                            width: `${Number.parseFloat(totalProduction) > 0
                              ? Math.round(
                                (Number.parseFloat(totalSelfConsumption) / Number.parseFloat(totalProduction)) * 100,
                              )
                              : 0
                              }%`,
                          }}
                        ></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Grid export</span>
                        <span>
                          {Number.parseFloat(totalProduction) > 0
                            ? Math.round((Number.parseFloat(totalExport) / Number.parseFloat(totalProduction)) * 100)
                            : 0}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-4">
                        <div
                          className="bg-blue-500 h-4 rounded-full"
                          style={{
                            width: `${Number.parseFloat(totalProduction) > 0
                              ? Math.round((Number.parseFloat(totalExport) / Number.parseFloat(totalProduction)) * 100)
                              : 0
                              }%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="h-80 mt-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={powerData}
                      margin={{
                        top: 10,
                        right: 10,
                        left: 0,
                        bottom: 0,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="time" />
                      <YAxis tickFormatter={(value) => `${value}kW`} />
                      <Tooltip />
                      <Legend content={<CustomLegend />} />
                      {visibleSeries.production && (
                        <Area
                          type="monotone"
                          dataKey="production"
                          name="Production"
                          stackId="1"
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
                          stackId="2"
                          stroke="#ef4444"
                          fill="#ef4444"
                          fillOpacity={0.5}
                        />
                      )}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Tabs>
            </div>
          </Card>

          {/* Environmental Impact */}
          <Card className="border">
            <div className="p-4 border-b">
              <h2 className="text-xl font-bold">Environmental Impact</h2>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-4">
                    <Cloud className="w-10 h-10 text-green-600" />
                  </div>
                  <h3 className="text-3xl font-bold text-green-600">{co2Saved} kg</h3>
                  <p className="text-gray-500 mt-2">CO2 emissions saved</p>
                </div>

                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-100 mb-4">
                    <Factory className="w-10 h-10 text-blue-600" />
                  </div>
                  <h3 className="text-3xl font-bold text-blue-600">
                    {dashboardData?.environmentalImpact?.carbonFootprintReduction?.toFixed(2) || '0.00'}%
                  </h3>
                  <p className="text-gray-500 mt-2">Carbon footprint reduction</p>
                </div>

                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-amber-100 mb-4">
                    <Tree className="w-10 h-10 text-amber-600" />
                  </div>
                  <h3 className="text-3xl font-bold text-amber-600">{treesEquivalent}</h3>
                  <p className="text-gray-500 mt-2">Equivalent trees planted</p>
                </div>
              </div>
            </div>
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

