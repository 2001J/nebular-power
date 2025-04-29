"use client"

import { useState, useEffect } from "react"
import { AlertCircle, FileBarChart, FileCheck, ShieldAlert, RefreshCw, Loader2 } from "lucide-react"
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
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { toast } from "@/components/ui/use-toast"
import { tamperDetectionApi, installationApi } from "@/lib/api"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Installation } from "@/types/installation"

interface MonitoringStatusMap {
  [key: string]: boolean;
}

export default function SecurityPage() {
  const [installations, setInstallations] = useState<Installation[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedInstallation, setSelectedInstallation] = useState<Installation | null>(null)
  const [sensitivityDialogOpen, setSensitivityDialogOpen] = useState(false)
  const [sensitivitySettings, setSensitivitySettings] = useState({
    PHYSICAL_MOVEMENT: 0.5,
    VOLTAGE_FLUCTUATION: 0.5,
    CONNECTION_INTERRUPTION: 0.5,
    LOCATION_CHANGE: 0.5
  })
  const [monitoringStatus, setMonitoringStatus] = useState<MonitoringStatusMap>({})
  const [refreshing, setRefreshing] = useState(false)
  const router = useRouter()

  // Fetch installations and monitoring status
  const fetchData = async () => {
    try {
      setLoading(true)

      // Get all installations
      const installationsData = await installationApi.getAllInstallations()
      setInstallations(installationsData.content || [])

      // For each installation, check monitoring status
      const statuses: MonitoringStatusMap = {}
      for (const installation of installationsData.content || []) {
        try {
          const statusResponse = await tamperDetectionApi.getMonitoringStatus(installation.id)
          statuses[installation.id] = statusResponse && statusResponse.isMonitoring === true
        } catch (error) {
          console.error(`Error fetching monitoring status for installation ${installation.id}:`, error)
          
          // Try to get from localStorage as fallback
          const fallback = localStorage.getItem(`monitoring_${installation.id}`) === 'true'
          statuses[installation.id] = fallback
        }
      }
      setMonitoringStatus(statuses)
    } catch (error) {
      console.error("Error fetching security data:", error)
      toast({
        title: "Error",
        description: "Failed to load security monitoring data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // Load data on initial page load
  useEffect(() => {
    fetchData()
  }, [])

  const refreshData = () => {
    setRefreshing(true)
    fetchData()
  }

  const toggleMonitoring = async (installationId: string) => {
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

      // Also update localStorage
      localStorage.setItem(`monitoring_${installationId}`, (!currentStatus).toString())

    } catch (error) {
      console.error(`Error toggling monitoring for installation ${installationId}:`, error)
      toast({
        title: "Error",
        description: `Failed to ${monitoringStatus[installationId] ? 'stop' : 'start'} monitoring`,
        variant: "destructive",
      })
    }
  }

  const runDiagnostics = async (installationId: string) => {
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

  const updateSensitivity = async () => {
    if (!selectedInstallation) return

    try {
      // Make API calls to update sensitivity settings for each event type
      for (const eventType in sensitivitySettings) {
        await tamperDetectionApi.adjustSensitivity(
          selectedInstallation.id,
          eventType,
          sensitivitySettings[eventType as keyof typeof sensitivitySettings]
        )
      }

      toast({
        title: "Settings Updated",
        description: `Sensitivity settings for installation #${selectedInstallation.id} have been updated.`,
      })
    } catch (error) {
      console.error(`Error updating sensitivity settings:`, error)
      toast({
        title: "Error",
        description: "Failed to update sensitivity settings",
        variant: "destructive",
      })
    } finally {
      setSensitivityDialogOpen(false)
    }
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
            <BreadcrumbPage>Monitoring</BreadcrumbPage>
        </BreadcrumbList>
      </Breadcrumb>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Security Monitoring</h1>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={refreshData} 
          disabled={refreshing || loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="space-y-1">
              <CardTitle className="text-sm font-medium">Monitoring Status</CardTitle>
              <CardDescription>
                Active monitoring systems
              </CardDescription>
            </div>
            <ShieldAlert className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "Loading..." : 
                Object.values(monitoringStatus).filter(Boolean).length
              }
              <span className="text-sm text-muted-foreground ml-1">
                /{installations.length} installations
              </span>
            </div>
          </CardContent>
        </Card>

          <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="space-y-1">
              <CardTitle className="text-sm font-medium">Security Diagnostics</CardTitle>
              <CardDescription>
                Run system health checks
              </CardDescription>
            </div>
            <FileCheck className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Select disabled={loading} onValueChange={(value) => {
                const installation = installations.find(i => i.id === value)
                if (installation) runDiagnostics(installation.id)
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select installation" />
                </SelectTrigger>
                <SelectContent>
                  {installations.map(installation => (
                    <SelectItem key={installation.id} value={installation.id}>
                      {installation.name || `Installation #${installation.id}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" disabled={loading}>
                <FileBarChart className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 grid-cols-1">
        <Card>
          <CardHeader>
            <CardTitle>Installation Monitoring</CardTitle>
            <CardDescription>
              Configure and manage tamper detection monitoring for all solar installations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
              <div className="flex items-center justify-center py-6">
                <span className="text-muted-foreground">Loading installations...</span>
                </div>
              ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Installation</TableHead>
                          <TableHead>Location</TableHead>
                    <TableHead>Monitoring</TableHead>
                    <TableHead>Sensitivity</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                  {installations.map(installation => (
                            <TableRow key={installation.id}>
                      <TableCell className="font-medium">
                                {installation.name || `Installation #${installation.id}`}
                              </TableCell>
                      <TableCell>{installation.location || "N/A"}</TableCell>
                              <TableCell>
                                  <Switch
                                    checked={monitoringStatus[installation.id] || false}
                                    onCheckedChange={() => toggleMonitoring(installation.id)}
                                  />
                              </TableCell>
                      <TableCell>
                                  <Button
                          variant="ghost" 
                                    size="sm"
                                    onClick={() => {
                                      setSelectedInstallation(installation)
                                      setSensitivityDialogOpen(true)
                                    }}
                                  >
                          Configure
                                  </Button>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                            onClick={() => runDiagnostics(installation.id)}
                              >
                            Diagnostics
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                            onClick={() => router.push(`/admin/security/alerts?installation=${installation.id}`)}
                              >
                            View Alerts
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
              )}
            </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              variant="outline"
              disabled={loading || refreshing}
              onClick={refreshData}
            >
              {refreshing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Refreshing...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh
                </>
              )}
            </Button>
            <Button
              onClick={() => router.push('/admin/security/alerts')}
            >
              View All Alerts
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Sensitivity Dialog */}
      <Dialog open={sensitivityDialogOpen} onOpenChange={setSensitivityDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configure Sensitivity</DialogTitle>
            <DialogDescription>
              Adjust detection sensitivity for different types of tampering events.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">
                Selected Installation
              </Label>
              <div className="col-span-3">
                {selectedInstallation ? (
                  <span>{selectedInstallation.name || `Installation #${selectedInstallation.id}`}</span>
                ) : (
                  <span className="text-muted-foreground">No installation selected</span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="physical-movement" className="text-right">
                Physical Movement
              </Label>
              <div className="col-span-3 flex items-center gap-2">
                  <Slider
                  id="physical-movement"
                  value={[sensitivitySettings.PHYSICAL_MOVEMENT]}
                    min={0}
                    max={1}
                    step={0.01}
                  onValueChange={([value]) => setSensitivitySettings(prev => ({
                      ...prev,
                    PHYSICAL_MOVEMENT: value
                    }))}
                  />
                <span className="w-12 text-center">{Math.round(sensitivitySettings.PHYSICAL_MOVEMENT * 100)}%</span>
                </div>
              </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="voltage-fluctuation" className="text-right">
                Voltage Fluctuation
              </Label>
              <div className="col-span-3 flex items-center gap-2">
                  <Slider
                  id="voltage-fluctuation"
                  value={[sensitivitySettings.VOLTAGE_FLUCTUATION]}
                    min={0}
                    max={1}
                    step={0.01}
                  onValueChange={([value]) => setSensitivitySettings(prev => ({
                      ...prev,
                    VOLTAGE_FLUCTUATION: value
                    }))}
                  />
                <span className="w-12 text-center">{Math.round(sensitivitySettings.VOLTAGE_FLUCTUATION * 100)}%</span>
                </div>
              </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="connection-interruption" className="text-right">
                Connection Interruption
              </Label>
              <div className="col-span-3 flex items-center gap-2">
                  <Slider
                  id="connection-interruption"
                  value={[sensitivitySettings.CONNECTION_INTERRUPTION]}
                    min={0}
                    max={1}
                    step={0.01}
                  onValueChange={([value]) => setSensitivitySettings(prev => ({
                      ...prev,
                    CONNECTION_INTERRUPTION: value
                    }))}
                  />
                <span className="w-12 text-center">{Math.round(sensitivitySettings.CONNECTION_INTERRUPTION * 100)}%</span>
                </div>
              </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="location-change" className="text-right">
                Location Change
              </Label>
              <div className="col-span-3 flex items-center gap-2">
                  <Slider
                  id="location-change"
                  value={[sensitivitySettings.LOCATION_CHANGE]}
                    min={0}
                    max={1}
                    step={0.01}
                  onValueChange={([value]) => setSensitivitySettings(prev => ({
                      ...prev,
                    LOCATION_CHANGE: value
                    }))}
                  />
                <span className="w-12 text-center">{Math.round(sensitivitySettings.LOCATION_CHANGE * 100)}%</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSensitivityDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={updateSensitivity}>Save Settings</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}