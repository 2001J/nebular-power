"use client"

import { useMemo } from "react"
import { Chart, ChartContainer } from "@/components/ui/chart"
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"

interface EnergyProductionChartProps {
  period: "day" | "week" | "month"
}

export function EnergyProductionChart({ period }: EnergyProductionChartProps) {
  const data = useMemo(() => {
    if (period === "day") {
      return [
        { time: "12 AM", value: 0.5 },
        { time: "2 AM", value: 0.2 },
        { time: "4 AM", value: 0.1 },
        { time: "6 AM", value: 1.2 },
        { time: "8 AM", value: 3.5 },
        { time: "10 AM", value: 5.2 },
        { time: "12 PM", value: 6.8 },
        { time: "2 PM", value: 7.2 },
        { time: "4 PM", value: 5.8 },
        { time: "6 PM", value: 3.2 },
        { time: "8 PM", value: 1.1 },
        { time: "10 PM", value: 0.3 },
      ]
    } else if (period === "week") {
      return [
        { time: "Mon", value: 25.4 },
        { time: "Tue", value: 28.6 },
        { time: "Wed", value: 32.1 },
        { time: "Thu", value: 30.5 },
        { time: "Fri", value: 35.2 },
        { time: "Sat", value: 38.7 },
        { time: "Sun", value: 42.5 },
      ]
    } else {
      return [
        { time: "Week 1", value: 180.5 },
        { time: "Week 2", value: 195.2 },
        { time: "Week 3", value: 210.8 },
        { time: "Week 4", value: 225.3 },
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
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
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
              stroke="hsl(var(--primary))"
              fillOpacity={1}
              fill="url(#colorValue)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartContainer>
    </Chart>
  )
}

