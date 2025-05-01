"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { AlertTriangle, Bell, BellOff, Check, Clock, Filter, RefreshCw, Search, Settings, Shield, ShieldAlert, Zap } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/components/auth-provider"
import { installationApi, securityApi } from "@/lib/api"

interface Alert {
  id: string;
  installationId: string;
  type: string;
  message: string;
  description?: string;
  severity: string;
  timestamp: string;
  location?: string;
  status: string;
  resolvedAt?: string;
}

interface Installation {
  id: string;
  name: string;
  status: string;
}

export default function AlertsPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("active")
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState("all")
  const [installations, setInstallations] = useState<Installation[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchData = async () => {
    if (!user) return

    try {
      setRefreshing(true)

      // Step 1: Fetch customer installations
      const installationsData = await installationApi.getCustomerInstallations(user.id)
      if (Array.isArray(installationsData) && installationsData.length > 0) {
        setInstallations(installationsData)

        // Step 2: Fetch alerts for each installation
        let allAlerts: Alert[] = []
        for (const installation of installationsData) {
          const installationAlerts = await securityApi.getInstallationAlerts(installation.id)
          if (Array.isArray(installationAlerts) && installationAlerts.length > 0) {
            // Map the API response to our Alert interface
            const formattedAlerts = installationAlerts.map((alert: any) => ({
              id: alert.id || alert.alertId,
              installationId: installation.id,
              type: mapAlertTypeToUIType(alert.type || alert.tamperType),
              message: alert.message || alert.title || alert.description,
              description: alert.description,
              severity: alert.severity?.toLowerCase() || "medium",
              timestamp: alert.timestamp || alert.createdAt,
              location: alert.location?.address || installation.name,
              status: alert.status || (alert.resolved ? "RESOLVED" : "OPEN"),
              resolvedAt: alert.resolvedAt || alert.resolutionTimestamp
            }))
            allAlerts = [...allAlerts, ...formattedAlerts]
          }
        }

        setAlerts(allAlerts)
      } else {
        setInstallations([])
        toast({
          variant: "destructive",
          title: "No installations found",
          description: "You don't have any registered solar installations to monitor."
        })
      }
    } catch (error) {
      console.error("Error fetching alerts data:", error)
      toast({
        variant: "destructive",
        title: "Failed to load alerts",
        description: "There was a problem loading your system alerts. Please try again later."
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // Map API alert types to UI alert types
  const mapAlertTypeToUIType = (type: string): string => {
    const typeMap: Record<string, string> = {
      "PHYSICAL_INTRUSION": "critical",
      "ORIENTATION_CHANGE": "warning",
      "CONNECTION_MANIPULATION": "critical",
      "TAMPER_DETECTION": "critical",
      "VOLTAGE_FLUCTUATION": "warning",
      "PHYSICAL_MOVEMENT": "critical",
      "UNAUTHORIZED_ACCESS": "critical",
      "CONNECTION_INTERRUPTION": "warning",
      "LOCATION_CHANGE": "warning",
      "HIGH": "critical",
      "MEDIUM": "warning",
      "LOW": "info"
    }

    return typeMap[type?.toUpperCase()] || "info"
  }

  // Load data on component mount
  useEffect(() => {
    fetchData()
  }, [user])

  // Filter alerts based on search term and type
  const activeAlerts = alerts.filter(alert => 
    alert.status.toUpperCase() !== "RESOLVED" && 
    !alert.resolvedAt
  )

  const resolvedAlerts = alerts.filter(alert => 
    alert.status.toUpperCase() === "RESOLVED" || 
    alert.resolvedAt
  )

  const filteredActiveAlerts = activeAlerts.filter(
    (alert) =>
      (alert.message?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        alert.description?.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (filterType === "all" || alert.type === filterType)
  )

  const filteredResolvedAlerts = resolvedAlerts.filter(
    (alert) =>
      (alert.message?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        alert.description?.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (filterType === "all" || alert.type === filterType)
  )

  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return "Unknown"
    const date = new Date(dateString)
    return date.toLocaleString()
  }

  // Get alert type badge
  const getAlertBadge = (type: string) => {
    switch (type) {
      case "critical":
        return <Badge variant="destructive">Critical</Badge>
      case "warning":
        return (
          <Badge variant="default" className="bg-amber-500">
            Warning
          </Badge>
        )
      case "info":
        return (
          <Badge variant="outline" className="text-blue-500">
            Info
          </Badge>
        )
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  // Get icon based on alert type
  const getAlertIcon = (type: string) => {
    switch (type) {
      case "critical":
        return ShieldAlert
      case "warning":
        return AlertTriangle
      case "info":
        return Bell
      default:
        return Bell
    }
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <h1 className="text-2xl font-bold">System Alerts</h1>

        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9 w-[250px]"
              placeholder="Search alerts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="info">Info</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="icon" onClick={fetchData} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Alert Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500">Active Alerts</div>
                <div className="text-2xl font-bold">{activeAlerts.length}</div>
              </div>
              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                <Bell className="h-5 w-5 text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500">Critical</div>
                <div className="text-2xl font-bold">{activeAlerts.filter((a) => a.type === "critical").length}</div>
              </div>
              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500">Warnings</div>
                <div className="text-2xl font-bold">{activeAlerts.filter((a) => a.type === "warning").length}</div>
              </div>
              <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500">Resolved</div>
                <div className="text-2xl font-bold">{resolvedAlerts.length}</div>
              </div>
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                <Check className="h-5 w-5 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alert List */}
      <Card className="border">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle>Alert Management</CardTitle>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Alert Settings
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="active" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="active">Active Alerts</TabsTrigger>
              <TabsTrigger value="resolved">Resolved Alerts</TabsTrigger>
              <TabsTrigger value="settings">Notification Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="active">
              {loading ? (
                <div className="flex items-center justify-center py-10">
                  <div className="flex flex-col items-center text-center">
                    <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                    <p className="mt-2 text-sm text-muted-foreground">Loading alerts...</p>
                  </div>
                </div>
              ) : filteredActiveAlerts.length > 0 ? (
                <div className="space-y-4">
                  {filteredActiveAlerts.map((alert) => {
                    const AlertIcon = getAlertIcon(alert.type)
                    return (
                      <Card key={alert.id} className="border">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            <div
                              className={`flex h-10 w-10 items-center justify-center rounded-full ${
                                alert.type === "critical"
                                  ? "bg-red-100 text-red-500"
                                  : alert.type === "warning"
                                    ? "bg-amber-100 text-amber-500"
                                    : "bg-blue-100 text-blue-500"
                              }`}
                            >
                              <AlertIcon className="h-5 w-5" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <h3 className="font-medium">{alert.message}</h3>
                                  {getAlertBadge(alert.type)}
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-500 flex items-center">
                                    <Clock className="h-3 w-3 mr-1" />
                                    {formatDate(alert.timestamp)}
                                  </span>
                                </div>
                              </div>
                              <p className="text-sm text-gray-500 mt-1">{alert.description || alert.message}</p>
                              {alert.location && (
                                <p className="text-xs text-gray-400 mt-1">Location: {alert.location}</p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="mx-auto h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mb-3">
                    <Check className="h-6 w-6 text-green-500" />
                  </div>
                  <h3 className="text-lg font-medium">No active alerts</h3>
                  <p className="text-sm text-gray-500 mt-1">Your system is running smoothly with no active alerts.</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="resolved">
              {loading ? (
                <div className="flex items-center justify-center py-10">
                  <div className="flex flex-col items-center text-center">
                    <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                    <p className="mt-2 text-sm text-muted-foreground">Loading alerts...</p>
                  </div>
                </div>
              ) : filteredResolvedAlerts.length > 0 ? (
                <div className="space-y-4">
                  {filteredResolvedAlerts.map((alert) => {
                    const AlertIcon = getAlertIcon(alert.type)
                    return (
                      <Card key={alert.id} className="border">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            <div
                              className={`flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-500`}
                            >
                              <AlertIcon className="h-5 w-5" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <h3 className="font-medium">{alert.message}</h3>
                                  <Badge variant="outline">Resolved</Badge>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-500 flex items-center">
                                    <Clock className="h-3 w-3 mr-1" />
                                    {formatDate(alert.timestamp)}
                                  </span>
                                </div>
                              </div>
                              <p className="text-sm text-gray-500 mt-1">{alert.description || alert.message}</p>
                              <div className="flex justify-between mt-1">
                                {alert.location && (
                                  <p className="text-xs text-gray-400">Location: {alert.location}</p>
                                )}
                                {alert.resolvedAt && (
                                  <p className="text-xs text-gray-400">Resolved: {formatDate(alert.resolvedAt)}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="mx-auto h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                    <BellOff className="h-6 w-6 text-gray-500" />
                  </div>
                  <h3 className="text-lg font-medium">No resolved alerts</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    There are no resolved alerts in the selected time period.
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="settings">
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="border">
                    <CardHeader>
                      <CardTitle className="text-lg">Alert Preferences</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">Critical Alerts</h4>
                          <p className="text-sm text-gray-500">Receive notifications for critical system issues</p>
                        </div>
                        <Switch defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">Warning Alerts</h4>
                          <p className="text-sm text-gray-500">Receive notifications for system warnings</p>
                        </div>
                        <Switch defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">Info Alerts</h4>
                          <p className="text-sm text-gray-500">Receive notifications for informational updates</p>
                        </div>
                        <Switch defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">Maintenance Reminders</h4>
                          <p className="text-sm text-gray-500">Receive notifications for scheduled maintenance</p>
                        </div>
                        <Switch defaultChecked />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border">
                    <CardHeader>
                      <CardTitle className="text-lg">Notification Methods</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">Email Notifications</h4>
                          <p className="text-sm text-gray-500">Receive alerts via email</p>
                        </div>
                        <Switch defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">SMS Notifications</h4>
                          <p className="text-sm text-gray-500">Receive alerts via text message</p>
                        </div>
                        <Switch defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">Push Notifications</h4>
                          <p className="text-sm text-gray-500">Receive alerts via mobile app</p>
                        </div>
                        <Switch defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">Dashboard Notifications</h4>
                          <p className="text-sm text-gray-500">Show alerts in the dashboard</p>
                        </div>
                        <Switch defaultChecked />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

// Keep the icon components from the original file
function BatteryLow(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="16" height="10" x="2" y="7" rx="2" ry="2" />
      <line x1="22" x2="22" y1="11" y2="13" />
      <line x1="6" x2="6" y1="11" y2="13" />
    </svg>
  )
}

function Cloud(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
    </svg>
  )
}

function WifiOff(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="2" x2="22" y1="2" y2="22" />
      <path d="M8.5 16.5a5 5 0 0 1 7 0" />
      <path d="M2 8.82a15 15 0 0 1 4.17-2.65" />
      <path d="M10.66 5c4.01-.36 8.14.9 11.34 3.76" />
      <path d="M16.85 11.25a10 10 0 0 1 2.22 1.68" />
      <path d="M5 13a10 10 0 0 1 5.24-2.76" />
      <line x1="12" x2="12.01" y1="20" y2="20" />
    </svg>
  )
}

function Sun(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </svg>
  )
}

function Download(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" x2="12" y1="15" y2="3" />
    </svg>
  )
}
