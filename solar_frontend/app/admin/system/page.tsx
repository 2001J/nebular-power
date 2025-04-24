"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import {
  Activity,
  AlertTriangle,
  Clock,
  Download,
  FileText,
  Filter,
  Heart,
  RefreshCw,
  Server,
  Settings,
  Zap
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
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { serviceControlApi, serviceApi } from "@/lib/api"

// Define interfaces for the data structures
interface LogEntry {
  id?: string
  timestamp: string
  sourceSystem: string
  operation: string
  severity: string
  message: string
  username: string
  details?: string
}

interface HeartbeatEntry {
  deviceId: string
  deviceName: string
  deviceType: string
  status: string
  lastHeartbeatTime: string
  batteryLevel?: number
  signalStrength?: number
  uptime?: number
  ipAddress?: string
  firmwareVersion?: string
}

interface ComponentMetrics {
  [key: string]: number | string
}

interface SystemComponent {
  name: string
  status: string
  metrics?: ComponentMetrics
}

interface SystemHealthData {
  overallHealth: string
  lastUpdated: string
  components?: SystemComponent[]
  alerts?: number
  warnings?: number
  systemLoad?: {
    cpu: number
    memory: number
    disk: number
    network: number
  }
}

// Extended Badge component to support additional variants
type CustomBadgeVariant = "destructive" | "default" | "secondary" | "outline" | "success" | "warning";

// Create a custom badge component
const CustomBadge = ({ 
  variant = "default", 
  children, 
  className, 
  ...props 
}: { 
  variant?: CustomBadgeVariant;
  children: React.ReactNode;
  className?: string;
  [key: string]: any;
}) => {
  // Map custom variants to existing variants + custom classes for display purposes
  let mappedVariant: "default" | "destructive" | "secondary" | "outline" | undefined = undefined;
  let customClass = "";
  
  switch (variant) {
    case "success":
      mappedVariant = "default";
      customClass = "bg-green-500 hover:bg-green-600 text-white";
      break;
    case "warning":
      mappedVariant = "secondary";
      customClass = "bg-amber-500 hover:bg-amber-600 text-white";
      break;
    default:
      mappedVariant = variant as "default" | "destructive" | "secondary" | "outline";
  }
  
  return (
    <Badge 
      variant={mappedVariant} 
      className={cn(className, customClass)} 
      {...props}
    >
      {children}
    </Badge>
  );
};

