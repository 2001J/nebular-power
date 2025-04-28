"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/auth-provider";
import { paymentApi, installationApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import PaymentDialog from "./payment-dialog";
import { 
  AlertCircle, 
  ArrowLeft,
  CreditCard,
  Home, 
  Receipt,
  Wallet,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

// Interface for payment plan
interface PaymentPlan {
  id: number;
  installationId: number;
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

// Interface for payments
interface Payment {
  id: number;
  dueDate: string;
  amount: number;
  status: string;
  paymentMethod?: string;
  paymentDate?: string;
  installationId?: number;
  description?: string;
}

// Interface for installation
interface Installation {
  id: number;
  name: string;
  address?: string;
  status?: string;
}

// Interface for payment dashboard data
interface PaymentDashboard {
  nextPaymentDueDate: string;
  nextPaymentAmount: number;
  paymentHistory: Payment[];
  upcomingPayments: Payment[];
  activePlan?: PaymentPlan;
  totalPaid: number;
  remainingBalance: number;
  paymentStatus: string;
}

export default function PaymentsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeLoan, setActiveLoan] = useState<PaymentPlan | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<Payment[]>([]);
  const [upcomingPayments, setUpcomingPayments] = useState<Payment[]>([]);
  const [installations, setInstallations] = useState<Installation[]>([]);
  const [allPaymentPlans, setAllPaymentPlans] = useState<PaymentPlan[]>([]);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [selectedInstallation, setSelectedInstallation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loadingPayments, setLoadingPayments] = useState(true);
  const [dashboardData, setDashboardData] = useState<PaymentDashboard | null>(null);

  useEffect(() => {
    if (!user) return;
    
    const fetchPaymentData = async () => {
      setLoading(true);
      try {
        // Fetch installations 
        const installationsRes = await installationApi.getCustomerInstallations(user.id);
        const customerInstallations = Array.isArray(installationsRes) ? installationsRes : [];
        setInstallations(customerInstallations);
        
        if (customerInstallations.length === 0) {
          console.log("No installations found for user");
          setLoading(false);
          return;
        }
        
        // Fetch payment dashboard data - this is a customer-accessible endpoint
        console.log("Fetching payment dashboard data...");
        const paymentDashboardData = await paymentApi.getPaymentDashboard();
        console.log("Dashboard data:", paymentDashboardData);
        setDashboardData(paymentDashboardData);
        
        // If dashboard has all needed data, create a complete payment plan
        if (paymentDashboardData && paymentDashboardData.totalAmount && paymentDashboardData.remainingAmount) {
          console.log("Creating payment plan from dashboard data");
          const planFromDashboard = createPlanFromDashboard(paymentDashboardData);
          console.log("Created plan from dashboard:", planFromDashboard);
          setActiveLoan(planFromDashboard);
          setAllPaymentPlans([planFromDashboard]);
        } 
        // Otherwise try to directly fetch the payment plan
        else {
          console.log("No complete dashboard data, fetching payment plan directly...");
          try {
            // First try getting a payment plan directly
            const plansResponse = await paymentApi.getCustomerPaymentPlan(customerInstallations[0]?.id);
            if (Array.isArray(plansResponse) && plansResponse.length > 0) {
              console.log("Found payment plans:", plansResponse);
              const activePlan = plansResponse.find(plan => plan.status === "ACTIVE") || plansResponse[0];
              setActiveLoan(activePlan);
              setAllPaymentPlans(plansResponse);
            } else {
              // Fallback to simplified customer payment plan
              const customerPlan = await paymentApi.getCustomerPaymentPlan(user.id);
              console.log("Customer payment plan:", customerPlan);
              
              // If we have a valid plan, use it, otherwise don't create dummy data
              if (customerPlan && (customerPlan.name || customerPlan.amount)) {
                setActiveLoan(customerPlan);
                if (Array.isArray(customerPlan)) {
                  setAllPaymentPlans(customerPlan);
                } else {
                  setAllPaymentPlans([customerPlan]);
                }
              } else {
                // If no payment plan is found, set states to empty/null
                setActiveLoan(null);
                setAllPaymentPlans([]);
                console.log("No payment plan found for this user");
              }
            }
          } catch (planError) {
            console.error("Error fetching payment plan details:", planError);
          }
        }
        
        // Use upcoming payments from dashboard data or fetch them
        let upcomingPaymentsData = [];
        let paymentHistoryData = [];
        
        if (paymentDashboardData?.upcomingPayments && paymentDashboardData.upcomingPayments.length > 0) {
          console.log("Using upcoming payments from dashboard data");
          upcomingPaymentsData = paymentDashboardData.upcomingPayments;
        }
        
        if (paymentDashboardData?.recentPayments && paymentDashboardData.recentPayments.length > 0) {
          console.log("Using recent payments from dashboard data");
          paymentHistoryData = paymentDashboardData.recentPayments;
        }
        
        // If we don't have payments in dashboard data, fetch them separately
        if (upcomingPaymentsData.length === 0 || paymentHistoryData.length === 0) {
          console.log("Fetching payment history and upcoming payments separately...");
          try {
            const [historyRes, upcomingRes] = await Promise.all([
              paymentApi.getPaymentHistory(),
              paymentApi.getUpcomingPayments()
            ]);
            
            console.log("Payment history from API:", historyRes);
            console.log("Upcoming payments from API:", upcomingRes);
            
            if (upcomingPaymentsData.length === 0 && upcomingRes?.content) {
              upcomingPaymentsData = upcomingRes.content;
            }
            
            if (paymentHistoryData.length === 0 && historyRes?.content) {
              paymentHistoryData = historyRes.content;
            }
          } catch (error) {
            console.error("Error fetching payments separately:", error);
          }
        }
        
        setUpcomingPayments(upcomingPaymentsData);
        setPaymentHistory(paymentHistoryData);
        setLoadingPayments(false);
        
        setError(null);
      } catch (err) {
        console.error("Error fetching payment data:", err);
        setError("Failed to load payment information. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchPaymentData();
  }, [user]);

  const handleOpenPaymentDialog = (payment = null, installationId = null) => {
    // If no specific payment was provided, find the next upcoming payment
    if (!payment) {
      // Sort upcoming payments by due date
      const sortedUpcomingPayments = [...upcomingPayments].sort((a, b) => 
        new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      );
      
      // Find the next payment that is SCHEDULED or UPCOMING
      const nextPayment = sortedUpcomingPayments.find(p => 
        p.status === 'SCHEDULED' || p.status === 'UPCOMING' || p.status === 'DUE_TODAY'
      );
      
      if (nextPayment) {
        console.log("Auto-selecting next scheduled payment:", nextPayment);
        payment = nextPayment;
        
        // If we found an upcoming payment, use its installation ID if none was provided
        if (!installationId && nextPayment.installationId) {
          installationId = nextPayment.installationId;
        }
      }
    }
    
    setSelectedPayment(payment);
    setSelectedInstallation(installationId);
    setIsPaymentDialogOpen(true);
  };

  const handlePaymentSuccess = async () => {
    // Refresh payment data after successful payment
    if (!user) return;
    
    try {
      // Refresh using customer endpoints
      const [historyRes, upcomingRes, dashboardData] = await Promise.all([
        paymentApi.getPaymentHistory(),
        paymentApi.getUpcomingPayments(),
        paymentApi.getPaymentDashboard()
      ]);
      
      // Fix - Check and handle array vs object structure for consistent state updates
      const historyContent = historyRes?.content || historyRes || [];
      const upcomingContent = upcomingRes?.content || upcomingRes || [];
      
      // Update all relevant state variables properly
      setPaymentHistory(Array.isArray(historyContent) ? historyContent : []);
      setUpcomingPayments(Array.isArray(upcomingContent) ? upcomingContent : []);
      setDashboardData(dashboardData);
      setLoadingPayments(false); // Ensure loading indicator is off
      
      // Update active loan if provided in dashboard
      if (dashboardData?.activePlan) {
        setActiveLoan(dashboardData.activePlan);
      } else if (dashboardData) {
        // If we don't have an active plan but have dashboard data,
        // create a plan from the dashboard data
        const planFromDashboard = createPlanFromDashboard(dashboardData);
        if (planFromDashboard) {
          setActiveLoan(planFromDashboard);
          setAllPaymentPlans([planFromDashboard]);
        }
      }
      
      console.log("Payment data refreshed successfully:", {
        history: Array.isArray(historyContent) ? historyContent.length : 0,
        upcoming: Array.isArray(upcomingContent) ? upcomingContent.length : 0
      });
      
    } catch (err) {
      console.error("Error refreshing payment data:", err);
      // Even on error, ensure we don't show loading state
      setLoadingPayments(false);
    }
  };

  const downloadReceipt = async (paymentId) => {
    try {
      // Use customer endpoint to get receipt
      const receipt = await paymentApi.getPaymentReceipt(paymentId);
      // Create a blob and download link
      const blob = new Blob([JSON.stringify(receipt)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `receipt-${paymentId}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Error downloading receipt:", err);
    }
  };

  const getStatusBadge = (status) => {
    const statusUpper = status?.toUpperCase();
    switch (statusUpper) {
      case "PAID":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Paid</Badge>;
      case "PENDING":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending</Badge>;
      case "OVERDUE":
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Overdue</Badge>;
      case "SCHEDULED":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Scheduled</Badge>;
      case "ACTIVE":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Active</Badge>;
      case "CURRENT":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Current</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  const getInstallationById = (id) => {
    return installations.find(installation => installation.id === id) || { name: `Installation #${id}`, id };
  };
  
  // Format frequency display
  const formatFrequency = (frequency) => {
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
        return frequency || "Monthly";
    }
  };

  // Calculate progress percentage
  const getProgressPercentage = (loan) => {
    if (!loan) return 0;
    
    // Handle edge case to avoid division by zero
    if (loan.totalAmount === 0) return 100;
    
    return 100 - Math.round((loan.remainingAmount / loan.totalAmount) * 100);
  };

  // Switch active loan
  const handleSwitchLoan = (loanId) => {
    // Since we're using customer endpoints only and might not have multiple loan plans
    // this function may be simplified or less needed
    const loan = allPaymentPlans.find(plan => plan.id === loanId);
    if (loan) {
      setActiveLoan(loan);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 mt-4">
        <h1 className="text-2xl font-bold mb-6">Loan & Payment Management</h1>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6 mt-4">
        <h1 className="text-2xl font-bold mb-6">Loan & Payment Management</h1>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  // No active loans condition - improved check to ensure we correctly identify when there's no active loan
  if ((!activeLoan || 
      (activeLoan && (!activeLoan.installmentAmount || activeLoan.installmentAmount === 0))) && 
     (!dashboardData || !dashboardData.activePlan) && 
     allPaymentPlans.length === 0 && 
     !loading) {
    return (
      <div className="container mx-auto p-6 mt-4">
        <h1 className="text-2xl font-bold mb-6">Loan & Payment Management</h1>
        <Card>
          <CardHeader>
            <CardTitle>No Active Loan Plans</CardTitle>
            <CardDescription>You don't have any active payment plans for your solar installations</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center p-6">
            <Home className="h-16 w-16 text-gray-300 mb-4" />
            <p className="text-center text-gray-500 mb-4">
              There are no active payment plans associated with your installations.
            </p>
            {upcomingPayments.length > 0 && (
              <Alert className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>You have upcoming payments</AlertTitle>
                <AlertDescription>
                  Although no payment plan is found, you have {upcomingPayments.length} upcoming payments.
                </AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Button variant="outline" onClick={() => router.push('/customer')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Return to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Use the active loan from the dashboard data if available, or use data from upcoming payments
  const loanToDisplay = activeLoan || dashboardData?.activePlan;
  
  // If we have upcoming payments but no loan details, create a minimal plan to display
  if (!loanToDisplay && upcomingPayments.length > 0 && installations.length > 0) {
    // Calculate total amount from upcoming payments
    const totalAmount = upcomingPayments.reduce((sum, payment) => sum + payment.amount, 0);
    const nextPayment = upcomingPayments[0];
    
    const minimalPlan = {
      id: 1,
      installationId: nextPayment.installationId || installations[0]?.id || 1,
      name: "Payment Plan",
      description: "Based on your upcoming payments",
      totalAmount: totalAmount,
      remainingAmount: totalAmount,
      numberOfPayments: upcomingPayments.length,
      totalInstallments: upcomingPayments.length,
      remainingInstallments: upcomingPayments.length,
      installmentAmount: nextPayment.amount || 0,
      monthlyPayment: nextPayment.amount || 0,
      frequency: "MONTHLY",
      startDate: nextPayment.dueDate || new Date().toISOString(),
      endDate: upcomingPayments[upcomingPayments.length - 1]?.dueDate || "",
      status: "ACTIVE",
      interestRate: 0,
      lateFeeAmount: 0,
      gracePeriodDays: 0,
      nextPaymentDate: nextPayment.dueDate || "",
      createdAt: "",
      updatedAt: ""
    };
    
    // Update state to use this minimal plan
    if (!activeLoan) {
      setActiveLoan(minimalPlan);
      setAllPaymentPlans([minimalPlan]);
    }
  }

  return (
    <div className="container mx-auto p-6 mt-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold">Loan Details</h1>
          <p className="text-muted-foreground">
            {loanToDisplay ? `${loanToDisplay.name || `Loan #${loanToDisplay.id}`}` : "Payment Overview"}
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => handleOpenPaymentDialog()}>
            <Wallet className="mr-2 h-4 w-4" />
            Make a Payment
          </Button>
          
          {allPaymentPlans.length > 1 && (
            <div className="relative">
              <select 
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
                value={loanToDisplay?.id || ""}
                onChange={(e) => handleSwitchLoan(Number(e.target.value))}
              >
                {allPaymentPlans.map(plan => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name || `Loan #${plan.id}`}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>
      
      {loanToDisplay && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${loanToDisplay.totalAmount?.toLocaleString() || 0}</div>
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">Repayment Progress</span>
                    <span className="text-sm font-medium">{getProgressPercentage(loanToDisplay)}%</span>
                  </div>
                  <Progress value={getProgressPercentage(loanToDisplay)} className="h-2" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Monthly Payment</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${loanToDisplay.monthlyPayment?.toLocaleString() || loanToDisplay.installmentAmount?.toLocaleString() || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {formatFrequency(loanToDisplay.frequency)} installments
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Remaining Balance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${loanToDisplay.remainingAmount?.toLocaleString() || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {loanToDisplay.totalAmount > 0 ? Math.round((loanToDisplay.remainingAmount / loanToDisplay.totalAmount) * 100) : 0}% of total loan
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Loan Details</CardTitle>
                <CardDescription>Complete information about your loan</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium">Status</h4>
                    <div className="mt-1">{getStatusBadge(loanToDisplay.status || dashboardData?.status)}</div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium">Interest Rate</h4>
                    <p className="mt-1">{loanToDisplay.interestRate || 0}%</p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium">Start Date</h4>
                    <p className="mt-1">{loanToDisplay.startDate ? format(new Date(loanToDisplay.startDate), 'PPP') : 'N/A'}</p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium">End Date</h4>
                    <p className="mt-1">{loanToDisplay.endDate ? format(new Date(loanToDisplay.endDate), 'PPP') : 'N/A'}</p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium">Next Payment Due</h4>
                    <p className="mt-1">{loanToDisplay.nextPaymentDate ? format(new Date(loanToDisplay.nextPaymentDate), 'PPP') : dashboardData?.nextPaymentDueDate ? format(new Date(dashboardData.nextPaymentDueDate), 'PPP') : 'N/A'}</p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium">Payment Frequency</h4>
                    <p className="mt-1">{formatFrequency(loanToDisplay.frequency)}</p>
                  </div>
                  
                  {loanToDisplay.numberOfPayments > 0 && (
                    <div>
                      <h4 className="text-sm font-medium">Total Installments</h4>
                      <p className="mt-1">{(loanToDisplay.numberOfPayments || 0)}</p>
                    </div>
                  )}
                  
                  {loanToDisplay.remainingInstallments > 0 && (
                    <div>
                      <h4 className="text-sm font-medium">Remaining Installments</h4>
                      <p className="mt-1">{loanToDisplay.remainingInstallments || 0}</p>
                    </div>
                  )}
                  
                  {loanToDisplay.lateFeeAmount > 0 && (
                    <div>
                      <h4 className="text-sm font-medium">Late Fee</h4>
                      <p className="mt-1">${loanToDisplay.lateFeeAmount || 0}</p>
                    </div>
                  )}
                  
                  {loanToDisplay.gracePeriodDays > 0 && (
                    <div>
                      <h4 className="text-sm font-medium">Grace Period</h4>
                      <p className="mt-1">{loanToDisplay.gracePeriodDays || 0} days</p>
                    </div>
                  )}

                  {loanToDisplay.installmentAmount > 0 && (
                    <div>
                      <h4 className="text-sm font-medium">Installment Amount</h4>
                      <p className="mt-1">${loanToDisplay.installmentAmount || 0}</p>
                    </div>
                  )}

                  {loanToDisplay.createdAt && (
                    <div>
                      <h4 className="text-sm font-medium">Created Date</h4>
                      <p className="mt-1">{loanToDisplay.createdAt ? format(new Date(loanToDisplay.createdAt), 'PPP') : 'N/A'}</p>
                    </div>
                  )}
                </div>
                
                {loanToDisplay.description && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="text-sm font-medium mb-2">Description</h4>
                      <p className="text-sm">{loanToDisplay.description}</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Installation Information</CardTitle>
                <CardDescription>Linked to this payment plan</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {loanToDisplay && loanToDisplay.installationId && (
                  <>
                    <div>
                      <h4 className="text-sm font-medium">Installation Name</h4>
                      <p className="mt-1">{getInstallationById(loanToDisplay.installationId).name}</p>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium">Installation ID</h4>
                      <p className="mt-1">#{loanToDisplay.installationId || 'N/A'}</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Payment Schedule</CardTitle>
                <CardDescription>Your upcoming and past payment installments</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {loadingPayments ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
                </div>
              ) : (upcomingPayments.length === 0 && paymentHistory.length === 0) ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <p className="text-muted-foreground">No payment records found</p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => handleOpenPaymentDialog()}
                  >
                    Make Payment
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {/* Show upcoming payments but avoid duplicates */}
                      {(() => {
                        // Create a Set to track which payment IDs we've seen
                        const displayedPaymentIds = new Set();
                        // Combined array for all payments to display
                        const paymentsToDisplay = [];
                        
                        // Add upcoming payments first
                        upcomingPayments.slice(0, 5).forEach(payment => {
                          if (!displayedPaymentIds.has(payment.id)) {
                            displayedPaymentIds.add(payment.id);
                            paymentsToDisplay.push({
                              ...payment,
                              type: 'upcoming'
                            });
                          }
                        });
                        
                        // Add payment history (but avoid duplicates)
                        if (paymentHistory.length > 0) {
                          paymentHistory.slice(0, 5).forEach(payment => {
                            if (!displayedPaymentIds.has(payment.id)) {
                              displayedPaymentIds.add(payment.id);
                              paymentsToDisplay.push({
                                ...payment,
                                type: 'history'
                              });
                            }
                          });
                        }
                        
                        // Sort by date (ascending)
                        paymentsToDisplay.sort((a, b) => {
                          if (!a.dueDate) return 1;
                          if (!b.dueDate) return -1;
                          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
                        });
                        
                        // Return the JSX for the payment rows
                        return paymentsToDisplay.map((payment) => (
                          <TableRow key={`payment-${payment.id}`}>
                            <TableCell>
                              {payment.dueDate ? format(new Date(payment.dueDate), 'PP') : 'N/A'}
                            </TableCell>
                            <TableCell>${payment.amount?.toLocaleString() || 0}</TableCell>
                            <TableCell>
                              {getStatusBadge(payment.status)}
                            </TableCell>
                            <TableCell className="text-right">
                              {payment.status?.toUpperCase() === "PAID" ? (
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => downloadReceipt(payment.id)}
                                >
                                  <Receipt className="mr-1 h-4 w-4" />
                                  Receipt
                                </Button>
                              ) : (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleOpenPaymentDialog(payment)}
                                  disabled={payment.status?.toUpperCase() === "PAID"}
                                >
                                  Pay Now
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ));
                      })()}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Payment Dialog */}
      <PaymentDialog 
        open={isPaymentDialogOpen} 
        onOpenChange={setIsPaymentDialogOpen}
        payment={selectedPayment}
        installationId={selectedInstallation || (loanToDisplay?.installationId)}
        installations={installations}
        paymentPlans={allPaymentPlans}
        onSuccess={handlePaymentSuccess}
        userId={user?.id}
      />
    </div>
  );
}

// Helper function to calculate end date based on frequency and number of payments
const calculateEndDate = (startDateStr, frequency, numberOfPayments) => {
  if (!startDateStr || !frequency || !numberOfPayments) {
    return new Date(new Date().setFullYear(new Date().getFullYear() + 2)).toISOString();
  }
  
  const startDate = new Date(startDateStr);
  const endDate = new Date(startDate);
  
  // Calculate end date based on frequency
  switch (frequency.toUpperCase()) {
    case "WEEKLY":
      endDate.setDate(startDate.getDate() + (numberOfPayments * 7));
      break;
    case "BI_WEEKLY":
    case "BIWEEKLY":
      endDate.setDate(startDate.getDate() + (numberOfPayments * 14));
      break;
    case "MONTHLY":
      endDate.setMonth(startDate.getMonth() + numberOfPayments);
      break;
    case "QUARTERLY":
      endDate.setMonth(startDate.getMonth() + (numberOfPayments * 3));
      break;
    case "SEMI_ANNUALLY":
    case "SEMIANNUALLY":
      endDate.setMonth(startDate.getMonth() + (numberOfPayments * 6));
      break;
    case "ANNUALLY":
      endDate.setFullYear(startDate.getFullYear() + numberOfPayments);
      break;
    default:
      // Default to monthly if frequency is unknown
      endDate.setMonth(startDate.getMonth() + numberOfPayments);
  }
  
  return endDate.toISOString();
};

// Create a payment plan from dashboard data if available
const createPlanFromDashboard = (paymentDashboardData) => {
  if (!paymentDashboardData) return null;
  
  // If we have a complete activePlan object in the dashboard, use it directly
  if (paymentDashboardData.activePlan) {
    console.log("Using activePlan directly from dashboard:", paymentDashboardData.activePlan);
    return paymentDashboardData.activePlan;
  }
  
  // If there's no significant data to create a plan, return null
  if (!paymentDashboardData.totalAmount || 
      (!paymentDashboardData.upcomingPayments && !paymentDashboardData.totalInstallments)) {
    console.log("Insufficient data to create a payment plan", paymentDashboardData);
    return null;
  }

  // Calculate end date based on upcoming payments if available
  let endDate = paymentDashboardData.endDate || "";
  if (!endDate && paymentDashboardData.upcomingPayments && paymentDashboardData.upcomingPayments.length > 0) {
    // Sort upcoming payments by date (ascending)
    const sortedPayments = [...paymentDashboardData.upcomingPayments].sort((a, b) => 
      new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    );
    
    // Use the last payment date as the end date
    const lastPayment = sortedPayments[sortedPayments.length - 1];
    if (lastPayment && lastPayment.dueDate) {
      endDate = lastPayment.dueDate;
    }
  }
  
  // Determine next payment date
  let nextPaymentDate = "";
  if (paymentDashboardData.upcomingPayments && paymentDashboardData.upcomingPayments.length > 0) {
    // Sort upcoming payments by date (ascending)
    const sortedPayments = [...paymentDashboardData.upcomingPayments].sort((a, b) => 
      new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    );
    
    // Use the first upcoming payment date
    const nextPayment = sortedPayments[0];
    if (nextPayment && nextPayment.dueDate) {
      nextPaymentDate = nextPayment.dueDate;
    }
  } else if (paymentDashboardData.recentPayments && paymentDashboardData.recentPayments.length > 0) {
    // If no upcoming payments, try to infer from recent payments + frequency
    // This is a fallback and may not be accurate
    const mostRecent = [...paymentDashboardData.recentPayments].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    )[0];
    
    if (mostRecent && mostRecent.date && paymentDashboardData.frequency) {
      const lastDate = new Date(mostRecent.date);
      // Add frequency days to last payment date
      lastDate.setDate(lastDate.getDate() + parseInt(paymentDashboardData.frequency, 10));
      nextPaymentDate = lastDate.toISOString().split('T')[0];
    }
  }
  
  // If we couldn't determine a next payment date, return null instead of creating an incomplete plan
  if (!nextPaymentDate) {
    console.log("Unable to determine next payment date, cannot create plan");
    return null;
  }

  return {
    id: paymentDashboardData.id || `plan-${Math.random().toString(36).substring(2, 11)}`,
    installationId: paymentDashboardData.installationId || "",
    name: paymentDashboardData.name || "Payment Plan",
    totalAmount: paymentDashboardData.totalAmount || 0,
    amountPaid: paymentDashboardData.amountPaid || 0,
    remainingAmount: paymentDashboardData.remainingAmount || (paymentDashboardData.totalAmount - (paymentDashboardData.amountPaid || 0)),
    status: paymentDashboardData.status || "Active",
    frequency: paymentDashboardData.frequency || "30", // Default to monthly
    startDate: paymentDashboardData.startDate || "",
    endDate: endDate,
    nextPaymentDate: nextPaymentDate,
    nextPaymentAmount: paymentDashboardData.nextPaymentAmount || 
                     (paymentDashboardData.upcomingPayments && paymentDashboardData.upcomingPayments.length > 0 
                      ? paymentDashboardData.upcomingPayments[0].amount : 0),
    totalInstallments: paymentDashboardData.totalInstallments || 0,
    paidInstallments: paymentDashboardData.paidInstallments || 0,
    remainingInstallments: paymentDashboardData.remainingInstallments || 0,
    createdAt: paymentDashboardData.createdAt || new Date().toISOString(),
    updatedAt: paymentDashboardData.updatedAt || new Date().toISOString(),
  };
};

