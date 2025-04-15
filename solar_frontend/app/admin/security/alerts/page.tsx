"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
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
  const [status, setStatus] = useState("OPEN")
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
        const installationsData = await installationApi.getAllInstallations()
        setInstallations(installationsData.content || [])

        // Fetch tamper events based on the status filter
        let events = []
        if (status === "OPEN") {
          // Unresolved events only
          events = await securityApi.getUnresolvedEvents()
        } else {
          // Get events by time range
          const startDate = dateRange.from ? dateRange.from.toISOString() : undefined
          const endDate = dateRange.to ? dateRange.to.toISOString() : undefined

          // For a specific installation
          if (installation !== "all") {
            events = await securityApi.getEventsByTimeRange(installation, startDate, endDate)
          } else {
            // Since there's no API to get all events across installations by time range,
            // we need to fetch events for each installation individually
            for (const installation of installationsData.content || []) {
              try {
                const installationEvents = await securityApi.getEventsByTimeRange(
                  installation.id,
                  startDate,
                  endDate
                )
                events = [...events, ...installationEvents]
              } catch (error) {
                console.error(`Error fetching events for installation ${installation.id}:`, error)
              }
            }
          }
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
  }, [dateRange, status, installation, isRefreshing])

  // Apply filters to tamper events
  const applyFilters = (events = tamperEvents) => {
    const filtered = events.filter(event => {
      // Event type filter
      if (eventType !== "all" && event.eventType !== eventType) return false

      // Severity filter
      if (severity !== "all" && event.severity !== severity) return false

      // Status filter is handled in the main API call, but we'll double-check here
      if (status !== "all" && event.status !== status) return false

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
  }, [eventType, severity, searchTerm])

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
        description: "Failed to acknowledge the event. Please try again.",
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
        description: `Event status changed to ${newStatus.toLowerCase().replace("_", " ")}.`,
      })

      // Refresh data
      refreshData()
    } catch (error) {
      console.error(`Error updating status for event ${eventId}:`, error)
      toast({
        title: "Error",
        description: "Failed to update event status. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Handle resolve event
  const handleResolveEvent = async () => {
    if (!selectedEvent) return

    try {
      const resolutionDetails = {
        eventId: selectedEvent.id,
        notes: resolutionNotes,
        resolution: "MANUAL_RESOLUTION",
        resolvedBy: "admin"
      }

      await securityApi.resolveEvent(selectedEvent.id, resolutionDetails)

      toast({
        title: "Event Resolved",
        description: "The tamper event has been successfully resolved.",
      })

      setResolveDialogOpen(false)
      setDetailsOpen(false)
      setResolutionNotes("")

      // Refresh data
      refreshData()
    } catch (error) {
      console.error(`Error resolving event ${selectedEvent.id}:`, error)
      toast({
        title: "Error",
        description: "Failed to resolve the event. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Get severity badge
  const getSeverityBadge = (severity) => {
    switch (severity?.toUpperCase()) {
      case 'HIGH':
        return <Badge variant="destructive">High</Badge>
      case 'MEDIUM':
        return <Badge variant="warning">Medium</Badge>
      case 'LOW':
        return <Badge variant="secondary">Low</Badge>
      default:
        return <Badge variant="outline">{severity}</Badge>
    }
  }

  // Get status badge
  const getStatusBadge = (status) => {
    switch (status?.toUpperCase()) {
      case 'OPEN':
        return <Badge variant="destructive">Open</Badge>
      case 'ACKNOWLEDGED':
        return <Badge variant="warning">Acknowledged</Badge>
      case 'IN_PROGRESS':
        return <Badge variant="warning">In Progress</Badge>
      case 'RESOLVED':
        return <Badge variant="success">Resolved</Badge>
      case 'FALSE_ALARM':
        return <Badge variant="secondary">False Alarm</Badge>
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
      case 'CONNECTION_INTERRUPTION':
        return <X className="h-4 w-4 text-red-500" />
      case 'LOCATION_CHANGE':
        return <Eye className="h-4 w-4 text-blue-500" />
      default:
        return <Shield className="h-4 w-4 text-gray-500" />
    }
  }

  // Format date
  const formatDate = (dateString) => {
    try {
      return format(parseISO(dateString), "PPP p")
    } catch (error) {
      return dateString || "N/A"
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
            <BreadcrumbPage>Security Alerts</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Security Alerts</h1>
          <p className="text-muted-foreground">
            Monitor and manage tamper detection alerts across all installations
          </p>
        </div>
        <div className="flex items-center gap-2">
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

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Tamper Detection Events</CardTitle>
              <CardDescription>
                {loading ? (
                  "Loading tamper events..."
                ) : (
                  `${filteredEvents.length} ${filteredEvents.length === 1 ? 'event' : 'events'} found`
                )}
              </CardDescription>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search events..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OPEN">Open</SelectItem>
                  <SelectItem value="ACKNOWLEDGED">Acknowledged</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="RESOLVED">Resolved</SelectItem>
                  <SelectItem value="FALSE_ALARM">False Alarm</SelectItem>
                  <SelectItem value="all">All Statuses</SelectItem>
                </SelectContent>
              </Select>

              <Select value={eventType} onValueChange={setEventType}>
                <SelectTrigger>
                  <SelectValue placeholder="Event Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="PHYSICAL_MOVEMENT">Physical Movement</SelectItem>
                  <SelectItem value="VOLTAGE_FLUCTUATION">Voltage Fluctuation</SelectItem>
                  <SelectItem value="CONNECTION_INTERRUPTION">Connection Interruption</SelectItem>
                  <SelectItem value="LOCATION_CHANGE">Location Change</SelectItem>
                </SelectContent>
              </Select>

              <Select value={severity} onValueChange={setSeverity}>
                <SelectTrigger>
                  <SelectValue placeholder="Severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severities</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="LOW">Low</SelectItem>
                </SelectContent>
              </Select>

              {status !== "OPEN" && (
                <div className="col-span-full mt-2">
                  <DatePickerWithRange date={dateRange} setDate={setDateRange} />
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="flex flex-col items-center space-y-2">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <p className="text-sm text-muted-foreground">Loading tamper events...</p>
              </div>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ShieldOff className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No Tamper Events Found</h3>
              <p className="text-sm text-muted-foreground max-w-md mt-2">
                {searchTerm ? (
                  `No events found matching "${searchTerm}".`
                ) : status === "OPEN" ? (
                  "There are no open tamper events at this time."
                ) : (
                  "No tamper events found with the current filters."
                )}
              </p>
              {(searchTerm || eventType !== "all" || severity !== "all" || status !== "OPEN") && (
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => {
                    setSearchTerm("")
                    setEventType("all")
                    setSeverity("all")
                    setStatus("OPEN")
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[180px]">Timestamp</TableHead>
                    <TableHead>Event Type</TableHead>
                    <TableHead>Installation</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEvents.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell>
                        <div className="flex items-center">
                          <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                          <span>{formatDate(event.timestamp)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          {getEventTypeIcon(event.eventType)}
                          <span className="ml-2">
                            {event.eventType?.replace("_", " ") || "Unknown"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{getInstallationName(event.installationId)}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        {event.description || "No description available"}
                      </TableCell>
                      <TableCell>{getSeverityBadge(event.severity)}</TableCell>
                      <TableCell>{getStatusBadge(event.status)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => viewEventDetails(event)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>

                            {event.status !== "RESOLVED" && event.status !== "FALSE_ALARM" && (
                              <>
                                <DropdownMenuSeparator />
                                {event.status === "OPEN" && (
                                  <DropdownMenuItem onClick={() => acknowledgeEvent(event.id)}>
                                    <CheckCircle2 className="mr-2 h-4 w-4" />
                                    Acknowledge
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedEvent(event);
                                    setResolveDialogOpen(true);
                                  }}
                                >
                                  <CheckCircle2 className="mr-2 h-4 w-4" />
                                  Resolve
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateEventStatus(event.id, "FALSE_ALARM")}>
                                  <X className="mr-2 h-4 w-4" />
                                  Mark as False Alarm
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Event Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Tamper Event Details</DialogTitle>
            <DialogDescription>
              {selectedEvent?.eventType?.replace("_", " ")} at {getInstallationName(selectedEvent?.installationId)}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium mb-2">Event Information</h3>
              <div className="space-y-2">
                <div className="grid grid-cols-3 items-center">
                  <span className="text-xs text-muted-foreground">Event ID:</span>
                  <span className="col-span-2 text-sm font-mono">{selectedEvent?.id}</span>
                </div>
                <div className="grid grid-cols-3 items-center">
                  <span className="text-xs text-muted-foreground">Type:</span>
                  <span className="col-span-2 text-sm">
                    {selectedEvent?.eventType?.replace("_", " ")}
                  </span>
                </div>
                <div className="grid grid-cols-3 items-center">
                  <span className="text-xs text-muted-foreground">Timestamp:</span>
                  <span className="col-span-2 text-sm">
                    {formatDate(selectedEvent?.timestamp)}
                  </span>
                </div>
                <div className="grid grid-cols-3 items-center">
                  <span className="text-xs text-muted-foreground">Severity:</span>
                  <span className="col-span-2 text-sm">
                    {getSeverityBadge(selectedEvent?.severity)}
                  </span>
                </div>
                <div className="grid grid-cols-3 items-center">
                  <span className="text-xs text-muted-foreground">Status:</span>
                  <span className="col-span-2 text-sm">
                    {getStatusBadge(selectedEvent?.status)}
                  </span>
                </div>
                <div className="grid grid-cols-3 items-center">
                  <span className="text-xs text-muted-foreground">Confidence:</span>
                  <span className="col-span-2 text-sm">
                    {selectedEvent?.confidenceScore
                      ? `${Math.round(selectedEvent.confidenceScore * 100)}%`
                      : "N/A"}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium mb-2">Installation Information</h3>
              <div className="space-y-2">
                <div className="grid grid-cols-3 items-center">
                  <span className="text-xs text-muted-foreground">Installation ID:</span>
                  <span className="col-span-2 text-sm font-mono">
                    {selectedEvent?.installationId}
                  </span>
                </div>
                <div className="grid grid-cols-3 items-center">
                  <span className="text-xs text-muted-foreground">Name:</span>
                  <span className="col-span-2 text-sm">
                    {selectedInstallation?.name ||
                      `Installation #${selectedEvent?.installationId}`}
                  </span>
                </div>
                <div className="grid grid-cols-3 items-center">
                  <span className="text-xs text-muted-foreground">Location:</span>
                  <span className="col-span-2 text-sm">
                    {selectedInstallation?.location || "Unknown location"}
                  </span>
                </div>
                <div className="grid grid-cols-3 items-center">
                  <span className="text-xs text-muted-foreground">Customer:</span>
                  <span className="col-span-2 text-sm">
                    {selectedInstallation?.customerName ||
                      selectedInstallation?.username ||
                      "Unknown customer"}
                  </span>
                </div>
              </div>
            </div>

            <div className="col-span-full">
              <h3 className="text-sm font-medium mb-2">Description</h3>
              <div className="bg-muted p-3 rounded-md text-sm">
                {selectedEvent?.description || "No description available"}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            {selectedEvent?.status !== "RESOLVED" && selectedEvent?.status !== "FALSE_ALARM" && (
              <>
                {selectedEvent?.status === "OPEN" && (
                  <Button variant="outline" onClick={() => acknowledgeEvent(selectedEvent.id)}>
                    Acknowledge
                  </Button>
                )}
                <Button variant="outline" onClick={() => updateEventStatus(selectedEvent.id, "FALSE_ALARM")}>
                  Mark as False Alarm
                </Button>
                <Button
                  onClick={() => {
                    setResolveDialogOpen(true);
                    setDetailsOpen(false);
                  }}
                >
                  Resolve Event
                </Button>
              </>
            )}
            {(selectedEvent?.status === "RESOLVED" || selectedEvent?.status === "FALSE_ALARM") && (
              <Button variant="outline" onClick={() => setDetailsOpen(false)}>
                Close
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resolve Event Dialog */}
      <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Tamper Event</DialogTitle>
            <DialogDescription>
              Enter resolution details for this tamper event.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="notes">Resolution Notes</Label>
              <Textarea
                id="notes"
                placeholder="Enter details about how this issue was resolved..."
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleResolveEvent}>
              Resolve Event
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 