"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CircleDollarSign, AlertCircle, ArrowRight, CalendarClock, Percent, Bell } from "lucide-react";
import { paymentApi, paymentComplianceApi } from "@/lib/api";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export default function PaymentStatusCard({ userId, installationId, isLarge = false }) {
  const [loading, setLoading] = useState(true);
  const [paymentData, setPaymentData] = useState(null);
  const [error, setError] = useState(null);
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
            activePlan = await paymentComplianceApi.getPaymentPlan(dashboardData.paymentPlanId);
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

  const getStatusBadge = (status) => {
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
  const getDaysUntilPayment = (dueDate) => {
    if (!dueDate) return null;
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading) {
    return (
      <Card className={cn("overflow-hidden border-0 shadow-md", isLarge ? "w-full" : "")}>
        <CardHeader className={cn("pb-3 bg-gradient-to-r from-slate-50 to-white", isLarge ? "" : "")}>
          <CardTitle className={cn("flex items-center gap-2 text-slate-800", isLarge ? "text-xl" : "text-sm")}>
            <CircleDollarSign className={cn("text-primary", isLarge ? "h-6 w-6" : "h-4 w-4")} />
            Payment Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`${isLarge ? "h-32" : "h-20"} flex items-center justify-center`}>
            <div className="animate-pulse h-4 w-full bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={cn("overflow-hidden border-0 shadow-md", isLarge ? "w-full" : "")}>
        <CardHeader className={cn("pb-3 bg-gradient-to-r from-slate-50 to-white", isLarge ? "" : "")}>
          <CardTitle className={cn("flex items-center gap-2 text-slate-800", isLarge ? "text-xl" : "text-sm")}>
            <CircleDollarSign className={cn("text-primary", isLarge ? "h-6 w-6" : "h-4 w-4")} />
            Payment Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-red-500 justify-center">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </div>
        </CardContent>
        <CardFooter className="justify-center">
          <Button variant="ghost" size="sm" onClick={handleViewPayments} className="flex items-center gap-1">
            <span>View Payments</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>
    );
  }

  const { nextPayment, paymentPlan, upcomingPayments } = paymentData;

  // Calculate loan progress
  const loanProgress = paymentPlan ? 
    ((paymentPlan.totalAmount - paymentPlan.remainingAmount) / paymentPlan.totalAmount) * 100 : 0;
  
  // Check if there are any overdue payments
  const hasOverduePayments = upcomingPayments?.some(payment => 
    payment.status?.toUpperCase() === "OVERDUE" || payment.daysOverdue > 0
  );

  const daysUntilNextPayment = nextPayment ? getDaysUntilPayment(nextPayment.dueDate) : null;
  const paymentIsSoon = daysUntilNextPayment !== null && daysUntilNextPayment <= 5;

  return (
    <Card className={cn("overflow-hidden border-0 shadow-md", isLarge ? "w-full" : "")}>
      <CardHeader className={cn("pb-3 bg-gradient-to-r from-slate-50 to-white", isLarge ? "" : "")}>
        <div className="flex justify-between items-center">
          <CardTitle className={cn("flex items-center gap-2 text-slate-800", isLarge ? "text-xl" : "text-sm")}>
            <CircleDollarSign className={cn("text-primary", isLarge ? "h-6 w-6" : "h-4 w-4")} />
            Loan Status
          </CardTitle>
          {(hasOverduePayments || paymentIsSoon) && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex">
                    <Bell className={`${isLarge ? "h-5 w-5" : "h-4 w-4"} ${hasOverduePayments ? 'text-red-500' : 'text-amber-500'}`} />
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
        <CardDescription className={cn("text-slate-500", isLarge ? "text-base" : "")}>
          {paymentPlan ? `Installation #${paymentPlan.installationId}` : "Payment information"}
        </CardDescription>
      </CardHeader>
      <CardContent className={isLarge ? "pt-5" : "pt-3"}>
        <div className={isLarge ? "space-y-5" : "space-y-4"}>
          {paymentPlan && (
            <>
              <div className="flex justify-between items-center">
                <span className={cn("text-slate-500", isLarge ? "text-base" : "text-sm")}>Loan:</span>
                <span className={cn("font-semibold text-slate-800", isLarge ? "text-lg" : "")}>
                  {paymentPlan.name || `Loan #${paymentPlan.id}`}
                </span>
              </div>
              
              {/* Display loan description if available */}
              {paymentPlan.description && (
                <div className={cn("text-slate-500 italic", isLarge ? "text-sm" : "text-xs")}>
                  {paymentPlan.description}
                </div>
              )}
              
              {/* Loan Progress Section */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className={cn("text-slate-500", isLarge ? "text-base" : "text-sm")}>Loan Progress:</span>
                  <span className={cn("font-semibold text-slate-800", isLarge ? "text-lg" : "")}>
                    {loanProgress.toFixed(0)}% Completed
                  </span>
                </div>
                <Progress 
                  value={loanProgress} 
                  className={cn("h-2.5 rounded-full bg-slate-100", isLarge ? "h-3" : "h-2")} 
                />
                <div className="flex justify-between text-slate-500">
                  <span className={isLarge ? "text-sm" : "text-xs"}>
                    Paid: {formatCurrency(paymentPlan.totalAmount - paymentPlan.remainingAmount)}
                  </span>
                  <span className={isLarge ? "text-sm" : "text-xs"}>
                    Total: {formatCurrency(paymentPlan.totalAmount)}
                  </span>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className={cn("text-slate-500", isLarge ? "text-base" : "text-sm")}>Payment Amount:</span>
                <span className={cn("font-semibold text-primary", isLarge ? "text-lg" : "")}>
                  {formatCurrency(paymentPlan.installmentAmount || paymentPlan.monthlyPayment)}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className={cn("text-slate-500", isLarge ? "text-base" : "text-sm")}>Frequency:</span>
                <div className="flex items-center gap-1.5">
                  <CalendarClock className={cn("text-slate-400", isLarge ? "h-4 w-4" : "h-3.5 w-3.5")} />
                  <span className={cn("font-medium uppercase text-slate-700", isLarge ? "text-base" : "")}>
                    {paymentPlan.frequency || "Monthly"}
                  </span>
                </div>
              </div>
              
              {/* Loan Term / End Date */}
              <div className="flex justify-between items-center">
                <span className={cn("text-slate-500", isLarge ? "text-base" : "text-sm")}>End Date:</span>
                <span className={cn("font-medium text-slate-800", isLarge ? "text-base" : "")}>
                  {paymentPlan.endDate ? formatDate(paymentPlan.endDate) : "N/A"}
                </span>
              </div>
              
              {paymentPlan.interestRate > 0 && (
                <div className="flex justify-between items-center">
                  <span className={cn("text-slate-500", isLarge ? "text-base" : "text-sm")}>Interest Rate:</span>
                  <div className="flex items-center gap-1.5">
                    <Percent className={cn("text-slate-400", isLarge ? "h-4 w-4" : "h-3.5 w-3.5")} />
                    <span className={cn("font-medium text-slate-800", isLarge ? "text-base" : "")}>
                      {paymentPlan.interestRate}%
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
          
          {nextPayment && (
            <>
              <div className={cn(
                "border-t border-slate-100 pt-4", 
                isLarge ? "mt-5 pt-5" : "mt-3 pt-3"
              )}>
                <div className={cn(
                  "flex justify-between items-center mb-3",
                  isLarge ? "mb-4" : "mb-3"
                )}>
                  <span className={cn(
                    "text-slate-500 font-medium", 
                    isLarge ? "text-base" : "text-sm"
                  )}>Next Payment:</span>
                  <span className={cn(
                    "font-semibold text-slate-800", 
                    isLarge ? "text-lg" : ""
                  )}>
                    {formatDate(nextPayment.dueDate)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center mb-2">
                  <span className={cn("text-slate-500", isLarge ? "text-base" : "text-sm")}>Amount Due:</span>
                  <span className={cn(
                    "font-semibold text-primary", 
                    isLarge ? "text-lg" : ""
                  )}>
                    {formatCurrency(nextPayment.amount)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className={cn("text-slate-500", isLarge ? "text-base" : "text-sm")}>Status:</span>
                  {getStatusBadge(nextPayment.status)}
                </div>
              </div>
            </>
          )}
          
          {!paymentPlan && !nextPayment && (
            <div className={cn(
              "py-6 text-center text-slate-500",
              isLarge ? "text-base" : "text-sm"
            )}>
              No active payment plans found
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className={cn(
        "flex justify-center bg-slate-50 border-t border-slate-100",
        isLarge ? "pt-4 pb-4" : "pt-3 pb-3"
      )}>
        <Button 
          onClick={handleViewPayments} 
          className={cn(
            "rounded-full shadow-sm hover:shadow-md transition-all",
            isLarge ? "px-6" : "px-4"
          )}
        >
          <span>View Payments</span>
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </CardFooter>
    </Card>
  );
}