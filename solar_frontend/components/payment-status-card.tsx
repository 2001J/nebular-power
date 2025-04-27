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

export default function PaymentStatusCard({ userId, installationId }) {
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
            const fetchedPayments = await paymentApi.getCustomerUpcomingPayments(userId);
            upcomingPayments = Array.isArray(fetchedPayments) ? fetchedPayments : [];
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
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <CircleDollarSign className="h-4 w-4" />
            Payment Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-20 flex items-center justify-center">
            <div className="animate-pulse h-4 w-full bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <CircleDollarSign className="h-4 w-4" />
            Payment Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-red-500">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </div>
        </CardContent>
        <CardFooter>
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
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <CircleDollarSign className="h-4 w-4" />
            Loan Status
          </CardTitle>
          {(hasOverduePayments || paymentIsSoon) && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex">
                    <Bell className={`h-4 w-4 ${hasOverduePayments ? 'text-red-500' : 'text-yellow-500'}`} />
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
        <CardDescription>
          {paymentPlan ? `Installation #${paymentPlan.installationId}` : "Payment information"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {paymentPlan && (
            <>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Loan:</span>
                <div className="flex items-center gap-1">
                  <span className="font-medium">{paymentPlan.name || `Loan #${paymentPlan.id}`}</span>
                  {getStatusBadge(paymentPlan.status)}
                </div>
              </div>
              
              {/* Display loan description if available */}
              {paymentPlan.description && (
                <div className="text-xs text-gray-500 italic">
                  {paymentPlan.description}
                </div>
              )}
              
              {/* Loan Progress Section */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Loan Progress:</span>
                  <span className="font-medium">{loanProgress.toFixed(0)}% Completed</span>
                </div>
                <Progress value={loanProgress} className="h-2" />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Paid: {formatCurrency(paymentPlan.totalAmount - paymentPlan.remainingAmount)}</span>
                  <span>Total: {formatCurrency(paymentPlan.totalAmount)}</span>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Payment Amount:</span>
                <span className="font-medium">{formatCurrency(paymentPlan.installmentAmount || paymentPlan.monthlyPayment)}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Frequency:</span>
                <div className="flex items-center gap-1">
                  <CalendarClock className="h-3 w-3 text-gray-400" />
                  <span className="font-medium">{paymentPlan.frequency || "Monthly"}</span>
                </div>
              </div>
              
              {/* Loan Term / End Date */}
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">End Date:</span>
                <span className="font-medium">{paymentPlan.endDate ? formatDate(paymentPlan.endDate) : "N/A"}</span>
              </div>
              
              {paymentPlan.interestRate > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Interest Rate:</span>
                  <div className="flex items-center gap-1">
                    <Percent className="h-3 w-3 text-gray-400" />
                    <span className="font-medium">{paymentPlan.interestRate}%</span>
                  </div>
                </div>
              )}
            </>
          )}
          
          {nextPayment && (
            <>
              <div className="border-t border-gray-100 my-2 pt-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Next Payment:</span>
                  <div className="flex items-center gap-1">
                    <span className="font-medium">{formatDate(nextPayment.dueDate)}</span>
                    {daysUntilNextPayment !== null && daysUntilNextPayment <= 5 && 
                      <Badge variant={daysUntilNextPayment <= 0 ? "destructive" : "warning"} className="text-xs">
                        {daysUntilNextPayment <= 0 ? 'Due today' : `${daysUntilNextPayment} days`}
                      </Badge>
                    }
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Amount Due:</span>
                  <span className="font-medium">{formatCurrency(nextPayment.amount)}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Status:</span>
                  {getStatusBadge(nextPayment.status)}
                </div>
                
                {/* Payment Description if available */}
                {nextPayment.description && (
                  <div className="mt-1 text-xs text-gray-500 italic">
                    {nextPayment.description}
                  </div>
                )}
              </div>
            </>
          )}
          
          {!paymentPlan && !nextPayment && (
            <div className="py-2 text-sm text-center text-gray-500">
              No active payment plans found
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="ghost" size="sm" onClick={handleViewPayments} className="flex items-center gap-1">
          <span>View Payments</span>
          <ArrowRight className="h-4 w-4" />
        </Button>
        {nextPayment && nextPayment.status !== "PAID" && (
          <Button 
            size="sm" 
            variant="default" 
            onClick={() => router.push('/customer/payments')}
            className={nextPayment.status === "OVERDUE" ? "bg-red-500 hover:bg-red-600" : ""}
          >
            Pay Now
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}