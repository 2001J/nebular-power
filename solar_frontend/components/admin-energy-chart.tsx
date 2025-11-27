"use client"

import { useEffect, useState, useRef } from "react"
import { Chart, ChartContainer } from "@/components/ui/chart"
import { BarChart3 } from "lucide-react"
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, XAxis, YAxis, Tooltip, Area, AreaChart } from "@/components/ui/direct-recharts"
import { energyApi } from "@/lib/api/energy"
import { energyWebSocket } from "@/lib/energyWebSocket"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatChartYAxis, formatChartTooltip } from "@/lib/energyUtils"

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

interface SystemOverview {
  totalActiveInstallations: number;
  totalSuspendedInstallations: number;
  totalInstallationsWithTamperAlerts: number;
  totalSystemCapacityKW: number;
  currentSystemGenerationWatts: number;
  todayTotalGenerationKWh: number;
  todayTotalConsumptionKWh: number;
  weekToDateGenerationKWh: number;
  weekToDateConsumptionKWh: number;
  monthToDateGenerationKWh: number;
  monthToDateConsumptionKWh: number;
  yearToDateGenerationKWh: number;
  yearToDateConsumptionKWh: number;
  averageSystemEfficiency: number;
  lastUpdated: string;
  recentlyActiveInstallations: InstallationDetails[];
  topProducers: InstallationDetails[];
}

interface AdminEnergyChartProps {
  type?: "production" | "consumption" | "revenue"
}

