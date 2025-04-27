"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  CreditCard,
  Plus,
  Receipt,
  Loader2,
  Download,
  RefreshCw
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { toast } from "@/components/ui/use-toast"
import { paymentComplianceApi } from "@/lib/api"
import { format } from "date-fns"

interface PaymentParams {
  id: string;
}

export default function LoanPaymentsPage({ params }: { params: PaymentParams }) {
  const router = useRouter()
  const [loan, setLoan] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [payments, setPayments] = useState<any[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [showOnlyPaid, setShowOnlyPaid] = useState(true)

  // Function to fetch payments
  const fetchPayments = async (installationId, timestamp) => {
    try {
      // First try direct payment history report approach
      // Create date range - use a wide range to get all payments
      const startDate = new Date();
      startDate.setFullYear(startDate.getFullYear() - 5); // 5 years ago
      const endDate = new Date();
      endDate.setFullYear(endDate.getFullYear() + 5); // 5 years in future
      
      // Use the formatted dates for the API call
      const formattedStartDate = startDate.toISOString().split('T')[0];
      const formattedEndDate = endDate.toISOString().split('T')[0];
      
      // Get payment history with date range and timestamp
      const paymentHistoryData = await paymentComplianceApi.getPaymentHistoryReport(
        installationId, 
        formattedStartDate,
        formattedEndDate,
        timestamp
      );
      
      if (paymentHistoryData && Array.isArray(paymentHistoryData) && paymentHistoryData.length > 0) {
        // Filter to only show payments for this specific payment plan if needed
        const filteredPayments = paymentHistoryData.filter(payment => 
          !payment.paymentPlanId || payment.paymentPlanId === parseInt(params.id)
        );
        
        if (filteredPayments.length > 0) {
          console.log("Found payments via paymentHistoryReport:", filteredPayments);
          return filteredPayments;
        }
      }
      
      // Try alternate endpoint as fallback
      const altPaymentData = await paymentComplianceApi.getCustomerInstallationPayments(installationId, timestamp);
      if (altPaymentData && Array.isArray(altPaymentData) && altPaymentData.length > 0) {
        // Filter to only show payments for this specific payment plan if needed
        const filteredPayments = altPaymentData.filter(payment => 
          !payment.paymentPlanId || payment.paymentPlanId === parseInt(params.id)
        );
        
        if (filteredPayments.length > 0) {
          console.log("Found payments via getCustomerInstallationPayments:", filteredPayments);
          return filteredPayments;
        }
      }
      
      // Last resort: check if loan data itself has payments
      const paymentPlanData = await paymentComplianceApi.getPaymentPlanReport(params.id, timestamp);
      if (paymentPlanData && paymentPlanData.payments && Array.isArray(paymentPlanData.payments) && paymentPlanData.payments.length > 0) {
        console.log("Found payments in payment plan data:", paymentPlanData.payments);
        return paymentPlanData.payments;
      }
      
      // If all methods failed, return empty array
      return [];
    } catch (error) {
      console.error("Error fetching payments:", error);
      return [];
    }
  };

  // Refresh function to force reload of payment data
  const refreshPaymentData = async () => {
    try {
      setRefreshing(true);
      
      if (!loan || !loan.installationId) {
        toast({
          title: "Error",
          description: "Missing installation information. Cannot refresh payments.",
          variant: "destructive",
        });
        setRefreshing(false);
        return;
      }
      
      const timestamp = new Date().getTime();
      const refreshedPayments = await fetchPayments(loan.installationId, timestamp);
      
      if (refreshedPayments.length > 0) {
        setPayments(refreshedPayments);
        toast({
          title: "Refreshed",
          description: `Found ${refreshedPayments.length} payments`,
        });
      } else {
        toast({
          title: "No payments found",
          description: "Could not find any payment records",
          variant: "warning",
        });
      }
    } catch (error) {
      console.error("Error refreshing payment data:", error);
      toast({
        title: "Error",
        description: "Failed to refresh payment data",
        variant: "destructive",
      });
    } finally {
      setRefreshing(false);
    }
  };

  // Fetch loan details
  useEffect(() => {
    const fetchLoanDetails = async () => {
      try {
        setLoading(true);
        
        // Get the payment plan details with timestamp to avoid caching
        const timestamp = new Date().getTime();
        const loanData = await paymentComplianceApi.getPaymentPlanReport(params.id, timestamp);
        
        if (loanData) {
          setLoan(loanData);
          
          // Only try to fetch payments if we have an installation ID
          if (loanData.installationId) {
            const paymentData = await fetchPayments(loanData.installationId, timestamp);
            setPayments(paymentData);
          } else {
            // Try to get payments directly from the loan data
            if (loanData.payments && Array.isArray(loanData.payments) && loanData.payments.length > 0) {
              setPayments(loanData.payments);
            } else {
              // Last try: get payments by ID only
              const backupPaymentData = await fetchPayments(params.id, timestamp);
              setPayments(backupPaymentData);
            }
          }
        } else {
          toast({
            title: "Error",
            description: "Could not find loan details",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Error fetching loan details:", error);
        toast({
          title: "Error",
          description: "Failed to load loan details",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchLoanDetails();
  }, [params.id]);

  // Format status badge display
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PAID":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Paid</Badge>
      case "PENDING":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending</Badge>
      case "SCHEDULED":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Scheduled</Badge>
      case "OVERDUE":
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Overdue</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  // Filter payments based on the showOnlyPaid state
  const filteredPayments = showOnlyPaid 
    ? payments.filter(payment => payment.status === "PAID")
    : payments;

  if (loading) {
    return (
      <div className="container mx-auto py-10 flex flex-col items-center justify-center h-[50vh]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading payment data...</p>
      </div>
    )
  }

  if (!loan) {
    return (
      <div className="container mx-auto py-10">
        <div className="flex flex-col items-center justify-center h-[50vh]">
          <p className="text-lg mb-4">Loan not found</p>
          <Button onClick={() => router.push("/admin/loans")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Return to Loans
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6">
      <Breadcrumb className="mb-4">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/admin">Admin</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/admin/loans">Loans</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href={`/admin/loans/${params.id}`}>Loan #{params.id}</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Payments</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Payment History</h1>
          <p className="text-muted-foreground">
            All payments for loan #{params.id} - {loan.customerName || `Installation #${loan.installationId}`}
          </p>
        </div>

        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setShowOnlyPaid(!showOnlyPaid)}
          >
            {showOnlyPaid ? "Show All" : "Show Paid Only"}
          </Button>
          <Button variant="outline" onClick={refreshPaymentData} disabled={refreshing}>
            {refreshing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Refresh
          </Button>
          <Button onClick={() => router.push(`/admin/loans/${params.id}/payments/new`)}>
            <Plus className="mr-2 h-4 w-4" />
            Record Payment
          </Button>
          <Button variant="outline" onClick={() => router.push(`/admin/loans/${params.id}`)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Loan
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Payment History</CardTitle>
              <CardDescription>
                {showOnlyPaid ? "Showing paid payments only" : "All payments for this loan"}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowOnlyPaid(!showOnlyPaid)}
              >
                {showOnlyPaid ? "Show All" : "Show Paid Only"}
              </Button>
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredPayments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              {payments.length > 0 && showOnlyPaid ? (
                <>
                  <p className="text-muted-foreground">No paid payments found</p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => setShowOnlyPaid(false)}
                  >
                    Show All Payments
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-muted-foreground">No payment records found</p>
                  <div className="flex gap-2 mt-4">
                    <Button 
                      variant="outline" 
                      onClick={refreshPaymentData}
                      disabled={refreshing}
                    >
                      {refreshing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                      Refresh Data
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => router.push(`/admin/loans/${params.id}/payments/new`)}
                    >
                      Record Payment
                    </Button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Payment ID</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment Method</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>#{payment.id}</TableCell>
                    <TableCell>
                      {payment.dueDate ? format(new Date(payment.dueDate), 'PP') : 'N/A'}
                    </TableCell>
                    <TableCell>${payment.amount?.toLocaleString() || 0}</TableCell>
                    <TableCell>
                      {getStatusBadge(payment.status)}
                    </TableCell>
                    <TableCell>{payment.paymentMethod || 'N/A'}</TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => router.push(`/admin/loans/${params.id}/payments/${payment.id}`)}
                      >
                        Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
