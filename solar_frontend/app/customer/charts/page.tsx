"use client"

import { useState } from "react"
import { Download, Filter, ArrowUp } from "lucide-react"
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

export default function ChartsPage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState("energy")
  const [selectedPeriod, setSelectedPeriod] = useState("month")
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0])

  // State for toggling data series visibility
  const [visibleSeries, setVisibleSeries] = useState({
    production: true,
    consumption: true,
    export: true,
    import: true,
    selfConsumption: true,
  })

  // Toggle visibility of a data series
  const toggleSeries = (series) => {
    setVisibleSeries((prev) => ({
      ...prev,
      [series]: !prev[series],
    }))
  }

  if (!user) return null

  // Mock data for the charts
  const monthlyData = [
    { month: "Jan", production: 320, consumption: 240, export: 120, import: 40, selfConsumption: 200 },
    { month: "Feb", production: 380, consumption: 290, export: 140, import: 50, selfConsumption: 240 },
    { month: "Mar", production: 450, consumption: 320, export: 180, import: 50, selfConsumption: 270 },
    { month: "Apr", production: 520, consumption: 350, export: 220, import: 50, selfConsumption: 300 },
    { month: "May", production: 590, consumption: 380, export: 260, import: 50, selfConsumption: 330 },
    { month: "Jun", production: 620, consumption: 400, export: 270, import: 50, selfConsumption: 350 },
    { month: "Jul", production: 650, consumption: 420, export: 280, import: 50, selfConsumption: 370 },
    { month: "Aug", production: 610, consumption: 400, export: 260, import: 50, selfConsumption: 350 },
    { month: "Sep", production: 550, consumption: 370, export: 230, import: 50, selfConsumption: 320 },
    { month: "Oct", production: 480, consumption: 340, export: 190, import: 50, selfConsumption: 290 },
    { month: "Nov", production: 390, consumption: 300, export: 140, import: 50, selfConsumption: 250 },
    { month: "Dec", production: 340, consumption: 280, export: 110, import: 50, selfConsumption: 230 },
  ]

  const hourlyData = Array.from({ length: 24 }, (_, i) => {
    const hour = i < 10 ? `0${i}:00` : `${i}:00`
    const production = i >= 6 && i <= 18 ? Math.random() * 5 + (i >= 10 && i <= 14 ? 3 : 1) : 0
    const consumption = Math.random() * 2 + 0.5
    const export_ = Math.max(0, production - consumption)
    const import_ = production > 0 ? 0 : consumption
    const selfConsumption = production > 0 ? Math.min(production, consumption) : 0

    return {
      hour,
      production: Number.parseFloat(production.toFixed(2)),
      consumption: Number.parseFloat(consumption.toFixed(2)),
      export: Number.parseFloat(export_.toFixed(2)),
      import: Number.parseFloat(import_.toFixed(2)),
      selfConsumption: Number.parseFloat(selfConsumption.toFixed(2)),
    }
  })

  const weatherData = [
    { day: "Mon", temperature: 72, production: 26.4, sunHours: 8.2 },
    { day: "Tue", temperature: 68, production: 22.1, sunHours: 6.5 },
    { day: "Wed", temperature: 74, production: 27.8, sunHours: 9.1 },
    { day: "Thu", temperature: 76, production: 28.5, sunHours: 9.4 },
    { day: "Fri", temperature: 65, production: 18.2, sunHours: 5.2 },
    { day: "Sat", temperature: 71, production: 25.3, sunHours: 7.8 },
    { day: "Sun", temperature: 73, production: 26.9, sunHours: 8.5 },
  ]

  const efficiencyData = [
    { month: "Jan", efficiency: 92, temperature: 45 },
    { month: "Feb", efficiency: 93, temperature: 48 },
    { month: "Mar", efficiency: 94, temperature: 55 },
    { month: "Apr", efficiency: 95, temperature: 62 },
    { month: "May", efficiency: 96, temperature: 70 },
    { month: "Jun", efficiency: 94, temperature: 78 },
    { month: "Jul", efficiency: 93, temperature: 82 },
    { month: "Aug", efficiency: 92, temperature: 80 },
    { month: "Sep", efficiency: 91, temperature: 75 },
    { month: "Oct", efficiency: 90, temperature: 65 },
    { month: "Nov", efficiency: 91, temperature: 55 },
    { month: "Dec", efficiency: 92, temperature: 48 },
  ]

  const comparisonData = [
    { name: "Your System", production: 535, savings: 128 },
    { name: "Neighborhood Avg", production: 482, savings: 115 },
    { name: "Regional Avg", production: 410, savings: 98 },
  ]

  // Custom legend that allows toggling series visibility
  const CustomLegend = ({ payload }) => {
    if (!payload) return null

    return (
      <div className="flex flex-wrap gap-4 justify-center mt-2">
        {payload.map((entry, index) => (
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

          <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
          </Button>

          <Button variant="outline" size="icon">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

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

              <Chart>
                <ChartContainer>
                  <ResponsiveContainer width="100%" height={400}>
                    {selectedPeriod === "day" ? (
                      <AreaChart data={hourlyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
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
                    ) : (
                      <BarChart data={monthlyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis label={{ value: "Energy (kWh)", angle: -90, position: "insideLeft" }} />
                        <Tooltip formatter={(value) => [`${value} kWh`, ""]} />
                        {visibleSeries.production && <Bar dataKey="production" fill="#4ade80" name="Production" />}
                        {visibleSeries.consumption && <Bar dataKey="consumption" fill="#f87171" name="Consumption" />}
                        {visibleSeries.export && <Bar dataKey="export" fill="#34d399" name="Export" />}
                        {visibleSeries.import && <Bar dataKey="import" fill="#fb7185" name="Import" />}
                        {visibleSeries.selfConsumption && (
                          <Bar dataKey="selfConsumption" fill="#60a5fa" name="Self Consumption" />
                        )}
                        <Legend content={<CustomLegend />} />
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                </ChartContainer>
              </Chart>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-gray-500">Total Production</div>
                        <div className="text-2xl font-bold">535.92 kWh</div>
                      </div>
                      <div className="text-green-500 flex items-center">
                        <ArrowUp className="h-4 w-4 mr-1" />
                        <span className="text-sm">+8.2%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-gray-500">Self-Consumption</div>
                        <div className="text-2xl font-bold">312.45 kWh</div>
                      </div>
                      <div className="text-green-500 flex items-center">
                        <ArrowUp className="h-4 w-4 mr-1" />
                        <span className="text-sm">+5.7%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-gray-500">Grid Export</div>
                        <div className="text-2xl font-bold">223.47 kWh</div>
                      </div>
                      <div className="text-green-500 flex items-center">
                        <ArrowUp className="h-4 w-4 mr-1" />
                        <span className="text-sm">+12.3%</span>
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
                        <Tooltip formatter={(value) => [`$${value}`, "Savings"]} />
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
                      <div className="text-2xl font-bold text-green-500">+11.0%</div>
                      <div className="text-sm text-gray-500">Your system produces 11% more energy</div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border">
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-sm text-gray-500">Production vs Region</div>
                      <div className="text-2xl font-bold text-green-500">+30.5%</div>
                      <div className="text-sm text-gray-500">Your system produces 30.5% more energy</div>
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
                        <div className="text-2xl font-bold text-amber-500">28.5 kWh</div>
                        <div className="text-sm text-gray-500">Average production</div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border">
                    <CardContent className="p-4">
                      <div className="text-center">
                        <div className="text-sm text-gray-500">Partly Cloudy</div>
                        <div className="text-2xl font-bold text-blue-400">22.1 kWh</div>
                        <div className="text-sm text-gray-500">Average production</div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border">
                    <CardContent className="p-4">
                      <div className="text-center">
                        <div className="text-sm text-gray-500">Cloudy Day</div>
                        <div className="text-2xl font-bold text-gray-500">18.2 kWh</div>
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
                        <div className="bg-blue-500 h-4 rounded-full" style={{ width: "94%" }}></div>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>94%</span>
                        <span className="text-green-500">Good</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border">
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <h3 className="font-medium">Inverter Efficiency</h3>
                      <div className="w-full bg-gray-200 rounded-full h-4">
                        <div className="bg-blue-500 h-4 rounded-full" style={{ width: "97%" }}></div>
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
                        <div className="bg-blue-500 h-4 rounded-full" style={{ width: "88%" }}></div>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>88%</span>
                        <span className="text-green-500">Good</span>
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
                        maintenance was performed 45 days ago.
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
    </div>
  )
}