export function AdminEnergyChart({ type = "production" }: AdminEnergyChartProps) {
  const [energyData, setEnergyData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeframe, setTimeframe] = useState<string>("day")
  const [systemOverview, setSystemOverview] = useState<any>(null)
  const [connected, setConnected] = useState(false)
  const webSocketRef = useRef<any>(null)

  // Fetch system series based on timeframe
  useEffect(() => {
    const fetchSeries = async () => {
      setLoading(true)
      try {
        // Keep overview cards populated
        const overviewData = await energyApi.getSystemOverview()
        if (overviewData) setSystemOverview(overviewData)

        // Fetch aggregated series
        const { start, end, bucket } = getRangeAndBucket(timeframe)
        const series = await energyApi.getSystemSeries(start.toISOString(), end.toISOString(), bucket)
        if (Array.isArray(series) && series.length > 0) {
          const formatted = series.map((pt: any) => {
            const ts = new Date(pt.bucketStart)
            let label = ''
            if (timeframe === 'day') label = `${ts.getHours()}:00`
            else if (timeframe === 'week') label = ts.toLocaleDateString('en-US', { weekday: 'short' })
            else if (timeframe === 'month') label = String(ts.getDate())
            else label = ts.toLocaleDateString('en-US', { month: 'short' })
            return {
              time: label,
              production: pt.avgGenerationWatts / 1000, // to kW
              consumption: pt.avgConsumptionWatts / 1000, // to kW
              timestamp: pt.bucketStart,
            }
          })
          setEnergyData(formatted)
          setError(null)
        } else {
          setEnergyData([])
        }
      } catch (err) {
        console.error('Error fetching system series:', err)
        setError('Failed to load system series data')
      } finally {
        setLoading(false)
      }
    }
    fetchSeries()
  }, [timeframe])

  // Compute period range and bucket
  const getRangeAndBucket = (range: string) => {
    const now = new Date()
    const end = now
    let start = new Date(now)
    let bucket: 'minute' | 'hour' | 'day' | 'month' = 'hour'
    if (range === 'day') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
      bucket = 'hour'
    } else if (range === 'week') {
      const day = now.getDay()
      const diffToMonday = (day + 6) % 7
      start = new Date(now)
      start.setDate(now.getDate() - diffToMonday)
      start.setHours(0,0,0,0)
      bucket = 'day'
    } else if (range === 'month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1)
      bucket = 'day'
    } else {
      start = new Date(now.getFullYear(), 0, 1)
      bucket = 'month'
    }
    return { start, end, bucket }
  }

  // Set up WebSocket connection for real-time updates
  useEffect(() => {
    // Connect to WebSocket for real-time system updates
    const webSocket = energyWebSocket.createSystemMonitor(
      // Message handler for real-time updates
      (data) => {
        console.log("WebSocket received system update:", data);
        
        // Update system overview if we receive a new one
        if (data.type === 'system-overview') {
          setSystemOverview(data.data);
          
          // Update chart data based on the latest real-time data
          if (energyData.length > 0) {
            // Get the current time
            const now = new Date();
            const currentHour = now.getHours();
            const currentMinutes = now.getMinutes();
            
            // Update only the most recent hour's data point
            setEnergyData(prevData => {
              // Create a copy of the data
              const updatedData = [...prevData];
              
              // Find the current hour data point
              const currentHourIndex = updatedData.findIndex(item => {
                const itemDate = new Date(item.timestamp);
                return itemDate.getHours() === currentHour;
              });
              
              if (currentHourIndex !== -1) {
                // Update the current hour data
                updatedData[currentHourIndex] = {
                  ...updatedData[currentHourIndex],
                  production: data.data.currentSystemGenerationWatts / 1000, // Convert to kW
                  consumption: data.data.todayTotalConsumptionKWh / 24 * (currentHour >= 17 && currentHour <= 22 ? 1.5 : 0.8), // Approximate current consumption based on time of day
                  time: `${currentHour}:${currentMinutes < 10 ? '0' + currentMinutes : currentMinutes}`
                };
              }
              
              return updatedData;
            });
          }
        }
      },
      // Error handler
      (error) => {
        console.error("WebSocket error:", error);
      },
      // Connected handler
      () => {
        console.log("WebSocket connected");
        setConnected(true);
      },
      // Disconnected handler
      () => {
        console.log("WebSocket disconnected");
        setConnected(false);
      }
    );

    // Store the WebSocket reference
    webSocketRef.current = webSocket;

    // Cleanup function to close WebSocket when component unmounts
    return () => {
      if (webSocketRef.current) {
        webSocketRef.current.close();
      }
    };
  }, [energyData.length]); // Only recreate the websocket if data array size changes

  if (loading) {
    return <Skeleton className="w-full h-[350px]" />;
  }

  if (error) {
    return <div className="p-4 text-red-500">{error}</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">
          {type === "production" ? "System Energy Production" : 
           type === "consumption" ? "System Energy Consumption" : "System Revenue"}
        </h3>
        <div className="flex gap-2 items-center">
          {connected ? (
            <span className="text-xs text-green-500 flex items-center">
              <span className="h-2 w-2 rounded-full bg-green-500 mr-1"></span> Live
            </span>
          ) : (
            <span className="text-xs text-gray-500 flex items-center">
              <span className="h-2 w-2 rounded-full bg-gray-500 mr-1"></span> Offline
            </span>
          )}
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Timeframe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Day</SelectItem>
              <SelectItem value="week">Week</SelectItem>
              <SelectItem value="month">Month</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {systemOverview && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 border rounded-lg bg-card">
            <div className="text-sm text-muted-foreground">Active Installations</div>
            <div className="text-2xl font-bold mt-1">{systemOverview.totalActiveInstallations || 0}</div>
          </div>
          <div className="p-4 border rounded-lg bg-card">
            <div className="text-sm text-muted-foreground">System Capacity</div>
            <div className="text-2xl font-bold mt-1">{systemOverview.totalSystemCapacityKW || 0} kW</div>
          </div>
          <div className="p-4 border rounded-lg bg-card">
            <div className="text-sm text-muted-foreground">Today's Generation</div>
            <div className="text-2xl font-bold mt-1">{systemOverview.todayTotalGenerationKWh?.toFixed(1) || 0} kWh</div>
          </div>
          <div className="p-4 border rounded-lg bg-card">
            <div className="text-sm text-muted-foreground">Today's Consumption</div>
            <div className="text-2xl font-bold mt-1">{systemOverview.todayTotalConsumptionKWh?.toFixed(1) || 0} kWh</div>
          </div>
        </div>
      )}

      {/* Weekly metrics */}
      {systemOverview && systemOverview.weekToDateGenerationKWh !== undefined && (
        <div className="grid grid-cols-2 gap-4 mb-6 p-4 border rounded-lg bg-card">
          <div>
            <div className="text-sm text-muted-foreground">Week-to-Date Generation</div>
            <div className="text-2xl font-bold mt-1">
              {systemOverview.weekToDateGenerationKWh >= 1000 
                ? (systemOverview.weekToDateGenerationKWh / 1000).toFixed(2) + ' MWh' 
                : systemOverview.weekToDateGenerationKWh.toFixed(1) + ' kWh'}
            </div>
          </div>
          
          <div>
            <div className="text-sm text-muted-foreground">Week-to-Date Consumption</div>
            <div className="text-2xl font-bold mt-1">
              {systemOverview.weekToDateConsumptionKWh >= 1000 
                ? (systemOverview.weekToDateConsumptionKWh / 1000).toFixed(2) + ' MWh' 
                : systemOverview.weekToDateConsumptionKWh.toFixed(1) + ' kWh'}
            </div>
          </div>
        </div>
      )}

      {/* Year-to-date metrics */}
      {systemOverview && systemOverview.yearToDateGenerationKWh !== undefined && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6 p-4 border rounded-lg bg-card">
          <div>
            <div className="text-sm text-muted-foreground">Year-to-Date Generation</div>
            <div className="text-2xl font-bold mt-1">
              {systemOverview.yearToDateGenerationKWh >= 1000 
                ? (systemOverview.yearToDateGenerationKWh / 1000).toFixed(2) + ' MWh' 
                : systemOverview.yearToDateGenerationKWh.toFixed(1) + ' kWh'}
            </div>
          </div>
          
          <div>
            <div className="text-sm text-muted-foreground">Year-to-Date Consumption</div>
            <div className="text-2xl font-bold mt-1">
              {systemOverview.yearToDateConsumptionKWh >= 1000 
                ? (systemOverview.yearToDateConsumptionKWh / 1000).toFixed(2) + ' MWh' 
                : systemOverview.yearToDateConsumptionKWh.toFixed(1) + ' kWh'}
            </div>
          </div>
          
          <div>
            <div className="text-sm text-muted-foreground">System Efficiency</div>
            <div className="text-2xl font-bold mt-1">
              {systemOverview.averageSystemEfficiency?.toFixed(1) || '0.0'}%
            </div>
          </div>
        </div>
      )}
      
      {/* Recently active installations */}
      {systemOverview && systemOverview.recentlyActiveInstallations && systemOverview.recentlyActiveInstallations.length > 0 && (
        <div className="mb-6 p-4 border rounded-lg bg-card">
          <h3 className="text-base font-medium mb-3">Recently Active Installations</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-2 px-3 text-left">Name</th>
                  <th className="py-2 px-3 text-left">Customer</th>
                  <th className="py-2 px-3 text-left">Capacity</th>
                  <th className="py-2 px-3 text-left">Type</th>
                  <th className="py-2 px-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {systemOverview.recentlyActiveInstallations.map((installation: any) => (
                  <tr key={installation.id} className="border-b hover:bg-muted/50">
                    <td className="py-2 px-3">{installation.name}</td>
                    <td className="py-2 px-3">{installation.username}</td>
                    <td className="py-2 px-3">{installation.installedCapacityKW} kW</td>
                    <td className="py-2 px-3">{installation.type}</td>
                    <td className="py-2 px-3">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        installation.status === 'ACTIVE' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {installation.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty state if no data */}
      {(!energyData || energyData.length === 0) ? (
        <div className="w-full h-[350px] flex flex-col items-center justify-center text-center p-8">
          <BarChart3 className="h-10 w-10 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No Energy Data</h3>
          <p className="text-sm text-muted-foreground max-w-sm mt-2">
            There is no energy data available for the selected {timeframe} period.
          </p>
        </div>
      ) : (
      <Chart>
        <ChartContainer>
          <ResponsiveContainer width="100%" height={350}>
            {type === "production" ? (
              <AreaChart data={energyData} margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
                <defs>
                  <linearGradient id="productionGradientAdmin" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(142, 76%, 46%)" stopOpacity={0.9} />
                    <stop offset="50%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.8} />
                    <stop offset="100%" stopColor="hsl(142, 76%, 26%)" stopOpacity={0.6} />
                  </linearGradient>
                  <filter id="productionGlowAdmin">
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
                />
                <YAxis
                  className="text-xs"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={(value) => `${formatChartYAxis(value)} kW`}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="rounded-lg border bg-background/95 backdrop-blur-sm p-3 shadow-lg">
                          <p className="font-semibold text-sm mb-2">{label}</p>
                          {payload.map((entry: any, index: number) => (
                            <div key={index} className="flex items-center gap-2">
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
                      )
                    }
                    return null
                  }}
                />
                <Legend 
                  wrapperStyle={{ paddingTop: '20px' }}
                  iconType="circle"
                />
                <Area
                  type="monotone"
                  dataKey="production"
                  name="Production"
                  fill="url(#productionGradientAdmin)"
                  stroke="hsl(142, 76%, 36%)"
                  strokeWidth={2}
                  fillOpacity={0.7}
                  style={{ filter: 'url(#productionGlowAdmin)' }}
                />
              </AreaChart>
            ) : type === "consumption" ? (
              <AreaChart data={energyData} margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
                <defs>
                  <linearGradient id="consumptionGradientAdmin" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(0, 84%, 70%)" stopOpacity={0.9} />
                    <stop offset="50%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0.7} />
                    <stop offset="100%" stopColor="hsl(0, 84%, 50%)" stopOpacity={0.2} />
                  </linearGradient>
                  <filter id="consumptionGlowAdmin">
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
                />
                <YAxis
                  className="text-xs"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={(value) => `${formatChartYAxis(value)} kW`}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="rounded-lg border bg-background/95 backdrop-blur-sm p-3 shadow-lg">
                          <p className="font-semibold text-sm mb-2">{label}</p>
                          {payload.map((entry: any, index: number) => (
                            <div key={index} className="flex items-center gap-2">
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
                      )
                    }
                    return null
                  }}
                />
                <Legend 
                  wrapperStyle={{ paddingTop: '20px' }}
                  iconType="circle"
                />
                <Area
                  type="monotone"
                  dataKey="consumption"
                  name="Consumption"
                  fill="url(#consumptionGradientAdmin)"
                  stroke="hsl(0, 84%, 60%)"
                  strokeWidth={2}
                  fillOpacity={1}
                  style={{ filter: 'url(#consumptionGlowAdmin)' }}
                />
              </AreaChart>
            ) : (
              <BarChart data={[
                { name: "Mon", revenue: 24000 },
                { name: "Tue", revenue: 26500 },
                { name: "Wed", revenue: 28900 },
                { name: "Thu", revenue: 27000 },
                { name: "Fri", revenue: 31000 },
                { name: "Sat", revenue: 33500 },
                { name: "Sun", revenue: 35800 },
              ]} margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(217, 91%, 70%)" stopOpacity={1} />
                    <stop offset="100%" stopColor="hsl(217, 91%, 50%)" stopOpacity={0.8} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" vertical={false} />
                <XAxis
                  dataKey="name"
                  className="text-xs"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis
                  className="text-xs"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={(value) => `$${value}`}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="rounded-lg border bg-background/95 backdrop-blur-sm p-3 shadow-lg">
                          <p className="font-semibold text-sm mb-2">{label}</p>
                          {payload.map((entry: any, index: number) => (
                            <div key={index} className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{
                                  backgroundColor: entry.color,
                                  boxShadow: `0 0 8px ${entry.color}40`
                                }}
                              />
                              <span className="text-xs text-muted-foreground">{entry.name}:</span>
                              <span className="text-sm font-medium">
                                ${Number(entry.value).toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Legend 
                  wrapperStyle={{ paddingTop: '20px' }}
                  iconType="circle"
                />
                <Bar 
                  dataKey="revenue" 
                  fill="url(#revenueGradient)" 
                  name="Revenue"
                  radius={[6, 6, 0, 0]}
                  style={{ 
                    filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))'
                  }}
                />
              </BarChart>
            )}
          </ResponsiveContainer>
        </ChartContainer>
      </Chart>
      )}
    </div>
  )
}
