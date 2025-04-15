"use client"

import { useMemo } from "react"
import { Chart, ChartContainer } from "@/components/ui/chart"
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"

interface EnergyConsumptionChartProps {
  period: "day" | "week" | "month"
}

export function EnergyConsumptionChart({ period }: EnergyConsumptionChartProps) {
  const data = useMemo(() => {
    if (period === "day") {
      return [
        { time: "12 AM", value: 0.8 },
        { time: "2 AM", value: 0.6 },
        { time: "4 AM", value: 0.5 },
        { time: "6 AM", value: 1.5 },
        { time: "8 AM", value: 2.8 },
        { time: "10 AM", value: 2.2 },
        { time: "12 PM", value: 2.5 },
        { time: "2 PM", value: 2.1 },
        { time: "4 PM", value: 2.3 },
        { time: "6 PM", value: 3.8 },
        { time: "8 PM", value: 4.2 },
        { time: "10 PM", value: 2.5 },
      ]
    } else if (period === "week") {
      return [
        { time: "Mon", value: 18.4 },
        { time: "Tue", value: 20.6 },
        { time: "Wed", value: 22.1 },
        { time: "Thu", value: 19.5 },
        { time: "Fri", value: 24.2 },
        { time: "Sat", value: 26.7 },
        { time: "Sun", value: 28.2 },
      ]
    } else {
      return [
        { time: "Week 1", value: 120.5 },
        { time: "Week 2", value: 135.2 },
        { time: "Week 3", value: 142.8 },
        { time: "Week 4", value: 150.3 },
      ]
    }
  }, [period])

  const unit = period === "day" ? "kWh" : period === "week" ? "kWh" : "kWh"

  return (
    <Chart>
      <ChartContainer>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorConsumption" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--secondary))" stopOpacity={0.8} />
                <stop offset="95%" stopColor="hsl(var(--secondary))" stopOpacity={0} />
              </linearGradient>
            </defs>
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
              tickFormatter={(value) => `${value} ${unit}`}
            />
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="rounded-md border bg-background p-2 shadow-md">
                      <p className="text-sm font-medium">{`${payload[0].value} ${unit}`}</p>
                    </div>
                  )
                }
                return null
              }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="hsl(var(--secondary))"
              fillOpacity={1}
              fill="url(#colorConsumption)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartContainer>
    </Chart>
  )
}

