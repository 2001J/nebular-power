"use client"

import { useState, useEffect } from "react"
import { ShieldAlert, AlertTriangle, Zap, User, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { securityApi } from "@/lib/api"
import { format, parseISO } from "date-fns"
import { Badge } from "@/components/ui/badge"

export function AdminSecurityAlerts() {
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        setLoading(true)
        const data = await securityApi.getTamperEvents()
        if (Array.isArray(data) && data.length > 0) {
          // Map API data to our UI format
          const formattedAlerts = data.map(alert => ({
            id: alert.id || alert.alertId,
            type: mapAlertTypeToUIType(alert.severity || alert.eventType),
            eventType: alert.eventType || alert.tamperType || alert.type || "Unknown Alert Type",
            message: alert.description || "Security alert detected",
            timestamp: formatDate(alert.timestamp),
            location: alert.installationLocation || `Installation #${alert.installationId}`,
            icon: getIconForAlertType(alert.severity || alert.eventType)
          }))
          setAlerts(formattedAlerts)
        } else {
          setAlerts([])
        }
      } catch (error) {
        console.error("Error fetching security alerts:", error)
        setAlerts([])
      } finally {
        setLoading(false)
      }
    }

    fetchAlerts()
  }, [])

  // Map API alert types to UI alert types
  const mapAlertTypeToUIType = (type) => {
    const criticalTypes = ["HIGH", "CRITICAL", "PHYSICAL_INTRUSION", "PHYSICAL_MOVEMENT", "CONNECTION_MANIPULATION", "PHYSICAL_TAMPER"]
    const warningTypes = ["MEDIUM", "WARNING", "VOLTAGE_FLUCTUATION", "ORIENTATION_CHANGE", "LOCATION_CHANGE", "VOLTAGE_TAMPER"]

    if (criticalTypes.includes(type?.toUpperCase())) return "critical"
    if (warningTypes.includes(type?.toUpperCase())) return "warning"
    return "info"
  }

  // Get icon based on alert type
  const getIconForAlertType = (type) => {
    const typeUpper = type?.toUpperCase()

    if (typeUpper === "PHYSICAL_INTRUSION" || typeUpper === "PHYSICAL_MOVEMENT" || typeUpper === "HIGH" || typeUpper === "PHYSICAL_TAMPER") 
      return ShieldAlert
    if (typeUpper === "VOLTAGE_FLUCTUATION" || typeUpper === "MEDIUM" || typeUpper === "VOLTAGE_TAMPER") 
      return AlertTriangle
    if (typeUpper === "CONNECTION_MANIPULATION" || typeUpper === "CONNECTION_INTERRUPTION" || typeUpper === "CONNECTION_TAMPER") 
      return Zap
    if (typeUpper === "LOCATION_CHANGE" || typeUpper === "LOCATION_TAMPER")
      return User
    return ShieldAlert
  }

  // Format alert type for display
  const formatAlertType = (eventType) => {
    if (!eventType) return "Unknown";
    
    // Replace underscores with spaces and capitalize each word
    return eventType
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  // Get alert badge based on type
  const getAlertBadge = (type) => {
    if (type === "critical") {
      return <Badge variant="destructive">Critical</Badge>;
    }
    
    if (type === "warning") {
      return <Badge className="bg-amber-500">Warning</Badge>;
    }
    
    return <Badge variant="outline">Info</Badge>;
  }

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return "Unknown time"
    try {
      return format(parseISO(dateString), "MMM d, h:mm a")
    } catch (error) {
      return dateString
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2">Loading security alerts...</span>
      </div>
    )
  }

  if (alerts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-center">
        <ShieldAlert className="h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-muted-foreground">No security alerts found</p>
        <p className="text-muted-foreground text-sm mt-1">
          There are currently no security alerts in the system. Alerts will appear here when tamper events are detected.
        </p>
        <div className="mt-4">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => window.location.href = "/admin/security/alerts"}
          >
            View Security Dashboard
          </Button>
        </div>
      </div>
    )
  }

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
            <div className="flex items-center gap-2 mt-1">
              {getAlertBadge(alert.type)}
              <span className="text-sm font-medium">{formatAlertType(alert.eventType)}</span>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => window.location.href = "/admin/security/alerts"}>
            View
          </Button>
        </div>
      ))}
      <div className="flex justify-end">
        <Button variant="link" size="sm" onClick={() => window.location.href = "/admin/security/alerts"}>
          View all alerts
        </Button>
      </div>
    </div>
  )
}
