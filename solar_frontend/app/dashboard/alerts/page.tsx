"use client"

import type React from "react"

import { useState } from "react"
import { AlertTriangle, Bell, BellOff, Check, Clock, Filter, Search, Settings, Shield, Zap } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"

export default function AlertsPage() {
  const [activeTab, setActiveTab] = useState("active")
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState("all")

  // Mock data for alerts
  const activeAlerts = [
    {
      id: 1,
      title: "Low Battery Level",
      description: "Battery level is below 20%. Consider charging or reducing consumption.",
      type: "warning",
      timestamp: "2025-04-01T08:15:00",
      icon: BatteryLow,
    },
    {
      id: 2,
      title: "System Maintenance Required",
      description: "Scheduled maintenance is due in 3 days. Please contact support to schedule.",
      type: "info",
      timestamp: "2025-04-01T07:30:00",
      icon: Settings,
    },
    {
      id: 3,
      title: "Potential Security Breach",
      description: "Unusual access pattern detected. Please verify system security.",
      type: "critical",
      timestamp: "2025-04-01T06:45:00",
      icon: Shield,
    },
    {
      id: 4,
      title: "High Energy Consumption",
      description: "Energy consumption is 35% higher than usual for this time of day.",
      type: "warning",
      timestamp: "2025-04-01T05:20:00",
      icon: Zap,
    },
    {
      id: 5,
      title: "Weather Alert",
      description: "Severe weather expected in your area. System may experience reduced efficiency.",
      type: "warning",
      timestamp: "2025-03-31T22:10:00",
      icon: Cloud,
    },
  ]

  const resolvedAlerts = [
    {
      id: 6,
      title: "Inverter Error",
      description: "Inverter reported error code E-14. Issue has been resolved.",
      type: "critical",
      timestamp: "2025-03-30T14:25:00",
      resolvedAt: "2025-03-30T16:40:00",
      icon: AlertTriangle,
    },
    {
      id: 7,
      title: "Connection Lost",
      description: "System connection was temporarily lost. Connection has been restored.",
      type: "warning",
      timestamp: "2025-03-29T09:15:00",
      resolvedAt: "2025-03-29T10:30:00",
      icon: WifiOff,
    },
    {
      id: 8,
      title: "Panel Efficiency Low",
      description: "Solar panel efficiency was below threshold. Issue resolved after cleaning.",
      type: "warning",
      timestamp: "2025-03-28T11:40:00",
      resolvedAt: "2025-03-28T15:20:00",
      icon: Sun,
    },
    {
      id: 9,
      title: "Software Update Required",
      description: "System software update was required. Update has been completed.",
      type: "info",
      timestamp: "2025-03-27T08:30:00",
      resolvedAt: "2025-03-27T09:45:00",
      icon: Download,
    },
    {
      id: 10,
      title: "Grid Connection Issue",
      description: "Grid connection was unstable. Issue has been resolved.",
      type: "critical",
      timestamp: "2025-03-26T16:20:00",
      resolvedAt: "2025-03-26T18:15:00",
      icon: Zap,
    },
  ]

  // Filter alerts based on search term and type
  const filteredActiveAlerts = activeAlerts.filter(
    (alert) =>
      (alert.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        alert.description.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (filterType === "all" || alert.type === filterType),
  )

  const filteredResolvedAlerts = resolvedAlerts.filter(
    (alert) =>
      (alert.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        alert.description.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (filterType === "all" || alert.type === filterType),
  )

  // Format date for display
  const formatDate = (dateString: string) => {
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

          <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
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
              {filteredActiveAlerts.length > 0 ? (
                <div className="space-y-4">
                  {filteredActiveAlerts.map((alert) => (
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
                            <alert.icon className="h-5 w-5" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <h3 className="font-medium">{alert.title}</h3>
                                {getAlertBadge(alert.type)}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500 flex items-center">
                                  <Clock className="h-3 w-3 mr-1" />
                                  {formatDate(alert.timestamp)}
                                </span>
                                <Button variant="ghost" size="sm">
                                  <Check className="h-4 w-4 mr-1" />
                                  Resolve
                                </Button>
                              </div>
                            </div>
                            <p className="text-sm text-gray-500 mt-1">{alert.description}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
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
              {filteredResolvedAlerts.length > 0 ? (
                <div className="space-y-4">
                  {filteredResolvedAlerts.map((alert) => (
                    <Card key={alert.id} className="border">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-500">
                            <alert.icon className="h-5 w-5" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <h3 className="font-medium">{alert.title}</h3>
                                <Badge variant="outline" className="text-gray-500">
                                  Resolved
                                </Badge>
                              </div>
                              <div>
                                <span className="text-xs text-gray-500 flex items-center">
                                  <Clock className="h-3 w-3 mr-1" />
                                  Resolved: {formatDate(alert.resolvedAt)}
                                </span>
                              </div>
                            </div>
                            <p className="text-sm text-gray-500 mt-1">{alert.description}</p>
                            <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                              <span>Occurred: {formatDate(alert.timestamp)}</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
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

                <Card className="border">
                  <CardHeader>
                    <CardTitle className="text-lg">Alert Schedule</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">Quiet Hours</h4>
                          <p className="text-sm text-gray-500">Disable non-critical alerts during specified hours</p>
                        </div>
                        <Switch />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium">Start Time</label>
                          <Select disabled>
                            <SelectTrigger>
                              <SelectValue placeholder="10:00 PM" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="10pm">10:00 PM</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-sm font-medium">End Time</label>
                          <Select disabled>
                            <SelectTrigger>
                              <SelectValue placeholder="7:00 AM" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="7am">7:00 AM</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-end">
                  <Button>Save Settings</Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

// Additional components
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
      <line x1="10" x2="10" y1="11" y2="13" />
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

