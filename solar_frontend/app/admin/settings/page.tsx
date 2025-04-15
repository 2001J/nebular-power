"use client"

import { useState, useEffect } from "react"
import {
  Settings,
  Save,
  User,
  Building,
  Mail,
  Bell,
  Lock,
  Cloud,
  Database,
  Layers,
  AlertCircle,
  Gauge,
  Server,
  Clock
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { settingsApi } from "@/lib/api"

export default function SettingsPage() {
  const { toast } = useToast()

  // General settings state
  const [companyName, setCompanyName] = useState("SolarComply, Inc.")
  const [adminEmail, setAdminEmail] = useState("admin@solarcomply.com")
  const [supportEmail, setSupportEmail] = useState("support@solarcomply.com")
  const [timeZone, setTimeZone] = useState("UTC-8 (Pacific Time)")
  const [dateFormat, setDateFormat] = useState("MM/DD/YYYY")

  // Notification settings
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [alertNotifications, setAlertNotifications] = useState(true)
  const [weeklyReports, setWeeklyReports] = useState(true)
  const [maintenanceAlerts, setMaintenanceAlerts] = useState(true)

  // Security settings
  const [twoFactorAuth, setTwoFactorAuth] = useState(false)
  const [sessionTimeout, setSessionTimeout] = useState("30")
  const [passwordExpiry, setPasswordExpiry] = useState("90")
  const [ipRestriction, setIpRestriction] = useState(false)

  // API settings
  const [apiRateLimit, setApiRateLimit] = useState("1000")
  const [apiLogging, setApiLogging] = useState(true)
  const [apiVersioning, setApiVersioning] = useState(true)

  // Storage settings
  const [dataRetention, setDataRetention] = useState("365")
  const [backupFrequency, setBackupFrequency] = useState("daily")
  const [autoArchive, setAutoArchive] = useState(true)

  // System health settings
  const [monitoringInterval, setMonitoringInterval] = useState("5")
  const [alertThreshold, setAlertThreshold] = useState("85")
  const [autoPauseThreshold, setAutoPauseThreshold] = useState("95")

  // Add loading state
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Add demo mode state
  const [demoMode, setDemoMode] = useState(false)

  // Fetch settings on component mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setIsLoading(true)
        const settings = await settingsApi.getSystemSettings()

        // Check if we're in demo mode (no real backend)
        if (settings && settings.message === "Settings updated successfully (demo mode)") {
          setDemoMode(true)
        }

        // Update state with fetched settings
        if (settings) {
          // Update general settings
          if (settings.general) {
            setCompanyName(settings.general.companyName || companyName)
            setAdminEmail(settings.general.adminEmail || adminEmail)
            setSupportEmail(settings.general.supportEmail || supportEmail)
            setTimeZone(settings.general.timeZone || timeZone)
            setDateFormat(settings.general.dateFormat || dateFormat)
          }

          // Add other settings categories here
        }
      } catch (error) {
        console.error("Error fetching settings:", error)
        setDemoMode(true)
        toast({
          title: "Demo Mode",
          description: "Using default settings values for demonstration.",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchSettings()
  }, [])

  // Handle settings save
  const handleSaveSettings = async () => {
    // Prevent saving while loading
    if (isLoading || isSaving) {
      return;
    }

    try {
      setIsSaving(true)

      // Prepare settings object
      const settings = {
        general: {
          companyName,
          adminEmail,
          supportEmail,
          timeZone,
          dateFormat
        },
        notifications: {
          emailNotifications,
          alertNotifications,
          weeklyReports,
          maintenanceAlerts
        },
        security: {
          twoFactorAuth,
          sessionTimeout,
          passwordExpiry,
          ipRestriction
        }
        // Add other settings categories
      }

      const response = await settingsApi.updateSystemSettings(settings)

      // Check if we're in demo mode
      if (response && response.message === "Settings updated successfully (demo mode)") {
        setDemoMode(true)
        toast({
          title: "Demo Mode",
          description: "Settings saved in demonstration mode.",
        })
      } else {
        toast({
          title: "Settings saved",
          description: "Your changes have been successfully saved.",
        })
      }
    } catch (error) {
      console.error("Error saving settings:", error)
      setDemoMode(true)
      toast({
        title: "Demo Mode",
        description: "Settings saved in demonstration mode.",
      })
    } finally {
      setIsSaving(false)
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
                <BreadcrumbPage>Settings</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">System Settings</h1>
          <p className="text-muted-foreground">
            Configure and manage global system settings.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {demoMode && (
            <div className="bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-100 text-xs px-3 py-1 rounded-full mr-2 flex items-center">
              <AlertCircle className="h-3 w-3 mr-1" />
              Demo Mode
            </div>
          )}
          <Button onClick={handleSaveSettings} disabled={isLoading || isSaving}>
            {isSaving ? (
              <>
                <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-solid border-current border-r-transparent"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="general">
        <TabsList className="grid w-full grid-cols-3 md:grid-cols-6">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="api">API</TabsTrigger>
          <TabsTrigger value="storage">Storage</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>Basic configuration for your solar monitoring system</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {isLoading ? (
                <div className="py-10 text-center">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
                  <p className="mt-2 text-sm text-muted-foreground">Loading settings...</p>
                </div>
              ) : (
                <>
                  <div className="grid gap-3">
                    <Label htmlFor="companyName">Company Name</Label>
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4 text-muted-foreground" />
                      <Input
                        id="companyName"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid gap-3">
                    <Label htmlFor="adminEmail">Admin Email</Label>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <Input
                        id="adminEmail"
                        value={adminEmail}
                        onChange={(e) => setAdminEmail(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid gap-3">
                    <Label htmlFor="supportEmail">Support Email</Label>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <Input
                        id="supportEmail"
                        value={supportEmail}
                        onChange={(e) => setSupportEmail(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid gap-3">
                    <Label htmlFor="timeZone">Default Time Zone</Label>
                    <Select value={timeZone} onValueChange={setTimeZone}>
                      <SelectTrigger id="timeZone">
                        <SelectValue placeholder="Select time zone" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UTC-8 (Pacific Time)">UTC-8 (Pacific Time)</SelectItem>
                        <SelectItem value="UTC-7 (Mountain Time)">UTC-7 (Mountain Time)</SelectItem>
                        <SelectItem value="UTC-6 (Central Time)">UTC-6 (Central Time)</SelectItem>
                        <SelectItem value="UTC-5 (Eastern Time)">UTC-5 (Eastern Time)</SelectItem>
                        <SelectItem value="UTC+0 (GMT)">UTC+0 (GMT)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-3">
                    <Label htmlFor="dateFormat">Date Format</Label>
                    <Select value={dateFormat} onValueChange={setDateFormat}>
                      <SelectTrigger id="dateFormat">
                        <SelectValue placeholder="Select date format" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                        <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                        <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>Configure alerts and notification preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <Label htmlFor="emailNotifications" className="mb-1">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive system alerts via email</p>
                </div>
                <Switch
                  id="emailNotifications"
                  checked={emailNotifications}
                  onCheckedChange={setEmailNotifications}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <Label htmlFor="alertNotifications" className="mb-1">Critical Alerts</Label>
                  <p className="text-sm text-muted-foreground">Notify immediately on critical system events</p>
                </div>
                <Switch
                  id="alertNotifications"
                  checked={alertNotifications}
                  onCheckedChange={setAlertNotifications}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <Label htmlFor="weeklyReports" className="mb-1">Weekly Reports</Label>
                  <p className="text-sm text-muted-foreground">Send weekly performance reports</p>
                </div>
                <Switch
                  id="weeklyReports"
                  checked={weeklyReports}
                  onCheckedChange={setWeeklyReports}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <Label htmlFor="maintenanceAlerts" className="mb-1">Maintenance Alerts</Label>
                  <p className="text-sm text-muted-foreground">Notify about scheduled maintenance</p>
                </div>
                <Switch
                  id="maintenanceAlerts"
                  checked={maintenanceAlerts}
                  onCheckedChange={setMaintenanceAlerts}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>Configure security and access control settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <Label htmlFor="twoFactorAuth" className="mb-1">Two-Factor Authentication</Label>
                  <p className="text-sm text-muted-foreground">Require 2FA for all admin accounts</p>
                </div>
                <Switch
                  id="twoFactorAuth"
                  checked={twoFactorAuth}
                  onCheckedChange={setTwoFactorAuth}
                />
              </div>

              <div className="grid gap-3">
                <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <Input
                    id="sessionTimeout"
                    type="number"
                    value={sessionTimeout}
                    onChange={(e) => setSessionTimeout(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid gap-3">
                <Label htmlFor="passwordExpiry">Password Expiry (days)</Label>
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  <Input
                    id="passwordExpiry"
                    type="number"
                    value={passwordExpiry}
                    onChange={(e) => setPasswordExpiry(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <Label htmlFor="ipRestriction" className="mb-1">IP Address Restriction</Label>
                  <p className="text-sm text-muted-foreground">Limit admin access to approved IP addresses</p>
                </div>
                <Switch
                  id="ipRestriction"
                  checked={ipRestriction}
                  onCheckedChange={setIpRestriction}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>API Settings</CardTitle>
              <CardDescription>Configure API access and usage limits</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-3">
                <Label htmlFor="apiRateLimit">API Rate Limit (requests per hour)</Label>
                <div className="flex items-center gap-2">
                  <Gauge className="h-4 w-4 text-muted-foreground" />
                  <Input
                    id="apiRateLimit"
                    type="number"
                    value={apiRateLimit}
                    onChange={(e) => setApiRateLimit(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <Label htmlFor="apiLogging" className="mb-1">API Request Logging</Label>
                  <p className="text-sm text-muted-foreground">Log all API requests for monitoring</p>
                </div>
                <Switch
                  id="apiLogging"
                  checked={apiLogging}
                  onCheckedChange={setApiLogging}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <Label htmlFor="apiVersioning" className="mb-1">API Versioning</Label>
                  <p className="text-sm text-muted-foreground">Enable version control for API endpoints</p>
                </div>
                <Switch
                  id="apiVersioning"
                  checked={apiVersioning}
                  onCheckedChange={setApiVersioning}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="storage" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Storage Settings</CardTitle>
              <CardDescription>Configure data storage and retention policies</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-3">
                <Label htmlFor="dataRetention">Data Retention Period (days)</Label>
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-muted-foreground" />
                  <Input
                    id="dataRetention"
                    type="number"
                    value={dataRetention}
                    onChange={(e) => setDataRetention(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid gap-3">
                <Label htmlFor="backupFrequency">Backup Frequency</Label>
                <Select value={backupFrequency} onValueChange={setBackupFrequency}>
                  <SelectTrigger id="backupFrequency">
                    <SelectValue placeholder="Select backup frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hourly">Hourly</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <Label htmlFor="autoArchive" className="mb-1">Auto-Archive Old Data</Label>
                  <p className="text-sm text-muted-foreground">Automatically archive data older than retention period</p>
                </div>
                <Switch
                  id="autoArchive"
                  checked={autoArchive}
                  onCheckedChange={setAutoArchive}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>System Health Settings</CardTitle>
              <CardDescription>Configure system monitoring and health checks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-3">
                <Label htmlFor="monitoringInterval">Health Check Interval (minutes)</Label>
                <div className="flex items-center gap-2">
                  <Server className="h-4 w-4 text-muted-foreground" />
                  <Input
                    id="monitoringInterval"
                    type="number"
                    value={monitoringInterval}
                    onChange={(e) => setMonitoringInterval(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid gap-3">
                <Label htmlFor="alertThreshold">Alert Threshold (% CPU/Memory)</Label>
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                  <Input
                    id="alertThreshold"
                    type="number"
                    value={alertThreshold}
                    onChange={(e) => setAlertThreshold(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid gap-3">
                <Label htmlFor="autoPauseThreshold">Auto-Pause Threshold (% CPU/Memory)</Label>
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-muted-foreground" />
                  <Input
                    id="autoPauseThreshold"
                    type="number"
                    value={autoPauseThreshold}
                    onChange={(e) => setAutoPauseThreshold(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 