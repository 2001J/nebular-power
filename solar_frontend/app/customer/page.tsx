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
import { paymentApi, installationApi } from "@/lib/api"
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
            <Badge variant={installation.status === 'ACTIVE' ? 'default' : 'secondary'}>
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

  const renderPaymentHistory = () => {
    if (paymentHistory.length === 0) {
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
            <TableHead>Payment Date</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Payment Method</TableHead>
            <TableHead>Transaction ID</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paymentHistory.slice(0, 5).map((payment) => (
            <TableRow key={payment.id}>
              <TableCell>{formatDate(payment.paidAt || payment.paymentDate || payment.dueDate)}</TableCell>
              <TableCell>{formatCurrency(payment.amount)}</TableCell>
              <TableCell>{payment.paymentMethod || 'N/A'}</TableCell>
              <TableCell className="font-mono text-xs">{payment.transactionId || 'N/A'}</TableCell>
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
            View and manage your solar installation and payments
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="installations">Installations</TabsTrigger>
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
                  System Health
                </CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">Good</div>
                <p className="text-xs text-muted-foreground">
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
          <h2 className="text-xl font-semibold">Your Solar Installations</h2>
          {renderInstallations()}
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
                <CardTitle>Payment History</CardTitle>
                <CardDescription>Your payment history</CardDescription>
            </CardHeader>
            <CardContent>
                {renderPaymentHistory()}
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

