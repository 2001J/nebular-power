"use client"

import { useState, useEffect } from "react"
import { AlertCircle, Bell, CheckCircle, Clock, Eye, FileBarChart, FileCheck, Power, ShieldAlert, X } from "lucide-react"
import { format } from "date-fns"
import { useRouter } from "next/navigation"

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
  DialogTrigger,
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
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { toast } from "@/components/ui/use-toast"
import { tamperDetectionApi, installationApi, securityApi } from "@/lib/api"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

export default function SecurityPage() {
  const [installations, setInstallations] = useState([])
  const [tamperEvents, setTamperEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedInstallation, setSelectedInstallation] = useState(null)
  const [simulateDialogOpen, setSimulateDialogOpen] = useState(false)
  const [sensitivityDialogOpen, setSensitivityDialogOpen] = useState(false)
  const [simulationType, setSimulationType] = useState("PHYSICAL_MOVEMENT")
  const [simulationValue, setSimulationValue] = useState(0.5)
  const [sensitivitySettings, setSensitivitySettings] = useState({
    PHYSICAL_MOVEMENT: 0.5,
    VOLTAGE_FLUCTUATION: 0.5,
    CONNECTION_INTERRUPTION: 0.5,
    LOCATION_CHANGE: 0.5
  })
  const [monitoringStatus, setMonitoringStatus] = useState({})
  const router = useRouter()

  // Fetch installations and tamper events
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)

        // Get all installations
        const installationsData = await installationApi.getAllInstallations()
        setInstallations(installationsData.content || [])

        // For each installation, check monitoring status
        const statuses = {}
        for (const installation of installationsData.content || []) {
          try {
            const status = await tamperDetectionApi.isMonitoring(installation.id)
            statuses[installation.id] = status
          } catch (error) {
            console.error(`Error fetching monitoring status for installation ${installation.id}:`, error)
            statuses[installation.id] = false
          }
        }
        setMonitoringStatus(statuses)

        // Fetch actual tamper events from API
        try {
          // Get unresolved events
          const eventsResponse = await securityApi.getUnresolvedEvents()
          console.log("Fetched tamper events:", eventsResponse)

          // Extract the content array from the paginated response
          const events = Array.isArray(eventsResponse) ? eventsResponse :
            (eventsResponse && eventsResponse.content ? eventsResponse.content : [])

          setTamperEvents(events)
        } catch (error) {
          console.error("Error fetching tamper events:", error)
          setTamperEvents([])
          toast({
            title: "Error",
            description: "Failed to load tamper events. Please try again.",
            variant: "destructive",
          })
        }
      } catch (error) {
        console.error("Error fetching security data:", error)
        toast({
          title: "Error",
          description: "Failed to load security monitoring data",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const toggleMonitoring = async (installationId) => {
    try {
      const currentStatus = monitoringStatus[installationId]

      if (currentStatus) {
        // Stop monitoring
        await tamperDetectionApi.stopMonitoring(installationId)
        toast({
          title: "Monitoring Stopped",
          description: `Tamper detection monitoring for installation #${installationId} has been stopped.`,
        })
      } else {
        // Start monitoring
        await tamperDetectionApi.startMonitoring(installationId)
        toast({
          title: "Monitoring Started",
          description: `Tamper detection monitoring for installation #${installationId} has been activated.`,
        })
      }

      // Update status
      setMonitoringStatus(prev => ({
        ...prev,
        [installationId]: !currentStatus
      }))

    } catch (error) {
      console.error(`Error toggling monitoring for installation ${installationId}:`, error)
      toast({
        title: "Error",
        description: `Failed to ${monitoringStatus[installationId] ? 'stop' : 'start'} monitoring`,
        variant: "destructive",
      })
    }
  }

  const runDiagnostics = async (installationId) => {
    try {
      await tamperDetectionApi.runDiagnostics(installationId)
      toast({
        title: "Diagnostics Completed",
        description: `Diagnostic tests for installation #${installationId} have been completed successfully.`,
      })
    } catch (error) {
      console.error(`Error running diagnostics for installation ${installationId}:`, error)
      toast({
        title: "Error",
        description: "Failed to run diagnostics",
        variant: "destructive",
      })
    }
  }

  const handleSimulate = async () => {
    if (!selectedInstallation) return

    try {
      let result

      switch (simulationType) {
        case "PHYSICAL_MOVEMENT":
          result = await tamperDetectionApi.simulateMovement(
            selectedInstallation.id,
            simulationValue * 10, // Scale to appropriate range
            JSON.stringify({ source: "admin_simulation" })
          )
          break

        case "VOLTAGE_FLUCTUATION":
          result = await tamperDetectionApi.simulateVoltageFluctuation(
            selectedInstallation.id,
            100 + (simulationValue * 100), // Scale to voltage range (100-200V)
            JSON.stringify({ source: "admin_simulation" })
          )
          break

        case "CONNECTION_INTERRUPTION":
          result = await tamperDetectionApi.simulateConnectionInterruption(
            selectedInstallation.id,
            simulationValue < 0.5, // Below 0.5 means disconnected
            JSON.stringify({ source: "admin_simulation" })
          )
          break

        case "LOCATION_CHANGE":
          const originalLocation = selectedInstallation.location || "Unknown"
          const newLocation = "Simulated New Location"

          result = await tamperDetectionApi.simulateLocationChange(
            selectedInstallation.id,
            newLocation,
            originalLocation,
            JSON.stringify({ source: "admin_simulation" })
          )
          break

        default:
          // Generic tamper event
          result = await tamperDetectionApi.simulateTampering(
            selectedInstallation.id,
            simulationType,
            simulationValue,
            "Admin simulated tamper event",
            JSON.stringify({ source: "admin_simulation" })
          )
      }

      toast({
        title: "Simulation Completed",
        description: `${simulationType.replace('_', ' ')} simulation for installation #${selectedInstallation.id} completed.`,
      })

      // Add the result to our tamper events list
      if (result) {
        setTamperEvents(prev => [result, ...prev])
      }

      setSimulateDialogOpen(false)

    } catch (error) {
      console.error(`Error simulating ${simulationType} for installation ${selectedInstallation.id}:`, error)
      toast({
        title: "Error",
        description: `Failed to simulate ${simulationType.toLowerCase().replace('_', ' ')}`,
        variant: "destructive",
      })
    }
  }

  const updateSensitivity = async () => {
    if (!selectedInstallation) return

    try {
      // Update each sensitivity type
      for (const [eventType, threshold] of Object.entries(sensitivitySettings)) {
        await tamperDetectionApi.adjustSensitivity(
          selectedInstallation.id,
          eventType,
          threshold
        )
      }

      toast({
        title: "Sensitivity Updated",
        description: `Tamper detection sensitivity for installation #${selectedInstallation.id} has been updated.`,
      })

      setSensitivityDialogOpen(false)

    } catch (error) {
      console.error(`Error updating sensitivity for installation ${selectedInstallation.id}:`, error)
      toast({
        title: "Error",
        description: "Failed to update sensitivity settings",
        variant: "destructive",
      })
    }
  }

  const getSeverityBadge = (severity) => {
    switch (severity.toUpperCase()) {
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

  const getStatusBadge = (status) => {
    switch (status.toUpperCase()) {
      case 'OPEN':
        return <Badge variant="destructive">Open</Badge>
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

  const getEventTypeIcon = (eventType) => {
    switch (eventType) {
      case 'PHYSICAL_MOVEMENT':
        return <ShieldAlert className="h-4 w-4 text-red-500" />
      case 'VOLTAGE_FLUCTUATION':
        return <AlertCircle className="h-4 w-4 text-amber-500" />
      case 'CONNECTION_INTERRUPTION':
        return <X className="h-4 w-4 text-red-500" />
      case 'LOCATION_CHANGE':
        return <Eye className="h-4 w-4 text-blue-500" />
      default:
        return <Bell className="h-4 w-4 text-gray-500" />
    }
  }

  // Acknowledge tamper event
  const acknowledgeEvent = async (eventId) => {
    try {
      await securityApi.acknowledgeEvent(eventId);

      // Update the event status in our list
      setTamperEvents(prev => prev.map(event =>
        event.id === eventId ? { ...event, acknowledged: true } : event
      ));

      toast({
        title: "Event Acknowledged",
        description: "The tamper event has been acknowledged.",
      });
    } catch (error) {
      console.error(`Error acknowledging event ${eventId}:`, error);
      toast({
        title: "Error",
        description: "Failed to acknowledge event. Please try again.",
        variant: "destructive",
      });
    }
  }

  // Update event status
  const updateEvent = async (eventId, status) => {
    try {
      await securityApi.updateEventStatus(eventId, status);

      // Update the event in our list
      setTamperEvents(prev => prev.map(event =>
        event.id === eventId ? { ...event, status } : event
      ));

      toast({
        title: "Status Updated",
        description: `Event status changed to ${status.toLowerCase()}.`,
      });
    } catch (error) {
      console.error(`Error updating event ${eventId} status:`, error);
      toast({
        title: "Error",
        description: "Failed to update event status. Please try again.",
        variant: "destructive",
      });
    }
  }

  // Resolve tamper event
  const resolveEvent = async (eventId, resolutionDetails) => {
    try {
      await securityApi.resolveEvent(eventId, resolutionDetails);

      // Remove the resolved event from our list or update its status
      setTamperEvents(prev => prev.filter(event => event.id !== eventId));

      toast({
        title: "Event Resolved",
        description: "The tamper event has been successfully resolved.",
      });
    } catch (error) {
      console.error(`Error resolving event ${eventId}:`, error);
      toast({
        title: "Error",
        description: "Failed to resolve event. Please try again.",
        variant: "destructive",
      });
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
            <BreadcrumbPage>Security Monitoring</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Security Monitoring</h1>
          <p className="text-muted-foreground">
            Monitor and manage tamper detection for installations
          </p>
        </div>
      </div>

      <Tabs defaultValue="installations" className="space-y-4">
        <TabsList>
          <TabsTrigger value="installations">Installations</TabsTrigger>
          <TabsTrigger value="events">Tamper Events</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="installations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Monitored Installations</CardTitle>
              <CardDescription>
                Manage tamper detection monitoring for solar installations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="py-10 text-center">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
                  <p className="mt-2 text-sm text-muted-foreground">Loading installations...</p>
                </div>
              ) : (
                <div>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[100px]">ID</TableHead>
                          <TableHead>Installation</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead>Monitoring Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {installations.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center">
                              No installations found
                            </TableCell>
                          </TableRow>
                        ) : (
                          installations.map((installation) => (
                            <TableRow key={installation.id}>
                              <TableCell className="font-medium">{installation.id}</TableCell>
                              <TableCell>
                                {installation.name || `Installation #${installation.id}`}
                              </TableCell>
                              <TableCell>
                                {installation.username || installation.customerName || "N/A"}
                              </TableCell>
                              <TableCell>
                                {installation.location || "N/A"}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center space-x-2">
                                  <Switch
                                    checked={monitoringStatus[installation.id] || false}
                                    onCheckedChange={() => toggleMonitoring(installation.id)}
                                  />
                                  <span>
                                    {monitoringStatus[installation.id] ? "Active" : "Inactive"}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedInstallation(installation)
                                      setSimulateDialogOpen(true)
                                    }}
                                  >
                                    Simulate
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedInstallation(installation)
                                      setSensitivityDialogOpen(true)
                                    }}
                                  >
                                    Adjust Sensitivity
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => runDiagnostics(installation.id)}
                                  >
                                    Run Diagnostics
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Tamper Events</CardTitle>
              <CardDescription>
                Overview of recent tamper detection events
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="py-10 text-center">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
                  <p className="mt-2 text-sm text-muted-foreground">Loading events...</p>
                </div>
              ) : tamperEvents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="rounded-full bg-muted w-12 h-12 flex items-center justify-center mb-4">
                    <CheckCircle className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium mb-1">No Tamper Events</h3>
                  <p className="text-sm text-muted-foreground text-center max-w-md">
                    No tamper events have been detected. All systems secure.
                  </p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[180px]">Time</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Installation</TableHead>
                        <TableHead>Severity</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tamperEvents.slice(0, 5).map((event) => (
                        <TableRow key={event.id}>
                          <TableCell>
                            {event.timestamp ? (
                              format(new Date(event.timestamp), "PPp")
                            ) : (
                              "Unknown"
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              {getEventTypeIcon(event.eventType)}
                              <span className="ml-2">
                                {event.eventType?.replace("_", " ") || "Unknown"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {installations.find(i => i.id === event.installationId)?.name || `Installation #${event.installationId}`}
                          </TableCell>
                          <TableCell>{getSeverityBadge(event.severity)}</TableCell>
                          <TableCell>{getStatusBadge(event.status)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={event.status === "RESOLVED" || event.status === "FALSE_ALARM"}
                                onClick={() => acknowledgeEvent(event.id)}
                              >
                                Acknowledge
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={event.status === "RESOLVED" || event.status === "FALSE_ALARM"}
                                onClick={() => updateEvent(event.id, "RESOLVED")}
                              >
                                Mark Resolved
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={event.status === "RESOLVED" || event.status === "FALSE_ALARM"}
                                onClick={() => updateEvent(event.id, "FALSE_ALARM")}
                              >
                                False Alarm
                              </Button>
                            </div>
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

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>
                Configure global security and tamper detection settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-8">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Notification Preferences</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Configure how and when security alerts are sent to administrators and customers.
                  </p>
                  <div className="grid gap-6 sm:grid-cols-2">
                    <div className="flex items-center justify-between space-x-2">
                      <Label htmlFor="email-alerts" className="flex flex-col space-y-1">
                        <span>Email Alerts</span>
                        <span className="font-normal text-xs text-muted-foreground">
                          Send email notifications for all security events to administrators
                        </span>
                      </Label>
                      <Switch
                        id="email-alerts"
                        defaultChecked
                        onCheckedChange={(checked) => {
                          toast({
                            title: "Settings Updated",
                            description: `Email alerts ${checked ? "enabled" : "disabled"} successfully.`
                          });
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between space-x-2">
                      <Label htmlFor="sms-alerts" className="flex flex-col space-y-1">
                        <span>SMS Alerts</span>
                        <span className="font-normal text-xs text-muted-foreground">
                          Send SMS notifications for high-severity events requiring immediate attention
                        </span>
                      </Label>
                      <Switch
                        id="sms-alerts"
                        defaultChecked
                        onCheckedChange={(checked) => {
                          toast({
                            title: "Settings Updated",
                            description: `SMS alerts ${checked ? "enabled" : "disabled"} successfully.`
                          });
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between space-x-2">
                      <Label htmlFor="dashboard-alerts" className="flex flex-col space-y-1">
                        <span>Dashboard Alerts</span>
                        <span className="font-normal text-xs text-muted-foreground">
                          Display security alerts as notifications in the admin dashboard header
                        </span>
                      </Label>
                      <Switch
                        id="dashboard-alerts"
                        defaultChecked
                        onCheckedChange={(checked) => {
                          toast({
                            title: "Settings Updated",
                            description: `Dashboard alerts ${checked ? "enabled" : "disabled"} successfully.`
                          });
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between space-x-2">
                      <Label htmlFor="customer-notifications" className="flex flex-col space-y-1">
                        <span>Customer Notifications</span>
                        <span className="font-normal text-xs text-muted-foreground">
                          Send alert notifications to customers when tampering is detected on their installation
                        </span>
                      </Label>
                      <Switch
                        id="customer-notifications"
                        onCheckedChange={(checked) => {
                          toast({
                            title: "Settings Updated",
                            description: `Customer notifications ${checked ? "enabled" : "disabled"} successfully.`
                          });
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Global Sensitivity Settings</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Set default sensitivity levels for all installations. These can be overridden for individual installations.
                  </p>
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="movement-sensitivity">Physical Movement Sensitivity</Label>
                        <span className="text-sm" id="movement-sensitivity-value">Medium (50%)</span>
                      </div>
                      <Slider
                        id="movement-sensitivity"
                        defaultValue={[0.5]}
                        max={1}
                        step={0.1}
                        className="w-full"
                        onValueChange={(value) => {
                          const percent = Math.round(value[0] * 100);
                          let level = "Low";
                          if (percent > 70) level = "High";
                          else if (percent > 30) level = "Medium";

                          document.getElementById("movement-sensitivity-value").innerText = `${level} (${percent}%)`;

                          toast({
                            title: "Setting Updated",
                            description: `Physical movement sensitivity set to ${level} (${percent}%)`
                          });
                        }}
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Fewer alerts, less sensitive</span>
                        <span>More alerts, more sensitive</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="voltage-sensitivity">Voltage Fluctuation Sensitivity</Label>
                        <span className="text-sm" id="voltage-sensitivity-value">Medium-High (70%)</span>
                      </div>
                      <Slider
                        id="voltage-sensitivity"
                        defaultValue={[0.7]}
                        max={1}
                        step={0.1}
                        className="w-full"
                        onValueChange={(value) => {
                          const percent = Math.round(value[0] * 100);
                          let level = "Low";
                          if (percent > 70) level = "High";
                          else if (percent > 30) level = "Medium";

                          document.getElementById("voltage-sensitivity-value").innerText = `${level} (${percent}%)`;

                          toast({
                            title: "Setting Updated",
                            description: `Voltage fluctuation sensitivity set to ${level} (${percent}%)`
                          });
                        }}
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Fewer alerts, less sensitive</span>
                        <span>More alerts, more sensitive</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="connection-sensitivity">Connection Interruption Sensitivity</Label>
                        <span className="text-sm" id="connection-sensitivity-value">High (80%)</span>
                      </div>
                      <Slider
                        id="connection-sensitivity"
                        defaultValue={[0.8]}
                        max={1}
                        step={0.1}
                        className="w-full"
                        onValueChange={(value) => {
                          const percent = Math.round(value[0] * 100);
                          let level = "Low";
                          if (percent > 70) level = "High";
                          else if (percent > 30) level = "Medium";

                          document.getElementById("connection-sensitivity-value").innerText = `${level} (${percent}%)`;

                          toast({
                            title: "Setting Updated",
                            description: `Connection interruption sensitivity set to ${level} (${percent}%)`
                          });
                        }}
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Fewer alerts, less sensitive</span>
                        <span>More alerts, more sensitive</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Automated Responses</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Configure automatic responses to security events. These actions will be taken without manual intervention.
                  </p>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between space-x-2">
                      <Label htmlFor="auto-suspend" className="flex flex-col space-y-1">
                        <span>Auto-Suspend for High Security Threats</span>
                        <span className="font-normal text-xs text-muted-foreground">
                          Automatically suspend service for confirmed high-severity security events to protect the installation
                        </span>
                      </Label>
                      <Switch
                        id="auto-suspend"
                        onCheckedChange={(checked) => {
                          toast({
                            title: "Settings Updated",
                            description: `Auto-suspend service for security threats ${checked ? "enabled" : "disabled"}.`,
                            variant: checked ? "default" : "warning"
                          });
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between space-x-2">
                      <Label htmlFor="auto-notify-authorities" className="flex flex-col space-y-1">
                        <span>Notify Authorities</span>
                        <span className="font-normal text-xs text-muted-foreground">
                          Automatically notify designated authorities for confirmed physical tampering events
                        </span>
                      </Label>
                      <Switch
                        id="auto-notify-authorities"
                        onCheckedChange={(checked) => {
                          toast({
                            title: "Settings Updated",
                            description: `Automatic authority notification ${checked ? "enabled" : "disabled"}.`,
                            variant: checked ? "default" : "warning"
                          });
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={() => {
                    toast({
                      title: "Settings Saved",
                      description: "All security settings have been saved successfully."
                    });
                  }}>
                    Save All Settings
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Simulate Dialog */}
      <Dialog open={simulateDialogOpen} onOpenChange={setSimulateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Simulate Tamper Event</DialogTitle>
            <DialogDescription>
              Simulate a tamper event for testing the detection system.
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
              <Label htmlFor="simulationType">Event Type</Label>
              <Select value={simulationType} onValueChange={setSimulationType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select event type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PHYSICAL_MOVEMENT">Physical Movement</SelectItem>
                  <SelectItem value="VOLTAGE_FLUCTUATION">Voltage Fluctuation</SelectItem>
                  <SelectItem value="CONNECTION_INTERRUPTION">Connection Interruption</SelectItem>
                  <SelectItem value="LOCATION_CHANGE">Location Change</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="simulationValue">
                {simulationType === "PHYSICAL_MOVEMENT" && "Movement Intensity"}
                {simulationType === "VOLTAGE_FLUCTUATION" && "Voltage Level"}
                {simulationType === "CONNECTION_INTERRUPTION" && "Connection Status"}
                {simulationType === "LOCATION_CHANGE" && "Location Change Magnitude"}
              </Label>
              <div className="py-4">
                <Slider
                  id="simulationValue"
                  min={0}
                  max={1}
                  step={0.01}
                  value={[simulationValue]}
                  onValueChange={(values) => setSimulationValue(values[0])}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>
                  {simulationType === "CONNECTION_INTERRUPTION" ? "Disconnected" : "Low"}
                </span>
                <span>
                  {simulationType === "CONNECTION_INTERRUPTION" ? "Connected" : "High"}
                </span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSimulateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSimulate}>
              Simulate Event
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sensitivity Dialog */}
      <Dialog open={sensitivityDialogOpen} onOpenChange={setSensitivityDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Sensitivity</DialogTitle>
            <DialogDescription>
              Configure tamper detection sensitivity thresholds.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="sens-installation">Installation</Label>
              <Input
                id="sens-installation"
                value={selectedInstallation ? (selectedInstallation.name || `Installation #${selectedInstallation.id}`) : ""}
                readOnly
              />
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="movement-sensitivity">Physical Movement Sensitivity</Label>
                <div className="py-4">
                  <Slider
                    id="movement-sensitivity"
                    min={0}
                    max={1}
                    step={0.01}
                    value={[sensitivitySettings.PHYSICAL_MOVEMENT]}
                    onValueChange={(values) => setSensitivitySettings(prev => ({
                      ...prev,
                      PHYSICAL_MOVEMENT: values[0]
                    }))}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Low Sensitivity</span>
                  <span>High Sensitivity</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="voltage-sensitivity">Voltage Fluctuation Sensitivity</Label>
                <div className="py-4">
                  <Slider
                    id="voltage-sensitivity"
                    min={0}
                    max={1}
                    step={0.01}
                    value={[sensitivitySettings.VOLTAGE_FLUCTUATION]}
                    onValueChange={(values) => setSensitivitySettings(prev => ({
                      ...prev,
                      VOLTAGE_FLUCTUATION: values[0]
                    }))}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Low Sensitivity</span>
                  <span>High Sensitivity</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="connection-sensitivity">Connection Interruption Sensitivity</Label>
                <div className="py-4">
                  <Slider
                    id="connection-sensitivity"
                    min={0}
                    max={1}
                    step={0.01}
                    value={[sensitivitySettings.CONNECTION_INTERRUPTION]}
                    onValueChange={(values) => setSensitivitySettings(prev => ({
                      ...prev,
                      CONNECTION_INTERRUPTION: values[0]
                    }))}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Low Sensitivity</span>
                  <span>High Sensitivity</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location-sensitivity">Location Change Sensitivity</Label>
                <div className="py-4">
                  <Slider
                    id="location-sensitivity"
                    min={0}
                    max={1}
                    step={0.01}
                    value={[sensitivitySettings.LOCATION_CHANGE]}
                    onValueChange={(values) => setSensitivitySettings(prev => ({
                      ...prev,
                      LOCATION_CHANGE: values[0]
                    }))}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Low Sensitivity</span>
                  <span>High Sensitivity</span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSensitivityDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={updateSensitivity}>
              Save Settings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}