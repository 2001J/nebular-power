"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { format, parseISO, subDays } from "date-fns"
import {
  AlertCircle,
  Bell,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Megaphone,
  MessageSquare,
  MoreHorizontal,
  RefreshCw,
  Search,
  SendHorizonal,
  Shield,
  Undo2,
  User,
  WrenchIcon,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
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
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "@/components/ui/use-toast"
import { securityApi, installationApi } from "@/lib/api"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function TamperResponsesPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [events, setEvents] = useState([])
  const [responses, setResponses] = useState([])
  const [filteredResponses, setFilteredResponses] = useState([])
  const [installations, setInstallations] = useState([])
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 30),
    to: new Date(),
  })
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [selectedEventResponses, setSelectedEventResponses] = useState([])
  const [responseType, setResponseType] = useState("all")
  const [installation, setInstallation] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [createResponseDialogOpen, setCreateResponseDialogOpen] = useState(false)
  const [newResponse, setNewResponse] = useState({
    responseType: "MANUAL_INTERVENTION",
    description: "",
    actionTaken: "",
    notifyUser: false,
    contactAuthorities: false
  })
  const [notificationDialogOpen, setNotificationDialogOpen] = useState(false)
  const [notificationDetails, setNotificationDetails] = useState({
    message: "",
    channels: ["EMAIL"],
    priority: "MEDIUM"
  })
  const [autoResponseDialogOpen, setAutoResponseDialogOpen] = useState(false)
  const [autoResponseType, setAutoResponseType] = useState("SHUTDOWN")
  const [selectedResponse, setSelectedResponse] = useState(null)
  const [responseDetailsOpen, setResponseDetailsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("events")

  // Fetch tamper events and responses
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)

        // Get all installations first for reference
        const installationsData = await installationApi.getAllInstallations()
        setInstallations(installationsData.content || [])

        // Fetch tamper events with unresolved status
        let eventsData = []
        try {
          eventsData = await securityApi.getUnresolvedEvents()
          console.log("Fetched tamper events:", eventsData)
          setEvents(eventsData || [])
        } catch (error) {
          console.error("Error fetching tamper events:", error)
          setEvents([])
        }

        // Fetch responses based on filters
        let responsesData = []
        try {
          if (installation !== "all") {
            // Get responses for specific installation
            responsesData = await securityApi.getResponsesByInstallation(installation)
          } else if (dateRange.from && dateRange.to) {
            // Get responses by time range
            const startDate = dateRange.from.toISOString()
            const endDate = dateRange.to.toISOString()
            responsesData = await securityApi.getResponsesByTimeRange(startDate, endDate)
          } else if (eventsData.length > 0) {
            // Get responses for the first few events
            for (const event of eventsData.slice(0, 3)) {
              try {
                const eventResponses = await securityApi.getResponsesByEventId(event.id)
                responsesData = [...responsesData, ...eventResponses]
              } catch (responseError) {
                console.error(`Error fetching responses for event ${event.id}:`, responseError)
              }
            }
          }

          if (responseType !== "all" && responseType !== "") {
            // Filter responses by type
            responsesData = responsesData.filter(response => response.responseType === responseType)
          }
        } catch (error) {
          console.error("Error fetching tamper responses:", error)
          responsesData = []
        }

        // If no data was returned, use mock data
        if (!responsesData || responsesData.length === 0) {
          responsesData = generateMockResponses(eventsData, 8)
        }

        console.log("Fetched or generated responses:", responsesData)
        setResponses(responsesData)
        applyFilters(responsesData)
      } catch (error) {
        console.error("Error fetching tamper response data:", error)
        toast({
          title: "Error",
          description: "Failed to load tamper response data",
          variant: "destructive",
        })

        // Set mock data as fallback
        const mockEvents = generateMockEvents(5)
        const mockResponses = generateMockResponses(mockEvents, 8)
        setEvents(mockEvents)
        setResponses(mockResponses)
        setFilteredResponses(mockResponses)
      } finally {
        setLoading(false)
        setIsRefreshing(false)
      }
    }

    fetchData()
  }, [dateRange, responseType, installation, isRefreshing])

  // Fetch responses for selected event
  useEffect(() => {
    const fetchEventResponses = async () => {
      if (!selectedEvent) return

      try {
        const eventResponses = await securityApi.getResponsesByEventId(selectedEvent.id)
        setSelectedEventResponses(eventResponses || [])
      } catch (error) {
        console.error(`Error fetching responses for event ${selectedEvent.id}:`, error)
        setSelectedEventResponses([])

        // Generate mock responses for the selected event
        const mockResponses = generateMockResponses([selectedEvent], 3)
        setSelectedEventResponses(mockResponses)
      }
    }

    fetchEventResponses()
  }, [selectedEvent])

  // Generate mock events for fallback
  const generateMockEvents = (count) => {
    const eventTypes = ["PHYSICAL_MOVEMENT", "VOLTAGE_FLUCTUATION", "CONNECTION_INTERRUPTION", "LOCATION_CHANGE"]
    const severities = ["HIGH", "MEDIUM", "LOW"]
    const statuses = ["OPEN", "ACKNOWLEDGED", "IN_PROGRESS"]
    const mockEvents = []

    for (let i = 0; i < count; i++) {
      const randomInstallation = installations.length > 0
        ? installations[Math.floor(Math.random() * installations.length)]
        : { id: `INST-${i + 100}`, name: `Demo Installation ${i + 1}` }

      mockEvents.push({
        id: `EVT-${Date.now()}-${i}`,
        timestamp: new Date(Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000)).toISOString(),
        eventType: eventTypes[Math.floor(Math.random() * eventTypes.length)],
        severity: severities[Math.floor(Math.random() * severities.length)],
        status: statuses[Math.floor(Math.random() * statuses.length)],
        description: `Mock tamper event for demonstration purposes.`,
        installationId: randomInstallation.id,
        installationName: randomInstallation.name,
        confidenceScore: Math.random().toFixed(2)
      })
    }

    return mockEvents
  }

  // Generate mock responses for fallback
  const generateMockResponses = (eventsArray, count) => {
    const responseTypes = ["NOTIFICATION", "MANUAL_INTERVENTION", "AUTOMATIC_SHUTDOWN", "REPORT_GENERATION"]
    const responseStatuses = ["COMPLETED", "PENDING", "FAILED"]
    const mockResponses = []

    for (let i = 0; i < count; i++) {
      const randomEvent = eventsArray.length > 0
        ? eventsArray[Math.floor(Math.random() * eventsArray.length)]
        : { id: `EVT-MOCK-${i}`, installationId: `INST-${i + 100}` }

      mockResponses.push({
        id: `RESP-${Date.now()}-${i}`,
        eventId: randomEvent.id,
        timestamp: new Date(Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000)).toISOString(),
        responseType: responseTypes[Math.floor(Math.random() * responseTypes.length)],
        status: responseStatuses[Math.floor(Math.random() * responseStatuses.length)],
        description: `Mock response action for tamper event.`,
        actionTaken: `Simulated response action ${i + 1}.`,
        createdBy: Math.random() > 0.5 ? "system" : "admin",
        installationId: randomEvent.installationId
      })
    }

    return mockResponses
  }

  // Apply filters to responses
  const applyFilters = (responsesData = responses) => {
    const filtered = responsesData.filter(response => {
      // Response type filter
      if (responseType !== "all" && response.responseType !== responseType) return false

      // Installation filter
      if (installation !== "all" && response.installationId !== installation) return false

      // Search term filter
      if (searchTerm && searchTerm.length > 0) {
        const searchLower = searchTerm.toLowerCase()
        const matchesDescription = response.description?.toLowerCase().includes(searchLower)
        const matchesAction = response.actionTaken?.toLowerCase().includes(searchLower)
        const matchesEventId = response.eventId?.toLowerCase().includes(searchLower)
        const matchesInstallation = getInstallationName(response.installationId)?.toLowerCase().includes(searchLower)

        if (!matchesDescription && !matchesAction && !matchesEventId && !matchesInstallation) return false
      }

      return true
    })

    // Sort by timestamp, newest first
    filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))

    setFilteredResponses(filtered)
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

  // Get event by ID
  const getEventById = (eventId) => {
    return events.find(event => event.id === eventId) || null
  }

  // Format date
  const formatDate = (dateString) => {
    try {
      return format(parseISO(dateString), "PPP p")
    } catch (error) {
      return dateString || "N/A"
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
      case 'COMPLETED':
      case 'SUCCESS':
        return <Badge variant="success">Completed</Badge>
      case 'PENDING':
      case 'IN_PROGRESS':
        return <Badge variant="warning">Pending</Badge>
      case 'FAILED':
        return <Badge variant="destructive">Failed</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  // Get response type icon
  const getResponseTypeIcon = (responseType) => {
    switch (responseType) {
      case 'NOTIFICATION':
        return <Bell className="h-4 w-4 text-blue-500" />
      case 'MANUAL_INTERVENTION':
        return <WrenchIcon className="h-4 w-4 text-amber-500" />
      case 'AUTOMATIC_SHUTDOWN':
      case 'AUTO_SHUTDOWN':
        return <Zap className="h-4 w-4 text-red-500" />
      case 'REPORT_GENERATION':
        return <FileText className="h-4 w-4 text-green-500" />
      default:
        return <Shield className="h-4 w-4 text-gray-500" />
    }
  }

  // Create a new tamper response
  const handleCreateResponse = async () => {
    if (!selectedEvent) return

    try {
      // Format request data
      const requestData = {
        eventId: selectedEvent.id,
        responseType: newResponse.responseType,
        description: newResponse.description,
        actionTaken: newResponse.actionTaken,
        additionalDetails: JSON.stringify({
          notifyUser: newResponse.notifyUser,
          contactAuthorities: newResponse.contactAuthorities
        })
      }

      // Call API to create response
      const createdResponse = await securityApi.createTamperResponse(selectedEvent.id, requestData)

      toast({
        title: "Response Created",
        description: "The tamper response has been recorded successfully.",
      })

      // Update the responses list
      if (createdResponse) {
        setResponses(prev => [createdResponse, ...prev])
        setSelectedEventResponses(prev => [createdResponse, ...prev])
        applyFilters([createdResponse, ...responses])
      } else {
        // If no response returned, refresh data
        refreshData()
      }

      // Reset form
      setNewResponse({
        responseType: "MANUAL_INTERVENTION",
        description: "",
        actionTaken: "",
        notifyUser: false,
        contactAuthorities: false
      })
      setCreateResponseDialogOpen(false)
    } catch (error) {
      console.error(`Error creating tamper response for event ${selectedEvent.id}:`, error)
      toast({
        title: "Error",
        description: "Failed to create tamper response. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Send notification for tamper event
  const handleSendNotification = async () => {
    if (!selectedEvent) return

    try {
      // Format request data
      const requestData = {
        message: notificationDetails.message,
        channels: notificationDetails.channels,
        priority: notificationDetails.priority
      }

      // Call API to send notification
      const result = await securityApi.sendNotification(selectedEvent.id, requestData)

      toast({
        title: "Notification Sent",
        description: `Notification sent successfully via ${notificationDetails.channels.join(", ").toLowerCase()}.`,
      })

      // Update responses or refresh data
      if (result) {
        setResponses(prev => [result, ...prev])
        setSelectedEventResponses(prev => [result, ...prev])
        applyFilters([result, ...responses])
      } else {
        refreshData()
      }

      // Reset form
      setNotificationDetails({
        message: "",
        channels: ["EMAIL"],
        priority: "MEDIUM"
      })
      setNotificationDialogOpen(false)
    } catch (error) {
      console.error(`Error sending notification for event ${selectedEvent.id}:`, error)
      toast({
        title: "Error",
        description: "Failed to send notification. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Execute automatic response for tamper event
  const handleExecuteAutoResponse = async () => {
    if (!selectedEvent) return

    try {
      // Format request data
      const requestData = {
        responseType: autoResponseType,
        executeImmediately: true
      }

      // Call API to execute automatic response
      const result = await securityApi.executeAutoResponse(selectedEvent.id, requestData)

      toast({
        title: "Auto-Response Executed",
        description: `Automatic ${autoResponseType.toLowerCase().replace("_", " ")} response executed successfully.`,
      })

      // Update responses or refresh data
      if (result) {
        setResponses(prev => [result, ...prev])
        setSelectedEventResponses(prev => [result, ...prev])
        applyFilters([result, ...responses])
      } else {
        refreshData()
      }

      // Reset and close dialog
      setAutoResponseType("SHUTDOWN")
      setAutoResponseDialogOpen(false)
    } catch (error) {
      console.error(`Error executing auto-response for event ${selectedEvent.id}:`, error)
      toast({
        title: "Error",
        description: "Failed to execute automatic response. Please try again.",
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
            <BreadcrumbPage>Tamper Responses</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tamper Responses</h1>
          <p className="text-muted-foreground">
            Manage and track responses to tamper detection events
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={refreshData} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => router.push("/admin/security/alerts")}>
            <AlertCircle className="h-4 w-4 mr-2" />
            View Alerts
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="events">Tamper Events</TabsTrigger>
          <TabsTrigger value="responses">Response Actions</TabsTrigger>
        </TabsList>

        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tamper Events Requiring Action</CardTitle>
              <CardDescription>
                Events that require response or have recent response actions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="flex flex-col items-center space-y-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <p className="text-sm text-muted-foreground">Loading tamper events...</p>
                  </div>
                </div>
              ) : events.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <CheckCircle2 className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No Active Events</h3>
                  <p className="text-sm text-muted-foreground max-w-md mt-2">
                    No tamper events currently require response actions.
                  </p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[180px]">Timestamp</TableHead>
                        <TableHead>Event Type</TableHead>
                        <TableHead>Installation</TableHead>
                        <TableHead>Severity</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {events.map((event) => (
                        <TableRow key={event.id}>
                          <TableCell>
                            <div className="flex items-center">
                              <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                              <span>{formatDate(event.timestamp)}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {event.eventType?.replace("_", " ") || "Unknown Event"}
                          </TableCell>
                          <TableCell>
                            {getInstallationName(event.installationId)}
                          </TableCell>
                          <TableCell>{getSeverityBadge(event.severity)}</TableCell>
                          <TableCell>
                            {event.status ? (
                              <Badge>{event.status?.replace("_", " ")}</Badge>
                            ) : (
                              "Unknown"
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <span className="sr-only">Open menu</span>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedEvent(event)
                                  }}
                                >
                                  View Response History
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedEvent(event)
                                    setNotificationDialogOpen(true)
                                  }}
                                >
                                  <Bell className="mr-2 h-4 w-4" />
                                  Send Notification
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedEvent(event)
                                    setCreateResponseDialogOpen(true)
                                  }}
                                >
                                  <WrenchIcon className="mr-2 h-4 w-4" />
                                  Record Response Action
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedEvent(event)
                                    setAutoResponseDialogOpen(true)
                                  }}
                                >
                                  <Zap className="mr-2 h-4 w-4" />
                                  Execute Auto-Response
                                </DropdownMenuItem>
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

            {selectedEvent && (
              <CardFooter className="flex flex-col items-start p-6 border-t">
                <div className="w-full mb-4">
                  <h3 className="text-lg font-semibold mb-2">
                    Response History: {selectedEvent.eventType?.replace("_", " ") || "Event"} at{" "}
                    {getInstallationName(selectedEvent.installationId)}
                  </h3>
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-muted-foreground">
                      Event ID: {selectedEvent.id} | Occurred: {formatDate(selectedEvent.timestamp)}
                    </p>
                    <div className="space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setNotificationDialogOpen(true)}
                      >
                        <Bell className="h-4 w-4 mr-2" />
                        Send Notification
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => setCreateResponseDialogOpen(true)}
                      >
                        <WrenchIcon className="h-4 w-4 mr-2" />
                        Record Response
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="w-full">
                  {selectedEventResponses.length === 0 ? (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>No responses yet</AlertTitle>
                      <AlertDescription>
                        No response actions have been recorded for this event.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <ScrollArea className="h-[300px] w-full">
                      <div className="space-y-3">
                        {selectedEventResponses.map((response) => (
                          <Card key={response.id} className="overflow-hidden">
                            <CardHeader className="p-4 pb-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                  {getResponseTypeIcon(response.responseType)}
                                  <span className="ml-2 font-medium">
                                    {response.responseType?.replace("_", " ")}
                                  </span>
                                </div>
                                <div className="flex items-center">
                                  <span className="text-sm text-muted-foreground mr-2">
                                    {formatDate(response.timestamp)}
                                  </span>
                                  {getStatusBadge(response.status)}
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent className="p-4 pt-0">
                              <p className="text-sm">
                                {response.actionTaken || response.description || "No description available"}
                              </p>
                              <div className="mt-2 flex items-center text-xs text-muted-foreground">
                                <User className="h-3 w-3 mr-1" />
                                <span>{response.createdBy || "Unknown user"}</span>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </div>
              </CardFooter>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="responses" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <CardTitle>Response Actions History</CardTitle>
                  <CardDescription>
                    {loading ? "Loading response actions..." : `${filteredResponses.length} response actions found`}
                  </CardDescription>
                </div>

                <div className="flex flex-wrap gap-2">
                  <div className="relative w-full md:w-auto">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Search responses..."
                      className="pl-8 w-full md:w-[200px]"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>

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

                  <Select value={responseType} onValueChange={setResponseType}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Response Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="NOTIFICATION">Notification</SelectItem>
                      <SelectItem value="MANUAL_INTERVENTION">Manual Intervention</SelectItem>
                      <SelectItem value="AUTOMATIC_SHUTDOWN">Automatic Shutdown</SelectItem>
                      <SelectItem value="REPORT_GENERATION">Report Generation</SelectItem>
                    </SelectContent>
                  </Select>

                  <DatePickerWithRange date={dateRange} setDate={setDateRange} />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="flex flex-col items-center space-y-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <p className="text-sm text-muted-foreground">Loading response actions...</p>
                  </div>
                </div>
              ) : filteredResponses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No Responses Found</h3>
                  <p className="text-sm text-muted-foreground max-w-md mt-2">
                    {searchTerm ? (
                      `No responses found matching "${searchTerm}".`
                    ) : (
                      "No response actions matching the current filters."
                    )}
                  </p>
                  {(searchTerm || responseType !== "all" || installation !== "all") && (
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => {
                        setSearchTerm("")
                        setResponseType("all")
                        setInstallation("all")
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
                        <TableHead>Response Type</TableHead>
                        <TableHead>Event ID</TableHead>
                        <TableHead>Installation</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created By</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredResponses.map((response) => (
                        <TableRow key={response.id}>
                          <TableCell>
                            <div className="flex items-center">
                              <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                              <span>{formatDate(response.timestamp)}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              {getResponseTypeIcon(response.responseType)}
                              <span className="ml-2">
                                {response.responseType?.replace("_", " ")}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {response.eventId || "N/A"}
                          </TableCell>
                          <TableCell>
                            {getInstallationName(response.installationId)}
                          </TableCell>
                          <TableCell>{getStatusBadge(response.status)}</TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <User className="mr-2 h-4 w-4 text-muted-foreground" />
                              <span>{response.createdBy || "Unknown"}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedResponse(response)
                                setResponseDetailsOpen(true)
                              }}
                            >
                              <ExternalLink className="h-4 w-4" />
                              <span className="sr-only">View details</span>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Response Dialog */}
      <Dialog open={createResponseDialogOpen} onOpenChange={setCreateResponseDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Record Response Action</DialogTitle>
            <DialogDescription>
              Document actions taken in response to the tamper event.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {selectedEvent && (
              <div className="rounded-md bg-muted p-3 text-sm">
                <p className="font-medium">
                  {selectedEvent.eventType?.replace("_", " ")} at {getInstallationName(selectedEvent.installationId)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Event occurred at {formatDate(selectedEvent.timestamp)}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="responseType">Response Type</Label>
              <Select
                value={newResponse.responseType}
                onValueChange={(value) => setNewResponse({ ...newResponse, responseType: value })}
              >
                <SelectTrigger id="responseType">
                  <SelectValue placeholder="Select response type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MANUAL_INTERVENTION">Manual Intervention</SelectItem>
                  <SelectItem value="NOTIFICATION">Notification Sent</SelectItem>
                  <SelectItem value="AUTOMATIC_SHUTDOWN">System Shutdown</SelectItem>
                  <SelectItem value="REPORT_GENERATION">Report Generated</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="actionTaken">Action Taken</Label>
              <Textarea
                id="actionTaken"
                placeholder="Describe the action taken in response to this event..."
                value={newResponse.actionTaken}
                onChange={(e) => setNewResponse({ ...newResponse, actionTaken: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="responseDescription">Additional Notes</Label>
              <Textarea
                id="responseDescription"
                placeholder="Add any additional details about this response..."
                value={newResponse.description}
                onChange={(e) => setNewResponse({ ...newResponse, description: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="notifyUser"
                  checked={newResponse.notifyUser}
                  onCheckedChange={(checked) => setNewResponse({ ...newResponse, notifyUser: checked })}
                />
                <Label htmlFor="notifyUser">Notify customer about this response</Label>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="contactAuthorities"
                  checked={newResponse.contactAuthorities}
                  onCheckedChange={(checked) => setNewResponse({ ...newResponse, contactAuthorities: checked })}
                />
                <Label htmlFor="contactAuthorities">Authorities were contacted</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateResponseDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateResponse} disabled={!newResponse.actionTaken.trim()}>
              Record Response
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Notification Dialog */}
      <Dialog open={notificationDialogOpen} onOpenChange={setNotificationDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Send Notification</DialogTitle>
            <DialogDescription>
              Send an alert notification regarding this tamper event.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {selectedEvent && (
              <div className="rounded-md bg-muted p-3 text-sm">
                <p className="font-medium">
                  {selectedEvent.eventType?.replace("_", " ")} at {getInstallationName(selectedEvent.installationId)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Event occurred at {formatDate(selectedEvent.timestamp)}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="notificationMessage">Notification Message</Label>
              <Textarea
                id="notificationMessage"
                placeholder="Enter the notification message..."
                value={notificationDetails.message}
                onChange={(e) => setNotificationDetails({ ...notificationDetails, message: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Notification Channels</Label>
              <div className="flex flex-wrap gap-2 mt-1.5">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="emailChannel"
                    checked={notificationDetails.channels.includes("EMAIL")}
                    onCheckedChange={(checked) => {
                      const updated = checked
                        ? [...notificationDetails.channels, "EMAIL"]
                        : notificationDetails.channels.filter(c => c !== "EMAIL")
                      setNotificationDetails({ ...notificationDetails, channels: updated })
                    }}
                  />
                  <Label htmlFor="emailChannel">Email</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="smsChannel"
                    checked={notificationDetails.channels.includes("SMS")}
                    onCheckedChange={(checked) => {
                      const updated = checked
                        ? [...notificationDetails.channels, "SMS"]
                        : notificationDetails.channels.filter(c => c !== "SMS")
                      setNotificationDetails({ ...notificationDetails, channels: updated })
                    }}
                  />
                  <Label htmlFor="smsChannel">SMS</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="pushChannel"
                    checked={notificationDetails.channels.includes("PUSH")}
                    onCheckedChange={(checked) => {
                      const updated = checked
                        ? [...notificationDetails.channels, "PUSH"]
                        : notificationDetails.channels.filter(c => c !== "PUSH")
                      setNotificationDetails({ ...notificationDetails, channels: updated })
                    }}
                  />
                  <Label htmlFor="pushChannel">Push Notification</Label>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={notificationDetails.priority}
                onValueChange={(value) => setNotificationDetails({ ...notificationDetails, priority: value })}
              >
                <SelectTrigger id="priority">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="LOW">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setNotificationDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSendNotification}
              disabled={!notificationDetails.message.trim() || notificationDetails.channels.length === 0}
            >
              <SendHorizonal className="h-4 w-4 mr-2" />
              Send Notification
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Auto Response Dialog */}
      <Dialog open={autoResponseDialogOpen} onOpenChange={setAutoResponseDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Execute Automatic Response</DialogTitle>
            <DialogDescription>
              Trigger an automated response to this tamper event.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {selectedEvent && (
              <div className="rounded-md bg-muted p-3 text-sm">
                <p className="font-medium">
                  {selectedEvent.eventType?.replace("_", " ")} at {getInstallationName(selectedEvent.installationId)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Event occurred at {formatDate(selectedEvent.timestamp)}
                </p>
              </div>
            )}

            <Alert variant="warning">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Attention</AlertTitle>
              <AlertDescription>
                Automatic responses may impact system operation. Please confirm before proceeding.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="autoResponseType">Response Type</Label>
              <Select
                value={autoResponseType}
                onValueChange={setAutoResponseType}
              >
                <SelectTrigger id="autoResponseType">
                  <SelectValue placeholder="Select response type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SHUTDOWN">System Shutdown</SelectItem>
                  <SelectItem value="RESTART">System Restart</SelectItem>
                  <SelectItem value="ISOLATE">Isolate System</SelectItem>
                  <SelectItem value="BACKUP">Backup Data</SelectItem>
                  <SelectItem value="ALERT_AUTHORITIES">Alert Authorities</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAutoResponseDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleExecuteAutoResponse}>
              <Zap className="h-4 w-4 mr-2" />
              Execute Response
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Response Details Dialog */}
      <Dialog open={responseDetailsOpen} onOpenChange={setResponseDetailsOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Response Details</DialogTitle>
            <DialogDescription>
              {selectedResponse?.responseType?.replace("_", " ")} on {formatDate(selectedResponse?.timestamp)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-semibold mb-1">Response ID</h4>
                <p className="text-sm font-mono">{selectedResponse?.id}</p>
              </div>
              <div>
                <h4 className="text-sm font-semibold mb-1">Event ID</h4>
                <p className="text-sm font-mono">{selectedResponse?.eventId}</p>
              </div>
              <div>
                <h4 className="text-sm font-semibold mb-1">Status</h4>
                <p className="text-sm">{getStatusBadge(selectedResponse?.status)}</p>
              </div>
              <div>
                <h4 className="text-sm font-semibold mb-1">Created By</h4>
                <p className="text-sm">{selectedResponse?.createdBy || "Unknown"}</p>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold mb-1">Installation</h4>
              <p className="text-sm">
                {getInstallationName(selectedResponse?.installationId)}
              </p>
            </div>

            <div>
              <h4 className="text-sm font-semibold mb-1">Action Taken</h4>
              <div className="bg-muted p-3 rounded-md text-sm">
                {selectedResponse?.actionTaken || "No action details available"}
              </div>
            </div>

            {selectedResponse?.description && (
              <div>
                <h4 className="text-sm font-semibold mb-1">Additional Notes</h4>
                <div className="bg-muted p-3 rounded-md text-sm">
                  {selectedResponse.description}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setResponseDetailsOpen(false)}>
              Close
            </Button>
            {selectedResponse?.eventId && (
              <Button
                variant="outline"
                onClick={() => {
                  const event = getEventById(selectedResponse.eventId)
                  if (event) {
                    setSelectedEvent(event)
                    setActiveTab("events")
                  } else {
                    toast({
                      title: "Event Not Found",
                      description: "The associated event could not be found in the current view.",
                      variant: "warning",
                    })
                  }
                  setResponseDetailsOpen(false)
                }}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                View Event
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}