"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CircleDollarSign, AlertCircle, ArrowRight, CalendarClock, Percent, Bell } from "lucide-react";
import { paymentApi } from "@/lib/api/payments";
import { paymentComplianceApi } from "@/lib/api/paymentCompliance";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type Props = {
  userId?: string;
  installationId?: string | number;
  isLarge?: boolean;
}

type PaymentItem = {
  id?: string;
  dueDate: string;
  amount: number | string;
  status?: string;
  daysOverdue?: number;
}

type PaymentPlanInfo = {
  id: string;
  installationId?: string | number | null;
  totalAmount?: number | string;
  remainingAmount?: number | string;
  monthlyPayment?: number | string;
  installmentAmount?: number | string;
  frequency?: string;
  endDate?: string | null;
  interestRate?: number | string;
  name?: string;
  description?: string;
}

type PaymentState = {
  nextPayment: PaymentItem | null;
  paymentPlan: PaymentPlanInfo | null;
  upcomingPayments: PaymentItem[];
  dashboardData: any;
}

export default function PaymentStatusCard({ userId, installationId, isLarge = false }: Props) {
  const [loading, setLoading] = useState<boolean>(true);
  const [paymentData, setPaymentData] = useState<PaymentState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!userId) return;

    const fetchPaymentData = async () => {
      setLoading(true);
      try {
        // Fetch payment dashboard data
        const dashboardData = await paymentApi.getPaymentDashboard();
        console.log("Dashboard data:", dashboardData);
        
        // We now have the active plan directly in the dashboard response
        let activePlan = dashboardData?.activePlan;
        
        // If no active plan is in the dashboard but we have payment plan ID,
        // try to fetch the plan directly
        if (!activePlan && dashboardData?.paymentPlanId) {
          try {
            activePlan = await paymentComplianceApi.getPaymentPlanById(dashboardData.paymentPlanId);
            console.log("Fetched payment plan:", activePlan);
          } catch (err) {
            console.error("Error fetching payment plan:", err);
          }
        }
        
        // Fetch upcoming payments to display the next due payment
        let nextPayment = null;
        let upcomingPayments = dashboardData?.upcomingPayments || [];
        
        // If no upcoming payments in dashboard, fetch separately
        if (!upcomingPayments || upcomingPayments.length === 0) {
          try {
            // Use getUpcomingPayments() instead of getCustomerUpcomingPayments(userId)
            // This uses the authenticated user's context instead of requiring admin privileges
            const fetchedPayments = await paymentApi.getUpcomingPayments();
            upcomingPayments = fetchedPayments?.content || [];
            console.log("Fetched upcoming payments:", upcomingPayments);
          } catch (err) {
            console.error("Error fetching upcoming payments:", err);
          }
        }
        
        // Find the next payment due
        if (upcomingPayments && upcomingPayments.length > 0) {
          // Sort by due date to ensure we get the earliest one
          const sortedPayments = [...upcomingPayments].sort((a, b) => 
            new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
          );
          
          // Find the next unpaid payment
          nextPayment = sortedPayments.find(payment => 
            payment.status !== "PAID" && payment.status !== "CANCELED"
          );
          
          // If no unpaid payment found, just use the first one
          if (!nextPayment) {
            nextPayment = sortedPayments[0];
          }
        }
        
        setPaymentData({
          nextPayment: nextPayment,
          paymentPlan: activePlan,
          upcomingPayments: upcomingPayments,
          dashboardData: dashboardData
        });
        
        setError(null);
      } catch (err) {
        console.error("Error fetching payment status:", err);
        setError("Could not retrieve payment information");
      } finally {
        setLoading(false);
      }
    };

    fetchPaymentData();
  }, [userId, installationId]);

  const getStatusBadge = (status?: string) => {
    if (!status) return null;
    
    switch (status.toUpperCase()) {
      case "PAID":
        return <Badge className="bg-green-500">Paid</Badge>;
      case "PENDING":
        return <Badge className="bg-yellow-500">Pending</Badge>;
      case "OVERDUE":
        return <Badge className="bg-red-500">Overdue</Badge>;
      case "UPCOMING":
        return <Badge className="bg-blue-500">Upcoming</Badge>;
      case "ACTIVE":
        return <Badge className="bg-green-500">Active</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const handleViewPayments = () => {
    router.push("/customer/payments");
  };

  // Calculate days until next payment
  const getDaysUntilPayment = (dueDate?: string) => {
    if (!dueDate) return null;
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading) {
    return (
      <Card className={cn("overflow-hidden border-gray-200 dark:border-white/10 shadow-sm dark:shadow-none rounded-2xl bg-white dark:bg-[#111318]", isLarge ? "w-full" : "")}>
        <CardHeader className={cn("pb-4 px-6 pt-6 bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-white/10", isLarge ? "" : "")}>
          <CardTitle className={cn("flex items-center gap-2 text-gray-900 dark:text-white/90", isLarge ? "text-xl" : "text-sm")}>
            <CircleDollarSign className={cn("text-blue-600 dark:text-blue-400", isLarge ? "h-6 w-6" : "h-4 w-4")} strokeWidth={2} />
            Payment Status
          </CardTitle>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          <div className={`${isLarge ? "h-32" : "h-20"} flex items-center justify-center`}>
            <div className="animate-pulse h-4 w-full bg-gray-200 dark:bg-white/10 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={cn("overflow-hidden border-gray-200 dark:border-white/10 shadow-sm dark:shadow-none rounded-2xl bg-white dark:bg-[#111318]", isLarge ? "w-full" : "")}>
        <CardHeader className={cn("pb-4 px-6 pt-6 bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-white/10", isLarge ? "" : "")}>
          <CardTitle className={cn("flex items-center gap-2 text-gray-900 dark:text-white/90", isLarge ? "text-xl" : "text-sm")}>
            <CircleDollarSign className={cn("text-blue-600 dark:text-blue-400", isLarge ? "h-6 w-6" : "h-4 w-4")} strokeWidth={2} />
            Payment Status
          </CardTitle>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400 justify-center">
            <AlertCircle className="h-4 w-4" strokeWidth={2} />
            <span className="text-sm">{error}</span>
          </div>
        </CardContent>
        <CardFooter className="justify-center px-6 pb-6 bg-gray-50 dark:bg-white/5 border-t border-gray-200 dark:border-white/10">
          <Button variant="ghost" size="sm" onClick={handleViewPayments} className="flex items-center gap-1 text-gray-700 dark:text-white/70 hover:text-gray-900 dark:hover:text-white/90">
            <span>View Payments</span>
            <ArrowRight className="h-4 w-4" strokeWidth={2} />
          </Button>
        </CardFooter>
      </Card>
    );
  }

  const { nextPayment, paymentPlan, upcomingPayments } = (paymentData as PaymentState);

  // Calculate loan progress
  const loanProgress = paymentPlan ? (() => {
    const total = Number(paymentPlan.totalAmount ?? 0);
    const remaining = Number(paymentPlan.remainingAmount ?? 0);
    if (!total) return 0;
    return ((total - remaining) / total) * 100;
  })() : 0;
  
  // Check if there are any overdue payments
  const hasOverduePayments = upcomingPayments?.some((payment) =>
    payment.status?.toUpperCase() === "OVERDUE" || (payment.daysOverdue ?? 0) > 0
  );

  const daysUntilNextPayment = nextPayment ? getDaysUntilPayment(nextPayment.dueDate) : null;
  const paymentIsSoon = daysUntilNextPayment !== null && daysUntilNextPayment <= 5;

  return (
    <Card className={cn("overflow-hidden border-gray-200 dark:border-white/10 shadow-sm dark:shadow-none rounded-2xl bg-white dark:bg-[#111318]", isLarge ? "w-full" : "")}>
      <CardHeader className={cn("pb-4 px-6 pt-6 bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-white/10", isLarge ? "" : "")}>
        <div className="flex justify-between items-center">
          <CardTitle className={cn("flex items-center gap-2 text-gray-900 dark:text-white/90", isLarge ? "text-xl" : "text-sm")}>
            <CircleDollarSign className={cn("text-blue-600 dark:text-blue-400", isLarge ? "h-6 w-6" : "h-4 w-4")} strokeWidth={2} />
            Loan Status
          </CardTitle>
          {(hasOverduePayments || paymentIsSoon) && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex">
                    <Bell className={`${isLarge ? "h-5 w-5" : "h-4 w-4"} ${hasOverduePayments ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`} strokeWidth={2} />
                    {hasOverduePayments && <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                    </span>}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  {hasOverduePayments ? 'You have overdue payments' : `Payment due in ${daysUntilNextPayment} days`}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <CardDescription className={cn("text-gray-500 dark:text-white/50", isLarge ? "text-base" : "")}>
          {paymentPlan ? `Installation #${paymentPlan.installationId}` : "Payment information"}
        </CardDescription>
      </CardHeader>
      <CardContent className={isLarge ? "pt-6 px-6 pb-6" : "pt-4 px-6 pb-4"}>
        <div className={isLarge ? "space-y-5" : "space-y-4"}>
          {paymentPlan && (
            <>
              <div className="flex justify-between items-center">
                <span className={cn("text-gray-500 dark:text-white/50", isLarge ? "text-base" : "text-sm")}>Loan:</span>
                <span className={cn("font-semibold text-gray-900 dark:text-white/90", isLarge ? "text-lg" : "")}>
                  {paymentPlan.name || `Loan #${paymentPlan.id}`}
                </span>
              </div>
              
              {/* Display loan description if available */}
              {paymentPlan.description && (
                <div className={cn("text-gray-600 dark:text-white/60 italic", isLarge ? "text-sm" : "text-xs")}>
                  {paymentPlan.description}
                </div>
              )}
              
              {/* Loan Progress Section */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className={cn("text-gray-500 dark:text-white/50", isLarge ? "text-base" : "text-sm")}>Loan Progress:</span>
                  <span className={cn("font-semibold text-gray-900 dark:text-white/90", isLarge ? "text-lg" : "")}>
                    {loanProgress.toFixed(0)}% Completed
                  </span>
                </div>
                <Progress 
                  value={loanProgress} 
                  className={cn("h-2.5 rounded-full bg-gray-200 dark:bg-white/10", isLarge ? "h-3" : "h-2")} 
                />
                <div className="flex justify-between text-gray-500 dark:text-white/50">
                  <span className={isLarge ? "text-sm" : "text-xs"}>
                    Paid: {formatCurrency(Number(paymentPlan.totalAmount ?? 0) - Number(paymentPlan.remainingAmount ?? 0))}
                  </span>
                  <span className={isLarge ? "text-sm" : "text-xs"}>
                    Total: {formatCurrency(Number(paymentPlan.totalAmount ?? 0))}
                  </span>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className={cn("text-gray-500 dark:text-white/50", isLarge ? "text-base" : "text-sm")}>Payment Amount:</span>
                <span className={cn("font-semibold text-blue-600 dark:text-blue-400", isLarge ? "text-lg" : "")}>
                  {formatCurrency(paymentPlan.installmentAmount || paymentPlan.monthlyPayment)}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className={cn("text-gray-500 dark:text-white/50", isLarge ? "text-base" : "text-sm")}>Frequency:</span>
                <div className="flex items-center gap-1.5">
                  <CalendarClock className={cn("text-gray-400 dark:text-white/40", isLarge ? "h-4 w-4" : "h-3.5 w-3.5")} strokeWidth={2} />
                  <span className={cn("font-medium uppercase text-gray-700 dark:text-white/70", isLarge ? "text-base" : "")}>
                    {paymentPlan.frequency || "Monthly"}
                  </span>
                </div>
              </div>
              
              {/* Loan Term / End Date */}
              <div className="flex justify-between items-center">
                <span className={cn("text-gray-500 dark:text-white/50", isLarge ? "text-base" : "text-sm")}>End Date:</span>
                <span className={cn("font-medium text-gray-900 dark:text-white/80", isLarge ? "text-base" : "")}>
                  {paymentPlan.endDate ? formatDate(paymentPlan.endDate) : "N/A"}
                </span>
              </div>
              
              {Number(paymentPlan.interestRate ?? 0) > 0 && (
                <div className="flex justify-between items-center">
                  <span className={cn("text-gray-500 dark:text-white/50", isLarge ? "text-base" : "text-sm")}>Interest Rate:</span>
                  <div className="flex items-center gap-1.5">
                    <Percent className={cn("text-gray-400 dark:text-white/40", isLarge ? "h-4 w-4" : "h-3.5 w-3.5")} strokeWidth={2} />
                    <span className={cn("font-medium text-gray-900 dark:text-white/80", isLarge ? "text-base" : "")}>
                      {Number(paymentPlan.interestRate ?? 0)}%
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
          
          {nextPayment && (
            <>
              <div className={cn(
                "border-t border-gray-200 dark:border-white/10 pt-4", 
                isLarge ? "mt-5 pt-5" : "mt-3 pt-3"
              )}>
                <div className={cn(
                  "flex justify-between items-center mb-3",
                  isLarge ? "mb-4" : "mb-3"
                )}>
                  <span className={cn(
                    "text-gray-500 dark:text-white/50 font-medium", 
                    isLarge ? "text-base" : "text-sm"
                  )}>Next Payment:</span>
                  <span className={cn(
                    "font-semibold text-gray-900 dark:text-white/90", 
                    isLarge ? "text-lg" : ""
                  )}>
                    {formatDate(nextPayment.dueDate)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center mb-2">
                  <span className={cn("text-gray-500 dark:text-white/50", isLarge ? "text-base" : "text-sm")}>Amount Due:</span>
                  <span className={cn(
                    "font-semibold text-blue-600 dark:text-blue-400", 
                    isLarge ? "text-lg" : ""
                  )}>
                    {formatCurrency(nextPayment.amount)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className={cn("text-gray-500 dark:text-white/50", isLarge ? "text-base" : "text-sm")}>Status:</span>
                  {getStatusBadge(nextPayment.status)}
                </div>
              </div>
            </>
          )}
          
          {!paymentPlan && !nextPayment && (
            <div className={cn(
              "py-6 text-center text-gray-500 dark:text-white/50",
              isLarge ? "text-base" : "text-sm"
            )}>
              No active payment plans found
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className={cn(
        "flex justify-center bg-gray-50 dark:bg-white/5 border-t border-gray-200 dark:border-white/10 px-6 pb-6",
        isLarge ? "pt-4 pb-4" : "pt-3 pb-3"
      )}>
        <Button 
          onClick={handleViewPayments} 
          className={cn(
            "rounded-xl shadow-sm hover:shadow-md transition-all bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white",
            isLarge ? "px-6" : "px-4"
          )}
        >
          <span>View Payments</span>
          <ArrowRight className="h-4 w-4 ml-2" strokeWidth={2} />
        </Button>
      </CardFooter>
    </Card>
  );
}
