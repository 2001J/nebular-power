"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowUpDown, CheckCircle, Clock, Settings, ShieldAlert, AlertTriangle, Clock4, RefreshCw, Plus, Activity, BarChart2, Zap, Signal, Server, Loader2 } from "lucide-react"
import { format } from "date-fns"

import { Badge } from "@/components/ui/badge"
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { toast } from "@/components/ui/use-toast"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { serviceControlApi, installationApi, serviceApi } from "@/lib/api"
import { ServiceStatusCard } from "./components/ServiceStatusCard"
import { ServiceStatusTable } from "./components/ServiceStatusTable"

export default function ServicePage() {
  const [activeTab, setActiveTab] = useState("statuses")
  const [installations, setInstallations] = useState([])
  const [statuses, setStatuses] = useState([])
  const [commands, setCommands] = useState([])
  const [selectedInstallation, setSelectedInstallation] = useState(null)
  const [loading, setLoading] = useState(true)
  const [commandsLoading, setCommandsLoading] = useState(true)
  const [updateStatusDialogOpen, setUpdateStatusDialogOpen] = useState(false)
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false)
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false)
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false)
  const [newCommandDialogOpen, setNewCommandDialogOpen] = useState(false)
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [commandStatusFilter, setCommandStatusFilter] = useState("all")
  const [sortBy, setSortBy] = useState("lastUpdated")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
  const [totalStatusItems, setTotalStatusItems] = useState(0)
  const [hasLoadedInitialData, setHasLoadedInitialData] = useState(false)

  // Form states
  const [statusFormData, setStatusFormData] = useState({
    status: "ACTIVE",
    statusReason: ""
  })

  const [suspendFormData, setSuspendFormData] = useState({
    reason: "",
    suspensionType: "PAYMENT" // PAYMENT, SECURITY, MAINTENANCE
  })

  const [maintenanceFormData, setMaintenanceFormData] = useState({
    startDate: new Date(),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default to 7 days from now
    reason: "",
    technician: "",
    notes: ""
  })

  const [restoreFormData, setRestoreFormData] = useState({
    reason: ""
  })

  const [scheduleFormData, setScheduleFormData] = useState({
    targetStatus: "ACTIVE",
    reason: "",
    scheduledTime: new Date(Date.now() + 24 * 60 * 60 * 1000) // Default to 24 hours from now
  })

  const [commandFormData, setCommandFormData] = useState({
    installationId: "",
    commandType: "",
    params: "",
    priority: "NORMAL"
  })

  const [isSubmitting, setIsSubmitting] = useState(false)

  // Add state for commandStats
  const [commandStats, setCommandStats] = useState({})

  // Fetch installations and statuses
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        
        // Get all installations
        const installationsData = await installationApi.getAllInstallations()
        setInstallations(installationsData?.content || [])
        
        // Get statuses
        await fetchPaginatedStatuses()
      } catch (error) {
        console.error("Error fetching service data:", error)
        toast({
          title: "Error",
          description: "Failed to load service data. Please try again.",
          variant: "destructive",
        })
        // Set empty arrays to prevent undefined errors
        setInstallations([])
        setStatuses([])
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [page, pageSize, statusFilter])

  // Fetch device commands with a more robust approach
  const fetchCommands = async () => {
    try {
      // Set loading state
      setCommandsLoading(true)
      setCommands([]) // Clear existing commands while loading

      // Check if we have installations
      if (installations.length === 0) {
        console.log("No installations available, cannot fetch commands")
        setCommandsLoading(false)
        return
      }

      let commandsData = []

      if (commandStatusFilter !== "all") {
        // Fetch commands by status
        console.log(`Fetching commands with status: ${commandStatusFilter}`)
        const commandsResponse = await serviceControlApi.getCommandsByStatus(commandStatusFilter)
        commandsData = commandsResponse?.content || []
      } else if (selectedInstallation) {
        // If we have a selected installation, fetch just for that one
        console.log(`Fetching commands for selected installation: ${selectedInstallation.id}`)
        const installationCommands = await serviceControlApi.getCommandsByInstallation(selectedInstallation.id)
        commandsData = installationCommands?.content || []
      } else {
        // Fetch pending commands from all installations to avoid overloading
        console.log(`Fetching recent commands for ${installations.length} installations`)
        
        // Get command status counts to display in dashboard
        try {
          const statusCounts = await serviceControlApi.getCommandStatusCounts()
          setCommandStats(statusCounts)
        } catch (error) {
          console.error("Error fetching command status counts:", error)
        }

        // Get recent commands from first 5 installations
        const topInstallations = installations.slice(0, 5)
        for (const installation of topInstallations) {
          try {
            const installationCommands = await serviceControlApi.getCommandsByInstallation(installation.id)
            if (installationCommands && installationCommands.content) {
              commandsData = [...commandsData, ...installationCommands.content]
            }
          } catch (error) {
            console.error(`Error fetching commands for installation ${installation.id}:`, error)
          }
        }
      }

      console.log(`Fetched ${commandsData.length} commands`)
      setCommands(commandsData)
    } catch (error) {
      console.error("Error fetching commands:", error)
      toast({
        title: "Error",
        description: "Failed to load device commands",
        variant: "destructive",
      })
    } finally {
      setCommandsLoading(false)
    }
  }

  // Handle tab changes
  const handleTabChange = (value) => {
    setActiveTab(value)

    // If switching to commands tab, load the commands
    if (value === "commands") {
      fetchCommands()
    }
  }

  // Load commands when installations change or when filter changes
  useEffect(() => {
    if (activeTab === "commands" && installations.length > 0) {
      fetchCommands()
    }
  }, [installations.length, commandStatusFilter, activeTab])

  const getStatusBadge = (status) => {
    if (!status) return <Badge variant="outline">Unknown</Badge>

    switch (status.toUpperCase()) {
      case 'ACTIVE':
        return <Badge variant="success">Active</Badge>
      case 'SUSPENDED_PAYMENT':
        return <Badge variant="destructive">Suspended (Payment)</Badge>
      case 'SUSPENDED_SECURITY':
        return <Badge variant="destructive">Suspended (Security)</Badge>
      case 'SUSPENDED_MAINTENANCE':
        return <Badge variant="warning">Maintenance</Badge>
      case 'PENDING':
        return <Badge variant="outline">Pending</Badge>
      case 'TRANSITIONING':
        return <Badge variant="secondary">Transitioning</Badge>
      case 'SCHEDULED':
        return <Badge variant="secondary">Scheduled Change</Badge>
      case 'UNKNOWN':
        return <Badge variant="outline">Unknown</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getCommandStatusBadge = (status) => {
    if (!status) return <Badge variant="outline">Unknown</Badge>

    switch (status.toUpperCase()) {
      case 'PENDING':
        return <Badge variant="outline">Pending</Badge>
      case 'SENT':
        return <Badge variant="secondary">Sent</Badge>
      case 'DELIVERED':
        return <Badge variant="secondary">Delivered</Badge>
      case 'EXECUTED':
        return <Badge variant="success">Executed</Badge>
      case 'FAILED':
        return <Badge variant="destructive">Failed</Badge>
      case 'TIMEOUT':
        return <Badge variant="destructive">Timeout</Badge>
      case 'CANCELLED':
        return <Badge variant="secondary">Cancelled</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  // Handler for updating status
  const handleUpdateStatus = async () => {
    if (!selectedInstallation || !selectedInstallation.id) {
      toast({
        title: "Error",
        description: "No installation selected or invalid installation ID",
        variant: "destructive",
      })
      return
    }

    try {
      setIsSubmitting(true)
      
      const statusData = {
        status: statusFormData.status,
        statusReason: statusFormData.statusReason
      }

      // Close the dialog first to provide immediate feedback
      setUpdateStatusDialogOpen(false)

      try {
        // Attempt to update the status
        const response = await serviceControlApi.updateServiceStatus(selectedInstallation.id, statusData)
        
        // Show success toast
        toast({
          title: "Status Updated",
          description: `Service status for installation #${selectedInstallation.id} has been updated to ${statusFormData.status}.`,
          variant: "default",
        })

        // Update the local state to reflect the change immediately
        setStatuses(prev => {
          // Find the index of the status to update
          const index = prev.findIndex(s => s.installationId === selectedInstallation.id)
          if (index >= 0) {
            // Create a copy of the statuses array
            const newStatuses = [...prev]
            // Replace the old status with the updated one
            newStatuses[index] = {
              ...prev[index],
              status: statusFormData.status,
              statusReason: statusFormData.statusReason,
              updatedAt: new Date().toISOString(),
              lastUpdated: new Date().toISOString()
            }
            return newStatuses
          }
          // If not found, add the new status
          return [...prev, {
            id: null,
            installationId: selectedInstallation.id,
            status: statusFormData.status,
            statusReason: statusFormData.statusReason,
            updatedAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
            updatedBy: "Current User"
          }]
        })
        
        // Force a refresh of the data to ensure UI is in sync
        setTimeout(() => {
          fetchPaginatedStatuses()
        }, 1000)
        
      } catch (updateError) {
        console.error(`Error updating status for installation ${selectedInstallation.id}:`, updateError)
        
        // Check if it's a logging error but the status was actually updated
        if (updateError.message && updateError.message.includes("USER_AGENT")) {
          // The status was likely updated but the logging failed
          toast({
            title: "Status Updated",
            description: `Service status updated but there was a minor logging issue. Refreshing data...`,
            variant: "default",
          })
          
          // Force a refresh to get the latest status
          fetchPaginatedStatuses()
        } else {
          // It was a more serious error
          toast({
            title: "Error",
            description: updateError.message || "Failed to update service status. Please try again.",
            variant: "destructive",
          })
        }
      }

      // Reset form data
      setStatusFormData({
        status: "ACTIVE",
        statusReason: ""
      })

    } catch (error) {
      console.error(`General error during status update for installation ${selectedInstallation.id}:`, error)
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handler for suspending service
  const handleSuspendService = async () => {
    if (!selectedInstallation || !selectedInstallation.id) {
      toast({
        title: "Error",
        description: "No installation selected or invalid installation ID",
        variant: "destructive",
      })
      return
    }

    try {
      setIsSubmitting(true)

      if (suspendFormData.suspensionType === "MAINTENANCE") {
        // For maintenance suspension, we need additional data
        const maintenanceData = {
          startDate: maintenanceFormData.startDate.toISOString(),
          endDate: maintenanceFormData.endDate.toISOString(),
          technician: maintenanceFormData.technician,
          notes: maintenanceFormData.notes
        }

        await serviceControlApi.suspendServiceForMaintenance(selectedInstallation.id, maintenanceData)

        toast({
          title: "Service Suspended for Maintenance",
          description: `Maintenance scheduled from ${format(maintenanceFormData.startDate, "PP")} to ${format(maintenanceFormData.endDate, "PP")}.`,
          variant: "default",
        })
      } else if (suspendFormData.suspensionType === "PAYMENT") {
        // For payment suspension
        await serviceControlApi.suspendServiceForPayment(selectedInstallation.id, suspendFormData.reason)

        toast({
          title: "Service Suspended for Payment Issues",
          description: `Service for installation #${selectedInstallation.id} has been suspended.`,
          variant: "default",
        })
      } else if (suspendFormData.suspensionType === "SECURITY") {
        // For security suspension
        await serviceControlApi.suspendServiceForSecurity(selectedInstallation.id, suspendFormData.reason)

        toast({
          title: "Service Suspended for Security Concerns",
          description: `Service for installation #${selectedInstallation.id} has been suspended.`,
          variant: "default",
        })
      }

      // Refresh data
      try {
        const updatedStatus = await serviceControlApi.getCurrentStatus(selectedInstallation.id)
        setStatuses(prev => {
          const index = prev.findIndex(s => s.installationId === selectedInstallation.id)
          if (index >= 0) {
            const newStatuses = [...prev]
            newStatuses[index] = updatedStatus
            return newStatuses
          }
          return [...prev, updatedStatus]
        })
      } catch (refreshError) {
        console.error("Error refreshing status after suspension:", refreshError)
        // Force a full refresh
        const installationsData = await installationApi.getAllInstallations()
        setInstallations(installationsData?.content || [])
      }

      setSuspendDialogOpen(false)

    } catch (error) {
      console.error(`Error suspending service for installation ${selectedInstallation.id}:`, error)
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to suspend service",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handler for restoring service
  const handleRestoreService = async () => {
    if (!selectedInstallation || !selectedInstallation.id) {
      toast({
        title: "Error",
        description: "No installation selected or invalid installation ID",
        variant: "destructive",
      })
      return
    }

    try {
      setIsSubmitting(true)
      await serviceControlApi.restoreService(selectedInstallation.id, restoreFormData.reason)

      toast({
        title: "Service Restored",
        description: `Service for installation #${selectedInstallation.id} has been restored.`,
        variant: "default",
      })

      // Refresh data
      try {
        const updatedStatus = await serviceControlApi.getCurrentStatus(selectedInstallation.id)
        setStatuses(prev => {
          const index = prev.findIndex(s => s.installationId === selectedInstallation.id)
          if (index >= 0) {
            const newStatuses = [...prev]
            newStatuses[index] = updatedStatus
            return newStatuses
          }
          return [...prev, updatedStatus]
        })
      } catch (refreshError) {
        console.error("Error refreshing status after restoration:", refreshError)
        // Force a full refresh
        const installationsData = await installationApi.getAllInstallations()
        setInstallations(installationsData?.content || [])
      }

      setRestoreDialogOpen(false)

    } catch (error) {
      console.error(`Error restoring service for installation ${selectedInstallation.id}:`, error)
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to restore service",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handler for scheduling a status change
  const handleScheduleStatusChange = async () => {
    if (!selectedInstallation || !selectedInstallation.id) {
      toast({
        title: "Error",
        description: "No installation selected or invalid installation ID",
        variant: "destructive",
      })
      return
    }

    try {
      setIsSubmitting(true)
      await serviceControlApi.scheduleStatusChange(
        selectedInstallation.id,
        scheduleFormData.targetStatus,
        scheduleFormData.reason,
        scheduleFormData.scheduledTime.toISOString()
      )

      toast({
        title: "Status Change Scheduled",
        description: `Service status change for installation #${selectedInstallation.id} scheduled for ${format(scheduleFormData.scheduledTime, "PPp")}.`,
        variant: "default",
      })

      // Refresh data
      try {
        const updatedStatus = await serviceControlApi.getCurrentStatus(selectedInstallation.id)
        setStatuses(prev => {
          const index = prev.findIndex(s => s.installationId === selectedInstallation.id)
          if (index >= 0) {
            const newStatuses = [...prev]
            newStatuses[index] = updatedStatus
            return newStatuses
          }
          return [...prev, updatedStatus]
        })
      } catch (refreshError) {
        console.error("Error refreshing status after scheduling:", refreshError)
        // Force a full refresh
        const installationsData = await installationApi.getAllInstallations()
        setInstallations(installationsData?.content || [])
      }

      setScheduleDialogOpen(false)

    } catch (error) {
      console.error(`Error scheduling status change for installation ${selectedInstallation.id}:`, error)
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to schedule status change",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSendCommand = async () => {
    try {
      setIsSubmitting(true)

      if (!commandFormData.installationId || !commandFormData.commandType) {
        toast({
          title: "Missing Information",
          description: "Please select an installation and command type",
          variant: "destructive",
        })
        return
      }

      // Parse the params string into an object if it's provided
      let params = {}
      if (commandFormData.params && commandFormData.params.trim() !== '') {
        try {
          params = JSON.parse(commandFormData.params)
        } catch (error) {
          toast({
            title: "Invalid Parameters",
            description: "Command parameters must be valid JSON",
            variant: "destructive",
          })
          return
        }
      }

      // Add priority to params if needed
      params.priority = commandFormData.priority || 'NORMAL'

      // Send the command
      await serviceControlApi.sendCommand(
        commandFormData.installationId,
        commandFormData.commandType,
        params
      )

      toast({
        title: "Command Sent",
        description: `Command ${commandFormData.commandType} sent to installation ${commandFormData.installationId}`,
        variant: "default",
      })

      // Close the dialog and refresh commands
      setNewCommandDialogOpen(false)
      fetchCommands()

      // Reset form
      setCommandFormData({
        installationId: "",
        commandType: "",
        params: "",
        priority: "NORMAL"
      })
    } catch (error) {
      console.error("Error sending command:", error)
      toast({
        title: "Error",
        description: "Failed to send command. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Add function to handle retry command
  const handleRetryCommand = async (commandId) => {
    try {
      setCommandsLoading(true)
      
      await serviceControlApi.retryCommand(commandId)
      
      toast({
        title: "Command Retried",
        description: "Command has been queued for retry",
        variant: "default",
      })
      
      // Refresh commands list
      fetchCommands()
    } catch (error) {
      console.error(`Error retrying command ${commandId}:`, error)
      toast({
        title: "Error",
        description: "Failed to retry command. Please try again.",
        variant: "destructive",
      })
    } finally {
      setCommandsLoading(false)
    }
  }

  // Add function to handle cancel command
  const handleCancelCommand = async (commandId) => {
    try {
      setCommandsLoading(true)
      
      await serviceControlApi.cancelCommand(commandId)
      
      toast({
        title: "Command Cancelled",
        description: "Command has been cancelled successfully",
        variant: "default",
      })
      
      // Refresh commands list
      fetchCommands()
    } catch (error) {
      console.error(`Error cancelling command ${commandId}:`, error)
      toast({
        title: "Error",
        description: "Failed to cancel command. Please try again.",
        variant: "destructive",
      })
    } finally {
      setCommandsLoading(false)
    }
  }

  // Add these functions for service control actions
  const handleStartService = async (installationId) => {
    try {
      setLoading(true)
      await serviceApi.startService(installationId)
      
      toast({
        title: "Service Started",
        description: `Started service for installation #${installationId}`,
        variant: "default",
      })
      
      // Refresh statuses
      await fetchPaginatedStatuses()
    } catch (error) {
      console.error(`Error starting service for installation ${installationId}:`, error)
      toast({
        title: "Error",
        description: "Failed to start service. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }
  
  const handleStopService = async (installationId) => {
    try {
      setLoading(true)
      await serviceApi.stopService(installationId)
      
      toast({
        title: "Service Stopped",
        description: `Stopped service for installation #${installationId}`,
        variant: "default",
      })
      
      // Refresh statuses
      await fetchPaginatedStatuses()
    } catch (error) {
      console.error(`Error stopping service for installation ${installationId}:`, error)
      toast({
        title: "Error",
        description: "Failed to stop service. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }
  
  const handleRestartService = async (installationId) => {
    try {
      setLoading(true)
      await serviceApi.restartService(installationId)
      
      toast({
        title: "Service Restarted",
        description: `Restarted service for installation #${installationId}`,
        variant: "default",
      })
      
      // Refresh statuses
      await fetchPaginatedStatuses()
    } catch (error) {
      console.error(`Error restarting service for installation ${installationId}:`, error)
      toast({
        title: "Error",
        description: "Failed to restart service. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }
  
  // Use this improved function to fetch statuses with pagination
  const fetchPaginatedStatuses = async () => {
    try {
      setLoading(true)
      setStatuses([]) // Clear existing statuses while loading

      let statusesData = []
      let totalItems = 0

      // If a status filter is applied, use the paginated API endpoint
      if (statusFilter !== "ALL") {
        const response = await serviceControlApi.getInstallationsByStatus(statusFilter, page, pageSize)
        statusesData = response?.content || []
        totalItems = response?.totalElements || 0
      } else {
        // Fetch installations with pagination
        if (installations.length === 0) {
          const installationsResponse = await installationApi.getAllInstallations({
            page, 
            size: pageSize
          })
          
          const installationsData = installationsResponse?.content || []
          setInstallations(installationsData)
          totalItems = installationsResponse?.totalElements || 0
          
          // If installations exist, fetch their statuses in batch for better performance
          if (installationsData.length > 0) {
            const installationIds = installationsData
              .filter(installation => installation && installation.id)
              .map(installation => installation.id)
            
            if (installationIds.length > 0) {
              // Use batch API for better performance
              statusesData = await serviceControlApi.getBatchStatuses(installationIds)
            }
          }
        } else {
          // We have installations, fetch statuses for the current page in batch
          const pageStart = page * pageSize
          const pageEnd = Math.min(pageStart + pageSize, installations.length)
          const pageInstallations = installations.slice(pageStart, pageEnd)
          totalItems = installations.length
          
          if (pageInstallations.length > 0) {
            const installationIds = pageInstallations
              .filter(installation => installation && installation.id)
              .map(installation => installation.id)
            
            if (installationIds.length > 0) {
              // Use batch API for better performance
              statusesData = await serviceControlApi.getBatchStatuses(installationIds)
            }
          }
        }
      }
      
      // Filter out null values
      statusesData = statusesData.filter(status => status !== null)
      
      setStatuses(statusesData)
      setTotalStatusItems(totalItems)
      
    } catch (error) {
      console.error("Error fetching service status data:", error)
      toast({
        title: "Error",
        description: "Failed to load service status data. Please try again.",
        variant: "destructive",
      })
      setStatuses([])
    } finally {
      setLoading(false)
    }
  }

  // Fetch initial data on load
  useEffect(() => {
    if (!hasLoadedInitialData) {
      fetchPaginatedStatuses()
      setHasLoadedInitialData(true)
    }
  }, [hasLoadedInitialData])

  // Fetch data when pagination or filters change
  useEffect(() => {
    if (hasLoadedInitialData) {
      fetchPaginatedStatuses()
    }
  }, [page, pageSize, statusFilter, sortBy, sortDirection])

  // Define a function to handle page changes
  const handlePageChange = (newPage: number) => {
    setPage(newPage)
  }

  // Define a function to handle page size changes
  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize)
    setPage(0) // Reset to first page when changing page size
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Service Control</h1>
          <p className="text-muted-foreground">
            Manage service status and maintenance for installations
          </p>
        </div>
      </div>

      <Tabs defaultValue="statuses" className="space-y-4" onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="statuses">Service Statuses</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled Changes</TabsTrigger>
          <TabsTrigger value="history">Status History</TabsTrigger>
          <TabsTrigger value="commands">Device Commands</TabsTrigger>
        </TabsList>

        <TabsContent value="statuses" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle>Installation Service Status</CardTitle>
                <CardDescription>
                  Manage service state for all solar installations
                </CardDescription>
              </div>
              <div className="flex items-center space-x-2">
                <Select
                  value={statusFilter}
                  onValueChange={setStatusFilter}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Statuses</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="SUSPENDED_PAYMENT">Suspended (Payment)</SelectItem>
                    <SelectItem value="SUSPENDED_SECURITY">Suspended (Security)</SelectItem>
                    <SelectItem value="SUSPENDED_MAINTENANCE">Maintenance</SelectItem>
                    <SelectItem value="SCHEDULED">Scheduled Changes</SelectItem>
                  </SelectContent>
                </Select>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={fetchPaginatedStatuses}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Replace the card grid with the table */}
              <ServiceStatusTable
                statuses={statuses}
                installations={installations}
                loading={loading}
                page={page}
                pageSize={pageSize}
                totalItems={totalStatusItems}
                onChangePage={handlePageChange}
                onChangePageSize={handlePageSizeChange}
                onStartService={handleStartService}
                onStopService={handleStopService}
                onRestartService={handleRestartService}
                onUpdateStatus={(installation) => {
                  setSelectedInstallation(installation)
                  setStatusFormData({
                    status: installation.status || "ACTIVE",
                    statusReason: ""
                  })
                  setUpdateStatusDialogOpen(true)
                }}
                onSuspendService={(installation) => {
                  setSelectedInstallation(installation)
                  setSuspendFormData({
                    reason: "",
                    suspensionType: "PAYMENT"
                  })
                  setSuspendDialogOpen(true)
                }}
                onRestoreService={(installation) => {
                  setSelectedInstallation(installation)
                  setRestoreFormData({
                    reason: ""
                  })
                  setRestoreDialogOpen(true)
                }}
                onScheduleChange={(installation) => {
                  setSelectedInstallation(installation)
                  setScheduleFormData({
                    targetStatus: "ACTIVE",
                    reason: "",
                    scheduledTime: new Date(Date.now() + 24 * 60 * 60 * 1000)
                  })
                  setScheduleDialogOpen(true)
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scheduled" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Scheduled Status Changes</CardTitle>
              <CardDescription>
                Upcoming service status changes for installations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="py-10 text-center">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
                  <p className="mt-2 text-sm text-muted-foreground">Loading scheduled changes...</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[80px]">ID</TableHead>
                        <TableHead>Installation</TableHead>
                        <TableHead>Current Status</TableHead>
                        <TableHead>Target Status</TableHead>
                        <TableHead>Scheduled Date</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {/* This would ideally use real scheduled data from the API */}
                      {installations.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="h-24 text-center">
                            No installations found to display scheduled changes
                          </TableCell>
                        </TableRow>
                      ) : (
                        <TableRow>
                          <TableCell colSpan={7} className="h-24 text-center">
                            No scheduled changes found
                          </TableCell>
                        </TableRow>
                      )}
                      {/* Example of what a scheduled change would look like 
                      <TableRow>
                        <TableCell className="font-medium">SC-001</TableCell>
                        <TableCell>Residential Solar #RT-542</TableCell>
                        <TableCell>{getStatusBadge("SUSPENDED_MAINTENANCE")}</TableCell>
                        <TableCell>{getStatusBadge("ACTIVE")}</TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                            <span>{format(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), "PPp")}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm line-clamp-1">Scheduled maintenance completion</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                            >
                              Apply Now
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              variant="destructive"
                            >
                              Cancel
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      */}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Status Change History</CardTitle>
              <CardDescription>
                Historical record of service status changes
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="py-10 text-center">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
                  <p className="mt-2 text-sm text-muted-foreground">Loading status history...</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[80px]">ID</TableHead>
                        <TableHead>Installation</TableHead>
                        <TableHead>Status Change</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Changed By</TableHead>
                        <TableHead>Reason</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {/* This would ideally fetch real history data from the API */}
                      {installations.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="h-24 text-center">
                            No installations found to display history
                          </TableCell>
                        </TableRow>
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="h-24 text-center">
                            No status change history found
                          </TableCell>
                        </TableRow>
                      )}
                      {/* Example of what history entries would look like
                      <TableRow>
                        <TableCell className="font-medium">SH-001</TableCell>
                        <TableCell>Residential Solar #RT-542</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusBadge("ACTIVE")} 
                            <span>→</span> 
                            {getStatusBadge("SUSPENDED_MAINTENANCE")}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                            <span>{format(new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), "PPp")}</span>
                          </div>
                        </TableCell>
                        <TableCell>Admin User</TableCell>
                        <TableCell>
                          <span className="text-sm line-clamp-1">Scheduled maintenance for panel replacement</span>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">SH-002</TableCell>
                        <TableCell>Commercial Solar #SJ-128</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusBadge("ACTIVE")} 
                            <span>→</span> 
                            {getStatusBadge("SUSPENDED_PAYMENT")}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                            <span>{format(new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), "PPp")}</span>
                          </div>
                        </TableCell>
                        <TableCell>System</TableCell>
                        <TableCell>
                          <span className="text-sm line-clamp-1">Automatic suspension due to payment delinquency</span>
                        </TableCell>
                      </TableRow>
                      */}
                    </TableBody>
                  </Table>
                </div>
              )}
              <div className="flex justify-end mt-4">
                <Button variant="outline" disabled={installations.length === 0}>
                  Download Full History
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="commands" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle>Device Commands</CardTitle>
                <CardDescription>
                  Send commands to devices and view command history
                </CardDescription>
              </div>

              <div className="flex gap-2">
                <Select
                  value={commandStatusFilter}
                  onValueChange={setCommandStatusFilter}
                  defaultValue="all"
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="executed">Executed</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="timeout">Timeout</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>

                <Button variant="outline" size="sm" onClick={fetchCommands}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {commandsLoading ? (
                <div className="py-10 text-center">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
                  <p className="mt-2 text-sm text-muted-foreground">Loading commands...</p>
                </div>
              ) : (
                <>
                  <div className="flex justify-end mb-4">
                    <Button onClick={() => setNewCommandDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      New Command
                    </Button>
                  </div>

                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[80px]">ID</TableHead>
                          <TableHead>Installation</TableHead>
                          <TableHead>Command Type</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead>Last Updated</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {installations.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="h-24 text-center">
                              No installations found to show commands
                            </TableCell>
                          </TableRow>
                        ) : commands.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="h-24 text-center">
                              No device commands found
                            </TableCell>
                          </TableRow>
                        ) : (
                          commands.map((command) => {
                            const installation = installations.find(i => i.id === command.installationId) || {}

                            return (
                              <TableRow key={command.id}>
                                <TableCell className="font-medium">{command.id}</TableCell>
                                <TableCell>
                                  {installation.name || `Installation #${command.installationId}`}
                                </TableCell>
                                <TableCell>{command.commandType}</TableCell>
                                <TableCell>
                                  {getCommandStatusBadge(command.status)}
                                </TableCell>
                                <TableCell>
                                  {command.createdAt ? format(new Date(command.createdAt), "PPp") : "N/A"}
                                </TableCell>
                                <TableCell>
                                  {command.updatedAt ? format(new Date(command.updatedAt), "PPp") : "N/A"}
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end gap-2">
                                    {command.status === "PENDING" || command.status === "FAILED" ? (
                                      <>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={async () => {
                                            try {
                                              await handleRetryCommand(command.id);
                                            } catch (error) {
                                              console.error("Error retrying command:", error)
                                            }
                                          }}
                                        >
                                          Retry
                                        </Button>
                                        {command.status === "PENDING" && (
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={async () => {
                                              try {
                                                await handleCancelCommand(command.id);
                                              } catch (error) {
                                                console.error("Error cancelling command:", error)
                                              }
                                            }}
                                          >
                                            Cancel
                                          </Button>
                                        )}
                                      </>
                                    ) : (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          // View command details
                                        }}
                                      >
                                        View Details
                                      </Button>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            )
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Command Statistics</CardTitle>
              <CardDescription>Overview of command execution statistics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-card rounded-lg border px-4 py-3">
                  <div className="text-sm font-medium text-muted-foreground">Total Commands</div>
                  <div className="text-2xl font-bold">0</div>
                </div>
                <div className="bg-card rounded-lg border px-4 py-3">
                  <div className="text-sm font-medium text-muted-foreground">Success Rate</div>
                  <div className="text-2xl font-bold">0%</div>
                </div>
                <div className="bg-card rounded-lg border px-4 py-3">
                  <div className="text-sm font-medium text-muted-foreground">Avg Response Time</div>
                  <div className="text-2xl font-bold">0 sec</div>
                </div>
                <div className="bg-card rounded-lg border px-4 py-3">
                  <div className="text-sm font-medium text-muted-foreground">Pending Commands</div>
                  <div className="text-2xl font-bold">0</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Update Status Dialog */}
      <Dialog open={updateStatusDialogOpen} onOpenChange={setUpdateStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Service Status</DialogTitle>
            <DialogDescription>
              Change the service status for this installation.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="installation">Installation</Label>
              <Input
                id="installation"
                value={selectedInstallation ? (selectedInstallation.name || `Installation #${selectedInstallation.id}`) : ""}
                readOnly
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={statusFormData.status}
                onValueChange={(value) => setStatusFormData(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="SUSPENDED_PAYMENT">Suspended (Payment)</SelectItem>
                  <SelectItem value="SUSPENDED_SECURITY">Suspended (Security)</SelectItem>
                  <SelectItem value="SUSPENDED_MAINTENANCE">Maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="statusReason">Reason for Change</Label>
              <Textarea
                id="statusReason"
                placeholder="Enter reason for status change"
                value={statusFormData.statusReason}
                onChange={(e) => setStatusFormData(prev => ({ ...prev, statusReason: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setUpdateStatusDialogOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={() => handleUpdateStatus()} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Status"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suspend Service Dialog */}
      <Dialog open={suspendDialogOpen} onOpenChange={setSuspendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspend Service</DialogTitle>
            <DialogDescription>
              Suspend service for this installation.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="susp-installation">Installation</Label>
              <Input
                id="susp-installation"
                value={selectedInstallation ? (selectedInstallation.name || `Installation #${selectedInstallation.id}`) : ""}
                readOnly
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="suspensionType">Suspension Type</Label>
              <Select
                value={suspendFormData.suspensionType}
                onValueChange={(value) => setSuspendFormData(prev => ({ ...prev, suspensionType: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select suspension type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PAYMENT">Payment Issues</SelectItem>
                  <SelectItem value="SECURITY">Security Concerns</SelectItem>
                  <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {suspendFormData.suspensionType === "MAINTENANCE" ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !maintenanceFormData.startDate && "text-muted-foreground"
                        )}
                      >
                        <Clock className="mr-2 h-4 w-4" />
                        {maintenanceFormData.startDate ? (
                          format(maintenanceFormData.startDate, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={maintenanceFormData.startDate}
                        onSelect={(date) => setMaintenanceFormData(prev => ({ ...prev, startDate: date }))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !maintenanceFormData.endDate && "text-muted-foreground"
                        )}
                      >
                        <Clock className="mr-2 h-4 w-4" />
                        {maintenanceFormData.endDate ? (
                          format(maintenanceFormData.endDate, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={maintenanceFormData.endDate}
                        onSelect={(date) => setMaintenanceFormData(prev => ({ ...prev, endDate: date }))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="technician">Technician</Label>
                  <Input
                    id="technician"
                    placeholder="Enter technician name"
                    value={maintenanceFormData.technician}
                    onChange={(e) => setMaintenanceFormData(prev => ({ ...prev, technician: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Maintenance Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Enter maintenance details"
                    value={maintenanceFormData.notes}
                    onChange={(e) => setMaintenanceFormData(prev => ({ ...prev, notes: e.target.value }))}
                  />
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="suspendReason">Reason for Suspension</Label>
                <Textarea
                  id="suspendReason"
                  placeholder="Enter reason for suspension"
                  value={suspendFormData.reason}
                  onChange={(e) => setSuspendFormData(prev => ({ ...prev, reason: e.target.value }))}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSuspendDialogOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={() => handleSuspendService()} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Suspending...
                </>
              ) : (
                "Suspend Service"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restore Service Dialog */}
      <Dialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore Service</DialogTitle>
            <DialogDescription>
              Restore service for this installation.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="restore-installation">Installation</Label>
              <Input
                id="restore-installation"
                value={selectedInstallation ? (selectedInstallation.name || `Installation #${selectedInstallation.id}`) : ""}
                readOnly
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="restoreReason">Reason for Restoration</Label>
              <Textarea
                id="restoreReason"
                placeholder="Enter reason for restoring service"
                value={restoreFormData.reason}
                onChange={(e) => setRestoreFormData(prev => ({ ...prev, reason: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRestoreDialogOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={() => handleRestoreService()} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Restoring...
                </>
              ) : (
                "Restore Service"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Status Change Dialog */}
      <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Status Change</DialogTitle>
            <DialogDescription>
              Schedule a future service status change.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="schedule-installation">Installation</Label>
              <Input
                id="schedule-installation"
                value={selectedInstallation ? (selectedInstallation.name || `Installation #${selectedInstallation.id}`) : ""}
                readOnly
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="targetStatus">Target Status</Label>
              <Select
                value={scheduleFormData.targetStatus}
                onValueChange={(value) => setScheduleFormData(prev => ({ ...prev, targetStatus: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select target status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="SUSPENDED_PAYMENT">Suspended (Payment)</SelectItem>
                  <SelectItem value="SUSPENDED_SECURITY">Suspended (Security)</SelectItem>
                  <SelectItem value="SUSPENDED_MAINTENANCE">Maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="scheduledTime">Scheduled Time</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !scheduleFormData.scheduledTime && "text-muted-foreground"
                    )}
                  >
                    <Clock className="mr-2 h-4 w-4" />
                    {scheduleFormData.scheduledTime ? (
                      format(scheduleFormData.scheduledTime, "PPP")
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={scheduleFormData.scheduledTime}
                    onSelect={(date) => setScheduleFormData(prev => ({ ...prev, scheduledTime: date }))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="scheduleReason">Reason for Change</Label>
              <Textarea
                id="scheduleReason"
                placeholder="Enter reason for scheduled status change"
                value={scheduleFormData.reason}
                onChange={(e) => setScheduleFormData(prev => ({ ...prev, reason: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleDialogOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={() => handleScheduleStatusChange()} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Scheduling...
                </>
              ) : (
                "Schedule Change"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Command Dialog */}
      <Dialog open={newCommandDialogOpen} onOpenChange={setNewCommandDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Device Command</DialogTitle>
            <DialogDescription>
              Send a command to a specific device installation.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="cmd-installation">Installation</Label>
              <Select
                value={commandFormData.installationId}
                onValueChange={(value) => setCommandFormData(prev => ({ ...prev, installationId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select installation" />
                </SelectTrigger>
                <SelectContent>
                  {installations.map(installation => (
                    <SelectItem key={installation.id} value={installation.id.toString()}>
                      {installation.name || `Installation #${installation.id}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="commandType">Command Type</Label>
              <Select
                value={commandFormData.commandType}
                onValueChange={(value) => setCommandFormData(prev => ({ ...prev, commandType: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select command type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="REBOOT_DEVICE">Reboot Device</SelectItem>
                  <SelectItem value="REQUEST_DIAGNOSTICS">Request Diagnostics</SelectItem>
                  <SelectItem value="UPDATE_SETTINGS">Update Settings</SelectItem>
                  <SelectItem value="RESET_INVERTER">Reset Inverter</SelectItem>
                  <SelectItem value="ENABLE_MAINTENANCE_MODE">Enable Maintenance Mode</SelectItem>
                  <SelectItem value="DISABLE_MAINTENANCE_MODE">Disable Maintenance Mode</SelectItem>
                  <SelectItem value="UPDATE_FIRMWARE">Update Firmware</SelectItem>
                  <SelectItem value="GET_LOGS">Get Logs</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="commandParams">Command Parameters (JSON)</Label>
              <Textarea
                id="commandParams"
                placeholder='{"param1": "value1", "param2": "value2"}'
                rows={4}
                value={commandFormData.params}
                onChange={(e) => setCommandFormData(prev => ({ ...prev, params: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">Enter command parameters in JSON format (if required)</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="commandPriority">Priority</Label>
              <Select
                value={commandFormData.priority}
                onValueChange={(value) => setCommandFormData(prev => ({ ...prev, priority: value }))}
                defaultValue="NORMAL"
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="NORMAL">Normal</SelectItem>
                  <SelectItem value="LOW">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setNewCommandDialogOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={() => handleSendCommand()} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send Command"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}