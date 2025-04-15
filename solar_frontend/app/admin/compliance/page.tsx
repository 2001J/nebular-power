"use client"

import { useEffect, useState } from "react"
import {
  BarChart,
  CheckCircle2,
  Clock,
  Download,
  FileBarChart,
  FileCheck,
  FileClock,
  Filter,
  RefreshCw,
  Search,
  ShieldCheck,
  AlertCircle
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { DatePickerWithRange } from "@/components/ui/date-range-picker"
import { toast } from "@/components/ui/use-toast"
import { format, subDays } from "date-fns"
import { complianceApi } from "@/lib/api"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"

export default function CompliancePage() {
  const [activeTab, setActiveTab] = useState("security")
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 30),
    to: new Date(),
  })
  const [isLoading, setIsLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [reportType, setReportType] = useState("monthly")

  // Data states
  const [securityData, setSecurityData] = useState([])
  const [paymentData, setPaymentData] = useState({
    totalPaymentsDue: 0,
    paidOnTime: 0,
    paidLate: 0,
    unpaid: 0,
    complianceRate: 0,
    details: []
  })
  const [installationData, setInstallationData] = useState([])
  const [activityLogs, setActivityLogs] = useState([])

  // Load data when component mounts or date range changes
  useEffect(() => {
    fetchReportData()
  }, [dateRange, activeTab])

  const fetchReportData = async () => {
    setIsLoading(true)

    try {
      const startDate = dateRange.from?.toISOString()
      const endDate = dateRange.to?.toISOString()

      // Use the comprehensive report method that delegates to specialized APIs
      const reportData = await complianceApi.getComprehensiveReport(activeTab, startDate, endDate)

      switch (activeTab) {
        case "security":
          // Ensure securityData is always an array
          if (Array.isArray(reportData)) {
            setSecurityData(reportData)
          } else if (reportData && reportData.content && Array.isArray(reportData.content)) {
            // Handle paginated response
            setSecurityData(reportData.content)
          } else {
            console.error("Expected array for security data, got:", reportData)
            setSecurityData([])
            toast({
              title: "Data Format Error",
              description: "Security data format is incorrect. Please contact support.",
              variant: "destructive"
            })
          }
          break
        case "payment":
          setPaymentData(reportData || {
            totalPaymentsDue: 0,
            paidOnTime: 0,
            paidLate: 0,
            unpaid: 0,
            complianceRate: 0,
            details: []
          })
          break
        case "installation":
          // Ensure installationData is always an array
          if (Array.isArray(reportData)) {
            setInstallationData(reportData)
          } else if (reportData && reportData.content && Array.isArray(reportData.content)) {
            // Handle paginated response
            setInstallationData(reportData.content)
          } else {
            console.error("Expected array for installation data, got:", reportData)
            setInstallationData([])
          }
          break
        case "activity":
          // Ensure we always set an array for activity logs
          if (Array.isArray(reportData)) {
            setActivityLogs(reportData)
          } else if (reportData && reportData.content && Array.isArray(reportData.content)) {
            // Handle paginated response
            setActivityLogs(reportData.content)
          } else {
            console.error("Expected array for activity logs, got:", reportData)
            setActivityLogs([])
            toast({
              title: "Data Format Error",
              description: "Activity logs data format is incorrect. Please contact support.",
              variant: "destructive"
            })
          }
          break
      }
    } catch (error) {
      console.error("Error fetching compliance data:", error)
      toast({
        title: "Error",
        description: "Failed to fetch compliance data. Please try again.",
        variant: "destructive"
      })

      // Reset the data for the current tab on error
      switch (activeTab) {
        case "security":
          setSecurityData([])
          break
        case "payment":
          setPaymentData({
            totalPaymentsDue: 0,
            paidOnTime: 0,
            paidLate: 0,
            unpaid: 0,
            complianceRate: 0,
            details: []
          })
          break
        case "installation":
          setInstallationData([])
          break
        case "activity":
          setActivityLogs([])
          break
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleGenerateReport = async () => {
    setIsLoading(true)

    try {
      const startDate = dateRange.from?.toISOString()
      const endDate = dateRange.to?.toISOString()

      const result = await complianceApi.generateComplianceReport(
        activeTab,
        "pdf",
        startDate,
        endDate
      )

      if (result) {
        toast({
          title: "Report Generated",
          description: `The ${activeTab} report has been generated successfully.`
        })
      } else {
        throw new Error("Failed to generate report")
      }
    } catch (error) {
      console.error("Error generating report:", error)
      toast({
        title: "Error",
        description: "Failed to generate report. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
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
          <BreadcrumbPage>Compliance Analytics</BreadcrumbPage>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Compliance Analytics</h1>
          <p className="text-muted-foreground">
            View consolidated compliance reports across security, payment, and installations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleGenerateReport} disabled={isLoading}>
            <FileBarChart className="mr-2 h-4 w-4" />
            Generate Report
          </Button>
          <Button size="sm" onClick={fetchReportData} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh Data
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 mb-4">
        <div className="flex-1">
          <DatePickerWithRange
            date={dateRange}
            setDate={(newDateRange) => {
              setDateRange(newDateRange);
              // Avoid API calls for incomplete date ranges
              if (newDateRange.from && newDateRange.to) {
                fetchReportData();
              }
            }}
          />
        </div>
        <div className="w-[180px]">
          <Select value={reportType} onValueChange={setReportType}>
            <SelectTrigger>
              <SelectValue placeholder="Report Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily Report</SelectItem>
              <SelectItem value="weekly">Weekly Report</SelectItem>
              <SelectItem value="monthly">Monthly Report</SelectItem>
              <SelectItem value="quarterly">Quarterly Report</SelectItem>
              <SelectItem value="annual">Annual Report</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="security" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="w-full">
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="security" className="flex-1">Security Compliance</TabsTrigger>
            <TabsTrigger value="payment" className="flex-1">Payment Compliance</TabsTrigger>
            <TabsTrigger value="installation" className="flex-1">Installation Compliance</TabsTrigger>
            <TabsTrigger value="activity" className="flex-1">Activity Log</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="security" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Monitoring Coverage
                </CardTitle>
                <ShieldCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoading ? "..." : "100%"}
                </div>
                <p className="text-xs text-muted-foreground">
                  All active installations monitored
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Active Events
                </CardTitle>
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoading ? "..." : securityData.length}
                </div>
                <p className="text-xs text-muted-foreground">
                  {securityData.length === 0 ? "No unresolved events" : "Unresolved security events"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Installations
                </CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoading ? "..." : installationData.length || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Total installations
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Security Compliance Report</CardTitle>
              <CardDescription>
                Summary of security compliance across all installations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-hidden">
                <Table className="table-fixed border-collapse">
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-[120px] whitespace-nowrap">Installation ID</TableHead>
                      <TableHead className="w-[140px] whitespace-nowrap">Event Type</TableHead>
                      <TableHead className="w-[140px] whitespace-nowrap">Detection Time</TableHead>
                      <TableHead className="w-[120px] whitespace-nowrap">Severity</TableHead>
                      <TableHead className="w-[100px] whitespace-nowrap">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                          <div className="flex items-center justify-center">
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Loading security data...
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : securityData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                          <div className="flex flex-col items-center justify-center py-4">
                            <ShieldCheck className="h-8 w-8 text-muted-foreground mb-2" />
                            <p className="text-sm text-muted-foreground">
                              No security events found in the selected period
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      securityData.slice(0, 5).map((event, i) => (
                        <TableRow key={event.id || i}>
                          <TableCell className="font-medium">{event.installationId || "Unknown"}</TableCell>
                          <TableCell>{event.eventType || "Unknown"}</TableCell>
                          <TableCell>
                            {event.detectionTime ?
                              format(new Date(event.detectionTime), "MMM dd, yyyy") :
                              "Unknown"
                            }
                          </TableCell>
                          <TableCell>
                            <Badge variant={
                              event.severity === "HIGH" || event.severity === "CRITICAL" ?
                                "destructive" :
                                event.severity === "MEDIUM" ?
                                  "warning" :
                                  "success"
                            }>
                              {event.severity || "Unknown"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={
                              event.status === "RESOLVED" ?
                                "success" :
                                "warning"
                            }>
                              {event.status || "Unknown"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
            <CardFooter className="border-t px-6 py-4">
              <Button variant="outline" className="ml-auto" disabled={isLoading || securityData.length === 0}>
                <Download className="mr-2 h-4 w-4" />
                Export Report
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="payment" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Payment Compliance
                </CardTitle>
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoading ? "..." : `${paymentData.complianceRate || 0}%`}
                </div>
                <p className="text-xs text-muted-foreground">
                  On-time payment rate
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Overdue Payments
                </CardTitle>
                <FileCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoading ? "..." : paymentData.unpaid || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  {paymentData.unpaid === 1 ? "Payment in grace period" : "Payments overdue"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  On-Time Payments
                </CardTitle>
                <FileClock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoading ? "..." : paymentData.paidOnTime || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Payments received on time
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Payment Compliance Report</CardTitle>
              <CardDescription>
                Summary of payment compliance across all payment plans
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-hidden">
                <Table className="table-fixed border-collapse">
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-[120px] whitespace-nowrap">Customer ID</TableHead>
                      <TableHead className="w-[140px] whitespace-nowrap">Payment Plan ID</TableHead>
                      <TableHead className="w-[160px] whitespace-nowrap">Last Payment Date</TableHead>
                      <TableHead className="w-[100px] whitespace-nowrap">Amount</TableHead>
                      <TableHead className="w-[100px] whitespace-nowrap">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                          <div className="flex items-center justify-center">
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Loading payment data...
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : !paymentData.details || paymentData.details.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                          <div className="flex flex-col items-center justify-center py-4">
                            <FileCheck className="h-8 w-8 text-muted-foreground mb-2" />
                            <p className="text-sm text-muted-foreground">
                              No payment data found in the selected period
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      paymentData.details.slice(0, 5).map((payment, i) => (
                        <TableRow key={payment.id || i}>
                          <TableCell className="font-medium">{payment.customerId || "Unknown"}</TableCell>
                          <TableCell>{payment.paymentPlanId || "Unknown"}</TableCell>
                          <TableCell>
                            {payment.lastPaymentDate ?
                              format(new Date(payment.lastPaymentDate), "MMM dd, yyyy") :
                              "No payment yet"
                            }
                          </TableCell>
                          <TableCell>${payment.amount ? payment.amount.toFixed(2) : "0.00"}</TableCell>
                          <TableCell>
                            <Badge variant={
                              payment.status === "PAID" ?
                                "success" :
                                payment.status === "PARTIAL" ?
                                  "warning" :
                                  "destructive"
                            }>
                              {payment.status || "Unknown"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
            <CardFooter className="border-t px-6 py-4">
              <Button variant="outline" className="ml-auto" disabled={isLoading || !paymentData.details || paymentData.details.length === 0}>
                <Download className="mr-2 h-4 w-4" />
                Export Report
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="installation" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Installations
                </CardTitle>
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoading ? "..." : installationData.length || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Total installations
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Operational
                </CardTitle>
                <FileCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoading ? "..." : installationData.filter(inst => inst.status === "OPERATIONAL").length || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Fully operational systems
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Compliance
                </CardTitle>
                <BarChart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoading ? "..." : installationData.length ?
                    `${Math.round((installationData.filter(inst => inst.status === "OPERATIONAL").length / installationData.length) * 100)}%` :
                    "0%"
                  }
                </div>
                <p className="text-xs text-muted-foreground">
                  All systems operational
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Installation Compliance Report</CardTitle>
              <CardDescription>
                Summary of installation compliance across all systems
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-hidden">
                <Table className="table-fixed border-collapse">
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-[120px] whitespace-nowrap">Installation ID</TableHead>
                      <TableHead className="w-[120px] whitespace-nowrap">Customer ID</TableHead>
                      <TableHead className="w-[160px] whitespace-nowrap">Last Service Date</TableHead>
                      <TableHead className="w-[120px] whitespace-nowrap">Status</TableHead>
                      <TableHead className="w-[120px] whitespace-nowrap">Issues Count</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                          <div className="flex items-center justify-center">
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Loading installation data...
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : installationData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                          <div className="flex flex-col items-center justify-center py-4">
                            <CheckCircle2 className="h-8 w-8 text-muted-foreground mb-2" />
                            <p className="text-sm text-muted-foreground">
                              No installation data found
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      installationData.slice(0, 5).map((installation, i) => (
                        <TableRow key={installation.id || i}>
                          <TableCell className="font-medium">{installation.id || i + 1}</TableCell>
                          <TableCell>{installation.userId || installation.customerId || "Unknown"}</TableCell>
                          <TableCell>
                            {installation.lastServiceDate ?
                              format(new Date(installation.lastServiceDate), "MMM dd, yyyy") :
                              "Not serviced yet"
                            }
                          </TableCell>
                          <TableCell>
                            <Badge variant={
                              installation.status === "OPERATIONAL" ?
                                "success" :
                                installation.status === "MAINTENANCE" ?
                                  "warning" :
                                  "destructive"
                            }>
                              {installation.status || "Unknown"}
                            </Badge>
                          </TableCell>
                          <TableCell>{installation.issuesCount || 0}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
            <CardFooter className="border-t px-6 py-4">
              <Button variant="outline" className="ml-auto" disabled={isLoading || installationData.length === 0}>
                <Download className="mr-2 h-4 w-4" />
                Export Report
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Compliance Activity Log</CardTitle>
                  <CardDescription>
                    All compliance-related activities across security and installations
                  </CardDescription>
                </div>
                <div className="w-[300px]">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Search activities..."
                      className="pl-8"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-hidden">
                <Table className="table-fixed border-collapse">
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-[180px] whitespace-nowrap">Timestamp</TableHead>
                      <TableHead className="w-[150px] whitespace-nowrap">Activity Type</TableHead>
                      <TableHead className="w-[300px] whitespace-nowrap">Description</TableHead>
                      <TableHead className="w-[100px] whitespace-nowrap">User</TableHead>
                      <TableHead className="w-[120px] whitespace-nowrap">Installation ID</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                          <div className="flex items-center justify-center">
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Loading activity logs...
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : activityLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                          <div className="flex flex-col items-center justify-center py-4">
                            <Search className="h-8 w-8 text-muted-foreground mb-2" />
                            <p className="text-sm text-muted-foreground">
                              No activity logs found for the selected period
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      // Filter logs by search term if present
                      Array.isArray(activityLogs) ? activityLogs
                        .filter(log =>
                          !searchTerm ||
                          (log.description && log.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          (log.activityType && log.activityType.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          (log.username && log.username.toLowerCase().includes(searchTerm.toLowerCase()))
                        )
                        .slice(0, 10)
                        .map((log, i) => (
                          <TableRow key={log.id || i}>
                            <TableCell>
                              {log.timestamp ?
                                format(new Date(log.timestamp), "MMM dd, yyyy HH:mm") :
                                "Unknown"
                              }
                            </TableCell>
                            <TableCell>
                              {log.activityType || "UNKNOWN"}
                            </TableCell>
                            <TableCell className="max-w-[300px] truncate">
                              {log.description || "No description available"}
                            </TableCell>
                            <TableCell>
                              {log.username || log.user || "system"}
                            </TableCell>
                            <TableCell>
                              {log.installationId || "N/A"}
                            </TableCell>
                          </TableRow>
                        )) : (
                        <TableRow>
                          <TableCell colSpan={5} className="h-24 text-center">
                            <div className="flex flex-col items-center justify-center py-4">
                              <AlertCircle className="h-8 w-8 text-destructive mb-2" />
                              <p className="text-sm text-muted-foreground">
                                Error loading activity logs data
                              </p>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
            <CardFooter className="border-t px-6 py-4">
              <div className="flex w-full justify-between">
                <Button variant="outline" disabled={isLoading || activityLogs.length === 0}>
                  <Filter className="mr-2 h-4 w-4" />
                  Filter Logs
                </Button>
                <Button variant="outline" disabled={isLoading || activityLogs.length === 0}>
                  <Download className="mr-2 h-4 w-4" />
                  Export Logs
                </Button>
              </div>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}