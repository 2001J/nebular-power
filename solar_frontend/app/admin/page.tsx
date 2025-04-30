"use client"

import type React from "react"

import { useState, useEffect } from "react"
import {
  ArrowUp,
  DollarSign,
  ShieldAlert,
  Sun,
  Users,
  Download,
  Filter,
  CheckCircle,
  XCircle,
  ArrowDown,
  BarChart3,
  Settings,
  RefreshCw,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/components/auth-provider"
import { Chart, ChartContainer } from "@/components/ui/chart"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Pie,
  PieChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/components/ui/use-toast"
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
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { useRouter } from "next/navigation"
import { customerApi, installationApi, paymentApi, securityApi, energyApi, serviceApi } from "@/lib/api"

export default function AdminDashboardPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const [selectedPeriod, setSelectedPeriod] = useState("week")
  const [loading, setLoading] = useState(true)

  // State to store API data
  const [installations, setInstallations] = useState([])
  const [customers, setCustomers] = useState([])
  const [securityAlerts, setSecurityAlerts] = useState([])
  const [payments, setPayments] = useState([])
  const [systemOverview, setSystemOverview] = useState(null)
  const [energyData, setEnergyData] = useState([])
  const [systemHealth, setSystemHealth] = useState(null)
  const [weatherImpactData, setWeatherImpactData] = useState(null)

  // State for search and filters
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  // Load initial data
  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user || user.role !== "ADMIN") return

      setLoading(true)

      try {
        // Fetch customers data
        try {
          console.log("Fetching customers data");
          const customersResponse = await customerApi.getAllCustomers();
          if (customersResponse?.content) {
            setCustomers(customersResponse.content);
          } else if (Array.isArray(customersResponse)) {
            setCustomers(customersResponse);
          } else {
            console.error("Invalid customers data format");
            setCustomers([]);
          }
        } catch (error) {
          console.error("Error fetching customers:", error);
          setCustomers([]);
          toast({
            title: "Error loading customers",
            description: "Failed to load customer data",
            variant: "destructive",
          });
        }

        // Fetch installations - Make sure we always get all installations
        try {
          console.log("Fetching all installations data");
          let installationsData = [];

          // First, try to get installations from getAllInstallations API
          try {
            const installationsResponse = await installationApi.getAllInstallations();
            if (installationsResponse?.content && Array.isArray(installationsResponse.content)) {
              installationsData = installationsResponse.content;
            } else if (Array.isArray(installationsResponse)) {
              installationsData = installationsResponse;
            }
          } catch (installError) {
            console.error("Error fetching installations directly:", installError);
          }

          // If we still don't have installations, try via system overview
          if (installationsData.length === 0) {
            try {
              const overview = await energyApi.getSystemOverview();
              setSystemOverview(overview);
              if (overview?.installations && Array.isArray(overview.installations)) {
                installationsData = overview.installations;
              }
            } catch (overviewError) {
              console.error("Error fetching system overview:", overviewError);
              setSystemOverview(null);
            }
          } else {
            // Get system overview separately for other stats if we already have installations
            try {
              const overview = await energyApi.getSystemOverview();
              setSystemOverview(overview);
            } catch (overviewError) {
              console.error("Error fetching system overview:", overviewError);
              setSystemOverview(null);
            }
          }

          // Set the installations regardless of where they came from
          console.log("Setting installations:", installationsData);
          setInstallations(installationsData);
        } catch (error) {
          console.error("Error in installations fetch flow:", error);
          setInstallations([]);
          toast({
            title: "Error loading installations",
            description: "Failed to load installation data",
            variant: "destructive",
          });
        }

        // Fetch energy data
        try {
          console.log("Fetching energy data");
          // Use existing API methods instead of the non-existent getSystemEnergyData
          // Find the first active installation to get data from
          const activeInstallation = installations.find(i => i.status === 'ACTIVE' || i.status === 'Active')?.id;
          
          if (activeInstallation) {
            const readings = await energyApi.getRecentReadings(activeInstallation, 30);
            
            // Transform readings data to match expected chart format
            const transformedData = [];
            
            if (Array.isArray(readings) && readings.length > 0) {
              // Group by day for weekly view
              const groupedByDay = {};
              readings.forEach(reading => {
                const date = new Date(reading.timestamp);
                const day = date.toLocaleDateString('en-US', { weekday: 'short' });
                
                if (!groupedByDay[day]) {
                  groupedByDay[day] = {
                    readings: [],
                    total: 0,
                    count: 0
                  };
                }
                
                groupedByDay[day].readings.push(reading);
                if (reading.powerGenerationWatts) {
                  groupedByDay[day].total += reading.powerGenerationWatts;
                  groupedByDay[day].count++;
                }
              });
              
              // Convert to chart data format
              Object.keys(groupedByDay).forEach(day => {
                const avgReading = groupedByDay[day].count > 0 ? 
                  groupedByDay[day].total / groupedByDay[day].count / 1000 : 0; // Convert to kWh
                
                transformedData.push({
                  name: day,
                  residential: Math.round(avgReading * 0.6), // Estimate residential portion
                  commercial: Math.round(avgReading * 0.3), // Estimate commercial portion
                  industrial: Math.round(avgReading * 0.1), // Estimate industrial portion
                  revenue: Math.round(avgReading * 0.15) // Estimate revenue
                });
              });
            }
            
            setEnergyData(transformedData.length > 0 ? transformedData : []);
          } else {
            setEnergyData([]);
          }
        } catch (error) {
          console.error("Error fetching energy data:", error);
          setEnergyData([]);
        }

        // Fetch weather impact data
        try {
          console.log("Fetching weather impact data");
          // Instead of using the non-existent getWeatherImpact function,
          // we'll calculate weather impact from recent readings if possible
          
          // If we have system overview data, we can use it for mock weather impact
          if (systemOverview) {
            const mockWeatherData = {
              sunnyDayImpact: 25,
              cloudyDayImpact: -18,
              optimalTemperatureRange: "70-75°F"
            };
            setWeatherImpactData(mockWeatherData);
          } else {
            setWeatherImpactData(null);
          }
        } catch (error) {
          console.error("Error calculating weather impact data:", error);
          setWeatherImpactData(null);
        }

        // Fetch security alerts
        try {
          console.log("Fetching security alerts");
          const alertsResponse = await securityApi.getTamperEvents();
          if (Array.isArray(alertsResponse)) {
            setSecurityAlerts(alertsResponse);
          } else if (alertsResponse?.content && Array.isArray(alertsResponse.content)) {
            setSecurityAlerts(alertsResponse.content);
          } else {
            console.error("Invalid security alerts format");
            setSecurityAlerts([]);
          }
        } catch (error) {
          console.error("Error fetching security alerts:", error);
          setSecurityAlerts([]);
        }

        // Fetch payments data
        try {
          console.log("Fetching payment data");
          const paymentsResponse = await paymentApi.getAdminPayments();
          
          // Handle different response formats - the function can return either an object with graphData
          // or it could return an array of payment records
          if (paymentsResponse && typeof paymentsResponse === 'object') {
            // This is the new format with graphData
            setPayments(paymentsResponse);
            console.log("Received payments data with graph data structure");
          } else if (Array.isArray(paymentsResponse)) {
            // Handle the legacy array format by transforming it to the expected format
            console.log("Received array payments data, transforming to expected format");
            setPayments({
              content: paymentsResponse,
              totalPages: 1,
              totalElements: paymentsResponse.length,
              size: paymentsResponse.length,
              number: 0,
              summary: { 
                totalRevenue: paymentsResponse.reduce((sum, p) => sum + (p.amount || 0), 0),
                expectedRevenue: 0,
                collectionRate: 0
              },
              graphData: { timeRange: 'week', data: [] }
            });
          } else {
            console.error("Invalid payments data format");
            // Create an empty object with the expected structure
            setPayments({
              content: [],
              totalPages: 0,
              totalElements: 0,
              size: 0,
              number: 0,
              summary: { totalRevenue: 0, expectedRevenue: 0, collectionRate: 0 },
              graphData: { timeRange: 'week', data: [] }
            });
          }
        } catch (error) {
          console.error("Error fetching payments:", error);
          // Create an empty object with the expected structure
          setPayments({
            content: [],
            totalPages: 0,
            totalElements: 0,
            size: 0,
            number: 0,
            summary: { totalRevenue: 0, expectedRevenue: 0, collectionRate: 0 },
            graphData: { timeRange: 'week', data: [] }
          });
        }

        // Fetch system health data
        try {
          console.log("Fetching system health data");
          const healthData = await serviceApi.getSystemHealth();
          console.log("System health data received:", healthData);
          setSystemHealth(healthData);
        } catch (error) {
          console.error("Error fetching system health:", error);
          setSystemHealth(null);
        }

      } catch (generalError) {
        console.error("General error loading dashboard data:", generalError);
        toast({
          title: "Error loading dashboard",
          description: "Failed to load dashboard data. Please try again later.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, [user, toast, selectedPeriod])

  // Handle customer search
  const handleSearch = (e) => {
    setSearchTerm(e.target.value)
  }

  // Filter customers based on search term and status
  const filteredCustomers = customers.filter((customer) => {
    const matchesSearch =
      customer.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || customer.status === statusFilter
    return matchesSearch && matchesStatus
  });

  // Navigate to customer details
  const navigateToCustomerDetails = (customerId) => {
    router.push(`/admin/customers/${customerId}`)
  }

  if (!user || user.role !== "ADMIN") return null

  // Get list of actual security alerts, without mock fallback
  const displaySecurityAlerts = securityAlerts;

  // Format system health data from the system overview
  const systemHealthData = systemOverview?.systemHealth 
    ? systemOverview.systemHealth 
    : [];

  // Calculate overdue payments data
  let overduePayments = [];
  let overduePaymentRanges = {};
  
  // Check if payments has content array (new structure) or is an array itself (old structure)
  if (payments && payments.content && Array.isArray(payments.content)) {
    // New structure - use content array
    overduePayments = payments.content.filter(payment => 
      payment.status === 'OVERDUE' || payment.status === 'overdue'
    );
  } else if (Array.isArray(payments)) {
    // Old structure - use payments directly
    overduePayments = payments.filter(payment => 
      payment.status === 'OVERDUE' || payment.status === 'overdue'
    );
  }
  
  // Process the filtered overdue payments
  overduePaymentRanges = overduePayments.reduce((acc, payment) => {
    const daysOverdue = payment.daysOverdue || 0;
    if (daysOverdue < 30) {
      acc["0-30 days"] = (acc["0-30 days"] || 0) + 1;
    } else if (daysOverdue < 60) {
      acc["30-60 days"] = (acc["30-60 days"] || 0) + 1;
    } else if (daysOverdue < 90) {
      acc["60-90 days"] = (acc["60-90 days"] || 0) + 1;
    } else {
      acc[">90 days"] = (acc[">90 days"] || 0) + 1;
    }
    return acc;
  }, {});

  const overduePaymentsData = [
    { name: "0-30 days", value: overduePaymentRanges["0-30 days"] || 0, color: "#3b82f6" },
    { name: "30-60 days", value: overduePaymentRanges["30-60 days"] || 0, color: "#f59e0b" },
    { name: "60-90 days", value: overduePaymentRanges["60-90 days"] || 0, color: "#f97316" },
    { name: ">90 days", value: overduePaymentRanges[">90 days"] || 0, color: "#ef4444" },
  ].filter(item => item.value > 0);

  // Calculate total energy production from all installations
  const calculateTotalEnergyProduction = () => {
    // First priority: use the todayTotalGenerationKWh from systemOverview
    if (systemOverview?.todayTotalGenerationKWh !== undefined) {
      return formatEnergyValue(systemOverview.todayTotalGenerationKWh);
    }
    
    // If no todayTotalGenerationKWh but we have totalEnergyProduction, use that as fallback
    if (systemOverview?.totalEnergyProduction) {
      return `${parseFloat(systemOverview.totalEnergyProduction).toFixed(1)} MWh`;
    }
    
    // If system overview doesn't have total energy, calculate from installations data
    let totalEnergy = 0;
    
    // Check if we have any installations with today's data
    if (installations && installations.length > 0) {
      installations.forEach(installation => {
        if (installation.todayGenerationKWh !== undefined) {
          totalEnergy += parseFloat(installation.todayGenerationKWh) || 0;
        }
      });
      
      if (totalEnergy > 0) {
        return formatEnergyValue(totalEnergy);
      }
    }
    
    // Default fallback
    return "0.0 kWh"; // Show zero instead of "No data"
  };
  
  // Format energy value with appropriate unit
  const formatEnergyValue = (value) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(2)} GWh`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(2)} MWh`;
    } else {
      return `${value.toFixed(2)} kWh`;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <Breadcrumb className="mb-2">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/admin">Admin</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Dashboard</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {user.name}! Here's an overview of the system.</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <div className="h-8 w-8 flex items-center justify-center rounded-full bg-blue-100">
              <Users className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customers.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Energy Production</CardTitle>
            <div className="h-8 w-8 flex items-center justify-center rounded-full bg-amber-100">
              <Sun className="h-4 w-4 text-amber-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {calculateTotalEnergyProduction()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Installations</CardTitle>
            <div className="h-8 w-8 flex items-center justify-center rounded-full bg-green-100">
              <BarChart3 className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{installations.length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row justify-between items-center">
            <div className="flex flex-col items-start">
              <CardTitle className="text-left">Recent Customers</CardTitle>
              <CardDescription className="text-left">Recently added customers and their status</CardDescription>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => router.push('/admin/customers/create')}>Add Customer</Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Joined</TableHead>
                    <TableHead className="hidden lg:table-cell">Email</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8">
                        <div className="flex justify-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : Array.isArray(customers) && customers.length > 0 ? (
                    customers.slice(0, 5).map((customer) => (
                      <TableRow key={customer.id} className="cursor-pointer" onClick={() => navigateToCustomerDetails(customer.id)}>
                        <TableCell className="font-medium">{customer.fullName || customer.email || "Unknown"}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              customer.status === "ACTIVE" || customer.status === "Active"
                                ? "default"
                                : customer.status === "PENDING_VERIFICATION" || customer.status === "Pending"
                                  ? "outline"
                                  : customer.status === "SUSPENDED" || customer.status === "Suspended"
                                    ? "destructive"
                                    : customer.status === "LOCKED" || customer.status === "Locked"
                                      ? "secondary"
                                      : "outline"
                            }
                          >
                            {customer.status === "ACTIVE" || customer.status === "Active"
                              ? "Active"
                              : customer.status === "PENDING_VERIFICATION" || customer.status === "Pending"
                                ? "Pending"
                                : customer.status === "SUSPENDED" || customer.status === "Suspended"
                                  ? "Suspended"
                                  : customer.status === "LOCKED" || customer.status === "Locked"
                                    ? "Locked"
                                    : customer.status || "Unknown"}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {customer.createdAt ? new Date(customer.createdAt).toLocaleDateString() :
                            customer.joinDate ? new Date(customer.joinDate).toLocaleDateString() : "N/A"}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-muted-foreground">
                          {customer.email || "N/A"}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8">
                        No customers found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="p-4 flex justify-center border-t">
              <Button variant="outline" size="sm" onClick={() => router.push("/admin/customers")}>
                View All Customers
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Security Alerts</CardTitle>
            <CardDescription>Recent security alerts across all systems</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : displaySecurityAlerts.length > 0 ? (
                displaySecurityAlerts.slice(0, 3).map((alert) => (
                  <div key={alert.id} className="flex items-start gap-4 rounded-lg border p-4">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${alert.type === "critical"
                        ? "bg-destructive/10 text-destructive"
                        : "bg-amber-500/10 text-amber-500"
                        }`}
                    >
                      <ShieldAlert className="h-5 w-5" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="font-medium">{alert.message}</p>
                      <p className="text-sm text-muted-foreground">{alert.location}</p>
                      <p className="text-sm text-muted-foreground">{alert.timestamp}</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => router.push(`/admin/security/alerts/${alert.id}`)}>
                      View
                    </Button>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No security alerts found
                </div>
              )}
              <div className="mt-4 flex justify-center">
                <Button variant="outline" size="sm" onClick={() => router.push("/admin/security/alerts")}>
                  View All Alerts
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Installations</CardTitle>
              <CardDescription>Overview of all solar installations in the system</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => router.push("/admin/installations")}>
              View All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : installations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      No installations found
                    </TableCell>
                  </TableRow>
                ) : (
                  installations.slice(0, 5).map((installation) => (
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
                        <Badge variant={
                          installation.status === "ACTIVE" || installation.status === "Active" || installation.status === "OPERATIONAL"
                            ? "default"
                            : installation.status === "PENDING" || installation.status === "Pending"
                              ? "outline"
                              : installation.status === "MAINTENANCE"
                                ? "warning"
                                : installation.status === "OFFLINE" || installation.status === "Inactive"
                                  ? "destructive"
                                  : "secondary"
                        }>
                          {installation.status || "Unknown"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/admin/installations/${installation.id}`)}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>System Health</CardTitle>
            <CardDescription>Current status of system components</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : !systemHealth ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Settings className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No System Health Data Available</h3>
                <p className="text-sm text-muted-foreground max-w-md mt-2">
                  System health metrics are not available at this time.
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-4"
                  onClick={async () => {
                    try {
                      setLoading(true);
                      const healthData = await serviceApi.getSystemHealth();
                      console.log("Refreshed system health data:", healthData);
                      setSystemHealth(healthData);
                    } catch (error) {
                      console.error("Error refreshing system health:", error);
                      toast({
                        title: "Error",
                        description: "Failed to refresh system health data",
                        variant: "destructive",
                      });
                    } finally {
                      setLoading(false);
                    }
                  }}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Data
                </Button>
              </div>
            ) : systemHealth.systemHealth && systemHealth.systemHealth.length > 0 ? (
              <div className="space-y-6">
                {systemHealth.systemHealth.map((item, index) => (
                  <div key={item.name || index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{item.name}</span>
                      <span className="text-sm font-medium">{item.value}%</span>
                    </div>
                    <Progress
                      value={item.value}
                      className="h-2"
                      style={
                        {
                          backgroundColor: "var(--muted)",
                          "--progress-color": item.color,
                        } as React.CSSProperties
                      }
                    />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Target: {item.target}%</span>
                      <span className={item.value >= item.target ? "text-green-500" : "text-amber-500"}>
                        {item.value >= item.target ? (
                          <CheckCircle className="inline h-3 w-3 mr-1" />
                        ) : (
                          <XCircle className="inline h-3 w-3 mr-1" />
                        )}
                        {item.value >= item.target ? "Meeting target" : "Below target"}
                      </span>
                    </div>
                  </div>
                ))}
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-4"
                  onClick={async () => {
                    try {
                      setLoading(true);
                      const healthData = await serviceApi.getSystemHealth();
                      console.log("Refreshed system health data:", healthData);
                      setSystemHealth(healthData);
                    } catch (error) {
                      console.error("Error refreshing system health:", error);
                      toast({
                        title: "Error",
                        description: "Failed to refresh system health data",
                        variant: "destructive",
                      });
                    } finally {
                      setLoading(false);
                    }
                  }}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Data
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Settings className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">System Health Data Format Error</h3>
                <p className="text-sm text-muted-foreground max-w-md mt-2">
                  The system health data was received but in an unexpected format.
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-4"
                  onClick={async () => {
                    try {
                      setLoading(true);
                      const healthData = await serviceApi.getSystemHealth();
                      console.log("Refreshed system health data:", healthData);
                      setSystemHealth(healthData);
                    } catch (error) {
                      console.error("Error refreshing system health:", error);
                      toast({
                        title: "Error",
                        description: "Failed to refresh system health data",
                        variant: "destructive",
                      });
                    } finally {
                      setLoading(false);
                    }
                  }}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Data
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

