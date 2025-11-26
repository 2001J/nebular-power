"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { ArrowUpDown, CheckCircle, Clock, Settings, ShieldAlert, AlertTriangle, Clock4, RefreshCw, Plus, Activity, BarChart2, Zap, Signal, Server, Loader2, Search } from "lucide-react"
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { toast } from "@/components/ui/use-toast"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { serviceControlApi } from "@/lib/api/serviceControl"
import { installationApi } from "@/lib/api/installations"
import { serviceApi } from "@/lib/api/service"
import { ServiceStatusCard } from "./components/ServiceStatusCard"
import { ServiceStatusTable } from "./components/ServiceStatusTable"

const VALID_STATUS_FILTERS = new Set([
  "ALL",
  "ACTIVE",
  "SUSPENDED_PAYMENT",
  "SUSPENDED_SECURITY",
  "SUSPENDED_MAINTENANCE"
])

export default function ServicePage() {
  const [activeTab, setActiveTab] = useState("statuses")
  const [installations, setInstallations] = useState<any[]>([])
  const [statuses, setStatuses] = useState<any[]>([])
  const [commands, setCommands] = useState<any[]>([])
  const [selectedInstallation, setSelectedInstallation] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [commandsLoading, setCommandsLoading] = useState(true)
  const [updateStatusDialogOpen, setUpdateStatusDialogOpen] = useState(false)
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false)
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false)
  const [newCommandDialogOpen, setNewCommandDialogOpen] = useState(false)
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [commandStatusFilter, setCommandStatusFilter] = useState("all")
  const [sortBy, setSortBy] = useState("lastUpdated")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
  const [totalStatusItems, setTotalStatusItems] = useState(0)

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

  const [commandFormData, setCommandFormData] = useState({
    installationId: "",
    commandType: "",
    params: "",
    priority: "NORMAL"
  })

  // Dynamic parameter fields based on command type
  const [commandParams, setCommandParams] = useState<Record<string, any>>({})

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [suspendFeedback, setSuspendFeedback] = useState<{ type: "error" | "info"; message: string } | null>(null)

  // Add state for commandStats
  const [commandStats, setCommandStats] = useState({})
  const [commandDetailsDialogOpen, setCommandDetailsDialogOpen] = useState(false)
  const [selectedCommand, setSelectedCommand] = useState<any | null>(null)
  const [commandSearchTerm, setCommandSearchTerm] = useState("")

  // Add new states for status history
  const [scheduleLoading, setScheduleLoading] = useState(false)
  const [statusHistory, setStatusHistory] = useState<any[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [selectedHistoryInstallation, setSelectedHistoryInstallation] = useState<any | null>(null)

  // Use this improved function to fetch statuses with pagination (memoized)
  const fetchPaginatedStatuses = useCallback(async (sourceInstallations?: any[]) => {
    if (!VALID_STATUS_FILTERS.has(statusFilter)) {
      setStatusFilter("ALL")
      return
    }
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
        const baseInstallations = Array.isArray(sourceInstallations) ? sourceInstallations : installations
        if (baseInstallations.length === 0) {
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
          const pageEnd = Math.min(pageStart + pageSize, baseInstallations.length)
          const pageInstallations = baseInstallations.slice(pageStart, pageEnd)
          totalItems = baseInstallations.length
          
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
  }, [statusFilter, page, pageSize, installations])

  // Fetch installations and statuses on mount (single run)
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        
        // Get all installations
        const installationsData = await installationApi.getAllInstallations()
        setInstallations(installationsData?.content || [])
        
        // Get statuses
        await fetchPaginatedStatuses(installationsData?.content || [])
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Fetch device commands with a more robust approach
  const fetchCommands = useCallback(async () => {
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

      let commandsData: any[] = []

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
  }, [installations, commandStatusFilter, selectedInstallation])

  // Handle tab changes
  const handleTabChange = (value) => {
    setActiveTab(value)

    // If switching to commands tab, load the commands
    if (value === "commands") {
      fetchCommands()
    }

    // If switching to history tab, load status history for the first installation
    if (value === "history" && installations.length > 0) {
      fetchStatusHistory(installations[0].id)
    }
  }

  // Load commands when installations change or when filter changes
  useEffect(() => {
    if (activeTab === "commands" && installations.length > 0) {
      fetchCommands()
    }
  }, [installations.length, commandStatusFilter, activeTab, fetchCommands])

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
      case 'EXPIRED':
        return <Badge variant="destructive">Expired</Badge>
      case 'CANCELLED':
        return <Badge variant="secondary">Cancelled</Badge>
      case 'QUEUED':
        return <Badge variant="outline">Queued</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  // Helper function to validate JSON
  const isValidJson = (str: string) => {
    if (!str || str.trim() === '') return true // Empty is valid
    try {
      JSON.parse(str)
      return true
    } catch {
      return false
    }
  }

  // Define form fields for each command type
  const getCommandFields = (commandType: string) => {
    const fields: Record<string, any> = {
      'REBOOT_DEVICE': [
        { name: 'force', label: 'Force Reboot', type: 'checkbox', defaultValue: false, description: 'Force immediate reboot without graceful shutdown' },
        { name: 'delay_seconds', label: 'Delay (seconds)', type: 'number', defaultValue: 0, description: 'Delay before rebooting (0 for immediate)' }
      ],
      'REQUEST_DIAGNOSTICS': [
        { name: 'include_logs', label: 'Include Logs', type: 'checkbox', defaultValue: true, description: 'Include device logs in diagnostics' },
        { name: 'diagnostic_type', label: 'Diagnostic Type', type: 'select', options: ['quick', 'full', 'hardware'], defaultValue: 'full', description: 'Type of diagnostic to run' },
        { name: 'component', label: 'Component', type: 'select', options: ['all', 'inverter', 'battery', 'sensors'], defaultValue: 'all', description: 'Specific component to diagnose' }
      ],
      'UPDATE_SETTINGS': [
        { name: 'power_limit', label: 'Power Limit (W)', type: 'number', defaultValue: 5000, required: true, description: 'Maximum power output in watts' },
        { name: 'auto_restart', label: 'Auto Restart', type: 'checkbox', defaultValue: true, description: 'Automatically restart on errors' },
        { name: 'validate_only', label: 'Validate Only', type: 'checkbox', defaultValue: false, description: 'Only validate settings without applying' },
        { name: 'apply_immediately', label: 'Apply Immediately', type: 'checkbox', defaultValue: true, description: 'Apply settings immediately or wait for next cycle' }
      ],
      'RESET_INVERTER': [
        { name: 'inverter_id', label: 'Inverter ID', type: 'text', defaultValue: 'main', description: 'ID of the inverter to reset' },
        { name: 'preserve_config', label: 'Preserve Configuration', type: 'checkbox', defaultValue: true, description: 'Keep current configuration after reset' }
      ],
      'ENABLE_MAINTENANCE_MODE': [
        { name: 'duration_hours', label: 'Duration (hours)', type: 'number', defaultValue: 24, description: 'How long maintenance mode should last' },
        { name: 'reason', label: 'Reason', type: 'text', defaultValue: 'Scheduled maintenance', description: 'Reason for enabling maintenance mode' }
      ],
      'DISABLE_MAINTENANCE_MODE': [
        { name: 'reason', label: 'Reason', type: 'text', defaultValue: 'Maintenance completed', description: 'Reason for disabling maintenance mode' }
      ],
      'UPDATE_FIRMWARE': [
        { name: 'firmware_version', label: 'Firmware Version', type: 'text', defaultValue: '', required: true, placeholder: 'e.g., 1.2.3', description: 'Version of firmware to install' },
        { name: 'firmware_url', label: 'Firmware URL', type: 'text', defaultValue: '', placeholder: 'https://...', description: 'URL to download firmware from' },
        { name: 'checksum', label: 'Checksum', type: 'text', defaultValue: '', placeholder: 'SHA256 hash', description: 'Checksum to verify firmware integrity' },
        { name: 'reboot_after', label: 'Reboot After Update', type: 'checkbox', defaultValue: true, description: 'Automatically reboot after firmware update' }
      ],
      'GET_LOGS': [
        { name: 'start_date', label: 'Start Date', type: 'date', defaultValue: format(new Date(Date.now() - 24 * 60 * 60 * 1000), "yyyy-MM-dd"), description: 'Start date for log retrieval' },
        { name: 'end_date', label: 'End Date', type: 'date', defaultValue: format(new Date(), "yyyy-MM-dd"), description: 'End date for log retrieval' },
        { name: 'log_level', label: 'Log Level', type: 'select', options: ['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'], defaultValue: 'ERROR', description: 'Minimum log level to retrieve' },
        { name: 'max_lines', label: 'Max Lines', type: 'number', defaultValue: 1000, description: 'Maximum number of log lines to retrieve' }
      ]
    }
    return fields[commandType] || []
  }

  // Initialize parameters when command type changes
  const initializeCommandParams = (commandType: string) => {
    const fields = getCommandFields(commandType)
    const initialParams: Record<string, any> = {}
    
    fields.forEach((field: any) => {
      initialParams[field.name] = field.defaultValue
    })
    
    setCommandParams(initialParams)
  }

  // Command parameter templates (keeping for backward compatibility with JSON mode)
  const getCommandTemplate = (commandType: string) => {
    const fields = getCommandFields(commandType)
    const template: Record<string, any> = {}
    
    fields.forEach((field: any) => {
      template[field.name] = field.defaultValue
    })
    
    // For UPDATE_SETTINGS, wrap in settings object
    if (commandType === 'UPDATE_SETTINGS') {
      return {
        settings: {
          power_limit: template.power_limit,
          auto_restart: template.auto_restart
        },
        validate_only: template.validate_only,
        apply_immediately: template.apply_immediately
      }
    }
    
    return template
  }

  const loadCommandTemplate = () => {
    if (!commandFormData.commandType) {
      toast({
        title: "Select Command Type",
        description: "Please select a command type first",
        variant: "destructive",
      })
      return
    }
    
    initializeCommandParams(commandFormData.commandType)
    
    toast({
      title: "Fields Reset",
      description: "Parameter fields have been reset to default values",
      variant: "default",
    })
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

  // Reset suspend dialog state whenever it closes
  const handleSuspendDialogOpenChange = (open: boolean) => {
    setSuspendDialogOpen(open)

    if (!open) {
      setSuspendFormData({
        reason: "",
        suspensionType: "PAYMENT",
      })

      setMaintenanceFormData({
        startDate: new Date(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        reason: "",
        technician: "",
        notes: "",
      })

      setSuspendFeedback(null)
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

    setSuspendFeedback(null)

    const trimmedReason = (suspendFormData.reason ?? "").trim()
    const requiresReason = ["PAYMENT", "SECURITY"].includes(suspendFormData.suspensionType)

    const currentStatusRecord = statuses.find(
      (status) => status?.installationId === selectedInstallation.id
    )
    const currentStatusValue = String(
      currentStatusRecord?.status || selectedInstallation.status || ""
    ).toUpperCase()

    if (currentStatusValue && currentStatusValue !== "ACTIVE") {
      setSuspendFeedback({
        type: "info",
        message: `Suspension is only allowed while the service is ACTIVE. Current state is ${currentStatusValue}.`,
      })
      return
    }

    if (requiresReason && !trimmedReason) {
      setSuspendFeedback({
        type: "error",
        message: "Please provide a reason before suspending this service.",
      })
      return
    }

    try {
      setIsSubmitting(true)

      if (suspendFormData.suspensionType === "MAINTENANCE") {
        // For maintenance suspension, we need additional data
        const maintenanceData = {
          startTime: maintenanceFormData.startDate.toISOString(),
          endTime: maintenanceFormData.endDate.toISOString(),
          reason: suspendFormData.reason || "Scheduled maintenance",
          maintenanceType: "SCHEDULED",
          notifyCustomer: true,
          notificationMessage: maintenanceFormData.notes || "Service will be temporarily suspended for maintenance",
        }

        await serviceControlApi.suspendServiceForMaintenance(selectedInstallation.id, maintenanceData)

        toast({
          title: "Service Suspended for Maintenance",
          description: `Maintenance scheduled from ${format(maintenanceFormData.startDate, "PP")} to ${format(maintenanceFormData.endDate, "PP")}.`,
          variant: "default",
        })
      } else if (suspendFormData.suspensionType === "PAYMENT") {
        await serviceControlApi.suspendServiceForPayment(selectedInstallation.id, trimmedReason)

        toast({
          title: "Service Suspended for Payment Issues",
          description: `Service for installation #${selectedInstallation.id} has been suspended.`,
          variant: "default",
        })
      } else if (suspendFormData.suspensionType === "SECURITY") {
        await serviceControlApi.suspendServiceForSecurity(selectedInstallation.id, trimmedReason)

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

      handleSuspendDialogOpenChange(false)
    } catch (error: any) {
      const status = error?.response?.status as number | undefined
      const rawBackendMessage =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        (typeof error?.response?.data === "string" ? error.response.data : undefined) ||
        error?.message ||
        "Failed to suspend service."

      const normalizedMessage = (() => {
        if (!rawBackendMessage) {
          return "Failed to suspend service."
        }

        if (status === 409) {
          const lowerMessage = String(rawBackendMessage).toLowerCase()
          if (lowerMessage.includes("not active")) {
            return "Suspension is only allowed when the service is currently ACTIVE."
          }
          if (lowerMessage.includes("no active service status")) {
            return "This installation has no active service record yet. Wait for activation before suspending."
          }
        }

        return String(rawBackendMessage)
      })()

      setSuspendFeedback({
        type: status === 409 ? "info" : "error",
        message: normalizedMessage,
      })

      if (!status || status >= 500) {
        console.error(`Error suspending service for installation ${selectedInstallation?.id}:`, error)
      }
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

      // Validate required fields based on command type
      const fields = getCommandFields(commandFormData.commandType)
      const missingRequired = fields.filter((field: any) => 
        field.required && !commandParams[field.name]
      )
      
      if (missingRequired.length > 0) {
        toast({
          title: "Missing Required Fields",
          description: `Please fill in: ${missingRequired.map((f: any) => f.label).join(', ')}`,
          variant: "destructive",
        })
        return
      }

      // Prepare params object - for UPDATE_SETTINGS, wrap in settings object
      let params: any = { ...commandParams }
      if (commandFormData.commandType === 'UPDATE_SETTINGS') {
        params = {
          settings: {
            power_limit: commandParams.power_limit,
            auto_restart: commandParams.auto_restart
          },
          validate_only: commandParams.validate_only,
          apply_immediately: commandParams.apply_immediately
        }
      }

      // Add priority
      params.priority = commandFormData.priority || 'NORMAL'

      // Send the command
      await serviceControlApi.sendCommand(
        commandFormData.installationId,
        commandFormData.commandType,
        params
      )

      toast({
        title: "Command Sent",
        description: `Command ${commandFormData.commandType} sent successfully`,
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
      setCommandParams({})
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

  // Service control action handler
  const handleRestartService = async (installationId) => {
    try {
      setLoading(true)
      await serviceApi.restartService(installationId)
      
      toast({
        title: "Service Restart Initiated",
        description: `Service restart in progress for installation #${installationId}. Status will update automatically.`,
        variant: "default",
      })
      
      // Refresh statuses after a delay to see TRANSITIONING status
      setTimeout(() => {
        fetchPaginatedStatuses()
      }, 1000)
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
  

  // Fetch data when pagination or filters change
  useEffect(() => {
    fetchPaginatedStatuses()
  }, [page, pageSize, statusFilter, sortBy, sortDirection, fetchPaginatedStatuses])

  // Auto-refresh when there are TRANSITIONING statuses
  useEffect(() => {
    const hasTransitioning = statuses.some(s => s.status === 'TRANSITIONING')
    
    if (hasTransitioning && activeTab === 'statuses') {
      const intervalId = setInterval(() => {
        console.log('Auto-refreshing due to TRANSITIONING status')
        fetchPaginatedStatuses()
      }, 3000) // Refresh every 3 seconds
      
      return () => clearInterval(intervalId)
    }
  }, [statuses, activeTab, fetchPaginatedStatuses])

  // Define a function to handle page changes
  const handlePageChange = (newPage: number) => {
    setPage(newPage)
  }

  // Define a function to handle page size changes
  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize)
    setPage(0) // Reset to first page when changing page size
  }

  // Function to fetch scheduled changes
  // Function to fetch status history for a specific installation
  const fetchStatusHistory = async (installationId) => {
    if (!installationId) return;
    
    try {
      setHistoryLoading(true)
      setSelectedHistoryInstallation(installationId)
      
      const history = await serviceControlApi.getStatusHistory(installationId)
      setStatusHistory(history.content || [])
      
    } catch (error) {
      console.error(`Error fetching status history for installation ${installationId}:`, error)
      toast({
        title: "Error",
        description: "Failed to load status history",
        variant: "destructive",
      })
      setStatusHistory([])
    } finally {
      setHistoryLoading(false)
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Service Control</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Manage service status and maintenance for installations
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="statuses" className="space-y-4" onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-flex">
          <TabsTrigger value="statuses" className="text-xs sm:text-sm">Service Statuses</TabsTrigger>
          <TabsTrigger value="history" className="text-xs sm:text-sm">Status History</TabsTrigger>
          <TabsTrigger value="commands" className="text-xs sm:text-sm">Device Commands</TabsTrigger>
        </TabsList>

        <TabsContent value="statuses" className="space-y-4">
          <Card>
            <CardHeader className="space-y-4 sm:space-y-0">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1.5">
                  <CardTitle className="text-lg sm:text-xl">Installation Service Status</CardTitle>
                  <CardDescription className="text-sm">
                    Manage service state for all solar installations
                  </CardDescription>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <Select
                    value={statusFilter}
                    onValueChange={setStatusFilter}
                  >
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Statuses</SelectItem>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="SUSPENDED_PAYMENT">Suspended (Payment)</SelectItem>
                      <SelectItem value="SUSPENDED_SECURITY">Suspended (Security)</SelectItem>
                      <SelectItem value="SUSPENDED_MAINTENANCE">Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => fetchPaginatedStatuses()}
                    className="w-full sm:w-auto"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>
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
                onRestartService={handleRestartService}
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
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader className="space-y-4 sm:space-y-0">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1.5">
                  <CardTitle className="text-lg sm:text-xl">Status Change History</CardTitle>
                  <CardDescription className="text-sm">
                    View the history of service status changes for an installation
                  </CardDescription>
                </div>
                <div className="flex items-center">
                  <Select
                    value={selectedHistoryInstallation?.toString() || ''}
                    onValueChange={(value) => fetchStatusHistory(value)}
                  >
                    <SelectTrigger className="w-full sm:w-[250px]">
                      <SelectValue placeholder="Select an installation" />
                    </SelectTrigger>
                  <SelectContent>
                    {installations.map((installation) => (
                      <SelectItem key={installation.id} value={installation.id.toString()}>
                        {installation.name || `Installation #${installation.id}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <div className="py-10 text-center">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
                  <p className="mt-2 text-sm text-muted-foreground">Loading status history...</p>
                </div>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[60px] sm:w-[80px]">ID</TableHead>
                        <TableHead className="min-w-[120px]">Status</TableHead>
                        <TableHead>Updated At</TableHead>
                        <TableHead>Updated By</TableHead>
                        <TableHead>Reason</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {statusHistory.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="h-24 text-center">
                            No status history found
                          </TableCell>
                        </TableRow>
                      ) : (
                        statusHistory.map((status) => (
                          <TableRow key={status.id}>
                            <TableCell className="font-medium">{status.id}</TableCell>
                            <TableCell>{getStatusBadge(status.status)}</TableCell>
                            <TableCell>
                              {status.updatedAt ? format(new Date(status.updatedAt), "PPp") : "Unknown"}
                            </TableCell>
                            <TableCell>{status.updatedBy || "System"}</TableCell>
                            <TableCell>
                              <span className="text-sm line-clamp-2">{status.statusReason || "No reason provided"}</span>
                            </TableCell>
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

        <TabsContent value="commands" className="space-y-4">
          <Card>
            <CardHeader className="space-y-4 sm:space-y-0">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1.5">
                  <CardTitle className="text-lg sm:text-xl">Device Commands</CardTitle>
                  <CardDescription className="text-sm">
                    Send commands to devices and view command history
                  </CardDescription>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="relative flex-1 sm:min-w-[200px]">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by ID or correlation ID..."
                      value={commandSearchTerm}
                      onChange={(e) => setCommandSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>

                  <Select
                    value={commandStatusFilter}
                    onValueChange={setCommandStatusFilter}
                    defaultValue="all"
                  >
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="SENT">Sent</SelectItem>
                      <SelectItem value="DELIVERED">Delivered</SelectItem>
                      <SelectItem value="EXECUTED">Executed</SelectItem>
                      <SelectItem value="FAILED">Failed</SelectItem>
                      <SelectItem value="EXPIRED">Expired</SelectItem>
                      <SelectItem value="CANCELLED">Cancelled</SelectItem>
                      <SelectItem value="QUEUED">Queued</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={fetchCommands}
                    className="w-full sm:w-auto"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>
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
                    <Button 
                      onClick={() => setNewCommandDialogOpen(true)}
                      className="w-full sm:w-auto"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      New Command
                    </Button>
                  </div>

                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[60px] sm:w-[80px]">ID</TableHead>
                          <TableHead className="min-w-[150px]">Installation</TableHead>
                          <TableHead className="min-w-[120px]">Command Type</TableHead>
                          <TableHead className="min-w-[100px]">Status</TableHead>
                          <TableHead className="hidden md:table-cell min-w-[150px]">Created</TableHead>
                          <TableHead className="hidden lg:table-cell min-w-[150px]">Last Updated</TableHead>
                          <TableHead className="text-right min-w-[100px]">Actions</TableHead>
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
                          commands
                            .filter(command => {
                              // Filter by search term
                              if (commandSearchTerm) {
                                const searchLower = commandSearchTerm.toLowerCase()
                                return (
                                  command.id.toString().includes(searchLower) ||
                                  (command.correlationId && command.correlationId.toLowerCase().includes(searchLower)) ||
                                  (command.command && command.command.toLowerCase().includes(searchLower)) ||
                                  (command.commandType && command.commandType.toLowerCase().includes(searchLower))
                                )
                              }
                              return true
                            })
                            .map((command) => {
                            const installation = installations.find(i => i.id === command.installationId) || {}

                            return (
                              <TableRow key={command.id}>
                                <TableCell className="font-medium">{command.id}</TableCell>
                                <TableCell>
                                  {installation.name || `Installation #${command.installationId}`}
                                </TableCell>
                                <TableCell className="font-mono text-sm">{command.command || command.commandType || 'N/A'}</TableCell>
                                <TableCell>
                                  {getCommandStatusBadge(command.status)}
                                </TableCell>
                                <TableCell className="hidden md:table-cell">
                                  {command.sentAt ? format(new Date(command.sentAt), "PPp") : 
                                   command.createdAt ? format(new Date(command.createdAt), "PPp") : "N/A"}
                                </TableCell>
                                <TableCell className="hidden lg:table-cell">
                                  {command.updatedAt ? format(new Date(command.updatedAt), "PPp") : 
                                   command.processedAt ? format(new Date(command.processedAt), "PPp") : "N/A"}
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
                                          setSelectedCommand(command)
                                          setCommandDetailsDialogOpen(true)
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
                  <div className="text-2xl font-bold">
                    {commandStats && typeof commandStats === 'object' && Object.keys(commandStats).length > 0
                      ? Object.values(commandStats).reduce((sum: number, val: any) => sum + (val || 0), 0)
                      : commands.length}
                  </div>
                </div>
                <div className="bg-card rounded-lg border px-4 py-3">
                  <div className="text-sm font-medium text-muted-foreground">Success Rate</div>
                  <div className="text-2xl font-bold">
                    {(() => {
                      if (commandStats && typeof commandStats === 'object') {
                        const executed = commandStats['EXECUTED'] || 0
                        const failed = commandStats['FAILED'] || 0
                        const total = executed + failed
                        if (total === 0) return '0%'
                        return `${Math.round((executed / total) * 100)}%`
                      }
                      const executed = commands.filter(c => c.status === 'EXECUTED').length
                      const failed = commands.filter(c => c.status === 'FAILED').length
                      const total = executed + failed
                      if (total === 0) return 'N/A'
                      return `${Math.round((executed / total) * 100)}%`
                    })()}
                  </div>
                </div>
                <div className="bg-card rounded-lg border px-4 py-3">
                  <div className="text-sm font-medium text-muted-foreground">In Progress</div>
                  <div className="text-2xl font-bold">
                    {commandStats && typeof commandStats === 'object'
                      ? (commandStats['PENDING'] || 0) + (commandStats['SENT'] || 0) + (commandStats['DELIVERED'] || 0) + (commandStats['QUEUED'] || 0)
                      : commands.filter(c => ['PENDING', 'SENT', 'DELIVERED', 'QUEUED'].includes(c.status)).length}
                  </div>
                </div>
                <div className="bg-card rounded-lg border px-4 py-3">
                  <div className="text-sm font-medium text-muted-foreground">Failed</div>
                  <div className="text-2xl font-bold text-destructive">
                    {commandStats && typeof commandStats === 'object'
                      ? (commandStats['FAILED'] || 0) + (commandStats['EXPIRED'] || 0)
                      : commands.filter(c => ['FAILED', 'EXPIRED'].includes(c.status)).length}
                  </div>
                </div>
                <div className="bg-card rounded-lg border px-4 py-3">
                  <div className="text-sm font-medium text-muted-foreground">Completed</div>
                  <div className="text-2xl font-bold">
                    {commandStats && typeof commandStats === 'object'
                      ? (commandStats['EXECUTED'] || 0) + (commandStats['FAILED'] || 0) + (commandStats['EXPIRED'] || 0) + (commandStats['CANCELLED'] || 0)
                      : commands.filter(c => ['EXECUTED', 'FAILED', 'EXPIRED', 'CANCELLED'].includes(c.status)).length}
                  </div>
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
      <Dialog open={suspendDialogOpen} onOpenChange={handleSuspendDialogOpenChange}>
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
                onValueChange={(value) => {
                  setSuspendFormData(prev => ({ ...prev, suspensionType: value }))
                  setSuspendFeedback(null)
                }}
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
                        onSelect={(date) => setMaintenanceFormData(prev => ({ ...prev, startDate: date ?? prev.startDate }))}
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
                        onSelect={(date) => setMaintenanceFormData(prev => ({ ...prev, endDate: date ?? prev.endDate }))}
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

          {suspendFeedback && (
            <Alert
              variant={suspendFeedback.type === "error" ? "destructive" : "default"}
              className="mt-2"
            >
              <AlertTitle>{suspendFeedback.type === "error" ? "Unable to suspend" : "Notice"}</AlertTitle>
              <AlertDescription>{suspendFeedback.message}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => handleSuspendDialogOpenChange(false)} disabled={isSubmitting}>
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

      {/* New Command Dialog */}
      <Dialog 
        open={newCommandDialogOpen} 
        onOpenChange={(open) => {
          setNewCommandDialogOpen(open)
          if (!open) {
            // Reset form when dialog closes
            setCommandFormData({
              installationId: "",
              commandType: "",
              params: "",
              priority: "NORMAL"
            })
            setCommandParams({})
          }
        }}
      >
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
                onValueChange={(value) => {
                  setCommandFormData(prev => ({ ...prev, commandType: value }))
                  // Initialize parameters with default values
                  initializeCommandParams(value)
                }}
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
              <p className="text-xs text-muted-foreground">Fill in the parameters below</p>
            </div>

            {/* Dynamic Form Fields */}
            {commandFormData.commandType && (
              <div className="space-y-4 border rounded-lg p-4 bg-muted/30">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Command Parameters</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={loadCommandTemplate}
                    className="h-auto py-1 px-2 text-xs"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Reset to Defaults
                  </Button>
                </div>
                
                {getCommandFields(commandFormData.commandType).map((field: any) => (
                  <div key={field.name} className="space-y-2">
                    <Label htmlFor={field.name} className="flex items-center gap-2">
                      {field.label}
                      {field.required && <span className="text-red-500">*</span>}
                    </Label>
                    
                    {field.type === 'text' && (
                      <Input
                        id={field.name}
                        type="text"
                        placeholder={field.placeholder || ''}
                        value={commandParams[field.name] || ''}
                        onChange={(e) => setCommandParams(prev => ({ ...prev, [field.name]: e.target.value }))}
                      />
                    )}
                    
                    {field.type === 'number' && (
                      <Input
                        id={field.name}
                        type="number"
                        placeholder={field.placeholder || ''}
                        value={commandParams[field.name] || ''}
                        onChange={(e) => setCommandParams(prev => ({ ...prev, [field.name]: Number(e.target.value) }))}
                      />
                    )}
                    
                    {field.type === 'checkbox' && (
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={field.name}
                          checked={commandParams[field.name] || false}
                          onChange={(e) => setCommandParams(prev => ({ ...prev, [field.name]: e.target.checked }))}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                        <label htmlFor={field.name} className="text-sm text-muted-foreground cursor-pointer">
                          {field.description}
                        </label>
                      </div>
                    )}
                    
                    {field.type === 'select' && (
                      <Select
                        value={commandParams[field.name] || field.defaultValue}
                        onValueChange={(value) => setCommandParams(prev => ({ ...prev, [field.name]: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
                        </SelectTrigger>
                        <SelectContent>
                          {field.options.map((option: string) => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    
                    {field.type === 'date' && (
                      <Input
                        id={field.name}
                        type="date"
                        value={commandParams[field.name] || field.defaultValue}
                        onChange={(e) => setCommandParams(prev => ({ ...prev, [field.name]: e.target.value }))}
                      />
                    )}
                    
                    {field.description && field.type !== 'checkbox' && (
                      <p className="text-xs text-muted-foreground">{field.description}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

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

      {/* Command Details Dialog */}
      <Dialog open={commandDetailsDialogOpen} onOpenChange={setCommandDetailsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Command Details</DialogTitle>
            <DialogDescription>
              Complete information for command #{selectedCommand?.id}
            </DialogDescription>
          </DialogHeader>

          {selectedCommand && (
            <div className="space-y-6 py-4">
              {/* Command Overview */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">Command ID</div>
                  <div className="text-sm">{selectedCommand.id}</div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">Status</div>
                  <div>{getCommandStatusBadge(selectedCommand.status)}</div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">Installation</div>
                  <div className="text-sm">
                    {installations.find(i => i.id === selectedCommand.installationId)?.name || 
                     `Installation #${selectedCommand.installationId}`}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">Command Type</div>
                  <div className="text-sm font-mono">{selectedCommand.command || selectedCommand.commandType || 'N/A'}</div>
                </div>
                {selectedCommand.correlationId && (
                  <div className="space-y-2 col-span-2">
                    <div className="text-sm font-medium text-muted-foreground">Correlation ID</div>
                    <div className="text-xs font-mono bg-muted p-2 rounded">{selectedCommand.correlationId}</div>
                  </div>
                )}
              </div>

              {/* Timeline */}
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3">Timeline</h4>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-primary h-2 w-2 mt-2"></div>
                    <div className="flex-1">
                      <div className="text-sm font-medium">Created</div>
                      <div className="text-xs text-muted-foreground">
                        {selectedCommand.sentAt ? format(new Date(selectedCommand.sentAt), "PPpp") : 
                         selectedCommand.createdAt ? format(new Date(selectedCommand.createdAt), "PPpp") : "N/A"}
                      </div>
                      {selectedCommand.initiatedBy && (
                        <div className="text-xs text-muted-foreground">by {selectedCommand.initiatedBy}</div>
                      )}
                    </div>
                  </div>
                  
                  {selectedCommand.updatedAt && selectedCommand.updatedAt !== selectedCommand.sentAt && (
                    <div className="flex items-start gap-3">
                      <div className="rounded-full bg-primary h-2 w-2 mt-2"></div>
                      <div className="flex-1">
                        <div className="text-sm font-medium">Last Updated</div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(selectedCommand.updatedAt), "PPpp")}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {selectedCommand.processedAt && (
                    <div className="flex items-start gap-3">
                      <div className="rounded-full bg-green-500 h-2 w-2 mt-2"></div>
                      <div className="flex-1">
                        <div className="text-sm font-medium">Processed</div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(selectedCommand.processedAt), "PPpp")}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {selectedCommand.retryCount > 0 && selectedCommand.lastRetryAt && (
                    <div className="flex items-start gap-3">
                      <div className="rounded-full bg-yellow-500 h-2 w-2 mt-2"></div>
                      <div className="flex-1">
                        <div className="text-sm font-medium">Retry Attempted</div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(selectedCommand.lastRetryAt), "PPpp")}
                          {' '}(Retry #{selectedCommand.retryCount})
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Parameters */}
              {selectedCommand.parameters && (
                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-3">Command Parameters</h4>
                  <div className="space-y-2">
                    {(() => {
                      try {
                        const params = JSON.parse(selectedCommand.parameters || '{}')
                        const entries = Object.entries(params)
                        
                        if (entries.length === 0) {
                          return <div className="text-sm text-muted-foreground">No parameters</div>
                        }
                        
                        return entries.map(([key, value]) => (
                          <div key={key} className="flex items-start gap-4 bg-muted/50 p-3 rounded-lg">
                            <div className="flex-shrink-0 min-w-[140px]">
                              <div className="text-sm font-medium text-muted-foreground">{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</div>
                            </div>
                            <div className="flex-1">
                              <div className="text-sm font-mono break-all">
                                {typeof value === 'boolean' 
                                  ? (value ? '✓ Yes' : '✗ No')
                                  : typeof value === 'object'
                                    ? JSON.stringify(value, null, 2)
                                    : String(value)}
                              </div>
                            </div>
                          </div>
                        ))
                      } catch (error) {
                        return (
                          <pre className="bg-muted p-4 rounded text-xs overflow-x-auto">
                            {selectedCommand.parameters}
                          </pre>
                        )
                      }
                    })()}
                  </div>
                </div>
              )}

              {/* Response/Error Message */}
              {selectedCommand.responseMessage && (
                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-3">
                    {selectedCommand.status === 'FAILED' ? 'Error Message' : 'Response Message'}
                  </h4>
                  <div className={`p-4 rounded text-sm ${
                    selectedCommand.status === 'FAILED' 
                      ? 'bg-red-50 dark:bg-red-950/20 text-red-900 dark:text-red-100' 
                      : 'bg-green-50 dark:bg-green-950/20 text-green-900 dark:text-green-100'
                  }`}>
                    {selectedCommand.responseMessage}
                  </div>
                </div>
              )}

              {/* Command Result Details */}
              {selectedCommand.result && (() => {
                try {
                  const result = JSON.parse(selectedCommand.result)
                  return (
                    <div className="border-t pt-4">
                      <details className="group">
                        <summary className="flex items-center justify-between cursor-pointer list-none">
                          <h4 className="font-semibold">Command Result Details</h4>
                          <span className="transition group-open:rotate-180">
                            <svg fill="none" height="20" width="20" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
                              <polyline points="6 9 12 15 18 9"></polyline>
                            </svg>
                          </span>
                        </summary>
                        <div className="mt-3 space-y-3">
                          {/* Show diagnostics data if present */}
                          {result.diagnostics && (
                            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                              <h5 className="font-semibold text-sm">Diagnostic Information</h5>
                              <div className="grid grid-cols-2 gap-3">
                                {Object.entries(result.diagnostics).map(([key, value]) => (
                                  <div key={key} className="space-y-1">
                                    <div className="text-xs text-muted-foreground capitalize">
                                      {key.replace(/([A-Z])/g, ' $1').trim()}
                                    </div>
                                    <div className="text-sm font-medium">{String(value)}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Show all other result fields */}
                          <div className="bg-muted/30 rounded-lg p-4">
                            <h5 className="font-semibold text-sm mb-3">Result Metadata</h5>
                            <div className="space-y-2 text-sm">
                              {Object.entries(result).filter(([key]) => key !== 'diagnostics').map(([key, value]) => (
                                <div key={key} className="flex justify-between py-1 border-b border-border/50 last:border-0">
                                  <span className="text-muted-foreground capitalize">
                                    {key.replace(/([A-Z])/g, ' $1').trim()}:
                                  </span>
                                  <span className="font-medium">
                                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </details>
                    </div>
                  )
                } catch (e) {
                  return null
                }
              })()}

              {/* Retry Information */}
              {selectedCommand.retryCount > 0 && (
                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-3">Retry Information</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-muted-foreground">Total Retries</div>
                      <div className="text-2xl font-bold">{selectedCommand.retryCount}</div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-muted-foreground">Last Retry</div>
                      <div className="text-sm">
                        {selectedCommand.lastRetryAt ? format(new Date(selectedCommand.lastRetryAt), "PPp") : "N/A"}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setCommandDetailsDialogOpen(false)}>
              Close
            </Button>
            {selectedCommand && ['PENDING', 'SENT', 'DELIVERED', 'QUEUED'].includes(selectedCommand.status) && (
              <Button 
                variant="destructive" 
                onClick={async () => {
                  try {
                    await handleCancelCommand(selectedCommand.id)
                    setCommandDetailsDialogOpen(false)
                  } catch (error) {
                    console.error("Error cancelling command:", error)
                  }
                }}
              >
                Cancel Command
              </Button>
            )}
            {selectedCommand && (selectedCommand.status === 'FAILED' || selectedCommand.status === 'PENDING') && (
              <Button onClick={async () => {
                try {
                  await handleRetryCommand(selectedCommand.id)
                  setCommandDetailsDialogOpen(false)
                } catch (error) {
                  console.error("Error retrying command:", error)
                }
              }}>
                Retry Command
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
