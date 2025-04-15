"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface ChartProps extends React.HTMLAttributes<HTMLDivElement> {}

const Chart = React.forwardRef<HTMLDivElement, ChartProps>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("", className)} {...props} />
))
Chart.displayName = "Chart"

interface ChartContainerProps extends React.HTMLAttributes<HTMLDivElement> {}

const ChartContainer = React.forwardRef<HTMLDivElement, ChartContainerProps>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("h-[350px] w-full", className)} {...props} />
))
ChartContainer.displayName = "ChartContainer"

interface ChartTooltipProps extends React.HTMLAttributes<HTMLDivElement> {
  content?: React.ReactNode
  cursor?: any
}

const ChartTooltip = React.forwardRef<HTMLDivElement, ChartTooltipProps>(({ content, cursor, ...props }, ref) => (
  <div ref={ref} {...props} />
))
ChartTooltip.displayName = "ChartTooltip"

interface ChartTooltipContentProps extends React.HTMLAttributes<HTMLDivElement> {}

const ChartTooltipContent = React.forwardRef<HTMLDivElement, ChartTooltipContentProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("rounded-md border bg-background px-3 py-2 shadow-md", className)} {...props} />
  ),
)
ChartTooltipContent.displayName = "ChartTooltipContent"

interface ChartTooltipItemProps {
  label: string
  value: string | ((value: any) => string)
  color?: string
  className?: string
}

function ChartTooltipItem({ label, value, color, className }: ChartTooltipItemProps) {
  return (
    <div className={cn("flex items-center justify-between gap-2", className)}>
      <div className="flex items-center gap-1">
        {color && <div className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />}
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
      <p className="text-sm font-medium">{typeof value === "function" ? value("0") : value}</p>
    </div>
  )
}

export { Chart, ChartContainer, ChartTooltip, ChartTooltipContent, ChartTooltipItem }

