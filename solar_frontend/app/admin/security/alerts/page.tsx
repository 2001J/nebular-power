"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { format, parseISO, subDays } from "date-fns"
import {
  AlertTriangle,
  ArrowUpDown,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock,
  Eye,
  Filter,
  MoreHorizontal,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldOff,
  X
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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

export default function SecurityAlertsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [tamperEvents, setTamperEvents] = useState([])
  const [filteredEvents, setFilteredEvents] = useState([])
  const [installations, setInstallations] = useState([])
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 30),
    to: new Date(),
  })
  const [eventType, setEventType] = useState("all")
  const [severity, setSeverity] = useState("all")
  const [status, setStatus] = useState("NEW")
  const [installation, setInstallation] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [selectedInstallation, setSelectedInstallation] = useState(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false)
  const [resolutionNotes, setResolutionNotes] = useState("")
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Fetch tamper events
  useEffect(() => {
    const fetchTamperEvents = async () => {
      try {
        setLoading(true)

        // Get all installations first for reference
        let installationsData
        try {
          installationsData = await installationApi.getAllInstallations()
          setInstallations(installationsData.content || [])
        } catch (error: any) {
          console.error("Error fetching installations:", error)
          if (error.response && error.response.status === 401) {
            toast({
              title: "Authentication Error",
              description: "Your session may have expired. Please log in again.",
              variant: "destructive",
            })
            // Potentially redirect to login page here
            setInstallations([])
            setTamperEvents([])
            setFilteredEvents([])
            setLoading(false)
            setIsRefreshing(false)
            return
          }
          setInstallations([])
        }

        // Check if there's an installation parameter in the URL
        const urlInstallation = searchParams.get('installation')
        if (urlInstallation) {
          setInstallation(urlInstallation)
        }

        // Always fetch all tamper events and apply filters client-side
        let events = []
        try {
          // Get all events, including resolved ones
          const allEvents = await securityApi.getAllTamperEvents()
          events = Array.isArray(allEvents) ? allEvents : []

          // Apply filters client-side
          // Note: We don't filter by status here, as we want to keep all events for counting purposes
          // Status filtering will be done in the applyFilters function

          // If we have a specific installation filter (not "all"), apply it
          if (installation !== "all" && installation) {
            events = events.filter(event => event.installationId.toString() === installation.toString())
          }

          // Apply date range filter if needed
          if (dateRange.from || dateRange.to) {
            events = events.filter(event => {
              const eventDate = new Date(event.timestamp)
              const isAfterStart = !dateRange.from || eventDate >= dateRange.from
              const isBeforeEnd = !dateRange.to || eventDate <= dateRange.to
              return isAfterStart && isBeforeEnd
            })
          }
        } catch (error: any) {
          console.error("Error fetching tamper events:", error)
          if (error.response && error.response.status === 401) {
            toast({
              title: "Authentication Error",
              description: "Your session may have expired. Please log in again.",
              variant: "destructive",
            })
            // Potentially redirect to login page here
          } else {
            toast({
              title: "Error",
              description: "Failed to load tamper events data",
              variant: "destructive",
            })
          }
          events = []
        }

        console.log("Fetched tamper events:", events)
        setTamperEvents(events || [])
        applyFilters(events)
      } catch (error) {
        console.error("Error fetching tamper events:", error)
        toast({
          title: "Error",
          description: "Failed to load tamper events data",
          variant: "destructive",
        })
        setTamperEvents([])
        setFilteredEvents([])
      } finally {
        setLoading(false)
        setIsRefreshing(false)
      }
    }

    fetchTamperEvents()
  }, [dateRange, status, installation, isRefreshing, searchParams])

  // Apply filters to tamper events
  const applyFilters = (events = tamperEvents) => {
    const filtered = events.filter(event => {
      // Event type filter
      if (eventType !== "all" && event.eventType !== eventType) return false

      // Severity filter
      if (severity !== "all" && event.severity !== severity) return false

      // Status filter
      if (status !== "all" && event.status !== status) return false

      // Installation filter
      if (installation !== "all" && event.installationId.toString() !== installation.toString()) return false

      // Search term filter (check description, installation name, etc.)
      if (searchTerm && searchTerm.length > 0) {
        const searchLower = searchTerm.toLowerCase()
        const matchesDescription = event.description?.toLowerCase().includes(searchLower)
        const matchesInstallation = getInstallationName(event.installationId)?.toLowerCase().includes(searchLower)

        if (!matchesDescription && !matchesInstallation) return false
      }

      return true
    })

    setFilteredEvents(filtered)
  }

  // Apply filters when filter values change
  useEffect(() => {
    applyFilters()
  }, [eventType, severity, status, installation, searchTerm])

  // Refresh data
  const refreshData = () => {
    setIsRefreshing(true)
  }

  // Get installation name by ID
  const getInstallationName = (installationId) => {
    const installation = installations.find(i => i.id === installationId)
    return installation ? (installation.name || `Installation #${installationId}`) : `Installation #${installationId}`
  }

  // Handle view details
  const viewEventDetails = async (event) => {
    try {
      // Get full event details
      const eventDetails = await securityApi.getTamperEventById(event.id)
      const installation = installations.find(i => i.id === event.installationId)

      setSelectedEvent(eventDetails || event)
      setSelectedInstallation(installation)
      setDetailsOpen(true)
    } catch (error) {
      console.error(`Error fetching event details for event ${event.id}:`, error)
      setSelectedEvent(event)
      setDetailsOpen(true)
      toast({
        title: "Warning",
        description: "Could not fetch complete event details. Showing limited information.",
        variant: "warning",
      })
    }
  }

  // Acknowledge event
  const acknowledgeEvent = async (eventId) => {
    try {
      await securityApi.acknowledgeEvent(eventId)

      toast({
        title: "Event Acknowledged",
        description: "The tamper event has been acknowledged.",
      })

      // Refresh data
      refreshData()
    } catch (error) {
      console.error(`Error acknowledging event ${eventId}:`, error)
      toast({
        title: "Error",
        description: "Failed to acknowledge event",
        variant: "destructive",
      })
    }
  }

  // Update event status
  const updateEventStatus = async (eventId, newStatus) => {
    try {
      await securityApi.updateEventStatus(eventId, newStatus)

      toast({
        title: "Status Updated",
        description: `Event status has been updated to ${newStatus}.`,
      })

      // Close the details dialog if open
      setDetailsOpen(false)

      // Refresh data
      refreshData()
    } catch (error) {
      console.error(`Error updating event ${eventId} status:`, error)
      toast({
        title: "Error",
        description: "Failed to update event status",
        variant: "destructive",
      })
    }
  }

  // Handle resolve event
  const handleResolveEvent = async () => {
    if (!selectedEvent) return

    try {
      // Get current user information
      const currentUser = "admin"; // In a real app, this would come from the auth context

      const resolutionDetails = {
        resolutionNotes: resolutionNotes || "Issue resolved",
        resolvedBy: currentUser,
        // We don't need resolvedAt as it will be set by the backend
      }

      await securityApi.resolveEvent(selectedEvent.id, resolutionDetails)

      toast({
        title: "Event Resolved",
        description: "The tamper event has been successfully resolved.",
      })

      // Close dialogs
      setResolveDialogOpen(false)
      setDetailsOpen(false)

      // Reset resolution notes
      setResolutionNotes("")

      // Refresh data
      refreshData()
    } catch (error) {
      console.error(`Error resolving event ${selectedEvent.id}:`, error)
      toast({
        title: "Error",
        description: "Failed to resolve event. Please make sure you're logged in with admin privileges.",
        variant: "destructive",
      })
    }
  }

  // Get severity badge
  const getSeverityBadge = (severity) => {
    switch (severity.toUpperCase()) {
      case 'HIGH':
        return <Badge className="bg-red-100 text-red-700 border-red-200">High</Badge>
      case 'MEDIUM':
        return <Badge className="bg-amber-100 text-amber-700 border-amber-200">Medium</Badge>
      case 'LOW':
        return <Badge className="bg-blue-100 text-blue-700 border-blue-200">Low</Badge>
      default:
        return <Badge variant="outline">{severity}</Badge>
    }
  }

  // Get status badge
  const getStatusBadge = (status) => {
    switch (status?.toUpperCase()) {
      case 'NEW':
        return <Badge className="bg-red-100 text-red-700 border-red-200">Open</Badge>
      case 'ACKNOWLEDGED':
        return <Badge className="bg-amber-100 text-amber-700 border-amber-200">Acknowledged</Badge>
      case 'INVESTIGATING':
        return <Badge className="bg-purple-100 text-purple-700 border-purple-200">Investigating</Badge>
      case 'RESOLVED':
        return <Badge className="bg-green-100 text-green-700 border-green-200">Resolved</Badge>
      case 'FALSE_ALARM':
        return <Badge className="bg-slate-100 text-slate-700 border-slate-200">False Alarm</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  // Get event type icon
  const getEventTypeIcon = (eventType) => {
    switch (eventType) {
      case 'PHYSICAL_MOVEMENT':
        return <ShieldAlert className="h-4 w-4 text-red-500" />
      case 'VOLTAGE_FLUCTUATION':
        return <AlertTriangle className="h-4 w-4 text-amber-500" />
      case 'CONNECTION_TAMPERING':
        return <X className="h-4 w-4 text-red-500" />
      case 'LOCATION_CHANGE':
        return <Eye className="h-4 w-4 text-blue-500" />
      case 'PANEL_ACCESS':
        return <ShieldAlert className="h-4 w-4 text-red-500" />
      case 'COMMUNICATION_INTERFERENCE':
        return <X className="h-4 w-4 text-amber-500" />
      case 'UNAUTHORIZED_ACCESS':
        return <ShieldAlert className="h-4 w-4 text-red-500" />
      default:
        return <ShieldAlert className="h-4 w-4 text-gray-500" />
    }
  }

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return "Unknown"
    try {
      return format(parseISO(dateString), "PPp")
    } catch (error) {
      console.error(`Error formatting date ${dateString}:`, error)
      return dateString
    }
  }

  // Navigate to the security monitoring page for the selected installation
  const navigateToMonitoring = (installationId) => {
    router.push(`/admin/security?installation=${installationId}`)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/admin">Dashboard</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="/admin/security">Security</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbPage>Alerts</BreadcrumbPage>
          </BreadcrumbList>
        </Breadcrumb>
        <Button
          variant="outline"
          size="sm"
          onClick={refreshData}
          disabled={isRefreshing}
          className="ml-auto"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Alerts</CardTitle>
            <div className="h-8 w-8 flex items-center justify-center rounded-full bg-red-100">
              <ShieldAlert className="h-4 w-4 text-red-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredEvents.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Alerts</CardTitle>
            <div className="h-8 w-8 flex items-center justify-center rounded-full bg-amber-100">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredEvents.filter(event => event.status === 'NEW').length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Severity</CardTitle>
            <div className="h-8 w-8 flex items-center justify-center rounded-full bg-purple-100">
              <AlertTriangle className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredEvents.filter(event => event.severity === 'CRITICAL').length}</div>
          </CardContent>
        </Card>

        {(status === "all" || status === "RESOLVED") && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Resolved</CardTitle>
              <div className="h-8 w-8 flex items-center justify-center rounded-full bg-green-100">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{filteredEvents.filter(event => event.status === 'RESOLVED').length}</div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Security Alerts</CardTitle>
            <CardDescription>
              View and manage security alerts across all installations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search alerts..."
                      className="pl-8"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex flex-row gap-2">
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NEW">Open</SelectItem>
                      <SelectItem value="ACKNOWLEDGED">Acknowledged</SelectItem>
                      <SelectItem value="INVESTIGATING">Investigating</SelectItem>
                      <SelectItem value="RESOLVED">Resolved</SelectItem>
                      <SelectItem value="all">All Statuses</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={severity} onValueChange={setSeverity}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Severity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CRITICAL">Critical</SelectItem>
                      <SelectItem value="HIGH">High</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="LOW">Low</SelectItem>
                      <SelectItem value="all">All Severities</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={eventType} onValueChange={setEventType}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Event Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PHYSICAL_MOVEMENT">Physical Movement</SelectItem>
                      <SelectItem value="VOLTAGE_FLUCTUATION">Voltage Fluctuation</SelectItem>
                      <SelectItem value="CONNECTION_TAMPERING">Connection Tampering</SelectItem>
                      <SelectItem value="LOCATION_CHANGE">Location Change</SelectItem>
                      <SelectItem value="PANEL_ACCESS">Panel Access</SelectItem>
                      <SelectItem value="COMMUNICATION_INTERFERENCE">Communication Interference</SelectItem>
                      <SelectItem value="UNAUTHORIZED_ACCESS">Unauthorized Access</SelectItem>
                      <SelectItem value="all">All Types</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Select value={installation} onValueChange={setInstallation}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select installation" />
                  </SelectTrigger>
                  <SelectContent>
                    {installations.map(installation => (
                      <SelectItem key={installation.id} value={installation.id}>
                        {installation.name || `Installation #${installation.id}`}
                      </SelectItem>
                    ))}
                    <SelectItem value="all">All Installations</SelectItem>
                  </SelectContent>
                </Select>

                <DatePickerWithRange
                  date={dateRange}
                  setDate={setDateRange}
                  className="w-full sm:w-auto"
                />
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-10">
                  <div className="flex flex-col items-center text-center">
                    <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                    <p className="mt-2 text-sm text-muted-foreground">Loading alerts...</p>
                  </div>
                </div>
              ) : filteredEvents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="rounded-full bg-muted p-3">
                    <CheckCircle2 className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">No alerts found</h3>
                  <p className="mt-2 text-sm text-muted-foreground max-w-sm">
                    No security alerts matching your current filters were found. Try adjusting your filters or refresh the data.
                  </p>
                  <Button variant="outline" className="mt-4" onClick={refreshData}>
                    Refresh Alerts
                  </Button>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Time</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Installation</TableHead>
                        <TableHead>Severity</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEvents.map(event => (
                        <TableRow key={event.id}>
                          <TableCell>{formatDate(event.timestamp)}</TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              {getEventTypeIcon(event.eventType)}
                              <span className="ml-2">
                                {event.eventType?.replace("_", " ") || "Unknown"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>{getInstallationName(event.installationId)}</TableCell>
                          <TableCell>{getSeverityBadge(event.severity)}</TableCell>
                          <TableCell>{getStatusBadge(event.status)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => viewEventDetails(event)}
                              >
                                Details
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                  <DropdownMenuItem
                                    onClick={() => navigateToMonitoring(event.installationId)}
                                  >
                                    View Monitoring
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    disabled={['RESOLVED'].includes(event.status)}
                                    onClick={() => acknowledgeEvent(event.id)}
                                  >
                                    Acknowledge
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    disabled={['RESOLVED'].includes(event.status)}
                                    onClick={() => updateEventStatus(event.id, 'INVESTIGATING')}
                                  >
                                    Mark as Investigating
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    disabled={['RESOLVED'].includes(event.status)}
                                    onClick={() => {
                                      setSelectedEvent(event)
                                      setResolveDialogOpen(true)
                                    }}
                                  >
                                    Resolve
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Event Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Alert Details</DialogTitle>
            <DialogDescription>
              Detailed information about the security alert
            </DialogDescription>
          </DialogHeader>
          {selectedEvent && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-start gap-4">
                <div className="col-span-4 md:col-span-1">
                  <h3 className="font-semibold">Alert Information</h3>
                  <div className="mt-2 space-y-3">
                    <div>
                      <div className="text-sm font-medium">ID</div>
                      <div className="text-sm text-muted-foreground">{selectedEvent.id}</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium">Time</div>
                      <div className="text-sm text-muted-foreground">{formatDate(selectedEvent.timestamp)}</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium">Type</div>
                      <div className="flex items-center text-sm text-muted-foreground">
                        {getEventTypeIcon(selectedEvent.eventType)}
                        <span className="ml-2">{selectedEvent.eventType?.replace("_", " ") || "Unknown"}</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium">Severity</div>
                      <div>{getSeverityBadge(selectedEvent.severity)}</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium">Status</div>
                      <div>{getStatusBadge(selectedEvent.status)}</div>
                    </div>
                  </div>
                </div>
                <div className="col-span-4 md:col-span-3">
                  <h3 className="font-semibold">Details</h3>
                  <div className="mt-2 space-y-3">
                    <div>
                      <div className="text-sm font-medium">Installation</div>
                      <div className="text-sm text-muted-foreground">
                        {selectedInstallation ? (
                          <>
                            {selectedInstallation.name || `Installation #${selectedInstallation.id}`}
                            <Button
                              variant="link"
                              size="sm"
                              className="h-auto p-0 ml-2"
                              onClick={() => navigateToMonitoring(selectedEvent.installationId)}
                            >
                              View monitoring
                            </Button>
                          </>
                        ) : (
                          `Installation #${selectedEvent.installationId}`
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium">Location</div>
                      <div className="text-sm text-muted-foreground">
                        {selectedInstallation?.location || "Unknown location"}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium">Description</div>
                      <div className="text-sm text-muted-foreground">
                        {selectedEvent.description || "No description available"}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium">Raw Data</div>
                      <pre className="mt-2 rounded-md bg-muted p-4 overflow-auto text-xs">
                        {JSON.stringify(selectedEvent.rawData || {}, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:justify-between">
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                onClick={() => setDetailsOpen(false)}
              >
                Close
              </Button>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                disabled={!selectedEvent || ['RESOLVED'].includes(selectedEvent?.status)}
                onClick={() => acknowledgeEvent(selectedEvent?.id)}
              >
                Acknowledge
              </Button>
              <Button
                variant="outline"
                disabled={!selectedEvent || ['RESOLVED'].includes(selectedEvent?.status)}
                onClick={() => {
                  updateEventStatus(selectedEvent?.id, 'INVESTIGATING')
                  setDetailsOpen(false)
                }}
              >
                Mark as Investigating
              </Button>
              <Button
                disabled={!selectedEvent || ['RESOLVED'].includes(selectedEvent?.status)}
                onClick={() => {
                  setDetailsOpen(false)
                  setResolveDialogOpen(true)
                }}
              >
                Resolve
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resolve Event Dialog */}
      <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Alert</DialogTitle>
            <DialogDescription>
              Provide resolution details for this security alert
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="resolution-notes" className="text-right pt-2">
                Resolution Notes
              </Label>
              <Textarea
                id="resolution-notes"
                placeholder="Describe how the issue was resolved..."
                className="col-span-3"
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setResolveDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleResolveEvent}>
              Resolve Alert
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
