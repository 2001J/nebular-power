"use client"

import { useState, useEffect } from "react"
import {
  CreditCard,
  Download,
  Search,
  Filter,
  Plus,
  Calendar,
  DollarSign,
  Check,
  XCircle,
  MoreHorizontal,
  ArrowUpDown,
  Loader2
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Progress } from "@/components/ui/progress"
import { toast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"
import { customerApi, paymentComplianceApi } from "@/lib/api"

// Interface for loan data
interface Loan {
  id: number;
  customer: string;
  customerId: string;
  loanAmount: number;
  remainingAmount: number;
  monthlyPayment: number;
  status: string;
  nextPayment: string;
  term: string;
  startDate: string;
  installationId?: string;
  installationName?: string;
}

export default function LoanManagementPage() {
  const router = useRouter()
  const [statusFilter, setStatusFilter] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [sortField, setSortField] = useState("customer")
  const [sortDirection, setSortDirection] = useState("asc")
  const [loading, setLoading] = useState(true)
  const [loans, setLoans] = useState<Loan[]>([])
  const [paymentPlans, setPaymentPlans] = useState([])
  const [upcomingPayments, setUpcomingPayments] = useState([])

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)

        // Fetch payment plans to use as loans - include all statuses
        try {
          // Create an array to store all loans
          let allLoans = [];

          // Fetch active payment plans
          const activePlans = await paymentComplianceApi.getPaymentPlansByStatusReport("ACTIVE");
          if (activePlans && Array.isArray(activePlans)) {
            const activeLoans = activePlans.map(plan => ({
              id: plan.id,
              customer: plan.customerName || `Customer #${plan.customerId || "Unknown"}`,
              customerId: plan.customerId,
              loanAmount: plan.totalAmount || 0,
              remainingAmount: plan.remainingAmount || 0,
              monthlyPayment: plan.installmentAmount || 0,
              status: plan.status === "ACTIVE" ? "Current" : plan.status,
              nextPayment: plan.nextPaymentDate || new Date().toISOString(),
              term: `${plan.numberOfPayments || 0} months`,
              startDate: plan.startDate || new Date().toISOString(),
              installationId: plan.installationId,
              installationName: plan.installationName || `Installation #${plan.installationId}`
            }));
            allLoans = [...allLoans, ...activeLoans];
          }
          
          // Fetch completed/paid payment plans
          const completedPlans = await paymentComplianceApi.getPaymentPlansByStatusReport("COMPLETED");
          if (completedPlans && Array.isArray(completedPlans)) {
            const completedLoans = completedPlans.map(plan => ({
              id: plan.id,
              customer: plan.customerName || `Customer #${plan.customerId || "Unknown"}`,
              customerId: plan.customerId,
              loanAmount: plan.totalAmount || 0,
              remainingAmount: 0, // Paid loans have no remaining amount
              monthlyPayment: plan.installmentAmount || 0,
              status: "Paid",
              nextPayment: "N/A",
              term: `${plan.numberOfPayments || 0} months`,
              startDate: plan.startDate || new Date().toISOString(),
              installationId: plan.installationId,
              installationName: plan.installationName || `Installation #${plan.installationId}`
            }));
            allLoans = [...allLoans, ...completedLoans];
          }

          // If we have any loans, set them
          if (allLoans.length > 0) {
            setLoans(allLoans);
            setLoading(false);
            return;
          }
        } catch (error) {
          console.error("Error fetching payment plans:", error);
        }

        // No fallback data, just set an empty array
        setLoans([]);

        // Show toast notification about no data
        toast({
          title: "No Loan Data Available",
          description: "No payment plans were found. The system will display loans when payment plans are created.",
          variant: "warning",
        });
      } catch (error) {
        console.error("Error in fetchData:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter and sort loans
  const filteredLoans = loans.filter((loan) => {
    const matchesSearch =
      !searchTerm ||
      loan.customer.toLowerCase().includes(searchTerm.toLowerCase())

    // Make status comparison case-insensitive
    const matchesStatus = 
      statusFilter === "all" || 
      loan.status.toLowerCase() === statusFilter.toLowerCase()

    return matchesSearch && matchesStatus
  }).sort((a, b) => {
    const aValue = a[sortField]
    const bValue = b[sortField]

    if (sortDirection === "asc") {
      return aValue > bValue ? 1 : -1
    } else {
      return aValue < bValue ? 1 : -1
    }
  })

  // Handle sorting
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  // Handle loan details navigation
  const navigateToLoanDetails = (id) => {
    router.push(`/admin/loans/${id}`)
  }

  // Calculate loan stats
  const totalLoanVolume = loans.reduce((sum, loan) => sum + loan.loanAmount, 0)
  const totalOutstanding = loans.reduce((sum, loan) => sum + loan.remainingAmount, 0)
  
  // Since we're only fetching active plans, all plans count as active unless marked as late
  // Count active loans (all plans that aren't marked as Late)
  const totalCurrentLoans = loans.filter(loan => loan.status !== "Late" && loan.status !== "No Data").length
  
  // Count overdue loans (plans marked as Late)
  const totalOverdueLoans = loans.filter(loan => loan.status === "Late").length
  
  // Calculate percentage of active and overdue loans for display
  const activePercentage = loans.length > 0 ? Math.round((totalCurrentLoans / loans.length) * 100) : 0
  const overduePercentage = loans.length > 0 ? Math.round((totalOverdueLoans / loans.length) * 100) : 0

  // Add refresh button and function
  const refreshData = async () => {
    try {
      setLoading(true);
      
      // Create an array to store all loans
      let allLoans = [];
      
      // Get timestamp to prevent caching
      const timestamp = new Date().getTime();

      // Fetch active payment plans
      try {
        // Add timestamp to prevent caching
        const activePlans = await paymentComplianceApi.getPaymentPlansByStatusReport("ACTIVE", null, null, timestamp);
        if (activePlans && Array.isArray(activePlans)) {
          const activeLoans = activePlans.map(plan => ({
            id: plan.id,
            customer: plan.customerName || `Customer #${plan.customerId || "Unknown"}`,
            customerId: plan.customerId,
            loanAmount: plan.totalAmount || 0,
            remainingAmount: plan.remainingAmount || 0,
            monthlyPayment: plan.installmentAmount || 0,
            status: plan.status === "ACTIVE" ? "Current" : plan.status,
            nextPayment: plan.nextPaymentDate || new Date().toISOString(),
            term: `${plan.numberOfPayments || 0} months`,
            startDate: plan.startDate || new Date().toISOString(),
            installationId: plan.installationId,
            installationName: plan.installationName || `Installation #${plan.installationId}`
          }));
          allLoans = [...allLoans, ...activeLoans];
        }
        
        // Fetch completed/paid payment plans
        const completedPlans = await paymentComplianceApi.getPaymentPlansByStatusReport("COMPLETED", null, null, timestamp);
        if (completedPlans && Array.isArray(completedPlans)) {
          const completedLoans = completedPlans.map(plan => ({
            id: plan.id,
            customer: plan.customerName || `Customer #${plan.customerId || "Unknown"}`,
            customerId: plan.customerId,
            loanAmount: plan.totalAmount || 0,
            remainingAmount: 0, // Paid loans have no remaining amount
            monthlyPayment: plan.installmentAmount || 0,
            status: "Paid",
            nextPayment: "N/A",
            term: `${plan.numberOfPayments || 0} months`,
            startDate: plan.startDate || new Date().toISOString(),
            installationId: plan.installationId,
            installationName: plan.installationName || `Installation #${plan.installationId}`
          }));
          allLoans = [...allLoans, ...completedLoans];
        }
        
        // Update state if we found loans
        if (allLoans.length > 0) {
          setLoans(allLoans);
          toast({
            title: "Data Refreshed",
            description: `Successfully loaded ${allLoans.length} loans`,
          });
        } else {
          toast({
            title: "No Loans Found",
            description: "No payment plans were found",
            variant: "warning",
          });
        }
      } catch (error) {
        console.error("Error refreshing loans:", error);
        toast({
          title: "Error",
          description: "Failed to refresh loan data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    } catch (error) {
      console.error("Error in refreshData:", error);
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-6">
      <Breadcrumb className="mb-4">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/admin">Admin</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Loan Management</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Loan Management</h1>
          <p className="text-muted-foreground">
            Manage active payment plans and financing arrangements
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={refreshData} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Refresh
          </Button>
          <Button onClick={() => router.push("/admin/loans/new")}>
            <Plus className="mr-2 h-4 w-4" />
            New Loan
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading loan information...</p>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Loan Volume</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${totalLoanVolume.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  Across {loans.length} customers
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Outstanding Balance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${totalOutstanding.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  {Math.round((totalOutstanding / totalLoanVolume) * 100) || 0}% of total volume
                </p>
              </CardContent>
            </Card>
            <Card className="border-2 border-green-400 dark:border-green-600 shadow-md">
              <CardHeader className="pb-2 bg-green-50 dark:bg-green-900/30">
                <CardTitle className="text-sm font-medium flex items-center">
                  <Check className="h-4 w-4 mr-2 text-green-600 dark:text-green-400" />
                  Active Loans
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">{totalCurrentLoans}</div>
                <p className="text-xs text-muted-foreground">
                  {totalCurrentLoans === 1 ? "1 loan" : `${totalCurrentLoans} loans`} in good standing
                </p>
                {totalCurrentLoans > 0 && loans.length > 0 && (
                  <p className="text-xs mt-2">
                    {Math.round((totalCurrentLoans / loans.length) * 100)}% of total loans
                  </p>
                )}
              </CardContent>
            </Card>
            <Card className="border-2 border-red-400 dark:border-red-600 shadow-md">
              <CardHeader className="pb-2 bg-red-50 dark:bg-red-900/30">
                <CardTitle className="text-sm font-medium flex items-center">
                  <XCircle className="h-4 w-4 mr-2 text-red-600 dark:text-red-400" />
                  Overdue Loans
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">{totalOverdueLoans}</div>
                <p className="text-xs text-muted-foreground">
                  {totalOverdueLoans === 1 ? "1 loan requires" : `${totalOverdueLoans} loans require`} attention
                </p>
                {totalOverdueLoans > 0 && loans.length > 0 && (
                  <p className="text-xs mt-2 text-red-600 dark:text-red-400">
                    {Math.round((totalOverdueLoans / loans.length) * 100)}% of total loans
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>All Loans</CardTitle>
              <CardDescription>
                {filteredLoans.length === 0 && !searchTerm && statusFilter === "all"
                  ? "No loans have been created yet"
                  : `Showing ${filteredLoans.length} of ${loans.length} total loans`}
              </CardDescription>

              <div className="flex flex-col sm:flex-row gap-4 mt-4">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by customer name..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                <div className="flex gap-2">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[130px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="Current">Current</SelectItem>
                      <SelectItem value="Late">Late</SelectItem>
                      <SelectItem value="Paid">Paid</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button variant="outline" size="icon" disabled={loans.length === 0}>
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <Button variant="ghost" className="p-0 hover:bg-transparent" onClick={() => handleSort("customer")}>
                          <span>Customer</span>
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button variant="ghost" className="p-0 hover:bg-transparent" onClick={() => handleSort("loanAmount")}>
                          <span>Loan Amount</span>
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                        </Button>
                      </TableHead>
                      <TableHead className="hidden md:table-cell">Remaining</TableHead>
                      <TableHead className="hidden md:table-cell">Monthly Payment</TableHead>
                      <TableHead>
                        <Button variant="ghost" className="p-0 hover:bg-transparent" onClick={() => handleSort("status")}>
                          <span>Status</span>
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                        </Button>
                      </TableHead>
                      <TableHead className="hidden md:table-cell">Next Payment</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLoans.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          {searchTerm || statusFilter !== "all" ? (
                            <div className="flex flex-col items-center space-y-1">
                              <p>No loans found matching your criteria</p>
                              <Button variant="link" onClick={() => {
                                setSearchTerm("");
                                setStatusFilter("all");
                              }}>
                                Clear filters
                              </Button>
                            </div>
                          ) : (
                            <>
                              {loans.length === 0 ? (
                                <div className="flex flex-col items-center space-y-1">
                                  <p>No loans have been created yet</p>
                                  <Button variant="link" onClick={() => router.push("/admin/loans/new")}>
                                    Create your first loan
                                  </Button>
                                </div>
                              ) : (
                                "No loans found"
                              )}
                            </>
                          )}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredLoans.map((loan) => (
                        <TableRow key={loan.id} className="cursor-pointer" onClick={() => navigateToLoanDetails(loan.id)}>
                          <TableCell className="font-medium">{loan.customer}</TableCell>
                          <TableCell>${loan.loanAmount.toLocaleString()}</TableCell>
                          <TableCell className="hidden md:table-cell">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center justify-between">
                                <span>${loan.remainingAmount.toLocaleString()}</span>
                                <span className="text-xs text-muted-foreground">
                                  {loan.remainingAmount > 0
                                    ? `${Math.round((loan.remainingAmount / loan.loanAmount) * 100)}%`
                                    : '0%'}
                                </span>
                              </div>
                              {loan.status !== "Paid" && (
                                <Progress
                                  value={100 - Math.round((loan.remainingAmount / loan.loanAmount) * 100)}
                                  className="h-2"
                                />
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">${loan.monthlyPayment}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                loan.status === "Current"
                                  ? "default"
                                  : loan.status === "Paid"
                                    ? "secondary"
                                    : "destructive"
                              }
                            >
                              {loan.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {loan.nextPayment === "N/A" ? "N/A" : (
                              new Date(loan.nextPayment).toLocaleDateString()
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <span className="sr-only">Open menu</span>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={(e) => {
                                  e.stopPropagation()
                                  navigateToLoanDetails(loan.id)
                                }}>
                                  View details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => {
                                  e.stopPropagation()
                                  router.push(`/admin/loans/${loan.id}/payments`)
                                }}>
                                  Payment history
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => {
                                  e.stopPropagation()
                                  router.push(`/admin/loans/${loan.id}/edit`)
                                }}>
                                  Edit loan
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Loan Distribution</CardTitle>
                <CardDescription>Distribution by loan amount</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                {loans.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground">No loan data available</p>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <div className="space-y-4 text-center">
                      <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                        <DollarSign className="h-6 w-6 text-primary" />
                      </div>
                      <div className="space-y-2">
                        {/* Calculate actual percentages based on real data */}
                        {(() => {
                          const ranges = {
                            "< $10,000": 0,
                            "$10,000 - $15,000": 0,
                            "$15,001 - $20,000": 0,
                            "> $20,000": 0
                          };

                          loans.forEach(loan => {
                            if (loan.loanAmount < 10000) ranges["< $10,000"]++;
                            else if (loan.loanAmount <= 15000) ranges["$10,000 - $15,000"]++;
                            else if (loan.loanAmount <= 20000) ranges["$15,001 - $20,000"]++;
                            else ranges["> $20,000"]++;
                          });

                          return Object.entries(ranges).map(([range, count]) => {
                            const percentage = Math.round((count / loans.length) * 100);
                            return (
                              <p key={range}>{range}: {percentage}%</p>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Upcoming Payments</CardTitle>
                <CardDescription>Next 7 days payment schedule</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px] flex flex-col gap-4 overflow-y-auto">
                {loans.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground">No upcoming payments</p>
                  </div>
                ) : (
                  loans
                    .filter(loan =>
                      loan.nextPayment !== "N/A" &&
                      new Date(loan.nextPayment) > new Date() &&
                      new Date(loan.nextPayment) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                    )
                    .sort((a, b) => new Date(a.nextPayment).getTime() - new Date(b.nextPayment).getTime())
                    .map(loan => (
                      <div key={loan.id} className="flex items-start gap-4 rounded-lg border p-4">
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${loan.status === "Late" ? "bg-destructive/10" : "bg-primary/10"}`}>
                          <Calendar className={`h-5 w-5 ${loan.status === "Late" ? "text-destructive" : "text-primary"}`} />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{loan.customer}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(loan.nextPayment).toLocaleDateString()} - ${loan.monthlyPayment}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Loan #{loan.id} - {loan.status}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/admin/loans/${loan.id}/payments`);
                          }}
                        >
                          Process
                        </Button>
                      </div>
                    ))
                )}

                {loans.length > 0 && !loans.some(loan =>
                  loan.nextPayment !== "N/A" &&
                  new Date(loan.nextPayment) > new Date() &&
                  new Date(loan.nextPayment) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                ) && (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-muted-foreground">No payments due in the next 7 days</p>
                    </div>
                  )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}