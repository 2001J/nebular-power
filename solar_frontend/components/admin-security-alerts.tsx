"use client"

import { ShieldAlert, AlertTriangle, Zap, User } from "lucide-react"
import { Button } from "@/components/ui/button"

export function AdminSecurityAlerts() {
  const alerts = [
    {
      id: 1,
      type: "critical",
      message: "Tampering detected at installation #1245",
      timestamp: "Today, 2:45 PM",
      location: "123 Main St, Anytown",
      icon: ShieldAlert,
    },
    {
      id: 2,
      type: "warning",
      message: "Unusual energy consumption pattern",
      timestamp: "Today, 1:30 PM",
      location: "456 Oak Ave, Somewhere",
      icon: Zap,
    },
    {
      id: 3,
      type: "critical",
      message: "Unauthorized access attempt",
      timestamp: "Today, 11:15 AM",
      location: "789 Pine Rd, Elsewhere",
      icon: User,
    },
    {
      id: 4,
      type: "warning",
      message: "Battery temperature above threshold",
      timestamp: "Today, 9:20 AM",
      location: "101 Elm St, Nowhere",
      icon: AlertTriangle,
    },
  ]

  return (
    <div className="space-y-4">
      {alerts.map((alert) => (
        <div key={alert.id} className="flex items-start gap-4 rounded-lg border p-3">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full ${
              alert.type === "critical" ? "bg-destructive/10 text-destructive" : "bg-amber-500/10 text-amber-500"
            }`}
          >
            <alert.icon className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <p className="font-medium">{alert.message}</p>
            <p className="text-sm text-muted-foreground">{alert.location}</p>
            <p className="text-sm text-muted-foreground">{alert.timestamp}</p>
          </div>
          <Button variant="outline" size="sm">
            View
          </Button>
        </div>
      ))}
    </div>
  )
}

