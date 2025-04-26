"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowRight, 
  Calendar,
  ClipboardList,
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
import { paymentApi, paymentComplianceApi, installationApi } from "@/lib/api"
import { format } from "date-fns"

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

interface PaymentPlan {
  id: number;
  installationId: number;
  customerName: string;
  customerEmail: string;
  name: string;
  description: string;
  totalAmount: number;
  remainingAmount: number;
  numberOfPayments: number;
  totalInstallments: number;
  remainingInstallments: number;
  installmentAmount: number;
  monthlyPayment: number;
  frequency: string;
  startDate: string;
  endDate: string;
  status: string;
  interestRate: number;
  lateFeeAmount: number;
  gracePeriodDays: number;
  nextPaymentDate: string;
  createdAt: string;
  updatedAt: string;
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
  paymentDate?: string;
  paymentMethod?: string;
  transactionId?: string;
}

export default function CustomerInstallationsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  
  const [installations, setInstallations] = useState<Installation[]>([])
  const [paymentPlans, setPaymentPlans] = useState<PaymentPlan[]>([])
  const [upcomingPayments, setUpcomingPayments] = useState<Payment[]>([])
  const [recentPayments, setRecentPayments] = useState<Payment[]>([])
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
          
          // Fetch payment plans for customer
          try {
            const paymentPlansResponse = await paymentApi.getCustomerPaymentPlan(user.id.toString())
            if (paymentPlansResponse) {
              console.log("Customer payment plan:", paymentPlansResponse)
              // This API returns a simplified payment plan
              // We'll try to fetch more comprehensive data
            }
            
            // Try to fetch more detailed payment plans from all installations
            let allPaymentPlans: PaymentPlan[] = []
            
            for (const installation of installationsResponse) {
              try {
                // Admin API but we should have read access via security rules
                const plansResponse = await paymentComplianceApi.getCustomerPaymentPlans(installation.id.toString())
                if (Array.isArray(plansResponse) && plansResponse.length > 0) {
                  allPaymentPlans = [...allPaymentPlans, ...plansResponse]
        }
      } catch (error) {
                console.error(`Error fetching payment plans for installation ${installation.id}:`, error)
              }
            }
            
            if (allPaymentPlans.length > 0) {
              setPaymentPlans(allPaymentPlans)
              console.log(`Found ${allPaymentPlans.length} payment plans`)
            }
          } catch (error) {
            console.error("Error fetching payment plans:", error)
          }
          
          // Fetch upcoming payments
          try {
            const upcomingPaymentsResponse = await paymentApi.getCustomerUpcomingPayments(user.id.toString())
            if (upcomingPaymentsResponse && upcomingPaymentsResponse.content) {
              setUpcomingPayments(upcomingPaymentsResponse.content)
              console.log(`Found ${upcomingPaymentsResponse.content.length} upcoming payments`)
          }
        } catch (error) {
            console.error("Error fetching upcoming payments:", error)
          }
          
          // Fetch payment history
          try {
            const paymentHistoryResponse = await paymentApi.getCustomerPaymentHistory(user.id.toString())
            if (paymentHistoryResponse && paymentHistoryResponse.content) {
              setRecentPayments(paymentHistoryResponse.content)
              console.log(`Found ${paymentHistoryResponse.content.length} recent payments`)
            }
        } catch (error) {
            console.error("Error fetching payment history:", error)
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
    if (status === 'ACTIVE' || status === 'PAID' || status === 'CURRENT') return 'success'
    if (status === 'PENDING' || status === 'SCHEDULED') return 'warning'
    if (status === 'OVERDUE' || status === 'LATE') return 'destructive'
    if (status === 'COMPLETED') return 'secondary'
    return 'default'
  }

  const renderInstallations = () => {
    if (installations.length === 0) {
      return (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>No installations found</AlertTitle>
          <AlertDescription>
            You don't have any registered solar installations yet. Please contact customer support if you believe this is an error.
          </AlertDescription>
        </Alert>
      )
    }

    return installations.map((installation) => (
      <Card key={installation.id} className="mb-6">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>{installation.name || `Solar Installation #${installation.id}`}</CardTitle>
              <CardDescription>Installed on {formatDate(installation.installationDate)}</CardDescription>
            </div>
            <Badge variant={installation.status === 'ACTIVE' ? 'success' : 'secondary'}>
              {installation.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex flex-col gap-1">
            <h3 className="text-sm font-medium">Type</h3>
            <p className="text-lg">{installation.type || 'Standard'}</p>
          </div>
          <div className="flex flex-col gap-1">
            <h3 className="text-sm font-medium">Capacity</h3>
            <p className="text-lg">{installation.installedCapacityKW} kW</p>
          </div>
          <div className="flex flex-col gap-1">
            <h3 className="text-sm font-medium">Location</h3>
            <p className="text-lg">{installation.location || 'Main Property'}</p>
          </div>
        </CardContent>
      </Card>
    ))
  }

  const renderPaymentPlans = () => {
    if (paymentPlans.length === 0) {
      return (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>No payment plans found</AlertTitle>
          <AlertDescription>
            You don't have any payment plans associated with your installation. If you recently had an installation,
            your payment plan may still be in processing.
          </AlertDescription>
        </Alert>
      )
    }

    return paymentPlans.map((plan) => (
      <Card key={plan.id} className="mb-6">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>{plan.name || `Payment Plan #${plan.id}`}</CardTitle>
              <CardDescription>{plan.description || `For installation #${plan.installationId}`}</CardDescription>
            </div>
            <Badge variant={getStatusColor(plan.status)}>
              {plan.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Remaining Balance:</span>
              <span className="text-lg font-medium">{formatCurrency(plan.remainingAmount)}</span>
            </div>
            <Progress 
              value={(1 - plan.remainingAmount / plan.totalAmount) * 100} 
              className="h-2"
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{formatCurrency(plan.totalAmount - plan.remainingAmount)} paid</span>
              <span>{formatCurrency(plan.totalAmount)} total</span>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex flex-col gap-1">
              <h3 className="text-sm font-medium">Payment Amount</h3>
              <p className="text-lg">{formatCurrency(plan.installmentAmount || plan.monthlyPayment)}</p>
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="text-sm font-medium">Frequency</h3>
              <p className="text-lg">{plan.frequency || 'Monthly'}</p>
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="text-sm font-medium">Next Payment</h3>
              <p className="text-lg">{formatDate(plan.nextPaymentDate)}</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <h3 className="text-sm font-medium">Start Date</h3>
              <p>{formatDate(plan.startDate)}</p>
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="text-sm font-medium">End Date</h3>
              <p>{formatDate(plan.endDate)}</p>
            </div>
          </div>

          {(plan.interestRate > 0 || plan.lateFeeAmount > 0) && (
            <div className="grid gap-4 sm:grid-cols-2">
              {plan.interestRate > 0 && (
                <div className="flex flex-col gap-1">
                  <h3 className="text-sm font-medium">Interest Rate</h3>
                  <p>{plan.interestRate}%</p>
                </div>
              )}
              {plan.lateFeeAmount > 0 && (
                <div className="flex flex-col gap-1">
                  <h3 className="text-sm font-medium">Late Fee</h3>
                  <p>{formatCurrency(plan.lateFeeAmount)}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button variant="secondary" className="w-full" onClick={() => router.push('/customer/payments')}>
            View Payment History
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>
    ))
  }

  const renderUpcomingPayments = () => {
    if (upcomingPayments.length === 0) {
      return (
        <div className="text-center py-6">
          <p className="text-muted-foreground">No upcoming payments scheduled.</p>
        </div>
      )
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Due Date</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Payment Plan</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {upcomingPayments.slice(0, 5).map((payment) => (
            <TableRow key={payment.id}>
              <TableCell>{formatDate(payment.dueDate)}</TableCell>
              <TableCell>{formatCurrency(payment.amount)}</TableCell>
              <TableCell>{payment.paymentPlanName || `Plan #${payment.paymentPlanId}`}</TableCell>
              <TableCell>
                <Badge variant={getStatusColor(payment.status)}>
                  {payment.status}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )
  }

  const renderRecentPayments = () => {
    if (recentPayments.length === 0) {
      return (
        <div className="text-center py-6">
          <p className="text-muted-foreground">No payment history available yet.</p>
        </div>
      )
    }

      return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Payment Method</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {recentPayments.slice(0, 5).map((payment) => (
            <TableRow key={payment.id}>
              <TableCell>{formatDate(payment.paymentDate || payment.dueDate)}</TableCell>
              <TableCell>{formatCurrency(payment.amount)}</TableCell>
              <TableCell>{payment.paymentMethod || 'N/A'}</TableCell>
              <TableCell>
                <Badge variant={getStatusColor(payment.status)}>
                  {payment.status}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">Loading your installation and payment data...</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-8">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Your Solar System</h1>
          <p className="text-muted-foreground">
            View and manage your solar installation and payment plans
          </p>
        </div>
        <Button onClick={() => router.push('/customer/payments')}>
          <CreditCard className="mr-2 h-4 w-4" />
          Make a Payment
          </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="installations">Installations</TabsTrigger>
          <TabsTrigger value="payment-plans">Payment Plans</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Systems
                </CardTitle>
                <Sun className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{installations.length}</div>
                <p className="text-xs text-muted-foreground">
                  Active solar installations
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Capacity
                </CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                  <div className="text-2xl font-bold">
                  {installations.reduce((sum, installation) => sum + (installation.installedCapacityKW || 0), 0).toFixed(2)} kW
                </div>
                <p className="text-xs text-muted-foreground">
                  Combined system capacity
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Payment Plans
                </CardTitle>
                <ClipboardList className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{paymentPlans.length}</div>
                <p className="text-xs text-muted-foreground">
                  Active financing plans
                </p>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Payments</CardTitle>
                <CardDescription>Your next scheduled payments</CardDescription>
              </CardHeader>
              <CardContent>
                {renderUpcomingPayments()}
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full" onClick={() => router.push('/customer/payments')}>
                  View All Payments
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Recent Payments</CardTitle>
                <CardDescription>Your payment history</CardDescription>
              </CardHeader>
              <CardContent>
                {renderRecentPayments()}
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full" onClick={() => router.push('/customer/payments')}>
                  Payment History
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
                </div>
        </TabsContent>
        
        <TabsContent value="installations" className="space-y-6">
          <h2 className="text-xl font-semibold">Your Solar Installations</h2>
          {renderInstallations()}
        </TabsContent>
        
        <TabsContent value="payment-plans" className="space-y-6">
          <h2 className="text-xl font-semibold">Your Payment Plans</h2>
          {renderPaymentPlans()}
        </TabsContent>
        
        <TabsContent value="payments" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Payments</CardTitle>
                <CardDescription>Your next scheduled payments</CardDescription>
            </CardHeader>
            <CardContent>
                {renderUpcomingPayments()}
            </CardContent>
          </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Payments</CardTitle>
                <CardDescription>Your payment history</CardDescription>
            </CardHeader>
            <CardContent>
                {renderRecentPayments()}
            </CardContent>
          </Card>
          </div>
          <Button className="w-full" onClick={() => router.push('/customer/payments')}>
            Go to Payment Center
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  )
}

