"use client"

import { Chart, ChartContainer } from "@/components/ui/chart"
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"

interface AdminEnergyChartProps {
  type?: "production" | "revenue"
}

export function AdminEnergyChart({ type = "production" }: AdminEnergyChartProps) {
  const data = [
    {
      name: "Mon",
      residential: 4000,
      commercial: 2400,
      industrial: 1800,
      revenue: 24000,
    },
    {
      name: "Tue",
      residential: 4200,
      commercial: 2600,
      industrial: 2100,
      revenue: 26500,
    },
    {
      name: "Wed",
      residential: 4500,
      commercial: 2800,
      industrial: 2300,
      revenue: 28900,
    },
    {
      name: "Thu",
      residential: 4100,
      commercial: 2700,
      industrial: 2200,
      revenue: 27000,
    },
    {
      name: "Fri",
      residential: 4800,
      commercial: 3000,
      industrial: 2500,
      revenue: 31000,
    },
    {
      name: "Sat",
      residential: 5200,
      commercial: 3200,
      industrial: 2700,
      revenue: 33500,
    },
    {
      name: "Sun",
      residential: 5500,
      commercial: 3400,
      industrial: 2900,
      revenue: 35800,
    },
  ]

  return (
    <Chart>
      <ChartContainer>
        <ResponsiveContainer width="100%" height={350}>
          {type === "production" ? (
            <BarChart data={data}>
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
                tickFormatter={(value) => `${value} kWh`}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="rounded-md border bg-background p-2 shadow-md">
                        {payload.map((entry, index) => (
                          <p key={index} className="text-sm">
                            {`${entry.name}: ${entry.value} kWh`}
                          </p>
                        ))}
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Legend />
              <Bar dataKey="residential" fill="hsl(var(--primary))" name="Residential" />
              <Bar dataKey="commercial" fill="hsl(var(--secondary))" name="Commercial" />
              <Bar dataKey="industrial" fill="hsl(var(--accent))" name="Industrial" />
            </BarChart>
          ) : (
            <BarChart data={data}>
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
  )
}

