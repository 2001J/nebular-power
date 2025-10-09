"use client"

import { useState, useEffect } from "react"
import { Chart, ChartContainer } from "@/components/ui/chart"
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis, Tooltip } from "@/components/ui/direct-recharts"

const testData = [
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

export function TestChart() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="h-[300px] w-full flex items-center justify-center">
        <div>Loading chart...</div>
      </div>
    )
  }

  return (
    <div className="h-[300px] w-full">
      <Chart>
        <ChartContainer>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={testData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="time"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value} kWh`}
              />
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="rounded-md border bg-background p-2 shadow-md">
                        <p className="text-sm font-medium">{`${payload[0].value} kWh`}</p>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#10b981"
                fillOpacity={1}
                fill="url(#colorValue)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>
      </Chart>
    </div>
  )
}