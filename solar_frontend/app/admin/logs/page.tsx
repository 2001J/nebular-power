"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import {
  Search,
  RefreshCw,
  Filter,
  Clock,
  Download,
  CheckCircle,
  XCircle,
  Info,
  AlertTriangle,
  ArrowUpDown,
  Loader2
} from "lucide-react"

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "@/components/ui/use-toast"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { serviceControlApi, installationApi, securityApi } from "@/lib/api"

export default function LogsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [logs, setLogs] = useState([])
  const [securityLogs, setSecurityLogs] = useState([])
  const [installations, setInstallations] = useState([])
  const [searchTerm, setSearchTerm] = useState("")
  const [logType, setLogType] = useState("all")
  const [activeTab, setActiveTab] = useState("operational")
  const [timeRange, setTimeRange] = useState("today")
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(20)
  const [sortField, setSortField] = useState("timestamp")
  const [sortDirection, setSortDirection] = useState("desc")

  // Load installation data for filtering
  useEffect(() => {
    const fetchInstallations = async () => {
      try {
        const response = await installationApi.getAllInstallations()
        setInstallations(response.content || [])
      } catch (error) {
        console.error("Error fetching installations:", error)
      }
    }

    fetchInstallations()
  }, [])

  // Load log data
  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true)

        // Determine date range
        const endDate = new Date()
        let startDate

        switch (timeRange) {
          case 'today':
            startDate = new Date()
            startDate.setHours(0, 0, 0, 0)
            break
          case 'yesterday':
            startDate = new Date()
            startDate.setDate(startDate.getDate() - 1)
            startDate.setHours(0, 0, 0, 0)
            endDate.setDate(endDate.getDate() - 1)
            endDate.setHours(23, 59, 59, 999)
            break
          case 'week':
            startDate = new Date()
            startDate.setDate(startDate.getDate() - 7)
            break
          case 'month':
            startDate = new Date()
            startDate.setMonth(startDate.getMonth() - 1)
            break
          default:
            startDate = new Date()
            startDate.setHours(0, 0, 0, 0)
        }

        let logsData = []

        try {
          // Use the time range API endpoint
          logsData = await serviceControlApi.getLogsByTimeRange(
            startDate.toISOString(),
            endDate.toISOString()
          )

          // Filter by operation/source if needed
          if (logType !== "all") {
            if (logType.startsWith("op_")) {
              // Filter by operation
              const operation = logType.replace("op_", "")
              logsData = await serviceControlApi.getLogsByOperation(operation)
            } else if (logType.startsWith("src_")) {
              // Filter by source system
              const source = logType.replace("src_", "")
              logsData = await serviceControlApi.getLogsBySourceSystem(source)
            }
          }

          setLogs(logsData)
        } catch (error) {
          console.error("Error fetching logs data:", error)
          toast({
            title: "Error",
            description: "Failed to load logs data. Please try again.",
            variant: "destructive",
          })

          // Set empty logs
          setLogs([])
        }
      } catch (error) {
        console.error("Error in logs fetch:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchLogs()
  }, [timeRange, logType, page, pageSize])

  // Handle refreshing logs
  const handleRefreshLogs = () => {
    if (activeTab === "operational") {
      setLoading(true)

      // Refresh operational logs...
      // ... existing operational logs refresh code ...
    } else if (activeTab === "security") {
      handleFetchSecurityLogs()
    }
  }

  // Handle fetching security logs
  const handleFetchSecurityLogs = async () => {
    try {
      setLoading(true)

      // Determine date range
      const endDate = new Date()
      let startDate

      switch (timeRange) {
        case 'today':
          startDate = new Date()
          startDate.setHours(0, 0, 0, 0)
          break
        case 'yesterday':
          startDate = new Date()
          startDate.setDate(startDate.getDate() - 1)
          startDate.setHours(0, 0, 0, 0)
          endDate.setDate(endDate.getDate() - 1)
          endDate.setHours(23, 59, 59, 999)
          break
        case 'week':
          startDate = new Date()
          startDate.setDate(startDate.getDate() - 7)
          break
        case 'month':
          startDate = new Date()
          startDate.setMonth(startDate.getMonth() - 1)
          break
        default:
          startDate = new Date()
          startDate.setHours(0, 0, 0, 0)
      }

      let securityLogsData = []

      try {
        // First try to get user security logs
        securityLogsData = await securityApi.getUserSecurityLogs()

        // If we have an activity type filter
        if (logType !== "all") {
          // Filter by activity type
          securityLogsData = await securityApi.getLogsByActivityType(
            null, // No specific installation
            logType
          )
        }

        // If no logs are found, get installation logs for all installations
        if (!securityLogsData || securityLogsData.length === 0) {
          for (const installation of installations) {
            try {
              const installationLogs = await securityApi.getLogsByTimeRange(
                installation.id,
                startDate.toISOString(),
                endDate.toISOString()
              )

              if (installationLogs && Array.isArray(installationLogs)) {
                securityLogsData = [...securityLogsData, ...installationLogs]
              }
            } catch (error) {
              console.error(`Error fetching security logs for installation ${installation.id}:`, error)
            }
          }
        }

        setSecurityLogs(securityLogsData)

        if (securityLogsData.length > 0) {
          toast({
            title: "Security Logs Refreshed",
            description: "The security audit logs have been refreshed."
          })
        } else {
          toast({
            title: "No Security Logs",
            description: "No security logs found for the selected filters."
          })
        }
      } catch (error) {
        console.error("Error fetching security logs:", error)
        toast({
          title: "Error",
          description: "Failed to load security logs. Please try again.",
          variant: "destructive",
        })

        // Set empty logs
        setSecurityLogs([])
      }
    } catch (error) {
      console.error("Error in security logs fetch:", error)
    } finally {
      setLoading(false)
    }
  }

  // Handle tab change
  const handleTabChange = (value) => {
    setActiveTab(value)

    if (value === "security" && securityLogs.length === 0) {
      // Load security logs when tab is first opened
      handleFetchSecurityLogs()
    }
  }

  // Filter logs based on search term
  const filteredLogs = logs.filter(log =>
    log.operation?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.sourceSystem?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.message?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.installationId?.toString().includes(searchTerm) ||
    log.userId?.toString().includes(searchTerm)
  )

  // Get status badge for log status
  const getStatusBadge = (status) => {
    if (!status) return <Badge variant="outline">Unknown</Badge>

    switch (status.toLowerCase()) {
      case 'success':
        return <Badge variant="success">Success</Badge>
      case 'failure':
      case 'error':
        return <Badge variant="destructive">Failure</Badge>
      case 'warning':
        return <Badge variant="warning">Warning</Badge>
      case 'info':
        return <Badge variant="secondary">Info</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  // Get icon for log type
  const getLogIcon = (status) => {
    if (!status) return <Info className="h-4 w-4" />

    switch (status.toLowerCase()) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failure':
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case 'info':
        return <Info className="h-4 w-4 text-blue-500" />
      default:
        return <Info className="h-4 w-4" />
    }
  }

  // Handle sorting
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  // Actually sort the logs
  const sortedLogs = [...filteredLogs].sort((a, b) => {
    let aValue = a[sortField]
    let bValue = b[sortField]

    // Handle dates for timestamp
    if (sortField === "timestamp") {
      aValue = new Date(a.timestamp).getTime()
      bValue = new Date(b.timestamp).getTime()
    }

    if (sortDirection === "asc") {
      return aValue > bValue ? 1 : -1
    } else {
      return aValue < bValue ? 1 : -1
    }
  })

  // Export logs as CSV
  const handleExportLogs = () => {
    if (sortedLogs.length === 0) {
      toast({
        title: "No Logs to Export",
        description: "There are no logs to export with the current filters.",
        variant: "destructive",
      })
      return
    }

    try {
      // Convert logs to CSV format
      const headers = ["Timestamp", "Operation", "Status", "Source", "Installation ID", "User ID", "Message"]
      const rows = sortedLogs.map(log => [
        log.timestamp ? new Date(log.timestamp).toISOString() : "",
        log.operation || "",
        log.status || "",
        log.sourceSystem || "",
        log.installationId || "",
        log.userId || "",
        log.message || ""
      ])

      // Create CSV content
      const csvContent = [
        headers.join(","),
        ...rows.map(row => row.join(","))
      ].join("\n")

      // Create download link
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.setAttribute("href", url)
      link.setAttribute("download", `service_logs_${new Date().toISOString().split("T")[0]}.csv`)
      link.style.visibility = "hidden"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast({
        title: "Logs Exported",
        description: `${sortedLogs.length} logs exported to CSV file.`
      })
    } catch (error) {
      console.error("Error exporting logs:", error)
      toast({
        title: "Export Failed",
        description: "Failed to export logs to CSV. Please try again.",
        variant: "destructive",
      })
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
                <BreadcrumbPage>System Logs</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">System Logs</h1>
          <p className="text-muted-foreground">
            View and analyze operational logs across all systems.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExportLogs}>
            <Download className="h-4 w-4 mr-2" />
            Export Logs
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <Tabs defaultValue="operational" className="w-full" onValueChange={handleTabChange}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="operational">Operational Logs</TabsTrigger>
                <TabsTrigger value="security">Security Logs</TabsTrigger>
              </TabsList>

              <TabsContent value="operational">
                <CardTitle>Operational Logs</CardTitle>
                <CardDescription>
                  View system logs from all services and installations.
                </CardDescription>

                <div className="flex flex-col sm:flex-row gap-4 mt-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search logs..."
                      className="pl-8"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Select value={logType} onValueChange={setLogType}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Log Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="op_SERVICE_STATUS_CHANGE">Status Change</SelectItem>
                        <SelectItem value="op_DEVICE_COMMAND">Device Command</SelectItem>
                        <SelectItem value="op_MAINTENANCE">Maintenance</SelectItem>
                        <SelectItem value="op_SECURITY_ALERT">Security Alert</SelectItem>
                        <SelectItem value="op_PAYMENT_EVENT">Payment Event</SelectItem>
                        <SelectItem value="src_SERVICE_CONTROL">Service Control</SelectItem>
                        <SelectItem value="src_SECURITY">Security System</SelectItem>
                        <SelectItem value="src_PAYMENT">Payment System</SelectItem>
                        <SelectItem value="src_DEVICE">Device</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={timeRange} onValueChange={setTimeRange}>
                      <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Time Range" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="today">Today</SelectItem>
                        <SelectItem value="yesterday">Yesterday</SelectItem>
                        <SelectItem value="week">Last 7 Days</SelectItem>
                        <SelectItem value="month">Last 30 Days</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button variant="outline" size="icon" onClick={handleRefreshLogs}>
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="security">
                <CardTitle>Security Audit Logs</CardTitle>
                <CardDescription>
                  View security system audit logs and tamper detection events.
                </CardDescription>

                <div className="flex flex-col sm:flex-row gap-4 mt-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search security logs..."
                      className="pl-8"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Select defaultValue="all" onValueChange={(value) => setLogType(value)}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Activity Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Activities</SelectItem>
                        <SelectItem value="LOGIN">Authentication</SelectItem>
                        <SelectItem value="TAMPER_DETECTION">Tamper Detection</SelectItem>
                        <SelectItem value="CONFIGURATION">Configuration Change</SelectItem>
                        <SelectItem value="ACCESS_CONTROL">Access Control</SelectItem>
                        <SelectItem value="ALERT_MANAGEMENT">Alert Management</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select defaultValue="week" onValueChange={(value) => setTimeRange(value)}>
                      <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Time Range" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="today">Today</SelectItem>
                        <SelectItem value="yesterday">Yesterday</SelectItem>
                        <SelectItem value="week">Last 7 Days</SelectItem>
                        <SelectItem value="month">Last 30 Days</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button variant="outline" size="icon" onClick={() => handleFetchSecurityLogs()}>
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardHeader>

          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="flex flex-col items-center space-y-4">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Loading logs...</p>
                </div>
              </div>
            ) : (
              <>
                {sortedLogs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 space-y-4">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
                      <Search className="h-10 w-10 text-muted-foreground" />
                    </div>
                    <div className="text-center space-y-2">
                      <h3 className="text-lg font-semibold">No logs found</h3>
                      <p className="text-sm text-muted-foreground">
                        {searchTerm ? (
                          <>No logs match your search criteria. Try adjusting your filters.</>
                        ) : (
                          <>No logs found for the selected time period and filters.</>
                        )}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[180px]">
                            <Button
                              variant="ghost"
                              className="p-0 font-medium"
                              onClick={() => handleSort("timestamp")}
                            >
                              Timestamp
                              {sortField === "timestamp" && (
                                <ArrowUpDown className="ml-2 h-4 w-4" />
                              )}
                            </Button>
                          </TableHead>
                          <TableHead>
                            <Button
                              variant="ghost"
                              className="p-0 font-medium"
                              onClick={() => handleSort("operation")}
                            >
                              Operation
                              {sortField === "operation" && (
                                <ArrowUpDown className="ml-2 h-4 w-4" />
                              )}
                            </Button>
                          </TableHead>
                          <TableHead>
                            <Button
                              variant="ghost"
                              className="p-0 font-medium"
                              onClick={() => handleSort("status")}
                            >
                              Status
                              {sortField === "status" && (
                                <ArrowUpDown className="ml-2 h-4 w-4" />
                              )}
                            </Button>
                          </TableHead>
                          <TableHead>Source</TableHead>
                          <TableHead>Installation</TableHead>
                          <TableHead>User</TableHead>
                          <TableHead className="w-1/4">Message</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sortedLogs.map((log, index) => {
                          // Get installation name
                          const installation = installations.find(i => i.id === log.installationId)

                          return (
                            <TableRow key={log.id || index}>
                              <TableCell className="font-mono text-xs">
                                {log.timestamp ? format(new Date(log.timestamp), "yyyy-MM-dd HH:mm:ss") : "N/A"}
                              </TableCell>
                              <TableCell>{log.operation || "N/A"}</TableCell>
                              <TableCell>
                                <div className="flex items-center">
                                  {getLogIcon(log.status)}
                                  <span className="ml-2">{getStatusBadge(log.status)}</span>
                                </div>
                              </TableCell>
                              <TableCell>{log.sourceSystem || "N/A"}</TableCell>
                              <TableCell>
                                {log.installationId
                                  ? installation
                                    ? installation.name
                                    : `Installation #${log.installationId}`
                                  : "N/A"}
                              </TableCell>
                              <TableCell>{log.userId || "System"}</TableCell>
                              <TableCell className="max-w-md truncate" title={log.message}>
                                {log.message || "No message"}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {sortedLogs.length > 0 && (
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-muted-foreground">
                      Showing {sortedLogs.length} of {filteredLogs.length} logs
                    </p>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(Math.max(0, page - 1))}
                        disabled={page === 0}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(page + 1)}
                        disabled={sortedLogs.length < pageSize}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Log Distribution</CardTitle>
              <CardDescription>Distribution of logs by operation type</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : logs.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-sm text-muted-foreground">No data available</p>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center">
                  {/* Simple visualization for now */}
                  <div className="space-y-2 w-full max-w-sm">
                    {(() => {
                      // Calculate operation type distribution
                      const operationCounts = {}
                      logs.forEach(log => {
                        const operation = log.operation || "Unknown"
                        operationCounts[operation] = (operationCounts[operation] || 0) + 1
                      })

                      return Object.entries(operationCounts)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 5)
                        .map(([operation, count]) => {
                          const percentage = Math.round((count / logs.length) * 100)
                          return (
                            <div key={operation} className="space-y-1">
                              <div className="flex justify-between text-sm">
                                <span>{operation}</span>
                                <span>{percentage}%</span>
                              </div>
                              <div className="h-2 rounded-full bg-secondary overflow-hidden">
                                <div
                                  className="h-full bg-primary"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          )
                        })
                    })()}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Log Status</CardTitle>
              <CardDescription>Success vs. failure rate</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : logs.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-sm text-muted-foreground">No data available</p>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center">
                  {/* Calculate success/failure rates */}
                  {(() => {
                    const statusCounts = { success: 0, failure: 0, warning: 0, info: 0, other: 0 }

                    logs.forEach(log => {
                      const status = log.status?.toLowerCase() || "other"
                      if (status === "success") statusCounts.success++
                      else if (status === "failure" || status === "error") statusCounts.failure++
                      else if (status === "warning") statusCounts.warning++
                      else if (status === "info") statusCounts.info++
                      else statusCounts.other++
                    })

                    const total = logs.length
                    const successRate = Math.round((statusCounts.success / total) * 100)
                    const failureRate = Math.round((statusCounts.failure / total) * 100)
                    const warningRate = Math.round((statusCounts.warning / total) * 100)
                    const infoRate = Math.round((statusCounts.info / total) * 100)

                    return (
                      <div className="space-y-4 w-full max-w-sm">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center">
                            <div className="w-4 h-4 rounded-full bg-green-500 mr-2"></div>
                            <span>Success</span>
                          </div>
                          <span className="font-semibold">{successRate}%</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="flex items-center">
                            <div className="w-4 h-4 rounded-full bg-red-500 mr-2"></div>
                            <span>Failure</span>
                          </div>
                          <span className="font-semibold">{failureRate}%</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="flex items-center">
                            <div className="w-4 h-4 rounded-full bg-yellow-500 mr-2"></div>
                            <span>Warning</span>
                          </div>
                          <span className="font-semibold">{warningRate}%</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="flex items-center">
                            <div className="w-4 h-4 rounded-full bg-blue-500 mr-2"></div>
                            <span>Info</span>
                          </div>
                          <span className="font-semibold">{infoRate}%</span>
                        </div>
                      </div>
                    )
                  })()}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
} 