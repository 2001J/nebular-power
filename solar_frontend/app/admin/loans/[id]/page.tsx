"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  CreditCard,
  Pencil,
  Trash,
  Clock,
  Loader2,
  Receipt
} from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
import { toast } from "@/components/ui/use-toast"
import { paymentComplianceApi } from "@/lib/api"
import { format } from "date-fns"

// Interface for the payment plan DTO
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
  payments: Payment[];
  nextPaymentDate: string;
  createdAt: string;
  updatedAt: string;
  customerId?: string;
}

// Interface for payments
interface Payment {
  id: number;
  dueDate: string;
  amount: number;
  status: string;
  paymentMethod?: string;
}

// Interface for page params
interface LoanParams {
  id: string;
}

export default function LoanDetailsPage({ params }: { params: LoanParams }) {
  const router = useRouter()
  const [loan, setLoan] = useState<PaymentPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [payments, setPayments] = useState<Payment[]>([])
  const [loadingPayments, setLoadingPayments] = useState(true)

  // Fetch loan details
  useEffect(() => {
    const fetchLoanDetails = async () => {
      try {
        setLoading(true)
        
        // First try to get active payment plans that match this ID
        try {
          // Try to get both active and completed payment plans
          const allPlans = [];
          
          // Fetch active plans
          const activePlans = await paymentComplianceApi.getPaymentPlansByStatusReport("ACTIVE");
          if (activePlans && Array.isArray(activePlans)) {
            allPlans.push(...activePlans);
          }
          
          // Fetch completed plans
          const completedPlans = await paymentComplianceApi.getPaymentPlansByStatusReport("COMPLETED");
          if (completedPlans && Array.isArray(completedPlans)) {
            allPlans.push(...completedPlans);
          }
          
          // Find the plan that matches our ID among all plans
          if (allPlans.length > 0) {
            const matchingPlan = allPlans.find(plan => plan.id === parseInt(params.id));
            if (matchingPlan) {
              console.log("Found matching plan:", matchingPlan);
              
              // Enhance the loan data with customer information
              const enhancedPlan = {
                ...matchingPlan,
                status: matchingPlan.status || 'ACTIVE', // Default to ACTIVE for active plans
                nextPaymentDate: matchingPlan.nextPaymentDate || getNextPaymentDate(matchingPlan),
                createdAt: matchingPlan.createdAt || matchingPlan.startDate
              };
              
              // Try to fetch payments for this loan to determine more accurate status
              // and retain customer information
              try {
                // Try to fetch payments separately
                await fetchPaymentsForLoan(matchingPlan.id, matchingPlan.installationId);
                
                // Now that we have payments, determine the correct status
                const correctStatus = determineLoanStatus(enhancedPlan, payments);
                
                // Apply further customer info enhancements and set next payment date
                const fullyEnhancedPlan = enhanceCustomerInfo(
                  { 
                    ...enhancedPlan, 
                    status: correctStatus,
                    nextPaymentDate: determineNextPaymentDate(
                      { ...enhancedPlan, status: correctStatus },
                      payments
                    )
                  }, 
                  payments
                );
                
                setLoan(fullyEnhancedPlan);
                return;
              } catch (paymentsError) {
                console.error("Error fetching payments for status determination:", paymentsError);
                setLoan(enhancedPlan);
                return;
              }
            }
          }
        } catch (activePlansError) {
          console.error("Error fetching plans:", activePlansError);
        }
        
        // If we couldn't find the plan in active plans, try the regular payment plan report
        const paymentData = await paymentComplianceApi.getPaymentPlanReport(params.id);
        console.log("Payment plan data retrieved:", paymentData);
        
        if (paymentData) {
          // Handle different response formats
          if (Array.isArray(paymentData) && paymentData.length > 0) {
            // If paymentData is an array, we'll identify loan info from the first payment
            const firstPayment = paymentData[0];
            if (firstPayment.paymentPlan) {
              // Extract payment plan info from the first payment and enhance it
              const enhancedPlan = {
                ...firstPayment.paymentPlan,
                status: firstPayment.paymentPlan.status || firstPayment.status || 'ACTIVE',
                nextPaymentDate: firstPayment.paymentPlan.nextPaymentDate || 
                                 getNextUnpaidDueDate(paymentData) || 
                                 getNextPaymentDate(firstPayment.paymentPlan),
                createdAt: firstPayment.paymentPlan.createdAt || firstPayment.paymentPlan.startDate
              };

              // Determine correct status and enhance customer info
              const correctStatus = determineLoanStatus(enhancedPlan, paymentData);
              const fullyEnhancedPlan = enhanceCustomerInfo(
                { 
                  ...enhancedPlan, 
                  status: correctStatus,
                  nextPaymentDate: determineNextPaymentDate(
                    { ...enhancedPlan, status: correctStatus },
                    paymentData
                  )
                }, 
                paymentData
              );
              
              setLoan(fullyEnhancedPlan);
              setPayments(paymentData);
            } else {
              // Just set payments - we'll need to fetch loan info separately
              setPayments(paymentData);
              
              // Try to get loan details from a different endpoint
              try {
                if (firstPayment.installationId) {
                  const loanDetails = await paymentComplianceApi.getCustomerPaymentPlans(firstPayment.installationId);
                  if (loanDetails && Array.isArray(loanDetails) && loanDetails.length > 0) {
                    // Find the matching plan
                    const matchingPlan = loanDetails.find(plan => plan.id === parseInt(params.id));
                    if (matchingPlan) {
                      // Enhance the plan data with derived fields
                      const enhancedPlan = {
                        ...matchingPlan,
                        status: matchingPlan.status || 'ACTIVE',
                        nextPaymentDate: matchingPlan.nextPaymentDate || getNextUnpaidDueDate(paymentData) || getNextPaymentDate(matchingPlan),
                        createdAt: matchingPlan.createdAt || matchingPlan.startDate
                      };
                      setLoan(enhancedPlan);
                    }
                  }
                }
              } catch (loanError) {
                console.error("Error fetching loan details:", loanError);
              }
            }
          } else if (paymentData.payments && Array.isArray(paymentData.payments)) {
            // If paymentData has a payments array inside it, enhance it with derived fields
            const enhancedPlan = {
              ...paymentData,
              status: paymentData.status || 'ACTIVE',
              nextPaymentDate: paymentData.nextPaymentDate || getNextUnpaidDueDate(paymentData.payments) || getNextPaymentDate(paymentData),
              createdAt: paymentData.createdAt || paymentData.startDate
            };
            
            // Determine correct status and enhance customer info
            const correctStatus = determineLoanStatus(enhancedPlan, paymentData.payments);
            const fullyEnhancedPlan = enhanceCustomerInfo(
              { 
                ...enhancedPlan, 
                status: correctStatus,
                nextPaymentDate: determineNextPaymentDate(
                  { ...enhancedPlan, status: correctStatus },
                  paymentData.payments
                )
              }, 
              paymentData.payments
            );
            
            setLoan(fullyEnhancedPlan);
            setPayments(paymentData.payments);
          } else {
            // If paymentData is the loan object itself, enhance it with derived fields
            const enhancedPlan = {
              ...paymentData,
              status: paymentData.status || 'ACTIVE',
              nextPaymentDate: paymentData.nextPaymentDate || getNextPaymentDate(paymentData),
              createdAt: paymentData.createdAt || paymentData.startDate
            };
            
            // Try to fetch payments separately if they're not included
            if (!paymentData.payments || paymentData.payments.length === 0) {
              await fetchPaymentsForLoan(paymentData.id, paymentData.installationId);
              
              // Now determine the correct status with the fetched payments
              const correctStatus = determineLoanStatus(enhancedPlan, payments);
              const fullyEnhancedPlan = enhanceCustomerInfo(
                { 
                  ...enhancedPlan, 
                  status: correctStatus,
                  nextPaymentDate: determineNextPaymentDate(
                    { ...enhancedPlan, status: correctStatus },
                    payments
                  )
                }, 
                payments
              );
              
              setLoan(fullyEnhancedPlan);
            } else {
              // Determine correct status and enhance customer info
              const correctStatus = determineLoanStatus(enhancedPlan, paymentData.payments);
              const fullyEnhancedPlan = enhanceCustomerInfo(
                { 
                  ...enhancedPlan, 
                  status: correctStatus,
                  nextPaymentDate: determineNextPaymentDate(
                    { ...enhancedPlan, status: correctStatus },
                    paymentData.payments
                  )
                }, 
                paymentData.payments
              );
              
              setLoan(fullyEnhancedPlan);
              setPayments(paymentData.payments);
              setLoadingPayments(false);
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

    // Helper function to fetch payments for a loan
    const fetchPaymentsForLoan = async (loanId, installationId) => {
      try {
        // Try to get payments via the installation ID first
        if (installationId) {
          // Create date range - use a wide range to get all payments
          const startDate = new Date();
          startDate.setFullYear(startDate.getFullYear() - 5); // 5 years ago
          const endDate = new Date();
          endDate.setFullYear(endDate.getFullYear() + 5); // 5 years in future
          
          // Use the formatted dates for the API call
          const formattedStartDate = startDate.toISOString().split('T')[0];
          const formattedEndDate = endDate.toISOString().split('T')[0];
          
          // Add timestamp to prevent caching
          const timestamp = new Date().getTime();
          
          // Get payment history with date range and timestamp
          const paymentHistoryData = await paymentComplianceApi.getPaymentHistoryReport(
            installationId, 
            formattedStartDate,
            formattedEndDate,
            timestamp
          );
          
          if (paymentHistoryData && Array.isArray(paymentHistoryData) && paymentHistoryData.length > 0) {
            // Filter to only show payments for this specific plan if needed
            const filteredPayments = paymentHistoryData.filter(payment => 
              !payment.paymentPlanId || payment.paymentPlanId === parseInt(params.id)
            );
            
            if (filteredPayments.length > 0) {
              setPayments(filteredPayments);
              setLoadingPayments(false);
              return;
            }
          }
          
          // If no payments found in history, try customer installation payments as fallback
          const paymentsData = await paymentComplianceApi.getCustomerInstallationPayments(installationId, new Date().getTime());
          if (paymentsData && Array.isArray(paymentsData)) {
            // Filter payments for this specific plan if paymentPlanId is available
            const filteredPayments = paymentsData.filter(payment => 
              !payment.paymentPlanId || payment.paymentPlanId === parseInt(params.id)
            );
            
            if (filteredPayments.length > 0) {
              setPayments(filteredPayments);
              setLoadingPayments(false);
              return;
            }
          }
        }
        
        // Last resort: try payment plan report directly
        const planPayments = await paymentComplianceApi.getPaymentPlanReport(params.id, new Date().getTime());
        if (planPayments && planPayments.payments && planPayments.payments.length > 0) {
          setPayments(planPayments.payments);
        } else {
          console.log("No payments found for this loan through any method");
          setPayments([]);
        }
      } catch (paymentsError) {
        console.error("Error fetching payments:", paymentsError);
      } finally {
        setLoadingPayments(false);
      }
    };
    
    // Helper function to calculate the next payment date based on frequency
    const getNextPaymentDate = (plan) => {
      if (!plan || !plan.frequency || !plan.startDate) {
        return new Date().toISOString();
      }
      
      // Start with the plan start date
      const startDate = new Date(plan.startDate);
      const today = new Date();
      
      // If start date is in the future, that's the first payment
      if (startDate > today) {
        return startDate.toISOString();
      }
      
      // Calculate the next payment date based on frequency
      let nextDate = new Date(startDate);
      const frequencyMap = {
        'MONTHLY': 1,
        'QUARTERLY': 3,
        'SEMI_ANNUALLY': 6,
        'ANNUALLY': 12,
        'WEEKLY': 0 // Special case for weekly
      };
      
      const monthsToAdd = frequencyMap[plan.frequency] || 1;
      
      // For weekly, we use days instead of months
      if (plan.frequency === 'WEEKLY') {
        while (nextDate <= today) {
          nextDate.setDate(nextDate.getDate() + 7);
        }
      } else {
        // For other frequencies, use months
        while (nextDate <= today) {
          nextDate.setMonth(nextDate.getMonth() + monthsToAdd);
        }
      }
      
      return nextDate.toISOString();
    };
    
    // Helper function to find the next unpaid due date from a list of payments
    const getNextUnpaidDueDate = (payments) => {
      if (!Array.isArray(payments) || payments.length === 0) {
        return null;
      }
      
      const today = new Date();
      
      // Find the first payment that is scheduled or pending and due in the future
      const unpaidFuturePayments = payments
        .filter(payment => 
          (payment.status === 'SCHEDULED' || payment.status === 'PENDING') && 
          new Date(payment.dueDate) > today
        )
        .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
      
      return unpaidFuturePayments.length > 0 ? unpaidFuturePayments[0].dueDate : null;
    };

    // Helper function to determine loan status based on payment data
    const determineLoanStatus = (loan, paymentsData) => {
      // If the loan has a defined status and it's not ACTIVE, return it
      if (loan.status && loan.status !== 'ACTIVE') {
        return loan.status;
      }
      
      // If remaining amount is 0 or less, mark as completed
      if (loan.remainingAmount <= 0) {
        return 'COMPLETED';
      }
      
      // If all payments are paid, mark as completed
      if (paymentsData && Array.isArray(paymentsData) && paymentsData.length > 0) {
        const allPaid = paymentsData.every(payment => payment.status === 'PAID');
        if (allPaid) {
          return 'COMPLETED';
        }
        
        // If any payment is overdue, mark as late
        const anyOverdue = paymentsData.some(payment => 
          payment.status === 'OVERDUE' || 
          payment.status === 'GRACE_PERIOD' || 
          payment.status === 'SUSPENSION_PENDING'
        );
        if (anyOverdue) {
          return 'DEFAULTED';
        }
      }
      
      // Default to active if no other condition matches
      return 'ACTIVE';
    };
    
    // Helper function to determine the next payment due date
    const determineNextPaymentDate = (loan, paymentsData) => {
      // If loan is completed or paid, there is no next payment
      if (loan.status === 'COMPLETED' || loan.status === 'PAID' || loan.remainingAmount <= 0) {
        return null;
      }
      
      // If we have payment data, find the first unpaid/scheduled payment
      if (paymentsData && Array.isArray(paymentsData) && paymentsData.length > 0) {
        // Sort payments by due date
        const sortedPayments = [...paymentsData].sort((a, b) => 
          new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
        );
        
        // Find the first payment that's not paid
        const nextUnpaidPayment = sortedPayments.find(payment => 
          payment.status === 'PENDING' || 
          payment.status === 'SCHEDULED' || 
          payment.status === 'DUE_TODAY'
        );
        
        if (nextUnpaidPayment) {
          return nextUnpaidPayment.dueDate;
        }
      }
      
      // If no specific next payment, return null
      return null;
    };
    
    // Helper function to preserve and enhance customer information
    const enhanceCustomerInfo = (loan, paymentsData) => {
      if (!loan) return loan;
      
      // Ensure we have customer name and email
      const enhancedLoan = { ...loan };
      
      // Try to extract customer info from payments if not in loan
      if ((!enhancedLoan.customerName || !enhancedLoan.customerEmail) && 
          paymentsData && paymentsData.length > 0) {
        
        // Find the first payment with customer info
        const paymentWithCustomerInfo = paymentsData.find(
          payment => payment.customerName || payment.customerEmail
        );
        
        if (paymentWithCustomerInfo) {
          enhancedLoan.customerName = enhancedLoan.customerName || 
                                    paymentWithCustomerInfo.customerName || 
                                    `Customer #${enhancedLoan.customerId || enhancedLoan.installationId || "Unknown"}`;
          
          enhancedLoan.customerEmail = enhancedLoan.customerEmail || 
                                    paymentWithCustomerInfo.customerEmail;
        }
      }
      
      // Ensure we have a customer name
      if (!enhancedLoan.customerName) {
        enhancedLoan.customerName = `Customer #${enhancedLoan.customerId || enhancedLoan.installationId || "Unknown"}`;
      }
      
      return enhancedLoan;
    };

    fetchLoanDetails();
  }, [params.id])

  // Format status badge display - update to handle "COMPLETED" status more visibly
  const getStatusBadge = (status: string) => {
    // Convert status to uppercase for case-insensitive comparison
    const normalizedStatus = status.toUpperCase();
    
    switch (normalizedStatus) {
      case "ACTIVE":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Active</Badge>
      case "COMPLETED":
      case "PAID":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-bold">Completed</Badge>
      case "CANCELLED":
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Cancelled</Badge>
      case "DEFAULTED":
      case "LATE":
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Defaulted</Badge>
      case "PENDING":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending</Badge>
      case "SCHEDULED":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Scheduled</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  // Format frequency display
  const formatFrequency = (frequency: string) => {
    switch (frequency) {
      case "WEEKLY":
        return "Weekly";
      case "MONTHLY":
        return "Monthly";
      case "QUARTERLY":
        return "Quarterly";
      case "SEMI_ANNUALLY":
        return "Semi-Annually";
      case "ANNUALLY":
        return "Annually";
      default:
        return frequency;
    }
  }

  // Calculate progress percentage
  const getProgressPercentage = () => {
    if (!loan) return 0
    
    // Handle edge case to avoid division by zero
    if (loan.totalAmount === 0) return 100;
    
    return 100 - Math.round((loan.remainingAmount / loan.totalAmount) * 100)
  }

  // Determine what field to use to show the total installments
  // If we have the numberOfPayments field, use that as it matches the actual number
  // Otherwise fall back to totalInstallments with adjustment
  const getActualInstallmentCount = () => {
    if (loan.numberOfPayments) {
      return loan.numberOfPayments;
    } else if (loan.totalInstallments && loan.totalInstallments > 0) {
      // If showing totalInstallments which includes registration payment, subtract 1
      return loan.totalInstallments > 1 ? loan.totalInstallments - 1 : loan.totalInstallments;
    } else if (payments && payments.length > 0) {
      // If we only have raw payments, count them but exclude registration payments
      return payments.filter(p => p.status !== 'REGISTRATION').length;
    }
    return 0;
  }

  if (loading) {
    return (
      <div className="container mx-auto py-10 flex flex-col items-center justify-center h-[50vh]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading loan details...</p>
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
            <BreadcrumbPage>Loan #{params.id}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Loan Details {loan.name && `- ${loan.name}`}
            </h1>
            <p className="text-muted-foreground">
              Payment plan for {loan.customerName || `Installation #${loan.installationId}`}
            </p>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push(`/admin/loans/${params.id}/payments`)}>
              <Receipt className="mr-2 h-4 w-4" />
              Payments
            </Button>
            <Button variant="outline" onClick={() => router.push(`/admin/loans/${params.id}/edit`)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>
            <Button variant="default" onClick={() => router.push("/admin/loans")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${loan.totalAmount?.toLocaleString() || 0}</div>
              <div className="mt-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">Repayment Progress</span>
                  <span className="text-sm font-medium">{getProgressPercentage()}%</span>
                </div>
                <Progress value={getProgressPercentage()} className="h-2" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Monthly Payment</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${loan.monthlyPayment?.toLocaleString() || loan.installmentAmount?.toLocaleString() || 0}</div>
              <p className="text-xs text-muted-foreground">
                {formatFrequency(loan.frequency)} installments
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Remaining Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${loan.remainingAmount?.toLocaleString() || 0}</div>
              <p className="text-xs text-muted-foreground">
                {loan.totalAmount > 0 ? Math.round((loan.remainingAmount / loan.totalAmount) * 100) : 0}% of total loan
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Loan Details</CardTitle>
              <CardDescription>Complete information about this loan</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium">Status</h4>
                  <div className="mt-1">{getStatusBadge(loan.status)}</div>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium">Interest Rate</h4>
                  <p className="mt-1">{loan.interestRate || 0}%</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium">Start Date</h4>
                  <p className="mt-1">{loan.startDate ? format(new Date(loan.startDate), 'PPP') : 'N/A'}</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium">End Date</h4>
                  <p className="mt-1">{loan.endDate ? format(new Date(loan.endDate), 'PPP') : 'N/A'}</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium">Next Payment Due</h4>
                  <p className="mt-1">
                    {loan.nextPaymentDate ? format(new Date(loan.nextPaymentDate), 'PPP') : 
                      payments && payments.length > 0 ? (
                        (() => {
                          // Check for the first unpaid/scheduled payment
                          const sortedPayments = [...payments]
                            .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
                          
                          const nextUnpaidPayment = sortedPayments.find(payment => 
                            payment.status === 'PENDING' || 
                            payment.status === 'SCHEDULED' || 
                            payment.status === 'DUE_TODAY'
                          );
                          
                          return nextUnpaidPayment ? format(new Date(nextUnpaidPayment.dueDate), 'PPP') : 'N/A';
                        })()
                      ) : 'N/A'
                    }
                  </p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium">Payment Frequency</h4>
                  <p className="mt-1">{formatFrequency(loan.frequency)}</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium">Total Installments</h4>
                  <p className="mt-1">{(loan.numberOfPayments || 0)}</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium">Remaining Installments</h4>
                  <p className="mt-1">{loan.remainingInstallments || 0}</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium">Late Fee</h4>
                  <p className="mt-1">${loan.lateFeeAmount || 0}</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium">Grace Period</h4>
                  <p className="mt-1">{loan.gracePeriodDays || 0} days</p>
                </div>

                <div>
                  <h4 className="text-sm font-medium">Installment Amount</h4>
                  <p className="mt-1">${loan.installmentAmount || 0}</p>
                </div>

                <div>
                  <h4 className="text-sm font-medium">Created Date</h4>
                  <p className="mt-1">{loan.createdAt ? format(new Date(loan.createdAt), 'PPP') : 'N/A'}</p>
                </div>
              </div>
              
              {loan.description && (
                <>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-medium mb-2">Description</h4>
                    <p className="text-sm">{loan.description}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Customer Information</CardTitle>
              <CardDescription>Linked to this payment plan</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="text-sm font-medium">Customer Name</h4>
                <p className="mt-1">{loan.customerName || 'Not available'}</p>
              </div>
              
              <div>
                <h4 className="text-sm font-medium">Customer Email</h4>
                <p className="mt-1">{loan.customerEmail || 'Not available'}</p>
              </div>
              
              <div>
                <h4 className="text-sm font-medium">Installation ID</h4>
                <p className="mt-1">#{loan.installationId || 'N/A'}</p>
              </div>
              
              <div className="pt-4">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => router.push(`/admin/installations/${loan.installationId}`)}
                >
                  View Installation
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Scheduled Payments</CardTitle>
              <CardDescription>Upcoming payment installments</CardDescription>
            </div>
            <Button variant="outline" onClick={() => router.push(`/admin/loans/${params.id}/payments`)}>
              View All
            </Button>
          </CardHeader>
          <CardContent>
            {loadingPayments ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : payments.length === 0 ? (
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
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.slice(0, 5).map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        {payment.dueDate ? format(new Date(payment.dueDate), 'PP') : 'N/A'}
                      </TableCell>
                      <TableCell>${payment.amount?.toLocaleString() || 0}</TableCell>
                      <TableCell>
                        {getStatusBadge(payment.status)}
                      </TableCell>
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
    </div>
  )
}
