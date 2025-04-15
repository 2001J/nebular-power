"use client"

import type React from "react"

import { useState, useEffect } from "react"
import {
  ArrowUp,
  DollarSign,
  ShieldAlert,
  Sun,
  Users,
  Calendar,
  Download,
  Filter,
  CheckCircle,
  XCircle,
  ArrowDown,
  BarChart3,
  Settings,
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
import { customerApi, installationApi, paymentApi, securityApi, energyApi } from "@/lib/api"

export default function AdminDashboardPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const [selectedPeriod, setSelectedPeriod] = useState("week")
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0])
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
              const overview = await installationApi.getSystemOverview();
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
              const overview = await installationApi.getSystemOverview();
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
          const energyResponse = await energyApi.getSystemEnergyData(selectedPeriod);
          if (Array.isArray(energyResponse)) {
            setEnergyData(energyResponse);
          } else {
            console.error("Invalid energy data format");
            setEnergyData([]);
          }
        } catch (error) {
          console.error("Error fetching energy data:", error);
          setEnergyData([]);
        }

        // Fetch weather impact data
        try {
          console.log("Fetching weather impact data");
          // Create a date range for the last 30 days
          const endDate = new Date().toISOString().split('T')[0];
          const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

          // If we have installations, use the first active one's ID, otherwise use a placeholder
          const installationId = installations.find(i => i.status === 'ACTIVE')?.id || 'system';

          const weatherData = await energyApi.getWeatherImpact(installationId, {
            start: startDate,
            end: endDate
          });

          if (weatherData) {
            console.log("Weather impact data received:", weatherData);
            setWeatherImpactData(weatherData);
          } else {
            console.log("No weather impact data available");
            setWeatherImpactData(null);
          }
        } catch (error) {
          console.error("Error fetching weather impact data:", error);
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
          if (Array.isArray(paymentsResponse)) {
            setPayments(paymentsResponse);
          } else {
            console.error("Invalid payments data format");
            setPayments([]);
          }
        } catch (error) {
          console.error("Error fetching payments:", error);
          setPayments([]);
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
  }, [user, toast, selectedPeriod]);

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
  const systemHealthData = systemOverview?.systemHealth ? systemOverview.systemHealth : [];

  // Filter installations to get upcoming ones
  const upcomingInstallations = installations.filter(installation => {
    // Check if it has a status of PENDING or Pending
    const isPending = installation.status === "PENDING" || installation.status === "Pending";

    // Check if installation date is in the future
    const hasValidDate = installation.installationDate && new Date(installation.installationDate) > new Date();

    return isPending && hasValidDate;
  });

  // Calculate overdue payments data
  const overduePayments = payments.filter(payment => payment.status === 'OVERDUE' || payment.status === 'overdue');
  const overduePaymentRanges = overduePayments.reduce((acc, payment) => {
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

        <div className="flex flex-wrap items-center gap-2 md:gap-4">
          <Select value={selectedDate} onValueChange={setSelectedDate}>
            <SelectTrigger className="w-[150px] md:w-[180px]">
              <SelectValue placeholder="Select date" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={new Date().toISOString().split("T")[0]}>Today</SelectItem>
              <SelectItem value={new Date(Date.now() - 86400000).toISOString().split("T")[0]}>Yesterday</SelectItem>
              <SelectItem value={new Date(Date.now() - 604800000).toISOString().split("T")[0]}>Last week</SelectItem>
              <SelectItem value={new Date(Date.now() - 2592000000).toISOString().split("T")[0]}>Last month</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
          </Button>

          <Button variant="outline" size="icon">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customers.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Energy Production</CardTitle>
            <Sun className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {systemOverview?.totalEnergyProduction
                ? `${parseFloat(systemOverview.totalEnergyProduction).toFixed(1)} MWh`
                : "No data"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {systemOverview?.monthlyRevenue
                ? `$${parseFloat(systemOverview.monthlyRevenue).toLocaleString()}`
                : "No data"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Security Alerts</CardTitle>
            <ShieldAlert className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{securityAlerts.length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
        <Card className="lg:col-span-7">
          <CardHeader>
            <CardTitle>System Overview</CardTitle>
            <CardDescription>Total energy production across all installations</CardDescription>
            <Tabs defaultValue="production" className="w-full">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <TabsList>
                  <TabsTrigger value="production">Production</TabsTrigger>
                  <TabsTrigger value="revenue">Revenue</TabsTrigger>
                </TabsList>
                <div className="flex items-center gap-2">
                  <Button
                    variant={selectedPeriod === "day" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedPeriod("day")}
                  >
                    Day
                  </Button>
                  <Button
                    variant={selectedPeriod === "week" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedPeriod("week")}
                  >
                    Week
                  </Button>
                  <Button
                    variant={selectedPeriod === "month" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedPeriod("month")}
                  >
                    Month
                  </Button>
                </div>
              </div>
              <TabsContent value="production" className="mt-4">
                {loading ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : energyData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <BarChart3 className="h-16 w-16 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium">No Production Data Available</h3>
                    <p className="text-sm text-muted-foreground max-w-md mt-2">
                      There is no energy production data available for the selected time range.
                    </p>
                  </div>
                ) : (
                  <Chart>
                    <ChartContainer>
                      <ResponsiveContainer width="100%" height={350}>
                        <BarChart
                          data={energyData}
                          margin={{ top: 10, right: 10, left: 10, bottom: 40 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="name" />
                          <YAxis tickFormatter={(value) => `${value} kWh`} />
                          <Tooltip formatter={(value) => [`${value} kWh`, ""]} />
                          <Legend wrapperStyle={{ bottom: 0, left: 25 }} />
                          {energyData[0]?.residential !== undefined && (
                            <Bar dataKey="residential" name="Residential" fill="#3b82f6" />
                          )}
                          {energyData[0]?.commercial !== undefined && (
                            <Bar dataKey="commercial" name="Commercial" fill="#10b981" />
                          )}
                          {energyData[0]?.industrial !== undefined && (
                            <Bar dataKey="industrial" name="Industrial" fill="#f59e0b" />
                          )}
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </Chart>
                )}
              </TabsContent>
              <TabsContent value="revenue" className="mt-4">
                {loading ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : energyData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <BarChart3 className="h-16 w-16 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium">No Revenue Data Available</h3>
                    <p className="text-sm text-muted-foreground max-w-md mt-2">
                      There is no revenue data available for the selected time range.
                    </p>
                  </div>
                ) : (
                  <Chart>
                    <ChartContainer>
                      <ResponsiveContainer width="100%" height={350}>
                        <AreaChart
                          data={energyData}
                          margin={{ top: 10, right: 10, left: 10, bottom: 40 }}
                        >
                          <defs>
                            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="name" />
                          <YAxis tickFormatter={(value) => `$${value}`} />
                          <Tooltip formatter={(value) => [`$${value}`, "Revenue"]} />
                          <Legend wrapperStyle={{ bottom: 0, left: 25 }} />
                          <Area
                            type="monotone"
                            dataKey="revenue"
                            stroke="#3b82f6"
                            fillOpacity={1}
                            fill="url(#colorRevenue)"
                            name="Revenue"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </Chart>
                )}
              </TabsContent>
            </Tabs>
          </CardHeader>
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
            <CardTitle>Weather Impact on Production</CardTitle>
            <CardDescription>How weather conditions affect system performance</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : !weatherImpactData ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Sun className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No Weather Impact Data Available</h3>
                <p className="text-sm text-muted-foreground max-w-md mt-2">
                  Weather impact data is not available at this time.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-lg border p-4 text-center">
                    <div className="text-sm text-muted-foreground">Sunny Days</div>
                    <div className="mt-1 text-2xl font-bold text-amber-500">
                      {weatherImpactData.sunnyDayImpact ? `${weatherImpactData.sunnyDayImpact > 0 ? '+' : ''}${weatherImpactData.sunnyDayImpact}%` : "+25%"}
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {weatherImpactData.sunnyDayImpact > 0 ? "Above" : "Below"} average production
                    </div>
                  </div>
                  <div className="rounded-lg border p-4 text-center">
                    <div className="text-sm text-muted-foreground">Cloudy Days</div>
                    <div className="mt-1 text-2xl font-bold text-muted-foreground">
                      {weatherImpactData.cloudyDayImpact ? `${weatherImpactData.cloudyDayImpact > 0 ? '+' : ''}${weatherImpactData.cloudyDayImpact}%` : "-18%"}
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {weatherImpactData.cloudyDayImpact > 0 ? "Above" : "Below"} average production
                    </div>
                  </div>
                </div>
                <div className="flex justify-center text-center space-y-1 py-3">
                  <div>
                    <div className="text-sm text-muted-foreground">Optimal Temperature Range</div>
                    <div className="text-xl font-bold text-green-500">
                      {weatherImpactData.optimalTemperatureRange || "70-75°F"}
                    </div>
                    <div className="text-xs text-muted-foreground">For maximum efficiency</div>
                  </div>
                </div>
                <div className="text-xs text-center text-muted-foreground mt-2">
                  Data based on system performance correlation with weather conditions over the last 30 days
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
            ) : systemHealthData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Settings className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No System Health Data Available</h3>
                <p className="text-sm text-muted-foreground max-w-md mt-2">
                  System health metrics are not available at this time.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {systemHealthData.map((item) => (
                  <div key={item.name} className="space-y-2">
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
              </div>
            )}
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

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Upcoming Installations</CardTitle>
          <CardDescription>Scheduled installations for the next 7 days</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : upcomingInstallations.length > 0 ? (
              upcomingInstallations.slice(0, 3).map((installation) => (
                <div key={installation.id} className="flex items-center gap-4 p-3 border rounded-md">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{installation.name || `Installation #${installation.id}`}</p>
                    <p className="text-sm text-muted-foreground">
                      {installation.installationDate ? new Date(installation.installationDate).toLocaleDateString() : 'N/A'} -
                      {installation.location || 'Location not specified'}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => router.push(`/admin/installations/${installation.id}`)}>
                    View Details
                  </Button>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {installations.length > 0 ?
                  "No pending installations scheduled for future dates" :
                  "No installations found in the system"
                }
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

