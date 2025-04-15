"use client"

import { useState, useEffect } from "react"
import { ArrowUpDown, Calendar, CreditCard, Download, MoreHorizontal, Search, AlertCircle, Clock } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { toast } from "@/components/ui/use-toast"
import { format, parseISO } from "date-fns"
import { useAuth } from "@/hooks/auth"
import { paymentApi, serviceControlApi } from "@/lib/api"

export default function PaymentsPage() {
  const { user } = useAuth()
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Payment data
  const [paymentHistory, setPaymentHistory] = useState([])
  const [upcomingPayments, setUpcomingPayments] = useState([])
  const [paymentMethod, setPaymentMethod] = useState({ type: "Credit Card", lastFour: "4242", expiry: "12/2025" })
  const [paymentPlan, setPaymentPlan] = useState({ name: "Standard", amount: 149.99 })
  const [totalPaid, setTotalPaid] = useState(0)

  // Service status
  const [serviceStatus, setServiceStatus] = useState(null)
  const [gracePeriod, setGracePeriod] = useState(7)
  const [daysUntilSuspension, setDaysUntilSuspension] = useState(null)
  const [hasOverduePayments, setHasOverduePayments] = useState(false)

  // Fetch payment data
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return

      try {
        setLoading(true)
        setError(null)

        // Fetch payment history
        const historyResponse = await paymentApi.getPaymentHistory()
        setPaymentHistory(historyResponse.content || [])

        // Calculate total paid
        const total = historyResponse.content?.reduce((sum, payment) => {
          return payment.status === "PAID" ? sum + payment.amount : sum
        }, 0) || 0
        setTotalPaid(total)

        // Fetch upcoming payments
        const upcomingResponse = await paymentApi.getUpcomingPayments()
        setUpcomingPayments(upcomingResponse.content || [])

        // Fetch payment dashboard data
        try {
          const dashboardResponse = await paymentApi.getPaymentDashboard()
          if (dashboardResponse) {
            // If dashboard data includes payment method and plan, use it
            if (dashboardResponse.paymentMethod) {
              setPaymentMethod(dashboardResponse.paymentMethod)
            }
            if (dashboardResponse.paymentPlan) {
              setPaymentPlan(dashboardResponse.paymentPlan)
            }
          }
        } catch (err) {
          console.error("Error fetching payment dashboard:", err)

          // Fall back to separate API calls for payment methods and plan
          try {
            const paymentMethodResponse = await paymentApi.getCustomerPaymentMethods(user.id)
            if (paymentMethodResponse.defaultMethod) {
              setPaymentMethod(paymentMethodResponse.defaultMethod)
            }
          } catch (methodErr) {
            console.error("Error fetching payment methods:", methodErr)
          }

          try {
            const paymentPlanResponse = await paymentApi.getCustomerPaymentPlan(user.id)
            if (paymentPlanResponse) {
              setPaymentPlan(paymentPlanResponse)
            }
          } catch (planErr) {
            console.error("Error fetching payment plan:", planErr)
          }
        }

        // Fetch service status for all user installations
        try {
          const installationsResponse = await serviceControlApi.getStatusesByUserId(user.id)
          if (installationsResponse && installationsResponse.length > 0) {
            const primaryInstallation = installationsResponse[0]
            setServiceStatus(primaryInstallation)

            // If service is suspended for payment, check details
            if (primaryInstallation.status === "SUSPENDED_PAYMENT") {
              setHasOverduePayments(true)
            } else {
              // Check if there are overdue payments
              const installation = primaryInstallation.installation.id
              const overdueCheck = await serviceControlApi.hasOverduePayments(installation)
              setHasOverduePayments(overdueCheck)

              if (overdueCheck) {
                // Get days until suspension
                const daysResponse = await serviceControlApi.getDaysUntilSuspension(installation)
                setDaysUntilSuspension(daysResponse)

                // Get grace period
                const gracePeriodResponse = await serviceControlApi.getGracePeriod(installation)
                setGracePeriod(gracePeriodResponse)
              }
            }
          }
        } catch (err) {
          console.error("Error fetching service status:", err)
        }

      } catch (err) {
        console.error("Error fetching payment data:", err)
        setError("Failed to load payment information. Please try again later.")
        toast({
          title: "Error",
          description: "Failed to load payment information",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user])

  // Filter payments based on search
  const filteredPayments = paymentHistory.filter(
    (payment) =>
      payment.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.date?.includes(searchTerm)
  )

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  // Format date
  const formatDate = (dateString) => {
    try {
      return format(new Date(dateString), "MMM d, yyyy")
    } catch (e) {
      return dateString
    }
  }

  // Get status badge
  const getStatusBadge = (status) => {
    switch (status) {
      case "PAID":
        return <Badge variant="success">Paid</Badge>
      case "PENDING":
        return <Badge variant="outline">Pending</Badge>
      case "OVERDUE":
        return <Badge variant="destructive">Overdue</Badge>
      case "FAILED":
        return <Badge variant="destructive">Failed</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  // Get service status badge
  const getServiceStatusBadge = () => {
    if (!serviceStatus) return null

    switch (serviceStatus.status) {
      case "ACTIVE":
        return <Badge variant="success">Active</Badge>
      case "SUSPENDED_PAYMENT":
        return <Badge variant="destructive">Suspended (Payment)</Badge>
      case "SUSPENDED_SECURITY":
        return <Badge variant="destructive">Suspended (Security)</Badge>
      case "SUSPENDED_MAINTENANCE":
        return <Badge variant="outline">Suspended (Maintenance)</Badge>
      default:
        return <Badge variant="secondary">{serviceStatus.status}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Payments</h1>
          <p className="text-muted-foreground">Loading payment information...</p>
        </div>
        <div className="flex items-center justify-center p-8">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Payments</h1>
        <p className="text-muted-foreground">Manage your payment history and upcoming payments.</p>
      </div>

      {/* Service status warning */}
      {serviceStatus?.status === "SUSPENDED_PAYMENT" && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Service Suspended</AlertTitle>
          <AlertDescription>
            Your solar service has been suspended due to overdue payments. Please make a payment to restore your service immediately.
          </AlertDescription>
          <Button variant="destructive" className="mt-2" size="sm" asChild>
            <a href="#pay-now">Pay Now</a>
          </Button>
        </Alert>
      )}

      {/* Grace period warning */}
      {hasOverduePayments && serviceStatus?.status !== "SUSPENDED_PAYMENT" && daysUntilSuspension !== null && (
        <Alert variant="warning" className="mb-4 border-amber-500 text-amber-800">
          <Clock className="h-4 w-4" />
          <AlertTitle>Payment Overdue</AlertTitle>
          <AlertDescription>
            <p>Your payment is overdue. Service will be automatically suspended in {daysUntilSuspension} days if payment is not received.</p>
            <div className="mt-2">
              <div className="flex items-center justify-between mb-1 text-xs">
                <span>Grace Period</span>
                <span>{daysUntilSuspension} of {gracePeriod} days remaining</span>
              </div>
              <Progress value={(gracePeriod - daysUntilSuspension) / gracePeriod * 100} className="h-2" />
            </div>
          </AlertDescription>
          <Button variant="outline" className="mt-2" size="sm" asChild>
            <a href="#pay-now">Pay Now</a>
          </Button>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Next Payment</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {upcomingPayments.length > 0
                ? formatCurrency(upcomingPayments[0].amount)
                : formatCurrency(paymentPlan.amount)}
            </div>
            <p className="text-xs text-muted-foreground">
              Due on {upcomingPayments.length > 0
                ? formatDate(upcomingPayments[0].dueDate)
                : "N/A"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Payment Method</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{paymentMethod.type} ****{paymentMethod.lastFour}</div>
            <p className="text-xs text-muted-foreground">Expires {paymentMethod.expiry}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Plan</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{paymentPlan.name}</div>
            <p className="text-xs text-muted-foreground">{formatCurrency(paymentPlan.amount)}/month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Service Status</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getServiceStatusBadge()}</div>
            <p className="text-xs text-muted-foreground">
              {serviceStatus?.status === "ACTIVE"
                ? "Your service is active"
                : serviceStatus?.statusReason || "Status information"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="history" className="w-full">
        <TabsList>
          <TabsTrigger value="history">Payment History</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming Payments</TabsTrigger>
        </TabsList>
        <TabsContent value="history" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
              <CardDescription>View all your past payments.</CardDescription>
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by invoice number or date..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
              </div>
            </CardHeader>
            <CardContent>
              {paymentHistory.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No payment history found.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <Button variant="ghost" className="p-0 hover:bg-transparent">
                          <span>Date</span>
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                        </Button>
                      </TableHead>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPayments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>{formatDate(payment.date)}</TableCell>
                        <TableCell>{payment.invoiceNumber}</TableCell>
                        <TableCell>{formatCurrency(payment.amount)}</TableCell>
                        <TableCell>
                          {getStatusBadge(payment.status)}
                        </TableCell>
                        <TableCell>{payment.method}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem
                                onClick={() => navigator.clipboard.writeText(payment.invoiceNumber)}
                              >
                                Copy Invoice ID
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={async () => {
                                  try {
                                    // Show loading toast
                                    toast({
                                      title: "Downloading Receipt",
                                      description: "Please wait while we prepare your receipt...",
                                    });

                                    // Get receipt from API
                                    const receipt = await paymentApi.getPaymentReceipt(payment.id);

                                    // In a real implementation, this would create a download
                                    // For demo purposes, show success toast instead
                                    toast({
                                      title: "Receipt Ready",
                                      description: `Receipt for payment #${payment.invoiceNumber} downloaded.`,
                                      variant: "success",
                                    });
                                  } catch (error) {
                                    toast({
                                      title: "Error",
                                      description: "Could not download receipt. Please try again later.",
                                      variant: "destructive",
                                    });
                                  }
                                }}
                              >
                                Download Receipt
                              </DropdownMenuItem>
                              <DropdownMenuItem>View Details</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="upcoming" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Payments</CardTitle>
              <CardDescription>View your scheduled payments.</CardDescription>
            </CardHeader>
            <CardContent>
              {upcomingPayments.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No upcoming payments found.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {upcomingPayments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>{formatDate(payment.dueDate)}</TableCell>
                        <TableCell>{payment.invoiceNumber}</TableCell>
                        <TableCell>{formatCurrency(payment.amount)}</TableCell>
                        <TableCell>
                          {getStatusBadge(payment.status)}
                        </TableCell>
                        <TableCell>{payment.method}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            id="pay-now"
                            onClick={async () => {
                              try {
                                toast({
                                  title: "Processing Payment",
                                  description: "Please wait while we process your payment...",
                                })

                                // Call the make payment API
                                await paymentApi.makePayment({
                                  paymentId: payment.id,
                                  amount: payment.amount,
                                  method: paymentMethod.type,
                                  description: `Payment for invoice #${payment.invoiceNumber}`
                                });

                                // In a real implementation, this would redirect to a payment processor
                                // For demo purposes, show success toast and refresh data
                                toast({
                                  title: "Payment Successful",
                                  description: `Payment of ${formatCurrency(payment.amount)} was processed successfully.`,
                                  variant: "success",
                                })

                                // Refresh data
                                window.location.reload();
                              } catch (error) {
                                toast({
                                  title: "Payment Failed",
                                  description: "There was an error processing your payment. Please try again.",
                                  variant: "destructive",
                                })
                              }
                            }}
                          >
                            Pay Now
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <div className="text-xs text-muted-foreground">
                Automatic payments will be processed on the due date using your default payment method.
              </div>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

