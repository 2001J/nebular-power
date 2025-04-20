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
  Download
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

  // Fetch loan details
  useEffect(() => {
    const fetchLoanDetails = async () => {
      try {
        setLoading(true)
        
        // Get the payment plan details
        const loanData = await paymentComplianceApi.getPaymentPlanReport(params.id)
        
        if (loanData) {
          setLoan(loanData)
          
          // Try to get payments for the loan
          try {
            const paymentData = await paymentComplianceApi.getPaymentPlanReport(params.id)
            if (paymentData && paymentData.payments) {
              setPayments(paymentData.payments)
            }
          } catch (error) {
            console.error("Error fetching payment data:", error)
          }
        } else {
          toast({
            title: "Error",
            description: "Could not find loan details",
            variant: "destructive",
          })
        }
      } catch (error) {
        console.error("Error fetching loan details:", error)
        toast({
          title: "Error",
          description: "Failed to load loan details",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchLoanDetails()
  }, [params.id])

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
              <CardTitle>Payment Schedule</CardTitle>
              <CardDescription>All payments for this loan</CardDescription>
            </div>
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <p className="text-muted-foreground">No payment records found</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => router.push(`/admin/loans/${params.id}/payments/new`)}
              >
                Record Payment
              </Button>
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
                {payments.map((payment) => (
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
