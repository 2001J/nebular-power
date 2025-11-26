"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowRight, 
  Calendar,
  CreditCard,
  DollarSign,
  Home,
  Info,
  Receipt,
  Shield,
  Sun,
  Zap
} from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/components/auth-provider"
import { useToast } from "@/components/ui/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { paymentApi } from "@/lib/api/payments"
import { installationApi } from "@/lib/api/installations"
import { format } from "date-fns"
import PaymentStatusCard from "@/components/payment-status-card"

// Define types for our installation and payment plan data
interface Installation {
  id: number;
  userId: number;
  username: string;
  name: string;
  installedCapacityKW: number;
  location: string;
  installationDate: string;
  status: string;
  tamperDetected: boolean;
  lastTamperCheck: string;
  type: string;
}

interface Payment {
  id: number;
  installationId: number;
  customerName: string;
  paymentPlanId: number;
  paymentPlanName: string;
  amount: number;
  dueDate: string;
  status: string;
  statusReason?: string;
  daysOverdue: number;
  paidAt?: string;
  paymentDate?: string;
  paymentMethod?: string;
  transactionId?: string;
  statusUpdatedAt?: string;
  lateFee?: number;
  notes?: string;
}

export default function CustomerInstallationsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  
  const [installations, setInstallations] = useState<Installation[]>([])
  const [upcomingPayments, setUpcomingPayments] = useState<Payment[]>([])
  const [paymentHistory, setPaymentHistory] = useState<Payment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [activeTab, setActiveTab] = useState("overview")

  // Fetch data when component mounts
  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return
      
      try {
        setIsLoading(true)
        setHasError(false)
        
        console.log("Fetching installations for user ID:", user.id)
        // Fetch installations
        const installationsResponse = await installationApi.getCustomerInstallations(user.id.toString())
        
        if (Array.isArray(installationsResponse) && installationsResponse.length > 0) {
          setInstallations(installationsResponse)
          console.log(`Found ${installationsResponse.length} installations for the user`)
          
          // Fetch upcoming payments
          try {
            const upcomingPaymentsResponse = await paymentApi.getUpcomingPayments();
            if (upcomingPaymentsResponse && upcomingPaymentsResponse.content) {
              setUpcomingPayments(upcomingPaymentsResponse.content);
              console.log(`Found ${upcomingPaymentsResponse.content.length} upcoming payments`);
            } else if (Array.isArray(upcomingPaymentsResponse)) {
              setUpcomingPayments(upcomingPaymentsResponse);
              console.log(`Found ${upcomingPaymentsResponse.length} upcoming payments (array format)`);
            } else {
              console.log("No upcoming payments found or invalid format", upcomingPaymentsResponse);
              setUpcomingPayments([]);
            }
          } catch (error) {
            console.error("Error fetching upcoming payments:", error);
            setUpcomingPayments([]);
          }
          
          // Fetch payment history
          try {
            const paymentHistoryResponse = await paymentApi.getPaymentHistory()
            if (paymentHistoryResponse && paymentHistoryResponse.content) {
              // Filter to only show payments with status 'PAID'
              const paidPayments = paymentHistoryResponse.content.filter(
                (payment: Payment) => payment.status === 'PAID'
              )
              setPaymentHistory(paidPayments)
              console.log(`Found ${paidPayments.length} paid payments out of ${paymentHistoryResponse.content.length} total payments`)
            } else if (Array.isArray(paymentHistoryResponse)) {
              // Filter to only show payments with status 'PAID'
              const paidPayments = paymentHistoryResponse.filter(
                (payment: Payment) => payment.status === 'PAID'
              )
              setPaymentHistory(paidPayments)
              console.log(`Found ${paidPayments.length} paid payments out of ${paymentHistoryResponse.length} total payments`)
            } else {
              console.log("No payment history found or invalid format", paymentHistoryResponse)
              setPaymentHistory([])
            }
          } catch (error) {
            console.error("Error fetching payment history:", error)
            setPaymentHistory([])
          }
          
        } else {
          console.warn("No installations found for this user or invalid response format")
          setInstallations([])
        }
      } catch (error) {
        console.error("Error fetching data:", error)
        setHasError(true)
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load your installation data. Please try again.",
        })
      } finally {
        setIsLoading(false)
      }
    }

    if (user) {
      fetchData()
    }
  }, [user, toast])

  // Format currency values
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value)
  }
  
  // Format date values
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A'
    try {
      const date = new Date(dateString)
      return format(date, 'MMM d, yyyy')
    } catch (error) {
      return dateString
    }
  }
  
  // Get status badge color
  const getStatusColor = (status: string) => {
    status = status.toUpperCase()
    if (status === 'ACTIVE' || status === 'PAID' || status === 'CURRENT') return 'default'
    if (status === 'PENDING' || status === 'SCHEDULED') return 'outline'
    if (status === 'OVERDUE' || status === 'LATE') return 'destructive'
    if (status === 'COMPLETED') return 'secondary'
    return 'default'
  }

  const renderInstallations = () => {
    if (installations.length === 0) {
      return (
        <Alert className="bg-white dark:bg-[#111318] border-gray-200 dark:border-white/10 rounded-xl">
          <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <AlertTitle className="text-gray-900 dark:text-white/90">No installations found</AlertTitle>
          <AlertDescription className="text-gray-600 dark:text-white/60">
            You don't have any registered solar installations yet. Please contact customer support if you believe this is an error.
          </AlertDescription>
        </Alert>
      )
    }

    return installations.map((installation) => (
      <Card key={installation.id} className="mb-6 bg-white dark:bg-[#111318] border-gray-200 dark:border-white/10 rounded-2xl shadow-sm dark:shadow-none hover:shadow-md dark:hover:shadow-none transition-shadow duration-200">
        <CardHeader className="pb-4 px-6 pt-6">
          <div className="flex justify-between items-start gap-4">
            <div className="space-y-1">
              <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white/90">
                {installation.name || `Solar Installation #${installation.id}`}
              </CardTitle>
              <CardDescription className="text-sm text-gray-500 dark:text-white/50">
                Installed on {formatDate(installation.installationDate)}
              </CardDescription>
            </div>
            <Badge 
              variant={installation.status === 'ACTIVE' ? 'default' : 'secondary'}
              className="rounded-lg px-3 py-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20"
            >
              {installation.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 px-6 pb-6">
          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-white/50">Type</h3>
            <p className="text-base font-medium text-gray-900 dark:text-white/80">{installation.type || 'Standard'}</p>
          </div>
          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-white/50">Capacity</h3>
            <p className="text-base font-medium text-gray-900 dark:text-white/80">{installation.installedCapacityKW} kW</p>
          </div>
          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-white/50">Location</h3>
            <p className="text-base font-medium text-gray-900 dark:text-white/80">{installation.location || 'Main Property'}</p>
          </div>
        </CardContent>
      </Card>
    ))
  }

  const renderUpcomingPayments = () => {
    if (upcomingPayments.length === 0) {
      return (
        <div className="text-center py-8">
          <p className="text-sm text-gray-500 dark:text-white/50">No upcoming payments scheduled.</p>
        </div>
      )
    }

    return (
      <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-white/10">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-gray-200 dark:border-white/10 hover:bg-transparent">
              <TableHead className="text-xs font-medium text-gray-500 dark:text-white/50 h-11">Due Date</TableHead>
              <TableHead className="text-xs font-medium text-gray-500 dark:text-white/50 h-11">Amount</TableHead>
              <TableHead className="text-xs font-medium text-gray-500 dark:text-white/50 h-11">Payment Plan</TableHead>
              <TableHead className="text-xs font-medium text-gray-500 dark:text-white/50 h-11">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {upcomingPayments.slice(0, 5).map((payment, index) => (
              <TableRow 
                key={payment.id} 
                className="border-b border-gray-100 dark:border-white/5 last:border-0 hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors duration-150"
              >
                <TableCell className="text-sm text-gray-700 dark:text-white/70">{formatDate(payment.dueDate)}</TableCell>
                <TableCell className="text-sm font-medium text-gray-900 dark:text-white/80">{formatCurrency(payment.amount)}</TableCell>
                <TableCell className="text-sm text-gray-600 dark:text-white/60">{payment.paymentPlanName || `Plan #${payment.paymentPlanId}`}</TableCell>
                <TableCell>
                  <Badge 
                    variant={getStatusColor(payment.status)}
                    className="rounded-lg px-2.5 py-1 text-xs font-medium bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-white/70 border-gray-200 dark:border-white/10"
                  >
                    {payment.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  const renderPaymentHistory = () => {
    if (paymentHistory.length === 0) {
      return (
        <div className="text-center py-8">
          <p className="text-sm text-gray-500 dark:text-white/50">No payment history available yet.</p>
        </div>
      )
    }

    return (
      <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-white/10">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-gray-200 dark:border-white/10 hover:bg-transparent">
              <TableHead className="text-xs font-medium text-gray-500 dark:text-white/50 h-11">Payment Date</TableHead>
              <TableHead className="text-xs font-medium text-gray-500 dark:text-white/50 h-11">Amount</TableHead>
              <TableHead className="text-xs font-medium text-gray-500 dark:text-white/50 h-11">Payment Method</TableHead>
              <TableHead className="text-xs font-medium text-gray-500 dark:text-white/50 h-11">Transaction ID</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paymentHistory.slice(0, 5).map((payment) => (
              <TableRow 
                key={payment.id}
                className="border-b border-gray-100 dark:border-white/5 last:border-0 hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors duration-150"
              >
                <TableCell className="text-sm text-gray-700 dark:text-white/70">{formatDate(payment.paidAt || payment.paymentDate || payment.dueDate)}</TableCell>
                <TableCell className="text-sm font-medium text-gray-900 dark:text-white/80">{formatCurrency(payment.amount)}</TableCell>
                <TableCell className="text-sm text-gray-600 dark:text-white/60">{payment.paymentMethod || 'N/A'}</TableCell>
                <TableCell className="font-mono text-xs text-gray-500 dark:text-white/50">{payment.transactionId || 'N/A'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-sm text-gray-500 dark:text-white/50">Loading your installation and payment data...</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-6 space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight text-gray-900 dark:text-white/90">
          Your Solar System
        </h1>
        <p className="text-base text-gray-600 dark:text-white/60">
          View and manage your solar installation and payments
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
        <TabsList className="bg-white dark:bg-[#111318] border border-gray-200 dark:border-white/10 p-1 rounded-xl">
          <TabsTrigger 
            value="overview" 
            className="rounded-lg data-[state=active]:bg-gray-100 dark:data-[state=active]:bg-white/10 data-[state=active]:text-gray-900 dark:data-[state=active]:text-white/90 text-gray-600 dark:text-white/60"
          >
            Overview
          </TabsTrigger>
          <TabsTrigger 
            value="installations"
            className="rounded-lg data-[state=active]:bg-gray-100 dark:data-[state=active]:bg-white/10 data-[state=active]:text-gray-900 dark:data-[state=active]:text-white/90 text-gray-600 dark:text-white/60"
          >
            Installations
          </TabsTrigger>
          <TabsTrigger 
            value="payments"
            className="rounded-lg data-[state=active]:bg-gray-100 dark:data-[state=active]:bg-white/10 data-[state=active]:text-gray-900 dark:data-[state=active]:text-white/90 text-gray-600 dark:text-white/60"
          >
            Payments
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-8">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card className="bg-white dark:bg-[#111318] border-gray-200 dark:border-white/10 rounded-2xl shadow-sm dark:shadow-none hover:shadow-md dark:hover:shadow-none transition-shadow duration-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 pt-6 px-6">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-white/70">
                  Total Systems
                </CardTitle>
                <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center">
                  <Sun className="h-5 w-5 text-amber-600 dark:text-amber-400" strokeWidth={2} />
                </div>
              </CardHeader>
              <CardContent className="px-6 pb-6">
                <div className="text-3xl font-semibold text-gray-900 dark:text-white/90">{installations.length}</div>
                <p className="text-sm text-gray-500 dark:text-white/50 mt-1">
                  Active solar installations
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-white dark:bg-[#111318] border-gray-200 dark:border-white/10 rounded-2xl shadow-sm dark:shadow-none hover:shadow-md dark:hover:shadow-none transition-shadow duration-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 pt-6 px-6">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-white/70">
                  Total Capacity
                </CardTitle>
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
                  <Zap className="h-5 w-5 text-blue-600 dark:text-blue-400" strokeWidth={2} />
                </div>
              </CardHeader>
              <CardContent className="px-6 pb-6">
                <div className="text-3xl font-semibold text-gray-900 dark:text-white/90">
                  {installations.reduce((sum, installation) => sum + (installation.installedCapacityKW || 0), 0).toFixed(2)} kW
                </div>
                <p className="text-sm text-gray-500 dark:text-white/50 mt-1">
                  Combined system capacity
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-white dark:bg-[#111318] border-gray-200 dark:border-white/10 rounded-2xl shadow-sm dark:shadow-none hover:shadow-md dark:hover:shadow-none transition-shadow duration-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 pt-6 px-6">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-white/70">
                  System Health
                </CardTitle>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-emerald-600 dark:text-emerald-400" strokeWidth={2} />
                </div>
              </CardHeader>
              <CardContent className="px-6 pb-6">
                <div className="text-3xl font-semibold text-gray-900 dark:text-white/90">Good</div>
                <p className="text-sm text-gray-500 dark:text-white/50 mt-1">
                  All systems operational
                </p>
              </CardContent>
            </Card>
          </div>
          
          {/* Loan Status Card in full width */}
          <div className="w-full">
            <PaymentStatusCard userId={user?.id} installationId={installations[0]?.id} isLarge={true} />
          </div>
        </TabsContent>
        
        <TabsContent value="installations" className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white/90">Your Solar Installations</h2>
          {renderInstallations()}
        </TabsContent>
        
        <TabsContent value="payments" className="space-y-8">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="bg-white dark:bg-[#111318] border-gray-200 dark:border-white/10 rounded-2xl shadow-sm dark:shadow-none">
              <CardHeader className="px-6 pt-6 pb-4">
                <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white/90">Upcoming Payments</CardTitle>
                <CardDescription className="text-sm text-gray-500 dark:text-white/50">Your next scheduled payments</CardDescription>
            </CardHeader>
            <CardContent className="px-6 pb-6">
                {renderUpcomingPayments()}
            </CardContent>
          </Card>

            <Card className="bg-white dark:bg-[#111318] border-gray-200 dark:border-white/10 rounded-2xl shadow-sm dark:shadow-none">
              <CardHeader className="px-6 pt-6 pb-4">
                <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white/90">Payment History</CardTitle>
                <CardDescription className="text-sm text-gray-500 dark:text-white/50">Your payment history</CardDescription>
            </CardHeader>
            <CardContent className="px-6 pb-6">
                {renderPaymentHistory()}
            </CardContent>
          </Card>
          </div>
          <Button 
            className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white shadow-sm hover:shadow-md transition-all duration-200" 
            onClick={() => router.push('/customer/payments')}
          >
            Go to Payment Center
            <ArrowRight className="ml-2 h-4 w-4" strokeWidth={2} />
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  )
}
