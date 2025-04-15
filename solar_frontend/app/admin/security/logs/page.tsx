"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { format, parseISO, subDays } from "date-fns"
import {
  ArrowUpDown,
  Calendar,
  Check,
  ChevronDown,
  Clock,
  Database,
  Download,
  FileText,
  Filter,
  MoreHorizontal,
  RefreshCw,
  Search,
  Shield,
  User
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { DatePickerWithRange } from "@/components/ui/date-range-picker"
import { toast } from "@/components/ui/use-toast"
import { securityApi, installationApi } from "@/lib/api"

export default function SecurityLogsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [logs, setLogs] = useState([])
  const [filteredLogs, setFilteredLogs] = useState([])
  const [installations, setInstallations] = useState([])
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 7),
    to: new Date(),
  })
  const [activityType, setActivityType] = useState("all")
  const [installation, setInstallation] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState("all-logs")
  const [exportFormat, setExportFormat] = useState("csv")

  // Fetch security logs
  useEffect(() => {
    const fetchSecurityLogs = async () => {
      try {
        setLoading(true)

        // Get all installations first for reference
        const installationsData = await installationApi.getAllInstallations()
        setInstallations(installationsData.content || [])

        // Fetch security logs based on selected tab and filters
        let logsData = []
        const startDate = dateRange.from ? dateRange.from.toISOString() : undefined
        const endDate = dateRange.to ? dateRange.to.toISOString() : undefined

        switch (activeTab) {
          case "all-logs":
            // Try to fetch all logs across installations
            try {
              logsData = await securityApi.getSecurityAuditLogs()
            } catch (error) {
              console.error("Error fetching all security logs:", error)

              // If the "all logs" endpoint fails, fall back to installation-specific logs
              if (installations.length > 0) {
                for (const installation of installationsData.content.slice(0, 5)) { // Limit to first 5 installations to avoid too many requests
                  try {
                    const installationLogs = await securityApi.getSecurityLogsForInstallation(installation.id)
                    logsData = [...logsData, ...installationLogs]
                  } catch (innerError) {
                    console.error(`Error fetching logs for installation ${installation.id}:`, innerError)
                  }
                }
              }
            }
            break

          case "by-installation":
            if (installation !== "all") {
              try {
                if (activityType !== "all") {
                  // Get logs by activity type for specific installation
                  logsData = await securityApi.getSecurityLogsByActivityType(installation, activityType)
                } else {
                  // Get all logs for specific installation
                  logsData = await securityApi.getSecurityLogsForInstallation(installation)
                }
              } catch (error) {
                console.error(`Error fetching logs for installation ${installation}:`, error)
              }
            } else {
              // Handle "all installations" - fetch some from each
              for (const installation of installationsData.content.slice(0, 3)) { // Limit to first 3 installations
                try {
                  const installationLogs = await securityApi.getSecurityLogsForInstallation(installation.id)
                  logsData = [...logsData, ...installationLogs]
                } catch (error) {
                  console.error(`Error fetching logs for installation ${installation.id}:`, error)
                }
              }
            }
            break

          case "by-time-range":
            if (installation !== "all") {
              try {
                // Get logs by time range for specific installation
                logsData = await securityApi.getSecurityLogsByTimeRange(installation, startDate, endDate)
              } catch (error) {
                console.error(`Error fetching logs by time range for installation ${installation}:`, error)
              }
            } else {
              // Try to get logs by time range across all installations (if supported by API)
              try {
                logsData = await securityApi.getSecurityLogsByTimeRange("all", startDate, endDate)
              } catch (error) {
                console.error("Error fetching logs by time range across all installations:", error)

                // Fall back to fetching logs for a few installations
                for (const installation of installationsData.content.slice(0, 3)) {
                  try {
                    const installationLogs = await securityApi.getSecurityLogsByTimeRange(installation.id, startDate, endDate)
                    logsData = [...logsData, ...installationLogs]
                  } catch (innerError) {
                    console.error(`Error fetching logs by time range for installation ${installation.id}:`, innerError)
                  }
                }
              }
            }
            break

          case "by-activity":
            if (activityType !== "all") {
              try {
                // Get logs by activity type across all installations
                logsData = await securityApi.getSecurityLogsByActivityType("all", activityType)
              } catch (error) {
                console.error(`Error fetching logs by activity type ${activityType}:`, error)

                // Fall back to fetching logs for a few installations
                if (installation !== "all") {
                  try {
                    logsData = await securityApi.getSecurityLogsByActivityType(installation, activityType)
                  } catch (innerError) {
                    console.error(`Error fetching logs by activity type for specific installation:`, innerError)
                  }
                } else {
                  for (const installation of installationsData.content.slice(0, 3)) {
                    try {
                      const installationLogs = await securityApi.getSecurityLogsByActivityType(installation.id, activityType)
                      logsData = [...logsData, ...installationLogs]
                    } catch (innerError) {
                      console.error(`Error fetching logs by activity type for installation ${installation.id}:`, innerError)
                    }
                  }
                }
              }
            } else {
              // If no specific activity type selected, get all logs
              try {
                logsData = await securityApi.getSecurityAuditLogs()
              } catch (error) {
                console.error("Error fetching all security logs:", error)
              }
            }
            break
        }

        // If API calls failed or returned no data, use mock data
        if (!logsData || logsData.length === 0) {
          console.log("No logs returned from API, using mock data")
          logsData = generateMockLogs(10)
        }

        console.log(`Fetched ${logsData.length} security logs`)
        setLogs(logsData)
        applyFilters(logsData)
      } catch (error) {
        console.error("Error fetching security logs:", error)
        toast({
          title: "Error",
          description: "Failed to load security audit logs",
          variant: "destructive",
        })

        // Set mock data as fallback
        const mockLogs = generateMockLogs(10)
        setLogs(mockLogs)
        setFilteredLogs(mockLogs)
      } finally {
        setLoading(false)
        setIsRefreshing(false)
      }
    }

    fetchSecurityLogs()
  }, [dateRange, activityType, installation, activeTab, isRefreshing])

  // Generate mock logs for fallback
  const generateMockLogs = (count) => {
    const activityTypes = ["LOGIN", "CONFIGURATION_CHANGE", "MONITORING_START", "MONITORING_STOP",
      "SENSITIVITY_CHANGE", "ALERT_ACKNOWLEDGED", "ALERT_RESOLVED", "SYSTEM_DIAGNOSTIC"]
    const users = ["admin", "system", "technician", "operator"]
    const mockLogs = []

    for (let i = 0; i < count; i++) {
      const randomInstallation = installations.length > 0
        ? installations[Math.floor(Math.random() * installations.length)]
        : { id: `INST-${i + 100}`, name: `Demo Installation ${i + 1}` }

      mockLogs.push({
        id: `LOG-${Date.now()}-${i}`,
        timestamp: new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000)).toISOString(),
        activityType: activityTypes[Math.floor(Math.random() * activityTypes.length)],
        description: `Mock security log entry for demonstration purposes.`,
        username: users[Math.floor(Math.random() * users.length)],
        installationId: randomInstallation.id,
        installationName: randomInstallation.name,
        details: JSON.stringify({ source: "mock_data", success: true })
      })
    }

    return mockLogs
  }

  // Apply filters to logs
  const applyFilters = (logsData = logs) => {
    const filtered = logsData.filter(log => {
      // Activity type filter
      if (activityType !== "all" && log.activityType !== activityType) return false

      // Installation filter (if on a tab where this applies)
      if (activeTab === "by-installation" && installation !== "all" && log.installationId !== installation) return false

      // Search term filter
      if (searchTerm && searchTerm.length > 0) {
        const searchLower = searchTerm.toLowerCase()
        const matchesDescription = log.description?.toLowerCase().includes(searchLower)
        const matchesUsername = log.username?.toLowerCase().includes(searchLower)
        const matchesInstallation = getInstallationName(log.installationId)?.toLowerCase().includes(searchLower)
        const matchesActivity = log.activityType?.toLowerCase().includes(searchLower)

        if (!matchesDescription && !matchesUsername && !matchesInstallation && !matchesActivity) return false
      }

      return true
    })

    // Sort by timestamp, newest first
    filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))

    setFilteredLogs(filtered)
  }

  // Apply filters when filter values change
  useEffect(() => {
    applyFilters()
  }, [searchTerm])

  // Refresh data
  const refreshData = () => {
    setIsRefreshing(true)
  }

  // Get installation name by ID
  const getInstallationName = (installationId) => {
    const installation = installations.find(i => i.id === installationId)
    return installation ? (installation.name || `Installation #${installationId}`) : `Installation #${installationId}`
  }

  // Format date
  const formatDate = (dateString) => {
    try {
      return format(parseISO(dateString), "PPP p")
    } catch (error) {
      return dateString || "N/A"
    }
  }

  // Get activity type badge
  const getActivityTypeBadge = (activityType) => {
    switch (activityType) {
      case 'LOGIN':
      case 'LOGOUT':
        return <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">Auth</Badge>
      case 'CONFIGURATION_CHANGE':
      case 'SENSITIVITY_CHANGE':
        return <Badge variant="outline" className="bg-purple-50 text-purple-600 border-purple-200">Config</Badge>
      case 'MONITORING_START':
      case 'MONITORING_STOP':
        return <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">Monitor</Badge>
      case 'ALERT_ACKNOWLEDGED':
      case 'ALERT_RESOLVED':
        return <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200">Alert</Badge>
      case 'SYSTEM_DIAGNOSTIC':
      case 'SYSTEM_MAINTENANCE':
        return <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200">System</Badge>
      default:
        return <Badge variant="outline">{activityType}</Badge>
    }
  }

  // Export logs
  const exportLogs = () => {
    try {
      const now = new Date()
      const timestamp = format(now, "yyyy-MM-dd_HH-mm-ss")
      const filename = `security_logs_${timestamp}.${exportFormat}`

      let content = ""

      if (exportFormat === "csv") {
        // CSV header
        content = "ID,Timestamp,Activity Type,Username,Installation,Description\n"

        // CSV rows
        filteredLogs.forEach(log => {
          content += `"${log.id}","${log.timestamp}","${log.activityType}","${log.username}","${getInstallationName(log.installationId)}","${log.description.replace(/"/g, '""')}"\n`
        })
      } else if (exportFormat === "json") {
        // Format logs for JSON export
        const exportData = filteredLogs.map(log => ({
          id: log.id,
          timestamp: log.timestamp,
          activityType: log.activityType,
          username: log.username,
          installation: getInstallationName(log.installationId),
          description: log.description,
          details: log.details
        }))

        content = JSON.stringify(exportData, null, 2)
      }

      // Create blob and download
      const blob = new Blob([content], { type: exportFormat === "csv" ? "text/csv" : "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast({
        title: "Export Complete",
        description: `Logs exported to ${filename}`,
      })
    } catch (error) {
      console.error("Error exporting logs:", error)
      toast({
        title: "Export Failed",
        description: "Failed to export security logs",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-6">
      <Breadcrumb className="mb-4">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/admin">Admin</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/admin/security">Security Monitoring</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Security Audit Logs</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Security Audit Logs</h1>
          <p className="text-muted-foreground">
            Review security-related activity and audit trail
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={exportFormat} onValueChange={setExportFormat}>
            <SelectTrigger className="w-[100px]">
              <SelectValue placeholder="Format" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="csv">CSV</SelectItem>
              <SelectItem value="json">JSON</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={exportLogs}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm" onClick={refreshData} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => router.push("/admin/security")}>
            <Shield className="h-4 w-4 mr-2" />
            Security Dashboard
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-2 md:grid-cols-4">
          <TabsTrigger value="all-logs">All Logs</TabsTrigger>
          <TabsTrigger value="by-installation">By Installation</TabsTrigger>
          <TabsTrigger value="by-time-range">By Time Range</TabsTrigger>
          <TabsTrigger value="by-activity">By Activity Type</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Security Audit Logs</CardTitle>
              <CardDescription>
                {loading ? (
                  "Loading security logs..."
                ) : (
                  `${filteredLogs.length} ${filteredLogs.length === 1 ? 'log entry' : 'log entries'}`
                )}
              </CardDescription>
            </div>

            <div className="flex flex-wrap gap-2">
              <div className="relative w-full md:w-auto">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search logs..."
                  className="pl-8 w-full md:w-[200px]"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {activeTab === "by-installation" && (
                <Select value={installation} onValueChange={setInstallation}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Installation" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Installations</SelectItem>
                    {installations.map((inst) => (
                      <SelectItem key={inst.id} value={inst.id}>
                        {inst.name || `Installation #${inst.id}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {(activeTab === "by-activity" || activeTab === "by-installation") && (
                <Select value={activityType} onValueChange={setActivityType}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Activity Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Activities</SelectItem>
                    <SelectItem value="LOGIN">Login</SelectItem>
                    <SelectItem value="LOGOUT">Logout</SelectItem>
                    <SelectItem value="CONFIGURATION_CHANGE">Configuration Change</SelectItem>
                    <SelectItem value="MONITORING_START">Monitoring Start</SelectItem>
                    <SelectItem value="MONITORING_STOP">Monitoring Stop</SelectItem>
                    <SelectItem value="SENSITIVITY_CHANGE">Sensitivity Change</SelectItem>
                    <SelectItem value="ALERT_ACKNOWLEDGED">Alert Acknowledged</SelectItem>
                    <SelectItem value="ALERT_RESOLVED">Alert Resolved</SelectItem>
                    <SelectItem value="SYSTEM_DIAGNOSTIC">System Diagnostic</SelectItem>
                    <SelectItem value="SYSTEM_MAINTENANCE">System Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              )}

              {activeTab === "by-time-range" && (
                <DatePickerWithRange date={dateRange} setDate={setDateRange} />
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="flex flex-col items-center space-y-2">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <p className="text-sm text-muted-foreground">Loading security logs...</p>
              </div>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No Logs Found</h3>
              <p className="text-sm text-muted-foreground max-w-md mt-2">
                {searchTerm ? (
                  `No logs found matching "${searchTerm}".`
                ) : (
                  "No security logs matching the current criteria."
                )}
              </p>
              {(searchTerm || activityType !== "all" || installation !== "all") && (
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => {
                    setSearchTerm("")
                    setActivityType("all")
                    setInstallation("all")
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
            <ScrollArea className="h-[600px]">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[180px]">Timestamp</TableHead>
                      <TableHead className="w-[150px]">Activity Type</TableHead>
                      <TableHead className="w-[120px]">User</TableHead>
                      <TableHead className="w-[160px]">Installation</TableHead>
                      <TableHead>Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          <div className="flex items-center">
                            <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                            <span>{formatDate(log.timestamp)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getActivityTypeBadge(log.activityType)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <User className="mr-2 h-4 w-4 text-muted-foreground" />
                            <span>{log.username}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getInstallationName(log.installationId)}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {log.description || "No description available"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  )
}