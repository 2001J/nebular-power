"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { format, subDays } from "date-fns"
import {
  ArrowLeft,
  Calendar,
  Download,
  FileText,
  Filter,
  RefreshCw,
  Search,
  XCircle,
  BarChart,
  PieChart,
  LineChart as LineChartIcon,
  Clock
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/use-toast"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { DatePickerWithRange } from "@/components/ui/date-range-picker"
import { paymentComplianceApi, paymentApi } from "@/lib/api"

export default function PaymentReportsPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("compliance")
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [reportData, setReportData] = useState<any>(null)

  // Date range for reports
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 30),
    to: new Date(),
  })

  // Fetch report data
  const fetchReportData = async (reportType: string) => {
    try {
      setLoading(true)

      let data
      // Format dates as ISO strings but only use the date part (YYYY-MM-DD)
      const startDate = dateRange.from 
        ? dateRange.from.toISOString().split('T')[0] 
        : undefined;
      const endDate = dateRange.to 
        ? dateRange.to.toISOString().split('T')[0]
        : undefined;

      console.log(`Fetching ${reportType} report with date range:`, { startDate, endDate });

      switch (reportType) {
        case "compliance":
        case "revenue":
        case "defaulters":
        case "collection":
        case "summary":
          // Use the updated paymentApi.getPaymentReports method instead of paymentComplianceApi.generatePaymentReport
          data = await paymentApi.getPaymentReports(
            reportType,
            startDate,
            endDate
          )
          break

        case "upcoming":
          data = await paymentComplianceApi.getUpcomingPaymentsReport(7)
          break

        case "overdue":
          data = await paymentComplianceApi.getOverduePaymentsReport()
          break

        case "due":
          data = await paymentComplianceApi.getPaymentsDueReport(startDate, endDate)
          break

        default:
          console.error("Unknown report type:", reportType)
          return
      }

      console.log(`Received ${reportType} report data:`, data)
      
      // Extract the actual report data if it's nested in a data property
      if (data && data.data) {
        setReportData(data.data)
      } else {
        setReportData(data)
      }
    } catch (error) {
      console.error(`Error fetching ${reportType} report:`, error)
      toast({
        title: "Error",
        description: `Failed to load ${reportType} report data.`,
        variant: "destructive",
      })

      // Set default mock data based on report type
      setMockReportData(reportType)
    } finally {
      setLoading(false)
    }
  }

  // Set mock data when API fails
  const setMockReportData = (reportType: string) => {
    let mockData

    // Log error
    console.log(`Using minimal placeholder data for ${reportType} report because API data is unavailable`)

    switch (reportType) {
      case "compliance":
        mockData = {
          reportType: "Payment Compliance Report",
          startDate: dateRange.from?.toISOString(),
          endDate: dateRange.to?.toISOString(),
          totalPaymentsDue: 0,
          paidOnTime: 0,
          paidLate: 0,
          unpaid: 0,
          complianceRate: 0,
          onTimePaymentRate: 0
        }
        toast({
          title: "API Data Unavailable",
          description: "Using placeholder data for compliance report. API data is currently unavailable.",
          variant: "warning",
        })
        break

      case "revenue":
        mockData = {
          reportType: "Revenue Report",
          startDate: dateRange.from?.toISOString(),
          endDate: dateRange.to?.toISOString(),
          totalRevenue: 0,
          expectedRevenue: 0,
          collectionRate: 0,
          numberOfPayments: 0
        }
        toast({
          title: "API Data Unavailable",
          description: "Using placeholder data for revenue report. API data is currently unavailable.",
          variant: "warning",
        })
        break

      case "upcoming":
      case "overdue":
        mockData = []
        toast({
          title: "No Payments Data",
          description: `No ${reportType} payments data available from the API.`,
          variant: "warning",
        })
        break

      default:
        mockData = { message: "No data available" }
        toast({
          title: "API Unavailable",
          description: "The report data could not be loaded from the server.",
          variant: "warning",
        })
    }

    setReportData(mockData)
  }

  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value)
    fetchReportData(value)
  }

  // Initial data load
  useEffect(() => {
    fetchReportData(activeTab)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Reload data when date range changes
  useEffect(() => {
    if (activeTab !== "upcoming" && activeTab !== "overdue") {
      fetchReportData(activeTab)
    }
  }, [dateRange]) // eslint-disable-line react-hooks/exhaustive-deps

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OVERDUE':
        return <Badge variant="destructive">Overdue</Badge>
      case 'PARTIALLY_PAID':
        return <Badge variant="warning">Partially Paid</Badge>
      case 'PENDING':
        return <Badge variant="outline">Pending</Badge>
      case 'PAID':
        return <Badge variant="success">Paid</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  // Render compliance report
  const renderComplianceReport = () => {
    if (!reportData) return null

    // Get metrics from the standardized format returned by our API
    const metrics = reportData.summary?.metrics || [];
    const complianceRate = metrics.find(m => m.name === 'Compliance Rate')?.value || '0%';
    const compliantCustomers = metrics.find(m => m.name === 'Compliant Customers')?.value || 0;
    const nonCompliantCustomers = metrics.find(m => m.name === 'Non-Compliant')?.value || 0;
    const overduePayments = metrics.find(m => m.name === 'Overdue Payments')?.value || 0;
    
    // Calculate on-time payment rate or use the original if available
    const onTimePaymentRate = reportData.onTimePaymentRate || 
      (reportData.totalPaymentsDue ? Math.round((reportData.paidOnTime / reportData.totalPaymentsDue) * 100) : 0);
    
    // Use either the new API format or fall back to the old format
    const totalPaymentsDue = reportData.totalPaymentsDue || 
      (typeof compliantCustomers === 'number' && typeof nonCompliantCustomers === 'number' 
        ? compliantCustomers + nonCompliantCustomers 
        : 0);
    
    const paidOnTime = reportData.paidOnTime || compliantCustomers || 0;
    const paidLate = reportData.paidLate || 0;
    const unpaid = reportData.unpaid || nonCompliantCustomers || 0;

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Payments Due</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalPaymentsDue}</div>
              <p className="text-xs text-muted-foreground">
                In selected time period
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Compliance Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{typeof complianceRate === 'string' ? complianceRate : `${complianceRate}%`}</div>
              <p className="text-xs text-muted-foreground">
                Payments made (on time or late)
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">On-Time Payment Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{onTimePaymentRate}%</div>
              <p className="text-xs text-muted-foreground">
                Payments made on or before due date
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Payment Status Breakdown</CardTitle>
            <CardDescription>
              Summary of payment statuses for the selected period
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex flex-col items-center justify-center p-4 bg-muted rounded-lg">
                <span className="text-4xl font-bold text-green-500">{paidOnTime}</span>
                <span className="mt-2 text-sm font-medium">Paid On Time</span>
              </div>
              <div className="flex flex-col items-center justify-center p-4 bg-muted rounded-lg">
                <span className="text-4xl font-bold text-yellow-500">{paidLate}</span>
                <span className="mt-2 text-sm font-medium">Paid Late</span>
              </div>
              <div className="flex flex-col items-center justify-center p-4 bg-muted rounded-lg">
                <span className="text-4xl font-bold text-red-500">{unpaid}</span>
                <span className="mt-2 text-sm font-medium">Unpaid</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Render revenue report
  const renderRevenueReport = () => {
    if (!reportData) return null

    // Get metrics from the standardized format returned by our API
    const metrics = reportData.summary?.metrics || [];
    const totalRevenue = metrics.find(m => m.name === 'Total Revenue')?.value || reportData.totalRevenue || 0;
    const expectedRevenue = metrics.find(m => m.name === 'Expected Revenue')?.value || reportData.expectedRevenue || 0;
    const collectionRate = metrics.find(m => m.name === 'Collection Rate')?.value || reportData.collectionRate || 0;
    const numberOfPayments = metrics.find(m => m.name === 'Number of Payments')?.value || reportData.numberOfPayments || 0;
    
    // Convert string currency values (e.g. "$1,000") to numbers if needed
    const parseToCurrency = (value: any): number => {
      if (typeof value === 'number') return value;
      if (typeof value === 'string') {
        // Remove currency symbol and commas, then parse
        return parseFloat(value.replace(/[$,]/g, '')) || 0;
      }
      return 0;
    };
    
    const totalRevenueNum = parseToCurrency(totalRevenue);
    const expectedRevenueNum = parseToCurrency(expectedRevenue);
    const collectionRateNum = typeof collectionRate === 'string' 
      ? parseFloat(collectionRate.replace(/%/g, '')) 
      : (collectionRate || 0);

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {typeof totalRevenue === 'string' ? totalRevenue : formatCurrency(totalRevenueNum)}
              </div>
              <p className="text-xs text-muted-foreground">
                Collected in selected period
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Expected Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {typeof expectedRevenue === 'string' ? expectedRevenue : formatCurrency(expectedRevenueNum)}
              </div>
              <p className="text-xs text-muted-foreground">
                Due in selected period
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Collection Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {typeof collectionRate === 'string' ? collectionRate : `${collectionRateNum}%`}
              </div>
              <p className="text-xs text-muted-foreground">
                {numberOfPayments} payments collected
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Revenue Collection</CardTitle>
            <CardDescription>
              Collection performance for the selected period
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] flex items-center justify-center">
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded-full bg-primary"></div>
                  <span className="text-sm">
                    Collected: {typeof totalRevenue === 'string' ? totalRevenue : formatCurrency(totalRevenueNum)}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <div className="h-4 w-4 rounded-full bg-destructive"></div>
                  <span className="text-sm">
                    Uncollected: {formatCurrency(expectedRevenueNum - totalRevenueNum)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Render payments table
  const renderPaymentsTable = (payments: any[]) => {
    if (!payments || payments.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center p-8 bg-muted/10 rounded-lg">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No Payments Found</h3>
          <p className="text-sm text-muted-foreground mt-2 text-center max-w-sm">
            There are no payments matching the current criteria. Try adjusting the date range or other filters.
          </p>
        </div>
      )
    }

    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">ID</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Status</TableHead>
              {activeTab === "overdue" && <TableHead>Days Overdue</TableHead>}
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((payment) => (
              <TableRow key={payment.id}>
                <TableCell className="font-medium">{payment.id}</TableCell>
                <TableCell>{payment.customerName}</TableCell>
                <TableCell>{formatCurrency(payment.amount)}</TableCell>
                <TableCell>
                  <div className="flex items-center">
                    <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span>{format(new Date(payment.dueDate), "PPP")}</span>
                  </div>
                </TableCell>
                <TableCell>{getStatusBadge(payment.status)}</TableCell>
                {activeTab === "overdue" && (
                  <TableCell>
                    <Badge variant="outline">{payment.daysPastDue} days</Badge>
                  </TableCell>
                )}
                <TableCell className="text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/admin/payments?paymentId=${payment.id}`)}
                  >
                    View Details
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Breadcrumb className="mb-4">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/admin">Admin</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Payment Analytics</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Payment Analytics</h1>
          <p className="text-muted-foreground">
            Track payment performance and analyze payment trends over time
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <DatePickerWithRange date={dateRange} setDate={setDateRange} />
          <Button
            onClick={() => fetchReportData(activeTab)}
            variant="outline"
            size="sm"
            className="h-10"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid grid-cols-4 md:w-[600px]">
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="overdue">Overdue</TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p className="text-sm text-muted-foreground">Loading report data...</p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {activeTab === "compliance" && renderComplianceReport()}
          {activeTab === "revenue" && renderRevenueReport()}
          {activeTab === "upcoming" && (
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Payments</CardTitle>
                <CardDescription>
                  Payments due in the next 7 days
                </CardDescription>
              </CardHeader>
              <CardContent>
                {renderPaymentsTable(reportData || [])}
              </CardContent>
            </Card>
          )}
          {activeTab === "overdue" && (
            <Card>
              <CardHeader>
                <CardTitle>Overdue Payments</CardTitle>
                <CardDescription>
                  Payments that are past their due date
                </CardDescription>
              </CardHeader>
              <CardContent>
                {renderPaymentsTable(reportData || [])}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}