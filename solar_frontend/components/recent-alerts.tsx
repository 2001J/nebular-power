"use client"

import { BatteryWarning, Info, ShieldAlert, Zap } from "lucide-react"

export function RecentAlerts() {
  const alerts = [
    {
      id: 1,
      type: "warning",
      message: "Battery level below 20%",
      timestamp: "Today, 2:45 PM",
      icon: BatteryWarning,
    },
    {
      id: 2,
      type: "info",
      message: "System maintenance scheduled",
      timestamp: "Today, 10:30 AM",
      icon: Info,
    },
    {
      id: 3,
      type: "error",
      message: "Potential tampering detected",
      timestamp: "Yesterday, 8:15 PM",
      icon: ShieldAlert,
    },
    {
      id: 4,
      type: "warning",
      message: "High energy consumption detected",
      timestamp: "Yesterday, 3:20 PM",
      icon: Zap,
    },
  ]

  return (
    <div className="space-y-4">
      {alerts.map((alert) => (
        <div key={alert.id} className="flex items-start gap-4 rounded-lg border p-3">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full ${
              alert.type === "error"
                ? "bg-destructive/10 text-destructive"
                : alert.type === "warning"
                  ? "bg-amber-500/10 text-amber-500"
                  : "bg-blue-500/10 text-blue-500"
            }`}
          >
            <alert.icon className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <p className="font-medium">{alert.message}</p>
            <p className="text-sm text-muted-foreground">{alert.timestamp}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