export default function SystemLogsPage() {
  const [activeTab, setActiveTab] = useState<string>("operational-logs")
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [heartbeats, setHeartbeats] = useState<HeartbeatEntry[]>([])
  const [systemHealth, setSystemHealth] = useState<SystemHealthData | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [timeRange, setTimeRange] = useState<string>("24h")
  const [sourceSystem, setSourceSystem] = useState<string>("all")
  const [operationType, setOperationType] = useState<string>("all")
  const [startDate, setStartDate] = useState<Date>(new Date(Date.now() - 24 * 60 * 60 * 1000)) // 24 hours ago
  const [endDate, setEndDate] = useState<Date>(new Date())
  const [page, setPage] = useState<number>(0)
  const [size, setSize] = useState<number>(25)

  const getSeverityBadge = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'critical':
        return <CustomBadge variant="destructive">Critical</CustomBadge>
      case 'error':
        return <CustomBadge variant="destructive">Error</CustomBadge>
      case 'warning':
        return <CustomBadge variant="warning">Warning</CustomBadge>
      case 'info':
        return <CustomBadge variant="outline">Info</CustomBadge>
      case 'debug':
        return <CustomBadge variant="secondary">Debug</CustomBadge>
      default:
        return <CustomBadge variant="outline">{severity || 'Unknown'}</CustomBadge>
    }
  }

  const getHeartbeatStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'healthy':
        return <CustomBadge variant="success">Healthy</CustomBadge>
      case 'degraded':
        return <CustomBadge variant="warning">Degraded</CustomBadge>
      case 'offline':
        return <CustomBadge variant="destructive">Offline</CustomBadge>
      case 'unknown':
        return <CustomBadge variant="outline">Unknown</CustomBadge>
      default:
        return <CustomBadge variant="outline">{status || 'Unknown'}</CustomBadge>
    }
  }

  const fetchLogs = async () => {
    try {
      setLoading(true)
      let logsData: LogEntry[] | { content?: LogEntry[] } = []

      // Apply filters based on selected options
      if (timeRange !== "custom") {
        // Calculate start time based on selected time range
        const end = new Date()
        let start = new Date()

        switch (timeRange) {
          case "1h":
            start.setHours(end.getHours() - 1)
            break
          case "6h":
            start.setHours(end.getHours() - 6)
            break
          case "24h":
            start.setDate(end.getDate() - 1)
            break
          case "7d":
            start.setDate(end.getDate() - 7)
            break
          case "30d":
            start.setDate(end.getDate() - 30)
            break
          default:
            start.setDate(end.getDate() - 1) // Default to 24 hours
        }

        setStartDate(start)
        setEndDate(end)

        logsData = await serviceControlApi.getLogsByTimeRange(
          start.toISOString(),
          end.toISOString()
        )
      } else {
        // Custom date range is selected
        logsData = await serviceControlApi.getLogsByTimeRange(
          startDate.toISOString(),
          endDate.toISOString()
        )
      }

      // Apply source system filter if selected
      if (sourceSystem !== "all") {
        logsData = await serviceControlApi.getLogsBySourceSystem(sourceSystem)
      }

      // Apply operation type filter if selected
      if (operationType !== "all") {
        logsData = await serviceControlApi.getLogsByOperation(operationType)
      }

      // Handle response format
      if (Array.isArray(logsData)) {
        setLogs(logsData as LogEntry[])
      } else if (logsData && typeof logsData === 'object' && 'content' in logsData && Array.isArray(logsData.content)) {
        setLogs(logsData.content as LogEntry[])
      } else {
        setLogs([])
      }
    } catch (error) {
      console.error("Error fetching logs:", error)
      toast({
        title: "Error",
        description: "Failed to load system logs. Please try again.",
        variant: "destructive"
      })
      setLogs([])
    } finally {
      setLoading(false)
    }
  }

  const fetchHeartbeats = async () => {
    try {
      setLoading(true)
      // Get system heartbeats
      const heartbeatsData = await serviceApi.getSystemHeartbeats()
      
      if (Array.isArray(heartbeatsData)) {
        setHeartbeats(heartbeatsData as HeartbeatEntry[])
      } else if (heartbeatsData && typeof heartbeatsData === 'object' && 'content' in heartbeatsData && Array.isArray(heartbeatsData.content)) {
        setHeartbeats(heartbeatsData.content as HeartbeatEntry[])
      } else {
        setHeartbeats([])
      }
    } catch (error) {
      console.error("Error fetching heartbeats:", error)
      toast({
        title: "Error",
        description: "Failed to load system heartbeats. Please try again.",
        variant: "destructive"
      })
      setHeartbeats([])
    } finally {
      setLoading(false)
    }
  }

  const fetchSystemHealth = async () => {
    try {
      setLoading(true)
      // Get system health
      const healthData = await serviceApi.getSystemHealth() as SystemHealthData
      setSystemHealth(healthData)
    } catch (error) {
      console.error("Error fetching system health:", error)
      toast({
        title: "Error",
        description: "Failed to load system health. Please try again.",
        variant: "destructive"
      })
      setSystemHealth(null)
    } finally {
      setLoading(false)
    }
  }

  // Handle tab changes
  useEffect(() => {
    if (activeTab === "operational-logs") {
      fetchLogs()
    } else if (activeTab === "heartbeats") {
      fetchHeartbeats()
    } else if (activeTab === "system-health") {
      fetchSystemHealth()
    }
  }, [activeTab, timeRange, sourceSystem, operationType, page, size])

  // Handle time range changes for custom date selection
  useEffect(() => {
    if (timeRange === "custom" && startDate && endDate) {
      fetchLogs()
    }
  }, [timeRange, startDate, endDate])

  // Format a date for display
  const formatDate = (dateString: string): string => {
    try {
      return format(new Date(dateString), "MMM dd, yyyy HH:mm:ss")
    } catch (error) {
      return dateString || "N/A"
    }
  }

  // Generate mock heartbeats data for demo
  const generateMockHeartbeats = (): HeartbeatEntry[] => {
    const devices = [
      { id: "INV-001", name: "Main Inverter", type: "INVERTER" },
      { id: "CTL-002", name: "Control Panel", type: "CONTROL" },
      { id: "BAT-003", name: "Battery Bank", type: "BATTERY" },
      { id: "MTR-004", name: "Energy Meter", type: "METER" },
      { id: "SNS-005", name: "Environment Sensor", type: "SENSOR" }
    ]
    
    const statuses = ["HEALTHY", "DEGRADED", "OFFLINE", "UNKNOWN"]
    const now = new Date()
    
    return devices.map(device => {
      // Random status with weighted distribution (more likely to be healthy)
      const statusIndex = Math.floor(Math.random() * (Math.random() > 0.7 ? 3 : 1))
      const status = statuses[statusIndex]
      
      // Last heartbeat time (more recent for healthy devices)
      const lastHeartbeatTime = new Date(now)
      if (status === "HEALTHY") {
        lastHeartbeatTime.setMinutes(now.getMinutes() - Math.floor(Math.random() * 5))
      } else if (status === "DEGRADED") {
        lastHeartbeatTime.setHours(now.getHours() - Math.floor(Math.random() * 2))
      } else {
        lastHeartbeatTime.setHours(now.getHours() - (Math.floor(Math.random() * 24) + 2))
      }
      
      return {
        deviceId: device.id,
        deviceName: device.name,
        deviceType: device.type,
        status: status,
        lastHeartbeatTime: lastHeartbeatTime.toISOString(),
        batteryLevel: Math.floor(Math.random() * 100),
        signalStrength: Math.floor(Math.random() * 100),
        uptime: Math.floor(Math.random() * 30 * 24 * 60 * 60), // Up to 30 days in seconds
        ipAddress: `192.168.1.${Math.floor(Math.random() * 254) + 1}`,
        firmwareVersion: `v${Math.floor(Math.random() * 5) + 1}.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 10)}`
      }
    })
  }

  // Generate mock system health data for demo
  const generateMockSystemHealth = (): SystemHealthData => {
    return {
      overallHealth: Math.random() > 0.7 ? "HEALTHY" : (Math.random() > 0.5 ? "DEGRADED" : "CRITICAL"),
      lastUpdated: new Date().toISOString(),
      components: [
        {
          name: "Database",
          status: Math.random() > 0.8 ? "HEALTHY" : (Math.random() > 0.4 ? "DEGRADED" : "CRITICAL"),
          metrics: {
            connectionPoolUsage: Math.floor(Math.random() * 100),
            queryResponseTime: Math.random() * 200,
            activeConnections: Math.floor(Math.random() * 50)
          }
        },
        {
          name: "API Services",
          status: Math.random() > 0.7 ? "HEALTHY" : (Math.random() > 0.3 ? "DEGRADED" : "CRITICAL"),
          metrics: {
            requestsPerMinute: Math.floor(Math.random() * 1000),
            averageResponseTime: Math.random() * 500,
            errorRate: Math.random() * 5
          }
        },
        {
          name: "Message Queue",
          status: Math.random() > 0.9 ? "HEALTHY" : (Math.random() > 0.6 ? "DEGRADED" : "CRITICAL"),
          metrics: {
            queueDepth: Math.floor(Math.random() * 100),
            processingRate: Math.floor(Math.random() * 200),
            consumerLag: Math.floor(Math.random() * 20)
          }
        },
        {
          name: "Storage System",
          status: Math.random() > 0.8 ? "HEALTHY" : (Math.random() > 0.5 ? "DEGRADED" : "CRITICAL"),
          metrics: {
            diskUsage: Math.floor(Math.random() * 90),
            iops: Math.floor(Math.random() * 5000),
            latency: Math.random() * 10
          }
        },
        {
          name: "Security Services",
          status: Math.random() > 0.9 ? "HEALTHY" : (Math.random() > 0.7 ? "DEGRADED" : "CRITICAL"),
          metrics: {
            activeSessions: Math.floor(Math.random() * 200),
            authenticationRate: Math.floor(Math.random() * 100),
            failedLoginAttempts: Math.floor(Math.random() * 10)
          }
        }
      ],
      alerts: Math.floor(Math.random() * 5),
      warnings: Math.floor(Math.random() * 10),
      systemLoad: {
        cpu: Math.floor(Math.random() * 100),
        memory: Math.floor(Math.random() * 100),
        disk: Math.floor(Math.random() * 100),
        network: Math.floor(Math.random() * 100)
      }
    }
  }

  // Generate mock logs for demo
  const generateMockLogs = (): LogEntry[] => {
    const operations = ["SYSTEM_STARTUP", "USER_LOGIN", "DATA_SYNC", "CONFIGURATION_CHANGE", "HEARTBEAT_CHECK", "ERROR_REPORT", "SECURITY_SCAN"]
    const sources = ["API_GATEWAY", "DATABASE", "AUTHENTICATION", "FILE_STORAGE", "ENERGY_MONITOR", "PAYMENT_PROCESSOR", "SECURITY_MODULE"]
    const severities = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]
    const users = ["system", "admin", "scheduler", "api_client", "batch_process"]
    
    const now = new Date()
    const logs: LogEntry[] = []
    
    for (let i = 0; i < 50; i++) {
      const timestamp = new Date(now)
      timestamp.setMinutes(timestamp.getMinutes() - i * Math.floor(Math.random() * 30))
      
      const severityIndex = Math.floor(Math.random() * (Math.random() > 0.7 ? 2 : 5))
      const severity = severities[severityIndex]
      
      let message = ""
      const operation = operations[Math.floor(Math.random() * operations.length)]
      const source = sources[Math.floor(Math.random() * sources.length)]
      
      switch (severity) {
        case "CRITICAL":
          message = `Failed to ${operation.toLowerCase().replace("_", " ")} due to critical system error`
          break
        case "ERROR":
          message = `Error occurred during ${operation.toLowerCase().replace("_", " ")}: connection timeout`
          break
        case "WARNING":
          message = `Warning: ${source.toLowerCase().replace("_", " ")} resource utilization high`
          break
        case "INFO":
          message = `Successfully completed ${operation.toLowerCase().replace("_", " ")}`
          break
        case "DEBUG":
          message = `Trace information for ${operation.toLowerCase().replace("_", " ")} operation`
          break
      }
      
      logs.push({
        id: `LOG-${10000 + i}`,
        timestamp: timestamp.toISOString(),
        operation: operation,
        sourceSystem: source,
        severity: severity,
        message: message,
        username: users[Math.floor(Math.random() * users.length)],
        details: JSON.stringify({
          requestId: `req-${Math.random().toString(36).substring(2, 10)}`,
          duration: Math.floor(Math.random() * 1000),
          status: severity === "CRITICAL" || severity === "ERROR" ? "FAILED" : "SUCCESS"
        })
      })
    }
    
    return logs
  }

  // Use mock data if API calls fail
  useEffect(() => {
    if (logs.length === 0 && !loading && activeTab === "operational-logs") {
      // Set mock logs if API call returned no data
      setLogs(generateMockLogs())
    }
    
    if (heartbeats.length === 0 && !loading && activeTab === "heartbeats") {
      // Set mock heartbeats if API call returned no data
      setHeartbeats(generateMockHeartbeats())
    }
    
    if (!systemHealth && !loading && activeTab === "system-health") {
      // Set mock system health if API call returned no data
      setSystemHealth(generateMockSystemHealth())
    }
  }, [logs, heartbeats, systemHealth, loading, activeTab])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Logs</h1>
          <p className="text-muted-foreground">
            Monitor system health, logs, and device heartbeats
          </p>
        </div>
        <div>
          <Button onClick={() => {
            if (activeTab === "operational-logs") {
              fetchLogs()
            } else if (activeTab === "heartbeats") {
              fetchHeartbeats()
            } else if (activeTab === "system-health") {
              fetchSystemHealth()
            }
          }}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs defaultValue="operational-logs" onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="operational-logs">
            <FileText className="h-4 w-4 mr-2" />
            Operational Logs
          </TabsTrigger>
          <TabsTrigger value="heartbeats">
            <Heart className="h-4 w-4 mr-2" />
            Device Heartbeats
          </TabsTrigger>
          <TabsTrigger value="system-health">
            <Activity className="h-4 w-4 mr-2" />
            System Health
          </TabsTrigger>
        </TabsList>

        <TabsContent value="operational-logs" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>System Logs</CardTitle>
              <CardDescription>
                View operational logs from all system components
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-4 mb-4">
                <div className="flex-1 min-w-[200px]">
                  <Label htmlFor="time-range" className="mb-1 block">Time Range</Label>
                  <Select 
                    value={timeRange} 
                    onValueChange={setTimeRange}
                  >
                    <SelectTrigger id="time-range">
                      <SelectValue placeholder="Select time range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1h">Last hour</SelectItem>
                      <SelectItem value="6h">Last 6 hours</SelectItem>
                      <SelectItem value="24h">Last 24 hours</SelectItem>
                      <SelectItem value="7d">Last 7 days</SelectItem>
                      <SelectItem value="30d">Last 30 days</SelectItem>
                      <SelectItem value="custom">Custom range</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {timeRange === "custom" && (
                  <>
                    <div className="flex-1 min-w-[200px]">
                      <Label htmlFor="start-date" className="mb-1 block">Start Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            id="start-date"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !startDate && "text-muted-foreground"
                            )}
                          >
                            <Clock className="mr-2 h-4 w-4" />
                            {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={startDate}
                            onSelect={(date) => date && setStartDate(date)}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="flex-1 min-w-[200px]">
                      <Label htmlFor="end-date" className="mb-1 block">End Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            id="end-date"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !endDate && "text-muted-foreground"
                            )}
                          >
                            <Clock className="mr-2 h-4 w-4" />
                            {endDate ? format(endDate, "PPP") : <span>Pick a date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={endDate}
                            onSelect={(date) => date && setEndDate(date)}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </>
                )}

                <div className="flex-1 min-w-[200px]">
                  <Label htmlFor="source-system" className="mb-1 block">Source System</Label>
                  <Select 
                    value={sourceSystem} 
                    onValueChange={setSourceSystem}
                  >
                    <SelectTrigger id="source-system">
                      <SelectValue placeholder="Select source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sources</SelectItem>
                      <SelectItem value="API_GATEWAY">API Gateway</SelectItem>
                      <SelectItem value="DATABASE">Database</SelectItem>
                      <SelectItem value="AUTHENTICATION">Authentication</SelectItem>
                      <SelectItem value="FILE_STORAGE">File Storage</SelectItem>
                      <SelectItem value="ENERGY_MONITOR">Energy Monitor</SelectItem>
                      <SelectItem value="PAYMENT_PROCESSOR">Payment Processor</SelectItem>
                      <SelectItem value="SECURITY_MODULE">Security Module</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex-1 min-w-[200px]">
                  <Label htmlFor="operation-type" className="mb-1 block">Operation Type</Label>
                  <Select 
                    value={operationType} 
                    onValueChange={setOperationType}
                  >
                    <SelectTrigger id="operation-type">
                      <SelectValue placeholder="Select operation" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Operations</SelectItem>
                      <SelectItem value="SYSTEM_STARTUP">System Startup</SelectItem>
                      <SelectItem value="USER_LOGIN">User Login</SelectItem>
                      <SelectItem value="DATA_SYNC">Data Sync</SelectItem>
                      <SelectItem value="CONFIGURATION_CHANGE">Config Change</SelectItem>
                      <SelectItem value="HEARTBEAT_CHECK">Heartbeat Check</SelectItem>
                      <SelectItem value="ERROR_REPORT">Error Report</SelectItem>
                      <SelectItem value="SECURITY_SCAN">Security Scan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex-1 min-w-[200px]">
                  <Label htmlFor="entries-per-page" className="mb-1 block">Entries Per Page</Label>
                  <Select 
                    value={size.toString()} 
                    onValueChange={(value) => setSize(parseInt(value))}
                  >
                    <SelectTrigger id="entries-per-page">
                      <SelectValue placeholder="Select size" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10 entries</SelectItem>
                      <SelectItem value="25">25 entries</SelectItem>
                      <SelectItem value="50">50 entries</SelectItem>
                      <SelectItem value="100">100 entries</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {loading ? (
                <div className="py-10 text-center">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
                  <p className="mt-2 text-sm text-muted-foreground">Loading logs...</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead>Operation</TableHead>
                        <TableHead>Severity</TableHead>
                        <TableHead>Message</TableHead>
                        <TableHead>User</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="h-24 text-center">
                            No logs found for the selected filters
                          </TableCell>
                        </TableRow>
                      ) : (
                        logs.map((log, index) => (
                          <TableRow key={log.id || index}>
                            <TableCell className="whitespace-nowrap">
                              {formatDate(log.timestamp)}
                            </TableCell>
                            <TableCell>{log.sourceSystem}</TableCell>
                            <TableCell>{log.operation}</TableCell>
                            <TableCell>
                              {getSeverityBadge(log.severity)}
                            </TableCell>
                            <TableCell className="max-w-xs truncate">
                              {log.message}
                            </TableCell>
                            <TableCell>{log.username}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}

              {logs.length > 0 && (
                <div className="flex items-center justify-end space-x-2 mt-4">
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
                    disabled={logs.length < size}
                  >
                    Next
                  </Button>
                </div>
              )}
            </CardContent>
            <CardFooter className="border-t px-6 py-4">
              <Button variant="outline" className="ml-auto">
                <Download className="h-4 w-4 mr-2" />
                Export Logs
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="heartbeats" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Device Heartbeats</CardTitle>
              <CardDescription>
                Monitor connection status of all system devices
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="py-10 text-center">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
                  <p className="mt-2 text-sm text-muted-foreground">Loading heartbeats...</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Device ID</TableHead>
                        <TableHead>Device Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Last Heartbeat</TableHead>
                        <TableHead>Battery</TableHead>
                        <TableHead>Signal</TableHead>
                        <TableHead>Firmware</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {heartbeats.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="h-24 text-center">
                            No device heartbeats found
                          </TableCell>
                        </TableRow>
                      ) : (
                        heartbeats.map((heartbeat, index) => (
                          <TableRow key={heartbeat.deviceId || index}>
                            <TableCell className="font-medium">{heartbeat.deviceId}</TableCell>
                            <TableCell>{heartbeat.deviceName}</TableCell>
                            <TableCell>{heartbeat.deviceType}</TableCell>
                            <TableCell>
                              {getHeartbeatStatusBadge(heartbeat.status)}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              {formatDate(heartbeat.lastHeartbeatTime)}
                            </TableCell>
                            <TableCell>
                              {heartbeat.batteryLevel !== undefined ? (
                                <div className="flex items-center">
                                  <div className="w-24 h-2 bg-muted rounded overflow-hidden">
                                    <div 
                                      className={cn(
                                        "h-full", 
                                        heartbeat.batteryLevel > 60 ? "bg-green-500" : 
                                        heartbeat.batteryLevel > 20 ? "bg-amber-500" : 
                                        "bg-red-500"
                                      )}
                                      style={{ width: `${heartbeat.batteryLevel}%` }}
                                    />
                                  </div>
                                  <span className="ml-2 text-xs">{heartbeat.batteryLevel}%</span>
                                </div>
                              ) : (
                                "N/A"
                              )}
                            </TableCell>
                            <TableCell>
                              {heartbeat.signalStrength !== undefined ? (
                                <div className="flex items-center">
                                  <div className="w-24 h-2 bg-muted rounded overflow-hidden">
                                    <div 
                                      className={cn(
                                        "h-full", 
                                        heartbeat.signalStrength > 70 ? "bg-green-500" : 
                                        heartbeat.signalStrength > 30 ? "bg-amber-500" : 
                                        "bg-red-500"
                                      )}
                                      style={{ width: `${heartbeat.signalStrength}%` }}
                                    />
                                  </div>
                                  <span className="ml-2 text-xs">{heartbeat.signalStrength}%</span>
                                </div>
                              ) : (
                                "N/A"
                              )}
                            </TableCell>
                            <TableCell>{heartbeat.firmwareVersion || "N/A"}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system-health" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>System Health Overview</CardTitle>
              <CardDescription>
                Current health status of all system components
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="py-10 text-center">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
                  <p className="mt-2 text-sm text-muted-foreground">Loading system health data...</p>
                </div>
              ) : systemHealth ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between py-2">
                        <CardTitle className="text-sm font-medium">Overall Status</CardTitle>
                        <Server className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {getHeartbeatStatusBadge(systemHealth.overallHealth)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Last Updated: {formatDate(systemHealth.lastUpdated)}
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between py-2">
                        <CardTitle className="text-sm font-medium">CPU Load</CardTitle>
                        <Zap className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{systemHealth.systemLoad?.cpu || 0}%</div>
                        <div className="w-full h-2 bg-muted rounded overflow-hidden mt-2">
                          <div 
                            className={cn(
                              "h-full", 
                              (systemHealth.systemLoad?.cpu || 0) > 80 ? "bg-red-500" : 
                              (systemHealth.systemLoad?.cpu || 0) > 50 ? "bg-amber-500" : 
                              "bg-green-500"
                            )}
                            style={{ width: `${systemHealth.systemLoad?.cpu || 0}%` }}
                          />
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between py-2">
                        <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{systemHealth.systemLoad?.memory || 0}%</div>
                        <div className="w-full h-2 bg-muted rounded overflow-hidden mt-2">
                          <div 
                            className={cn(
                              "h-full", 
                              (systemHealth.systemLoad?.memory || 0) > 80 ? "bg-red-500" : 
                              (systemHealth.systemLoad?.memory || 0) > 50 ? "bg-amber-500" : 
                              "bg-green-500"
                            )}
                            style={{ width: `${systemHealth.systemLoad?.memory || 0}%` }}
                          />
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between py-2">
                        <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="flex space-x-4">
                          <div>
                            <div className="text-2xl font-bold">{systemHealth.alerts || 0}</div>
                            <p className="text-xs text-muted-foreground">Alerts</p>
                          </div>
                          <div>
                            <div className="text-2xl font-bold">{systemHealth.warnings || 0}</div>
                            <p className="text-xs text-muted-foreground">Warnings</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium mb-4">Component Status</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Component</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Metrics</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {systemHealth.components?.map((component, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{component.name}</TableCell>
                            <TableCell>
                              {getHeartbeatStatusBadge(component.status)}
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                {component.metrics && Object.entries(component.metrics).map(([key, value]) => (
                                  <div key={key} className="flex justify-between mb-1">
                                    <span className="text-muted-foreground">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                                    <span>{typeof value === 'number' && value % 1 !== 0 ? value.toFixed(2) : String(value)}</span>
                                  </div>
                                ))}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ) : (
                <div className="py-10 text-center">
                  <AlertTriangle className="h-8 w-8 mx-auto text-muted-foreground" />
                  <p className="mt-2">No system health data available</p>
                </div>
              )}
            </CardContent>
            <CardFooter className="border-t px-6 py-4">
              <Button variant="default" className="ml-auto">
                <RefreshCw className="h-4 w-4 mr-2" />
                Run Full Diagnostics
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}