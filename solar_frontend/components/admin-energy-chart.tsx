"use client"

import { useEffect, useState, useRef } from "react"
import { Chart, ChartContainer } from "@/components/ui/chart"
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, XAxis, YAxis, Tooltip, Line, LineChart } from "recharts"
import { energyApi } from "@/lib/api"
import { energyWebSocket } from "@/lib/energyWebSocket"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

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

  // Fetch initial system overview data when the component loads
  useEffect(() => {
    const fetchSystemOverview = async () => {
      setLoading(true);
      try {
        // Get system overview which contains aggregated metrics
        const overviewData = await energyApi.getSystemOverview();
        
        if (overviewData) {
          setSystemOverview(overviewData);
          
          // Create hourly data points for today's generation/consumption
          // This simulates a time series from the aggregate data
          const now = new Date();
          const hourlyData = [];
          
          // Generate 24 hours of data, with a curve that peaks during daylight hours
          for (let i = 0; i < 24; i++) {
            const hour = new Date(now);
            hour.setHours(i, 0, 0, 0);
            
            // Production follows sun pattern - peaks at noon-2pm
            let productionFactor = 0;
            if (i >= 6 && i <= 18) { // 6am to 6pm
              productionFactor = 1 - Math.abs((i - 12) / 6) * 0.8; // Peak at noon
            }
            
            // Consumption has two peaks - morning and evening
            let consumptionFactor = 0.3; // Base load
            if (i >= 6 && i <= 9) { // Morning peak 6am-9am
              consumptionFactor = 0.7 + (i - 6) * 0.1; // Ramps up in morning
            } else if (i >= 17 && i <= 22) { // Evening peak 5pm-10pm
              consumptionFactor = 0.8 - (i - 17) * 0.1; // Ramps down in evening
            }
            
            // Calculate values based on system overview data
            const production = overviewData.currentSystemGenerationWatts * productionFactor / 1000; // Convert to kW
            const consumption = overviewData.todayTotalConsumptionKWh / 24 * consumptionFactor * 3; // Convert daily kWh to hourly kW
            
            hourlyData.push({
              time: hour.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              timestamp: hour.toISOString(),
              production: production,
              consumption: consumption,
            });
          }
          
          setEnergyData(hourlyData);
          setError(null);
        } else {
          setError("Failed to load system overview data");
        }
      } catch (err) {
        console.error("Error fetching system overview:", err);
        setError("Failed to load system overview data");
      } finally {
        setLoading(false);
      }
    };

    fetchSystemOverview();
  }, [timeframe]);

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
      
      <Chart>
        <ChartContainer>
          <ResponsiveContainer width="100%" height={350}>
            {type === "production" || type === "consumption" ? (
              <LineChart data={energyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="time"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value} kW`}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="rounded-md border bg-background p-2 shadow-md">
                          <p className="text-sm font-medium">{payload[0]?.payload.time}</p>
                          {payload.map((entry, index) => (
                            <p key={index} className="text-sm">
                              {`${entry.name}: ${Number(entry.value).toFixed(2)} kW`}
                            </p>
                          ))}
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Legend />
                {type === "production" && (
                  <Line 
                    type="monotone" 
                    dataKey="production" 
                    stroke="hsl(var(--primary))" 
                    name="Production" 
                    strokeWidth={2}
                    dot={false}
                  />
                )}
                {type === "consumption" && (
                  <Line 
                    type="monotone" 
                    dataKey="consumption" 
                    stroke="hsl(var(--destructive))" 
                    name="Consumption" 
                    strokeWidth={2}
                    dot={false}
                  />
                )}
              </LineChart>
            ) : (
              <BarChart data={[
                { name: "Mon", revenue: 24000 },
                { name: "Tue", revenue: 26500 },
                { name: "Wed", revenue: 28900 },
                { name: "Thu", revenue: 27000 },
                { name: "Fri", revenue: 31000 },
                { name: "Sat", revenue: 33500 },
                { name: "Sun", revenue: 35800 },
              ]}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="name"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `$${value}`}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="rounded-md border bg-background p-2 shadow-md">
                          <p className="text-sm font-medium">{`$${payload[0].value}`}</p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" name="Revenue" />
              </BarChart>
            )}
          </ResponsiveContainer>
        </ChartContainer>
      </Chart>
    </div>
  )
}

