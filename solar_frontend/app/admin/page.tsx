"use client"

import type React from "react"

import { useState, useEffect } from "react"
import {
  ArrowUp,
  ShieldAlert,
  Sun,
  Users,
  CheckCircle,
  XCircle,
  BarChart3,
  Settings,
  RefreshCw,
  AlertTriangle,
  Zap,
  MapPin,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/components/auth-provider"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/components/ui/use-toast"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { useRouter } from "next/navigation"
import { customerApi, installationApi, paymentApi, securityApi } from "@/lib/api"
import type { PaginatedResponse } from "@/lib/api/client"
import { energyApi } from "@/lib/api/energy"
import { serviceApi } from "@/lib/api/service"

export default function AdminDashboardPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const [selectedPeriod, setSelectedPeriod] = useState("week")
  const [loading, setLoading] = useState(true)

  // State to store API data
  const [installations, setInstallations] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [securityAlerts, setSecurityAlerts] = useState<any[]>([])
  const [payments, setPayments] = useState<any>(null)
  const [systemOverview, setSystemOverview] = useState<any>(null)
  const [energyData, setEnergyData] = useState<Array<{ name: string; residential: number; commercial: number; industrial: number; revenue: number }>>([])
  const [systemHealth, setSystemHealth] = useState<any>(null)
  const [weatherImpactData, setWeatherImpactData] = useState<any>(null)

  // State for search and filters
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  // Load initial data
  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user || user.role !== "ADMIN") return

      setLoading(true)

      try {
        // Keep installations fetched in this run to avoid relying on stale state
        let fetchedInstallations: any[] = []
        // Fetch customers data
        try {
          console.log("Fetching customers data");
          const customersResponse: PaginatedResponse<any> = await customerApi.getAllCustomers();
          setCustomers(Array.isArray(customersResponse?.content) ? customersResponse.content : []);
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

          // First, try to get installations from getAllInstallations API
          try {
            const installationsResponse = await installationApi.getAllInstallations();
            if (installationsResponse?.content && Array.isArray(installationsResponse.content)) {
              fetchedInstallations = installationsResponse.content;
            } else if (Array.isArray(installationsResponse)) {
              fetchedInstallations = installationsResponse;
            }
          } catch (installError) {
            console.error("Error fetching installations directly:", installError);
          }

          // If we still don't have installations, try via system overview
          if (fetchedInstallations.length === 0) {
            try {
              const overview = await energyApi.getSystemOverview();
              setSystemOverview(overview);
              if (overview?.recentlyActiveInstallations && Array.isArray(overview.recentlyActiveInstallations)) {
                fetchedInstallations = overview.recentlyActiveInstallations.map((inst: any) => ({
                  id: inst.id?.toString() || String(inst.id),
                  name: inst.name || inst.address || `Installation ${inst.id}`,
                  location: inst.location || inst.address || '',
                  installedCapacityKW: inst.installedCapacityKW || inst.systemSize || 0,
                  status: inst.status || 'active',
                  type: inst.type || inst.installationType || 'RESIDENTIAL',
                  userId: inst.userId || inst.customerId || '',
                  installationDate: inst.installationDate || new Date().toISOString(),
                  tamperDetected: inst.tamperDetected || false,
                  lastTamperCheck: inst.lastTamperCheck || new Date().toISOString()
                }));
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
          console.log("Setting installations:", fetchedInstallations);
          setInstallations(fetchedInstallations);
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
          const activeInstallation = fetchedInstallations.find((i: any) => i?.status === 'ACTIVE' || i?.status === 'Active')?.id;
          
          if (activeInstallation) {
            const readings = await energyApi.getRecentReadings(String(activeInstallation), 30);
            
            // Transform readings data to match expected chart format
            const transformedData: Array<{ name: string; residential: number; commercial: number; industrial: number; revenue: number }> = [];
            
            if (Array.isArray(readings) && readings.length > 0) {
              // Group by day for weekly view
              const groupedByDay: Record<string, { readings: any[]; total: number; count: number }> = {};
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

        // Weather impact is derived from overview in a separate effect

        // Fetch security alerts
        try {
          console.log("Fetching security alerts");
          const alertsResponse: any = await securityApi.getTamperEvents();
          // Wrapper already normalizes to array; set directly
          setSecurityAlerts(Array.isArray(alertsResponse) ? alertsResponse : []);
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

  // Derive weather impact from system overview without refetching everything
  useEffect(() => {
    try {
      if (systemOverview) {
        const mockWeatherData = {
          sunnyDayImpact: 25,
          cloudyDayImpact: -18,
          optimalTemperatureRange: "70-75°F",
        };
        setWeatherImpactData(mockWeatherData);
      } else {
        setWeatherImpactData(null);
      }
    } catch (error) {
      console.error("Error calculating weather impact data:", error);
      setWeatherImpactData(null);
    }
  }, [systemOverview])

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
  let overduePayments: any[] = [];
  let overduePaymentRanges: Record<string, number> = {};
  
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
    <div className="space-y-8 animate-fade-in px-4 md:px-6 py-6">
      {/* Header Section */}
      <div className="flex flex-col gap-3">
        <Breadcrumb>
          <BreadcrumbList className="text-sm">
            <BreadcrumbItem>
              <BreadcrumbLink href="/admin" className="text-gray-500 dark:text-white/50 hover:text-gray-900 dark:hover:text-white/80 transition-colors">
                Admin
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="text-gray-300 dark:text-white/30" />
            <BreadcrumbItem>
              <BreadcrumbPage className="text-gray-900 dark:text-white/90 font-medium">Dashboard</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900 dark:text-white/90">Dashboard</h1>
          <p className="text-gray-600 dark:text-white/60 text-xs sm:text-sm">
            Welcome back, {user.name}. Here's what's happening with your system today.
          </p>
        </div>
      </div>

      {/* Stats Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <Card className="bg-white dark:bg-[#111318] border-gray-200 dark:border-white/10 rounded-2xl shadow-sm dark:shadow-none hover:shadow-md dark:hover:shadow-none transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between pb-3 pt-6 px-6">
            <div className="space-y-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-gray-500 dark:text-white/50">Total Customers</CardTitle>
              <div className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900 dark:text-white/90">{customers.length}</div>
            </div>
            <div className="h-10 w-10 sm:h-12 sm:w-12 flex items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-500/10">
              <Users className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 dark:text-blue-400" strokeWidth={2} />
            </div>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <div className="flex items-center text-xs text-gray-600 dark:text-white/60">
              <ArrowUp className="h-3 w-3 mr-1 text-emerald-600 dark:text-emerald-400" strokeWidth={2} />
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">12% </span>
              <span className="ml-1">from last month</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-[#111318] border-gray-200 dark:border-white/10 rounded-2xl shadow-sm dark:shadow-none hover:shadow-md dark:hover:shadow-none transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between pb-3 pt-6 px-6">
            <div className="space-y-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-gray-500 dark:text-white/50">Energy Today</CardTitle>
              <div className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900 dark:text-white/90">
                {calculateTotalEnergyProduction()}
              </div>
            </div>
            <div className="h-10 w-10 sm:h-12 sm:w-12 flex items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-500/10">
              <Sun className="h-5 w-5 sm:h-6 sm:w-6 text-amber-600 dark:text-amber-400" strokeWidth={2} />
            </div>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <div className="flex items-center text-xs text-gray-600 dark:text-white/60">
              <ArrowUp className="h-3 w-3 mr-1 text-emerald-600 dark:text-emerald-400" strokeWidth={2} />
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">8% </span>
              <span className="ml-1">from yesterday</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-[#111318] border-gray-200 dark:border-white/10 rounded-2xl shadow-sm dark:shadow-none hover:shadow-md dark:hover:shadow-none transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between pb-3 pt-6 px-6">
            <div className="space-y-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-gray-500 dark:text-white/50">Installations</CardTitle>
              <div className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900 dark:text-white/90">{installations.length}</div>
            </div>
            <div className="h-10 w-10 sm:h-12 sm:w-12 flex items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-500/10">
              <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-600 dark:text-emerald-400" strokeWidth={2} />
            </div>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <div className="flex items-center text-xs text-gray-600 dark:text-white/60">
              <span className="font-medium">
                {installations.filter(i => i?.status === 'ACTIVE' || i?.status === 'Active').length} active
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Customers Card */}
        <Card className="bg-white dark:bg-[#111318] border-gray-200 dark:border-white/10 rounded-2xl shadow-sm dark:shadow-none overflow-hidden">
          <CardHeader className="flex flex-row justify-between items-start pb-4 px-6 pt-6">
            <div className="space-y-1.5">
              <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white/90">Recent Customers</CardTitle>
              <CardDescription className="text-sm text-gray-500 dark:text-white/50">
                Latest customer registrations
              </CardDescription>
            </div>
            <Button 
              onClick={() => router.push('/admin/customers/create')}
              size="sm"
              className="rounded-xl bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white shadow-sm hover:shadow-md transition-all duration-200"
            >
              Add Customer
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-gray-200 dark:border-white/10 hover:bg-transparent">
                    <TableHead className="text-xs font-medium text-gray-500 dark:text-white/50 h-11">Name</TableHead>
                    <TableHead className="text-xs font-medium text-gray-500 dark:text-white/50 h-11">Status</TableHead>
                    <TableHead className="hidden md:table-cell text-xs font-medium text-gray-500 dark:text-white/50 h-11">Joined</TableHead>
                    <TableHead className="hidden lg:table-cell text-xs font-medium text-gray-500 dark:text-white/50 h-11">Email</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-12">
                        <div className="flex justify-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : Array.isArray(customers) && customers.length > 0 ? (
                    customers.slice(0, 5).map((customer) => (
                      <TableRow 
                        key={customer.id} 
                        className="cursor-pointer border-b border-gray-100 dark:border-white/5 last:border-0 hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors duration-150"
                        onClick={() => navigateToCustomerDetails(customer.id)}
                      >
                        <TableCell className="font-medium text-sm text-gray-900 dark:text-white/80">{customer.fullName || customer.email || "Unknown"}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              customer.status === "ACTIVE" || customer.status === "Active"
                                ? "success"
                                : customer.status === "PENDING_VERIFICATION" || customer.status === "Pending"
                                  ? "warning"
                                  : customer.status === "SUSPENDED" || customer.status === "Suspended"
                                    ? "destructive"
                                    : customer.status === "LOCKED" || customer.status === "Locked"
                                      ? "destructive"
                                      : "secondary"
                            }
                            className="rounded-full text-xs font-medium"
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
                        <TableCell className="hidden md:table-cell text-sm text-gray-600 dark:text-white/60">
                          {customer.createdAt ? new Date(customer.createdAt).toLocaleDateString() :
                            customer.joinDate ? new Date(customer.joinDate).toLocaleDateString() : "N/A"}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm text-gray-600 dark:text-white/60">
                          {customer.email || "N/A"}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-12 text-sm text-gray-500 dark:text-white/50">
                        No customers found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="px-6 py-4 flex justify-center border-t border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/5">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => router.push("/admin/customers")}
                className="text-sm font-medium text-gray-700 dark:text-white/70 hover:text-gray-900 dark:hover:text-white/90 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors duration-150"
              >
                View All Customers
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Security Alerts Card */}
        <Card className="bg-white dark:bg-[#111318] border-gray-200 dark:border-white/10 rounded-2xl shadow-sm dark:shadow-none overflow-hidden">
          <CardHeader className="pb-4 px-6 pt-6">
            <div className="space-y-1.5">
              <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white/90">Security Alerts</CardTitle>
              <CardDescription className="text-sm text-gray-500 dark:text-white/50">
                Recent security events and notifications
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
                </div>
              ) : displaySecurityAlerts.length > 0 ? (
                displaySecurityAlerts.slice(0, 3).map((alert) => {
                  // Format alert message to be more concise
                  const simplifyAlertMessage = (message) => {
                    if (!message) return "Security alert";
                    
                    // Extract just the alert type without detailed values
                    if (message.includes(":")) {
                      return message.split(":")[0].trim();
                    }
                    
                    // For other types of alerts, extract just the main part before any detailed values
                    const detailsStart = message.match(/\(|\d|:/);
                    if (detailsStart) {
                      return message.substring(0, detailsStart.index).trim();
                    }
                    
                    // If no pattern found, limit to first 40 chars
                    if (message.length > 40) {
                      return message.substring(0, 40).trim() + "...";
                    }
                    
                    return message;
                  };
                  
                  // Format alert type for display
                  const formatAlertType = (eventType) => {
                    if (!eventType) return "Unknown";
                    
                    // Replace underscores with spaces and capitalize each word
                    return eventType
                      .replace(/_/g, ' ')
                      .split(' ')
                      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                      .join(' ');
                  };
                  
                  // Get alert type and severity
                  const alertType = alert.eventType || alert.tamperType || alert.type || "Unknown Alert Type";
                  const severity = alert.severity?.toLowerCase() || 
                    (alertType.includes("PHYSICAL") ? "critical" : 
                     alertType.includes("VOLTAGE") ? "warning" : "info");
                  
                  // Get badge based on severity
                  const getBadge = () => {
                    if (severity === "critical" || severity === "high") {
                      return <Badge variant="destructive" className="rounded-full">Critical</Badge>;
                    }
                    if (severity === "warning" || severity === "medium") {
                      return <Badge variant="warning" className="rounded-full">Warning</Badge>;
                    }
                    return <Badge variant="secondary" className="rounded-full">Info</Badge>;
                  };
                  
                  return (
                    <div key={alert.id} className="flex items-start gap-4 rounded-xl bg-gray-50 dark:bg-white/5 p-4 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors duration-150">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                          severity === "critical" || severity === "high"
                            ? "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400"
                            : "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400"
                        }`}
                      >
                        {/* Use different icons based on alert type */}
                        {alertType.toUpperCase().includes("PHYSICAL") || 
                         alertType.toUpperCase().includes("INTRUSION") ? (
                          <ShieldAlert className="h-5 w-5" strokeWidth={2} />
                        ) : alertType.toUpperCase().includes("VOLTAGE") || 
                           alertType.toUpperCase().includes("POWER") ? (
                          <AlertTriangle className="h-5 w-5" strokeWidth={2} />
                        ) : alertType.toUpperCase().includes("CONNECTION") || 
                           alertType.toUpperCase().includes("NETWORK") ? (
                          <Zap className="h-5 w-5" strokeWidth={2} />
                        ) : alertType.toUpperCase().includes("LOCATION") || 
                           alertType.toUpperCase().includes("GPS") ? (
                          <MapPin className="h-5 w-5" strokeWidth={2} />
                        ) : (
                          <ShieldAlert className="h-5 w-5" strokeWidth={2} />
                        )}
                      </div>
                      <div className="flex-1 space-y-1.5">
                        <p className="text-sm font-medium leading-tight text-gray-900 dark:text-white/80">{simplifyAlertMessage(alert.description || alert.message)}</p>
                        <p className="text-xs text-gray-500 dark:text-white/50">
                          {alert.installationLocation || alert.location || `Installation #${alert.installationId}`}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          {getBadge()}
                          <span className="text-xs font-medium text-gray-500 dark:text-white/50">{formatAlertType(alertType)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-12 text-sm text-gray-500 dark:text-white/50">
                  No security alerts found
                </div>
              )}
            </div>
            <div className="mt-6 flex justify-center pt-4 border-t border-gray-200 dark:border-white/10">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => router.push("/admin/security/alerts")}
                className="text-sm font-medium text-gray-700 dark:text-white/70 hover:text-gray-900 dark:hover:text-white/90 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors duration-150"
              >
                View All Alerts
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Installations Section */}
      <Card className="bg-white dark:bg-[#111318] border-gray-200 dark:border-white/10 rounded-2xl shadow-sm dark:shadow-none overflow-hidden">
        <CardHeader className="px-6 pt-6 pb-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1.5">
              <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white/90">All Installations</CardTitle>
              <CardDescription className="text-sm text-gray-500 dark:text-white/50">
                Overview of all solar installations
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => router.push("/admin/installations")}
              className="rounded-xl border-gray-200 dark:border-white/10 text-gray-700 dark:text-white/70 hover:bg-gray-50 dark:hover:bg-white/10 transition-all duration-150"
            >
              View All
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-gray-200 dark:border-white/10 hover:bg-transparent">
                  <TableHead className="w-[100px] text-xs font-medium text-gray-500 dark:text-white/50 h-11">ID</TableHead>
                  <TableHead className="text-xs font-medium text-gray-500 dark:text-white/50 h-11">Name</TableHead>
                  <TableHead className="text-xs font-medium text-gray-500 dark:text-white/50 h-11">Customer</TableHead>
                  <TableHead className="text-xs font-medium text-gray-500 dark:text-white/50 h-11">Location</TableHead>
                  <TableHead className="text-xs font-medium text-gray-500 dark:text-white/50 h-11">Status</TableHead>
                  <TableHead className="text-right text-xs font-medium text-gray-500 dark:text-white/50 h-11">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 dark:border-blue-400 border-t-transparent"></div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : installations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-sm text-gray-500 dark:text-white/50">
                      No installations found
                    </TableCell>
                  </TableRow>
                ) : (
                  installations.slice(0, 5).map((installation) => (
                    <TableRow key={installation.id} className="border-b border-gray-100 dark:border-white/5 last:border-0 hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors duration-150">
                      <TableCell className="font-medium text-sm text-gray-900 dark:text-white/80">{installation.id}</TableCell>
                      <TableCell className="text-sm text-gray-700 dark:text-white/70">
                        {installation.name || `Installation #${installation.id}`}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600 dark:text-white/60">
                        {installation.username || installation.customerName || "N/A"}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600 dark:text-white/60">
                        {installation.location || "N/A"}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            installation.status === "ACTIVE" || installation.status === "Active" || installation.status === "OPERATIONAL"
                              ? "success"
                              : installation.status === "PENDING" || installation.status === "Pending"
                                ? "warning"
                                : installation.status === "MAINTENANCE"
                                  ? "warning"
                                  : installation.status === "OFFLINE" || installation.status === "Inactive"
                                    ? "destructive"
                                    : "secondary"
                          }
                          className="rounded-full text-xs font-medium"
                        >
                          {installation.status || "Unknown"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/admin/installations/${installation.id}`)}
                          className="rounded-lg text-sm text-gray-700 dark:text-white/70 hover:text-gray-900 dark:hover:text-white/90 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors duration-150"
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

      {/* System Health Section */}
      <Card className="bg-white dark:bg-[#111318] border-gray-200 dark:border-white/10 rounded-2xl shadow-sm dark:shadow-none overflow-hidden">
        <CardHeader className="px-6 pt-6 pb-4">
          <div className="space-y-1.5">
            <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white/90">System Health</CardTitle>
            <CardDescription className="text-sm text-gray-500 dark:text-white/50">
              Current status of system components
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 dark:border-blue-400 border-t-transparent"></div>
            </div>
          ) : !systemHealth ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Settings className="h-16 w-16 text-gray-300 dark:text-white/30 mb-4" strokeWidth={1.5} />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white/90">No System Health Data Available</h3>
                <p className="text-sm text-gray-500 dark:text-white/50 max-w-md mt-2">
                  System health metrics are not available at this time.
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-4 rounded-xl border-gray-200 dark:border-white/10 text-gray-700 dark:text-white/70 hover:bg-gray-50 dark:hover:bg-white/10"
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
                  <RefreshCw className="h-4 w-4 mr-2" strokeWidth={2} />
                  Refresh Data
                </Button>
              </div>
            ) : systemHealth.systemHealth && systemHealth.systemHealth.length > 0 ? (
              <div className="space-y-6">
                {systemHealth.systemHealth.map((item, index) => (
                  <div key={item.name || index} className="space-y-3 p-5 rounded-xl bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors duration-150">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700 dark:text-white/70">{item.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white/90">{item.value}%</span>
                        {item.value >= item.target ? (
                          <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" strokeWidth={2} />
                        ) : (
                          <XCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" strokeWidth={2} />
                        )}
                      </div>
                    </div>
                    <Progress
                      value={item.value}
                      className="h-2.5"
                      style={
                        {
                          backgroundColor: "var(--muted)",
                          "--progress-color": item.color,
                        } as React.CSSProperties
                      }
                    />
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500 dark:text-white/50">Target: {item.target}%</span>
                      <span className={item.value >= item.target ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-amber-600 dark:text-amber-400 font-medium"}>
                        {item.value >= item.target ? "Meeting target" : "Below target"}
                      </span>
                    </div>
                  </div>
                ))}
                <div className="mt-6 pt-4 border-t border-gray-200 dark:border-white/10 flex justify-center">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="rounded-xl text-gray-700 dark:text-white/70 hover:text-gray-900 dark:hover:text-white/90 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors duration-150"
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
                    <RefreshCw className="h-4 w-4 mr-2" strokeWidth={2} />
                    Refresh Data
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Settings className="h-16 w-16 text-gray-300 dark:text-white/30 mb-4" strokeWidth={1.5} />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white/90">System Health Data Format Error</h3>
                <p className="text-sm text-gray-500 dark:text-white/50 max-w-md mt-2">
                  The system health data was received but in an unexpected format.
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-4 rounded-xl border-gray-200 dark:border-white/10 text-gray-700 dark:text-white/70 hover:bg-gray-50 dark:hover:bg-white/10"
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
                  <RefreshCw className="h-4 w-4 mr-2" strokeWidth={2} />
                  Refresh Data
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
    </div>
  )
}
