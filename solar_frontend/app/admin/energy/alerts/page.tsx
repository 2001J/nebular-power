"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Download,
  Filter,
  Search,
  ShieldAlert,
  XCircle,
  Zap,
  MoreHorizontal,
} from "lucide-react"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import { energyApi } from "@/lib/api"
import { energyWebSocket } from "@/lib/energyWebSocket"

export default function AlertsDashboardPage() {
  const router = useRouter()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [alerts, setAlerts] = useState([])
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [severityFilter, setSeverityFilter] = useState("all")

  // Fetch alerts data
  useEffect(() => {
    const fetchAlerts = async () => {
      setLoading(true)
      try {
        // Prepare filter parameters
        const params = {}
        if (severityFilter !== "all") {
          params.severity = severityFilter
        }
        if (statusFilter !== "all") {
          params.status = statusFilter
        }

        // Fetch alerts from API
        const alertsData = await energyApi.getAlerts(params)

        if (alertsData && Array.isArray(alertsData)) {
          setAlerts(alertsData)
        } else {
          // Set empty array if no alerts are available
          setAlerts([])
        }
      } catch (error) {
        console.error("Error fetching alerts:", error)
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load alert data from the server.",
        })
        // Reset data on error
        setAlerts([])
      } finally {
        setLoading(false)
      }
    }

    fetchAlerts()

    // Set up WebSocket for real-time alerts
    let wsConnection = null

    try {
      wsConnection = energyWebSocket.createAlertsMonitor(
        // Message handler
        (data) => {
          if (data.type === 'ALERT_UPDATE') {
            // Add new alert to the list
            setAlerts(prevAlerts => {
              // Check if alert already exists
              const existingIndex = prevAlerts.findIndex(a => a.id === data.payload.id)

              if (existingIndex >= 0) {
                // Update existing alert
                const updatedAlerts = [...prevAlerts]
                updatedAlerts[existingIndex] = data.payload
                return updatedAlerts
              } else {
                // Add new alert
                return [data.payload, ...prevAlerts]
              }
            })

            // Show a toast notification for new alerts
            toast({
              title: `New ${data.payload.severity} Alert`,
              description: data.payload.description,
              variant: data.payload.severity === "high" ? "destructive" : "default"
            })
          }
        },
        // Error handler
        (error) => {
          console.error('WebSocket error:', error)
        }
      )
    } catch (error) {
      console.error('Error setting up WebSocket:', error)
    }

    // Clean up WebSocket connection
    return () => {
      if (wsConnection) {
        wsConnection.close()
      }
    }
  }, [statusFilter, severityFilter, toast])

  // Filter alerts based on search term
  const filteredAlerts = alerts.filter(alert => {
    if (!searchTerm) return true

    const searchLower = searchTerm.toLowerCase()
    return (
      (alert.type && alert.type.toLowerCase().includes(searchLower)) ||
      (alert.installationName && alert.installationName.toLowerCase().includes(searchLower)) ||
      (alert.customerName && alert.customerName.toLowerCase().includes(searchLower)) ||
      (alert.description && alert.description.toLowerCase().includes(searchLower))
    )
  })

  // Get counts for dashboard metrics
  const activeAlerts = alerts.filter(alert => alert.status === "active")
  const highSeverityAlerts = activeAlerts.filter(alert => alert.severity === "high")
  const mediumSeverityAlerts = activeAlerts.filter(alert => alert.severity === "medium")
  const lowSeverityAlerts = activeAlerts.filter(alert => alert.severity === "low")

  // Handle export alerts data
  const handleExportData = () => {
    // Create CSV data
    const headers = ["ID", "Type", "Severity", "Status", "Installation", "Customer", "Time", "Description", "Resolution Time"]
    const csvData = filteredAlerts.map(alert => [
      alert.id,
      alert.type,
      alert.severity,
      alert.status,
      alert.installationName,
      alert.customerName,
      new Date(alert.timestamp).toLocaleString(),
      alert.description,
      alert.resolutionTime ? new Date(alert.resolutionTime).toLocaleString() : "N/A"
    ])

    // Add headers to top of file
    csvData.unshift(headers)

    // Convert to CSV string
    const csvString = csvData.map(row => row.join(',')).join('\n')

    // Create download link
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `energy_alerts_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast({
      title: "Export successful",
      description: `Exported ${filteredAlerts.length} alerts to CSV file.`,
    })
  }

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleString()
  }

  // Get severity badge style
  const getSeverityBadge = (severity) => {
    switch (severity) {
      case "high":
        return <Badge className="bg-red-500">High</Badge>
      case "medium":
        return <Badge className="bg-amber-500">Medium</Badge>
      case "low":
        return <Badge className="bg-blue-500">Low</Badge>
      default:
        return <Badge>Unknown</Badge>
    }
  }

  // Get status badge style
  const getStatusBadge = (status) => {
    switch (status) {
      case "active":
        return <Badge className="bg-red-500">Active</Badge>
      case "resolved":
        return <Badge className="bg-green-500">Resolved</Badge>
      default:
        return <Badge>Unknown</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <Breadcrumb className="mb-2">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/admin">Admin</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href="/admin/energy">Energy Monitoring</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Alerts Dashboard</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => router.back()} className="mr-2">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Alerts Dashboard</h1>
          </div>
          <p className="text-muted-foreground">
            Monitor and manage system alerts across all installations
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handleExportData}>
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Alert Summary Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{activeAlerts.length}</div>
            <div className="flex items-center text-sm text-muted-foreground">
              <AlertTriangle className="mr-1 h-4 w-4 text-amber-500" />
              Requiring attention
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">High Severity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{highSeverityAlerts.length}</div>
            <div className="flex items-center text-sm text-muted-foreground">
              <ShieldAlert className="mr-1 h-4 w-4 text-red-500" />
              Critical alerts
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Medium Severity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{mediumSeverityAlerts.length}</div>
            <div className="flex items-center text-sm text-muted-foreground">
              <AlertTriangle className="mr-1 h-4 w-4 text-amber-500" />
              Warning alerts
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Low Severity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{lowSeverityAlerts.length}</div>
            <div className="flex items-center text-sm text-muted-foreground">
              <Zap className="mr-1 h-4 w-4 text-blue-500" />
              Information alerts
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts Table */}
      <Card>
        <CardHeader>
          <CardTitle>System Alerts</CardTitle>
          <CardDescription>
            {filteredAlerts.length} alerts found
          </CardDescription>

          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search alerts..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>

              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severities</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Installation</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Customer</TableHead>
                  <TableHead className="hidden md:table-cell">Time</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      <div className="flex justify-center items-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        <span className="ml-2">Loading alerts...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredAlerts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-48 text-center">
                      <div className="flex flex-col items-center justify-center py-8">
                        <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium">No Alerts Found</h3>
                        {searchTerm || statusFilter !== "all" || severityFilter !== "all" ? (
                          <>
                            <p className="text-sm text-muted-foreground max-w-md mt-2">
                              No alerts match your current filters. Try changing your search criteria.
                            </p>
                            <div className="flex gap-2 mt-4">
                              <Button variant="outline" onClick={() => {
                                setSearchTerm("");
                                setStatusFilter("all");
                                setSeverityFilter("all");
                              }}>
                                Clear Filters
                              </Button>
                            </div>
                          </>
                        ) : (
                          <p className="text-sm text-muted-foreground max-w-md mt-2">
                            There are no active alerts in the system at this time. All systems appear to be functioning normally.
                          </p>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAlerts.map((alert) => (
                    <TableRow key={alert.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell>{alert.type}</TableCell>
                      <TableCell>
                        {alert.installationName ? (
                          <Button
                            variant="link"
                            className="p-0 h-auto"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/admin/energy/installation/${alert.installationId}`)
                            }}
                          >
                            {alert.installationName}
                          </Button>
                        ) : "N/A"}
                      </TableCell>
                      <TableCell>{getSeverityBadge(alert.severity)}</TableCell>
                      <TableCell>{getStatusBadge(alert.status)}</TableCell>
                      <TableCell className="hidden md:table-cell">{alert.customerName || "N/A"}</TableCell>
                      <TableCell className="hidden md:table-cell">{formatDate(alert.timestamp)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        <CardFooter className="border-t p-4 flex justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {filteredAlerts.length} of {alerts.length} alerts
          </div>
          <Button variant="outline" onClick={() => router.push("/admin/energy")}>
            Return to Dashboard
          </Button>
        </CardFooter>
      </Card>

      {/* Tabs for different alert views */}
      <Tabs defaultValue="recent" className="w-full">
        <TabsList className="grid w-full md:w-auto grid-cols-2 md:grid-cols-3">
          <TabsTrigger value="recent">Recent Alerts</TabsTrigger>
          <TabsTrigger value="installations">By Installation</TabsTrigger>
          <TabsTrigger value="types">By Alert Type</TabsTrigger>
        </TabsList>

        <TabsContent value="recent" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Alerts Timeline</CardTitle>
              <CardDescription>Chronological view of recent system alerts</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : filteredAlerts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No alerts found
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Display recent alerts in a timeline format */}
                  {filteredAlerts.slice(0, 5).map((alert) => (
                    <div key={alert.id} className="flex">
                      <div className="mr-4 flex flex-col items-center">
                        <div className={`rounded-full p-2 ${alert.severity === "high" ? "bg-red-100 text-red-600" :
                          alert.severity === "medium" ? "bg-amber-100 text-amber-600" :
                            "bg-blue-100 text-blue-600"
                          }`}>
                          <AlertTriangle className="h-5 w-5" />
                        </div>
                        <div className="h-full w-px bg-border mt-2"></div>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold">{alert.type}</h4>
                          {getStatusBadge(alert.status)}
                        </div>
                        <p className="text-sm text-muted-foreground mb-1">{alert.description}</p>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {formatDate(alert.timestamp)}
                          </span>
                          <span className="text-muted-foreground">
                            {alert.installationName}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="installations" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Alerts by Installation</CardTitle>
              <CardDescription>Alert distribution across installations</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">This feature will be implemented in the next iteration.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="types" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Alerts by Type</CardTitle>
              <CardDescription>Distribution of different alert categories</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">This feature will be implemented in the next iteration.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 