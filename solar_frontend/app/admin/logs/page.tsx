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
  const [timeRange, setTimeRange] = useState("month") // Changed default from "today" to "month" for 30 days
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(20)
  const [sortField, setSortField] = useState("timestamp")
  const [sortDirection, setSortDirection] = useState("desc")
  const [totalPages, setTotalPages] = useState(0)
  const [totalElements, setTotalElements] = useState(0)
  const [exporting, setExporting] = useState(false)
  const [initialLoadDone, setInitialLoadDone] = useState(false)

  // Add a direct initial fetch when component mounts
  useEffect(() => {
    // This effect runs once on component mount to ensure logs are loaded
    if (!initialLoadDone) {
      console.log("🔄 Running initial logs fetch on component mount");
      fetchLogsData();
      setInitialLoadDone(true);
    }
  }, []);

  // Function to fetch logs data that can be called anywhere
  const fetchLogsData = async () => {
    try {
      console.log("📊 Fetching logs data with:", { timeRange, logType, page, pageSize });
      setLoading(true);

      // Determine date range with correct ISO format
      const endDate = new Date();
      let startDate;

      switch (timeRange) {
        case 'today':
          startDate = new Date();
          startDate.setHours(0, 0, 0, 0);
          // Set end date to the end of the current day (23:59:59.999)
          endDate.setHours(23, 59, 59, 999);
          break;
        case 'yesterday':
          startDate = new Date();
          startDate.setDate(startDate.getDate() - 1);
          startDate.setHours(0, 0, 0, 0);
          endDate.setDate(endDate.getDate() - 1);
          endDate.setHours(23, 59, 59, 999);
          break;
        case 'week':
          startDate = new Date();
          startDate.setDate(startDate.getDate() - 7);
          // Keep current endDate with time set to end of day
          endDate.setHours(23, 59, 59, 999);
          break;
        case 'month':
          startDate = new Date();
          startDate.setMonth(startDate.getMonth() - 1);
          // Keep current endDate with time set to end of day
          endDate.setHours(23, 59, 59, 999);
          break;
        default:
          startDate = new Date();
          startDate.setHours(0, 0, 0, 0);
          // Default to end of current day
          endDate.setHours(23, 59, 59, 999);
      }

      console.log("📅 Using date range:", {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      });

      let logsData = null;

      try {
        if (logType === "all") {
          // Use the ISO format that was proven to work in our tests
          logsData = await serviceControlApi.getLogsByTimeRange(
            startDate.toISOString(),
            endDate.toISOString(),
            page,
            pageSize
          );

          console.log("✅ Logs fetched successfully with ISO format:", 
            logsData && logsData.content ? 
              `Found ${logsData.content.length} logs` : 
              Array.isArray(logsData) ? 
                `Found ${logsData.length} logs` : 
                "No logs found");
        } else if (logType.startsWith("op_")) {
          // Filter by operation
          const operation = logType.replace("op_", "");
          logsData = await serviceControlApi.getLogsByOperation(operation, page, pageSize);
        } else if (logType.startsWith("src_")) {
          // Filter by source system
          const source = logType.replace("src_", "");
          logsData = await serviceControlApi.getLogsBySourceSystem(source, page, pageSize);
        } else if (logType.startsWith("inst_")) {
          // Filter by installation ID
          const installationId = logType.replace("inst_", "");
          logsData = await serviceControlApi.getLogsByInstallation(installationId, page, pageSize);
        }

        // Process the logs data - our enhanced API always returns a consistent format
        if (logsData && typeof logsData === 'object') {
          // Check if we got the expected structure (content array property)
          if (Array.isArray(logsData.content)) {
            setLogs(logsData.content);
            setTotalPages(logsData.totalPages || 1);
            setTotalElements(logsData.totalElements || logsData.content.length);
          } else if (Array.isArray(logsData)) {
            // Direct array response
            setLogs(logsData);
            setTotalPages(1);
            setTotalElements(logsData.length);
          } else {
            // Fallback for unexpected response format
            console.warn("⚠️ Unexpected logs data format:", logsData);
            setLogs([]);
            setTotalPages(0);
            setTotalElements(0);
          }
        } else {
          // Fallback for null or undefined response
          console.warn("⚠️ No logs data returned:", logsData);
          setLogs([]);
          setTotalPages(0);
          setTotalElements(0);
        }
      } catch (error) {
        console.error("❌ Error fetching logs data:", error);

        // Show toast error
        toast({
          title: "Error",
          description: "Failed to load logs data. Please try again.",
          variant: "destructive",
        });

        // Set empty logs
        setLogs([]);
        setTotalPages(0);
        setTotalElements(0);
      }
    } catch (error) {
      console.error("❌ Error in logs fetch:", error);
    } finally {
      setLoading(false);
    }
  };

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

  // Load log data on dependency changes
  useEffect(() => {
    console.log("🔄 Dependencies changed for log fetch. Triggering fetch with:", 
      { timeRange, logType, page, pageSize, sortField, sortDirection });
    fetchLogsData();
  }, [timeRange, logType, page, pageSize, sortField, sortDirection])

  // Handle refreshing logs
  const handleRefreshLogs = () => {
    setPage(0) // Reset to first page

    if (activeTab === "operational") {
      // Force refresh by changing a dependency
      setTimeRange(prev => {
        // Toggle between today and same value to force refresh
        const temp = prev === "today" ? "today_refresh" : "today"
        setTimeout(() => setTimeRange(prev), 100) // Reset after a short delay
        return temp
      })
    } else if (activeTab === "security") {
      handleFetchSecurityLogs()
    }
  }

  // Handle fetching security logs
  const handleFetchSecurityLogs = async () => {
    try {
      setLoading(true);

      console.log("🔎 Fetching security logs with filters:", { 
        logType, 
        timeRange,
        isInstallationFilter: logType.startsWith("sec_inst_")
      });

      // Check for authentication token first
      const token = typeof window !== 'undefined' 
        ? localStorage.getItem("token") || sessionStorage.getItem("token")
        : null;

      if (!token) {
        console.error("Missing authentication token for security logs request");
        toast({
          title: "Authentication Error",
          description: "Your session may have expired. Please log in again.",
          variant: "destructive"
        });
        setSecurityLogs([]);
        setLoading(false);
        return;
      }

      // Determine date range with proper timestamps
      const endDate = new Date();
      let startDate;

      switch (timeRange) {
        case 'today':
          startDate = new Date();
          startDate.setHours(0, 0, 0, 0);
          endDate.setHours(23, 59, 59, 999);
          break;
        case 'yesterday':
          startDate = new Date();
          startDate.setDate(startDate.getDate() - 1);
          startDate.setHours(0, 0, 0, 0);
          endDate.setDate(endDate.getDate() - 1);
          endDate.setHours(23, 59, 59, 999);
          break;
        case 'week':
          startDate = new Date();
          startDate.setDate(startDate.getDate() - 7);
          startDate.setHours(0, 0, 0, 0); // Set to start of day
          endDate.setHours(23, 59, 59, 999); // Set to end of day
          break;
        case 'month':
          startDate = new Date();
          startDate.setMonth(startDate.getMonth() - 1);
          startDate.setHours(0, 0, 0, 0); // Set to start of day
          endDate.setHours(23, 59, 59, 999); // Set to end of day
          break;
        default:
          startDate = new Date();
          startDate.setHours(0, 0, 0, 0);
          endDate.setHours(23, 59, 59, 999);
      }

      const startTimeFormatted = startDate.toISOString();
      const endTimeFormatted = endDate.toISOString();

      console.log("🔍 Security logs - using date range:", {
        startTime: startTimeFormatted,
        endTime: endTimeFormatted
      });

      try {
        let securityLogsData = [];
        let fetchedData = false;
        let requestAttempts = 0;
        let filterApplied = false;

        // Check if we're filtering by activity type but not by installation
        if (logType !== "all" && !logType.startsWith("sec_inst_")) {
          filterApplied = true;
          console.log(`🔍 Filtering by activity type: ${logType}`);

          try {
            requestAttempts++;
            // Get all admin logs filtered by activity type
            const activityLogs = await securityApi.getAdminAuditLogs(0, 100, logType);
            if (activityLogs && activityLogs.content && activityLogs.content.length > 0) {
              securityLogsData = activityLogs.content;
              setTotalPages(activityLogs.totalPages || 1);
              setTotalElements(activityLogs.totalElements || activityLogs.content.length);
              fetchedData = true;
              console.log(`✅ Found ${activityLogs.content.length} security logs for activity type ${logType}`);
            } else {
              console.log(`No logs found for activity type ${logType}`);
              // Clear logs when no data is found for selected activity type
              securityLogsData = [];
              setTotalPages(0);
              setTotalElements(0);
              fetchedData = true; // Mark as fetched even though empty, to prevent fallback to all logs
            }
          } catch (error) {
            console.warn("Could not fetch logs by activity type:", error);
            // Don't reset securityLogsData here, to allow fallback
          }
        }
        // Check if we're filtering by installation ID
        else if (logType.startsWith("sec_inst_")) {
          filterApplied = true;
          const installationId = logType.replace("sec_inst_", "");
          console.log(`🔍 Fetching security logs for installation ${installationId}`);

          try {
            requestAttempts++;
            // Try to get logs by time range for this specific installation
            const installationLogs = await securityApi.getLogsByTimeRange(
              installationId,
              startTimeFormatted,
              endTimeFormatted
            );

            if (installationLogs && Array.isArray(installationLogs) && installationLogs.length > 0) {
              securityLogsData = installationLogs;
              fetchedData = true;
              console.log(`✅ Found ${installationLogs.length} security logs for installation ${installationId}`);
            } else if (installationLogs && installationLogs.content && installationLogs.content.length > 0) {
              securityLogsData = installationLogs.content;
              fetchedData = true;
              console.log(`✅ Found ${installationLogs.content.length} security logs for installation ${installationId}`);
            } else {
              console.log(`No logs found for installation ${installationId} in the selected time range`);
              // Clear logs when no data is found for selected installation
              securityLogsData = [];
              setTotalPages(0);
              setTotalElements(0);
              fetchedData = true; // Mark as fetched even though empty
            }
          } catch (error) {
            console.warn(`Could not fetch logs for installation ${installationId}:`, error);
          }
        }

        // If not filtering or the filter returned no results AND we're showing "all", get logs for multiple installations
        if (!fetchedData && logType === "all") {
          const combinedLogs = [];
          console.log(`🔍 Fetching security logs for all installations`);

          // Try to get logs for the available installations
          if (installations.length > 0) {
            // Only get logs for up to 5 installations to avoid too many requests
            const installationsToFetch = installations.slice(0, 5);

            for (const installation of installationsToFetch as Array<{id: number | string, name?: string}>) {
              try {
                requestAttempts++;
                console.log(`🔍 Fetching security logs for installation ${installation.id}`);
                const installationLogs = await securityApi.getLogsByTimeRange(
                  installation.id.toString(),
                  startTimeFormatted,
                  endTimeFormatted
                );

                if (Array.isArray(installationLogs) && installationLogs.length > 0) {
                  combinedLogs.push(...installationLogs);
                  fetchedData = true;
                  console.log(`✅ Found ${installationLogs.length} security logs for installation ${installation.id}`);
                } else if (installationLogs && installationLogs.content && installationLogs.content.length > 0) {
                  combinedLogs.push(...installationLogs.content);
                  fetchedData = true;
                  console.log(`✅ Found ${installationLogs.content.length} security logs for installation ${installation.id}`);
                }
              } catch (error) {
                console.warn(`Could not fetch logs for installation ${installation.id}:`, error);
              }
            }
          }

          // If we got logs by installation
          if (combinedLogs.length > 0) {
            securityLogsData = combinedLogs;
            setTotalPages(1);
            setTotalElements(combinedLogs.length);
          } 
          // If we still don't have data, try user logs as fallback
          else if (!fetchedData) {
            console.log(`🔍 Fetching user security logs as fallback`);
            try {
              requestAttempts++;
              const userLogsData = await securityApi.getUserSecurityLogs(0, 100);

              if (userLogsData && userLogsData.content) {
                securityLogsData = userLogsData.content;
                setTotalPages(userLogsData.totalPages || 1);
                setTotalElements(userLogsData.totalElements || userLogsData.content.length);
                fetchedData = true;
                console.log(`✅ Found ${userLogsData.content.length} user security logs`);
              } else if (Array.isArray(userLogsData)) {
                securityLogsData = userLogsData;
                setTotalPages(1);
                setTotalElements(userLogsData.length);
                fetchedData = true;
                console.log(`✅ Found ${userLogsData.length} user security logs`);
              }
            } catch (error) {
              console.warn("Could not fetch user security logs:", error);
            }
          }
        }

        // Filter by activity type if we're viewing logs for a specific installation
        if (logType.startsWith("sec_inst_") && logType !== "all" && securityLogsData.length > 0) {
          const parts = logType.split("_");
          if (parts.length > 3) {
            const activityType = parts[3]; // Extract activity type from filter if present
            if (activityType && activityType !== "inst") {
              filterApplied = true;
              console.log(`🔍 Further filtering installation logs by activity type: ${activityType}`);
              const preFilterCount = securityLogsData.length;
              securityLogsData = securityLogsData.filter((log: any) => 
                log.activityType === activityType
              );
              console.log(`Filtered from ${preFilterCount} to ${securityLogsData.length} logs with activity type ${activityType}`);
            }
          }
        }

        // Sort logs by timestamp descending (newest first)
        if (securityLogsData.length > 0) {
          securityLogsData.sort((a: any, b: any) => {
            return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
          });
        }

        setSecurityLogs(securityLogsData);

        if (securityLogsData.length > 0) {
          toast({
            title: "Security Logs Refreshed",
            description: `Loaded ${securityLogsData.length} security audit logs.`
          });
        } else {
          // Provide guidance if no logs were found
          let suggestion = '';

          if (filterApplied) {
            if (logType !== "all" && !logType.startsWith("sec_inst_")) {
              suggestion = `No data found for activity type "${logType}". Try a different activity type or time range.`;
            } else if (logType.startsWith("sec_inst_")) {
              const parts = logType.split("_");
              if (parts.length > 3) {
                suggestion = `No data found for the selected installation and activity type. Try a different combination.`;
              } else {
                suggestion = 'Try expanding your time range to last 7 or 30 days.';
              }
            }
          } else if (!logType.startsWith("sec_inst_")) {
            suggestion = 'Try selecting a specific installation for better results.';
          } else if (timeRange === 'today' || timeRange === 'yesterday') {
            suggestion = 'Try expanding your time range to last 7 or 30 days.';
          }

          toast({
            title: "No Security Logs Found",
            description: suggestion,
            variant: "default"
          });
        }
      } catch (error) {
        console.error("Error fetching security logs:", error);
        toast({
          title: "Error",
          description: "Failed to load security logs. Please try again.",
          variant: "destructive",
        });
        setSecurityLogs([]);
      }
    } catch (error) {
      console.error("Error in security logs fetch:", error);
    } finally {
      setLoading(false);
    }
  }

  // Handle tab change
  const handleTabChange = (value) => {
    // Reset filters when switching tabs to ensure independence
    setSearchTerm("");
    setLogType("all");

    // Update active tab
    setActiveTab(value);

    if (value === "security") {
      // Load security logs when tab is first opened or switched to
      handleFetchSecurityLogs();
    } else {
      // Reset to operational logs
      fetchLogsData();
    }
  }

  // Auto-fetch security logs when filters change
  useEffect(() => {
    if (activeTab === "security" && initialLoadDone) {
      console.log("🔄 Security logs filter changed, auto-refreshing...");
      handleFetchSecurityLogs();
    }
  }, [logType, timeRange, activeTab, initialLoadDone]);

  // Filter logs based on search term
  const filteredLogs = activeTab === "operational" 
    ? logs.filter(log =>
        log.operation?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.sourceSystem?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.details?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.installationId?.toString().includes(searchTerm) ||
        log.userId?.toString().includes(searchTerm)
      )
    : securityLogs.filter(log =>
        log.activityType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.details?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.userId?.toString().includes(searchTerm) ||
        log.installationId?.toString().includes(searchTerm)
      );

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
  const handleExportLogs = async () => {
    try {
      setExporting(true)

      // Check for authentication token first
      const token = typeof window !== 'undefined' 
        ? localStorage.getItem("token") || sessionStorage.getItem("token")
        : null;

      if (!token) {
        console.error("Missing authentication token for logs export request");
        toast({
          title: "Authentication Error",
          description: "Your session may have expired. Please log in again.",
          variant: "destructive"
        });
        setExporting(false);
        return;
      }

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

      // Prepare filters based on current view
      const filters = {
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
        sortField,
        sortDirection
      }

      // Add type-specific filters
      if (logType !== "all") {
        if (logType.startsWith("op_")) {
          filters.operation = logType.replace("op_", "")
        } else if (logType.startsWith("src_")) {
          filters.sourceSystem = logType.replace("src_", "")
        } else if (logType.startsWith("inst_")) {
          filters.installationId = logType.replace("inst_", "")
        }
      }

      // Add search term if available
      if (searchTerm) {
        filters.searchTerm = searchTerm
      }

      // Export with all current filters
      const blobData = await serviceControlApi.exportLogs(filters)

      // Create and trigger download
      const url = window.URL.createObjectURL(new Blob([blobData]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `logs_export_${new Date().toISOString().split('T')[0]}.csv`)
      document.body.appendChild(link)
      link.click()
      link.remove()

      toast({
        title: "Export Successful",
        description: "Logs have been exported successfully",
        variant: "default",
      })
    } catch (error) {
      console.error("Error exporting logs:", error)
      toast({
        title: "Export Failed",
        description: "Failed to export logs. Please try again.",
        variant: "destructive",
      })
    } finally {
      setExporting(false)
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
                        <SelectItem value="op_SERVICE_STATUS_CHANGE">Service Status Change</SelectItem>
                        <SelectItem value="op_COMMAND_SENT">Command Sent</SelectItem>
                        <SelectItem value="op_COMMAND_RESPONSE">Command Response</SelectItem>
                        <SelectItem value="op_DEVICE_HEARTBEAT">Device Heartbeat</SelectItem>
                        <SelectItem value="op_DEVICE_CONFIGURATION">Device Configuration</SelectItem>
                        <SelectItem value="op_DEVICE_FIRMWARE_UPDATE">Device Firmware Update</SelectItem>
                        <SelectItem value="op_DEVICE_REBOOT">Device Reboot</SelectItem>
                        <SelectItem value="op_DEVICE_POWER_CHANGE">Device Power Change</SelectItem>
                        <SelectItem value="op_MAINTENANCE_MODE">Maintenance Mode</SelectItem>
                        <SelectItem value="op_SECURITY_ACTION">Security Action</SelectItem>
                        <SelectItem value="op_PAYMENT_ACTION">Payment Action</SelectItem>
                        <SelectItem value="op_SYSTEM_ALERT">System Alert</SelectItem>
                        <SelectItem value="op_USER_ACTION">User Action</SelectItem>
                        <SelectItem value="op_SERVICE_STATUS_UPDATE">Service Status Update</SelectItem>
                        <SelectItem value="op_SERVICE_SUSPENSION">Service Suspension</SelectItem>
                        <SelectItem value="op_SERVICE_RESTORATION">Service Restoration</SelectItem>
                        <SelectItem value="op_STATUS_CHANGE_SCHEDULED">Status Change Scheduled</SelectItem>
                        <SelectItem value="op_SCHEDULED_CHANGE_CANCELLED">Scheduled Change Cancelled</SelectItem>
                        <SelectItem value="op_COMMAND_CANCELLED">Command Cancelled</SelectItem>
                        <SelectItem value="op_COMMAND_RETRIED">Command Retried</SelectItem>
                        <SelectItem value="op_PAYMENT_STATUS_CHANGE">Payment Status Change</SelectItem>
                        <SelectItem value="op_PROCESS_OVERDUE_PAYMENTS">Process Overdue Payments</SelectItem>
                        <SelectItem value="op_TAMPER_EVENT_RECEIVED">Tamper Event Received</SelectItem>
                        <SelectItem value="op_SECURITY_RESPONSE_PROCESSED">Security Response Processed</SelectItem>
                        <SelectItem value="op_SERVICE_STARTED">Service Started</SelectItem>
                        <SelectItem value="op_SERVICE_STOPPED">Service Stopped</SelectItem>
                        <SelectItem value="op_SERVICE_RESTARTED">Service Restarted</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select 
                      value={logType.startsWith("inst_") ? logType : "all_installations"} 
                      onValueChange={(value) => {
                        if (value === "all_installations") {
                          // If the current logType is an installation filter, reset to all
                          if (logType.startsWith("inst_")) {
                            setLogType("all");
                          }
                        } else {
                          setLogType(value);
                        }
                      }}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Installation" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all_installations">All Installations</SelectItem>
                        {installations.map((installation) => (
                          <SelectItem key={installation.id} value={`inst_${installation.id}`}>
                            {installation.name || `Installation #${installation.id}`}
                          </SelectItem>
                        ))}
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

                    <Button variant="outline" size="icon" onClick={handleRefreshLogs} disabled={loading}>
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
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
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        // No need to add auto-refresh here as we apply search locally
                      }}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Select value={logType} onValueChange={(value) => {
                      setLogType(value);
                      // No need for setTimeout - the useEffect will handle the refresh
                    }}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Activity Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Activities</SelectItem>
                        <SelectItem value="SENSOR_READING">Sensor Reading</SelectItem>
                        <SelectItem value="CONFIGURATION_CHANGE">Configuration Change</SelectItem>
                        <SelectItem value="ALERT_GENERATED">Alert Generated</SelectItem>
                        <SelectItem value="ALERT_ACKNOWLEDGED">Alert Acknowledged</SelectItem>
                        <SelectItem value="ALERT_RESOLVED">Alert Resolved</SelectItem>
                        <SelectItem value="SYSTEM_DIAGNOSTIC">System Diagnostic</SelectItem>
                        <SelectItem value="SENSITIVITY_CHANGE">Sensitivity Change</SelectItem>
                        <SelectItem value="MANUAL_CHECK">Manual Check</SelectItem>
                        <SelectItem value="REMOTE_ACCESS">Remote Access</SelectItem>
                        <SelectItem value="FIRMWARE_UPDATE">Firmware Update</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select 
                      value={logType.startsWith("sec_inst_") ? logType : "all_installations"} 
                      onValueChange={(value) => {
                        if (value === "all_installations") {
                          // If the current logType is an installation filter, reset to all
                          if (logType.startsWith("sec_inst_")) {
                            setLogType("all");
                            // No need for setTimeout - the useEffect will handle the refresh
                          }
                        } else {
                          setLogType(value);
                          // No need for setTimeout - the useEffect will handle the refresh
                        }
                      }}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Installation" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all_installations">All Installations</SelectItem>
                        {installations.map((installation) => (
                          <SelectItem key={installation.id} value={`sec_inst_${installation.id}`}>
                            {installation.name || `Installation #${installation.id}`}
                          </SelectItem>
                        ))}
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

                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={() => handleFetchSecurityLogs()}
                      disabled={loading}
                    >
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                {/* Status indicator when loading or filtering */}
                {loading && (
                  <div className="mt-2 text-sm text-muted-foreground bg-muted/50 p-2 rounded-md flex items-center animate-pulse">
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    <span>Loading security logs...</span>
                  </div>
                )}

                {!loading && logType !== "all" && (
                  <div className="mt-2 text-sm text-blue-500 bg-blue-50 dark:bg-blue-950/30 p-2 rounded-md flex items-center">
                    <Info className="h-4 w-4 mr-2" />
                    <span>
                      <strong>Filter applied:</strong> {logType.startsWith("sec_inst_") 
                        ? `Installation ${logType.replace("sec_inst_", "")}` 
                        : `Activity type "${logType}"`}
                    </span>
                  </div>
                )}

                {/* Time Range Selection Guide/Help */}
                <div className="mt-2 text-sm text-muted-foreground bg-muted p-2 rounded-md flex items-center">
                  <Info className="h-4 w-4 mr-2" />
                  <span>
                    Tip: Select an installation first for best results. Time range filters logs from {' '}
                    {timeRange === 'today' ? 'today only' : 
                     timeRange === 'yesterday' ? 'yesterday only' : 
                     timeRange === 'week' ? 'the past 7 days' : 'the past 30 days'}.
                  </span>
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
                        ) : logType !== "all" ? (
                          <>No logs match the selected filter{activeTab === "security" && logType !== "all" ? ` (${logType})` : ""}. Try different parameters.</>
                        ) : (
                          <>No logs found for the selected time period and filters.</>
                        )}
                      </p>
                      {activeTab === "security" && logType !== "all" && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => {
                            setLogType("all");
                            setTimeout(() => handleFetchSecurityLogs(), 100);
                          }}
                          className="mt-2"
                        >
                          Clear Activity Filter
                        </Button>
                      )}
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
                              onClick={() => handleSort(activeTab === "operational" ? "timestamp" : "timestamp")}
                            >
                              Timestamp
                              {sortField === (activeTab === "operational" ? "timestamp" : "timestamp") && (
                                <ArrowUpDown className="ml-2 h-4 w-4" />
                              )}
                            </Button>
                          </TableHead>
                          {activeTab === "operational" ? (
                            <>
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
                                  onClick={() => handleSort("success")}
                                >
                                  Status
                                  {sortField === "success" && (
                                    <ArrowUpDown className="ml-2 h-4 w-4" />
                                  )}
                                </Button>
                              </TableHead>
                              <TableHead>Source System</TableHead>
                              <TableHead>Installation</TableHead>
                              <TableHead className="w-1/3">Details</TableHead>
                            </>
                          ) : (
                            <>
                              <TableHead>
                                <Button
                                  variant="ghost"
                                  className="p-0 font-medium"
                                  onClick={() => handleSort("activityType")}
                                >
                                  Activity Type
                                  {sortField === "activityType" && (
                                    <ArrowUpDown className="ml-2 h-4 w-4" />
                                  )}
                                </Button>
                              </TableHead>
                              <TableHead className="w-1/3">Details</TableHead>
                              <TableHead>Installation</TableHead>
                              <TableHead>User ID</TableHead>
                            </>
                          )}
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

                              {activeTab === "operational" ? (
                                <>
                                  <TableCell>{log.operation || "N/A"}</TableCell>
                                  <TableCell>
                                    <div className="flex items-center">
                                      {log.success === true ? (
                                        <CheckCircle className="h-4 w-4 text-green-500" />
                                      ) : log.success === false ? (
                                        <XCircle className="h-4 w-4 text-red-500" />
                                      ) : (
                                        <Info className="h-4 w-4" />
                                      )}
                                      <span className="ml-2">
                                        {log.success === true ? (
                                          <Badge variant="outline" className="bg-green-50 text-green-700 hover:bg-green-50 border-green-200">Success</Badge>
                                        ) : log.success === false ? (
                                          <Badge variant="outline" className="bg-red-50 text-red-700 hover:bg-red-50 border-red-200">Failure</Badge>
                                        ) : (
                                          <Badge variant="outline">Unknown</Badge>
                                        )}
                                      </span>
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
                                  <TableCell className="max-w-md truncate" title={log.details}>
                                    {log.details || "No details"}
                                  </TableCell>
                                </>
                              ) : (
                                <>
                                  <TableCell>
                                    <Badge variant="outline">
                                      {log.activityType || "Unknown"}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="max-w-md truncate" title={log.details}>
                                    {log.details || "No details"}
                                  </TableCell>
                                  <TableCell>
                                    {log.installationId
                                      ? installation
                                        ? installation.name
                                        : `Installation #${log.installationId}`
                                      : "N/A"}
                                  </TableCell>
                                  <TableCell>{log.userId || "SYSTEM"}</TableCell>
                                </>
                              )}
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {/* Pagination Controls */}
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {logs.length > 0 ? page * pageSize + 1 : 0}-
                    {Math.min((page + 1) * pageSize, totalElements)} of {totalElements} logs
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(0)}
                      disabled={page === 0 || loading}
                    >
                      First
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(0, p - 1))}
                      disabled={page === 0 || loading}
                    >
                      Previous
                    </Button>
                    <span className="text-sm mx-2">
                      Page {page + 1} of {totalPages || 1}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => p + 1)}
                      disabled={page >= totalPages - 1 || loading}
                    >
                      Next
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(totalPages - 1)}
                      disabled={page >= totalPages - 1 || loading}
                    >
                      Last
                    </Button>
                    <Select value={pageSize.toString()} onValueChange={(value) => {
                      setPageSize(Number(value))
                      setPage(0)
                    }}>
                      <SelectTrigger className="w-20">
                        <SelectValue placeholder="20" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Only show dashboard cards for operational logs */}
        {activeTab === "operational" && (
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
                    {/* Calculate success/failure rates based directly on SUCCESS field */}
                    {(() => {
                      const statusCounts = { success: 0, failure: 0 }

                      logs.forEach(log => {
                        if (log.success === true) statusCounts.success++
                        else if (log.success === false) statusCounts.failure++
                      })

                      const total = logs.length
                      const successRate = Math.round((statusCounts.success / total) * 100) || 0
                      const failureRate = Math.round((statusCounts.failure / total) * 100) || 0

                      return (
                        <div className="space-y-6 w-full max-w-sm">
                          <div className="text-center mb-6">
                            <div className="relative pt-1">
                              <div className="flex mb-2 items-center justify-between">
                                <div>
                                  <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-green-600 bg-green-200">
                                    Success
                                  </span>
                                </div>
                                <div>
                                  <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-red-600 bg-red-200">
                                    Failure
                                  </span>
                                </div>
                              </div>
                              <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-gray-200">
                                <div style={{ width: `${successRate}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap justify-center bg-green-500">
                                </div>
                                <div style={{ width: `${failureRate}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap justify-center bg-red-500">
                                </div>
                              </div>
                              <div className="flex justify-between text-xs text-muted-foreground">
                                <span>{successRate}%</span>
                                {failureRate > 0 && <span>{failureRate}%</span>}
                              </div>
                            </div>
                          </div>

                          <div className="flex justify-between items-center">
                            <div className="flex items-center">
                              <div className="w-4 h-4 rounded-full bg-green-500 mr-2"></div>
                              <span>Success</span>
                            </div>
                            <span className="font-semibold">{statusCounts.success} logs ({successRate}%)</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <div className="flex items-center">
                              <div className="w-4 h-4 rounded-full bg-red-500 mr-2"></div>
                              <span>Failure</span>
                            </div>
                            <span className="font-semibold">{statusCounts.failure} logs ({failureRate}%)</span>
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* For security logs, maybe add a different dashboard or info panel */}
        {activeTab === "security" && (
          <div className="mt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Security Logs Overview</CardTitle>
                <CardDescription>
                  View and monitor security-related activities across your installations
                </CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <p>Use the filters above to narrow down security logs by activity type or installation.</p>
                <p className="mt-2">Security logs record sensitive activities such as tamper events, configuration changes, alert acknowledgments, and system diagnostics.</p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
