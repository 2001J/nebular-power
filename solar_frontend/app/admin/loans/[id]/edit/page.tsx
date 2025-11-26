"use client"

import React, { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, DollarSign, Percent, Loader2 } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "@/components/ui/use-toast"
import { format } from "date-fns"
import { paymentComplianceApi } from "@/lib/api/paymentCompliance"
import { useForm, type Resolver } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useTheme } from "next-themes"
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs"
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider"
import { DatePicker } from "@mui/x-date-pickers/DatePicker"
import dayjs from "dayjs"
import { createTheme, ThemeProvider } from "@mui/material/styles"

// Payment frequency options - matches backend PaymentPlan.PaymentFrequency enum
const paymentFrequencies = [
  { value: "WEEKLY", label: "Weekly" },
  { value: "BI_WEEKLY", label: "Bi-Weekly" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "QUARTERLY", label: "Quarterly" },
  { value: "SEMI_ANNUALLY", label: "Semi-Annually" },
  { value: "ANNUALLY", label: "Annually" },
]

// Helper to get frequency label
const getFrequencyLabel = (frequency: string): string => {
  const labels: Record<string, string> = {
    WEEKLY: "weekly",
    BI_WEEKLY: "bi-weekly",
    MONTHLY: "monthly",
    QUARTERLY: "quarterly",
    SEMI_ANNUALLY: "semi-annually",
    ANNUALLY: "annually"
  }
  return labels[frequency] || "per billing period"
}

// Helper to get muted className based on enabled state
const getMutedClassName = (isEnabled: boolean): string => {
  return isEnabled ? "" : "text-muted-foreground";
}

// Helper to get reminder description based on settings
const getReminderDescription = (loadingSettings: boolean, autoSendEnabled: boolean): string => {
  if (loadingSettings) return "Loading settings...";
  if (autoSendEnabled) return "Automatically notify customer about upcoming payments (controlled by global settings)";
  return "Payment reminders are disabled in global payment settings";
}

// Helper to get late fee description based on settings
const getLateFeeDescription = (loadingSettings: boolean, lateFeesEnabled: boolean): string => {
  if (loadingSettings) return "Loading settings...";
  if (lateFeesEnabled) return "Apply fees for overdue payments (controlled by global settings)";
  return "Late fees are disabled in global payment settings";
}

// Form schema with validation
const loanFormSchema = z.object({
  installationId: z.coerce.number(),
  name: z.string().optional(),
  description: z.string().optional(),
  installmentAmount: z.coerce.number().positive("Installment amount must be positive"),
  frequency: z.string().min(1, "Payment frequency is required"),
  startDate: z.date(),
  endDate: z.date(),
  totalAmount: z.coerce.number().positive("Total amount must be positive"),
  interestRate: z.coerce.number().min(0, "Interest rate cannot be negative").default(0),
  downPayment: z.coerce.number().min(0).default(0),
  lateFeeAmount: z.coerce.number().min(0).default(0),
  gracePeriodDays: z.coerce.number().min(0).default(7),
  useDefaultGracePeriod: z.boolean().default(false),
  useDefaultLateFee: z.boolean().default(false),
  applyLateFee: z.boolean().default(false),
  sendPaymentReminders: z.boolean().default(true),
}).refine(data => data.endDate > data.startDate, {
  message: "End date must be after start date",
  path: ["endDate"],
});

// Define the type for our form values
type LoanFormValues = z.infer<typeof loanFormSchema>;

// Define the type for our route parameters
interface EditLoanParams {
  id: string;
}

interface PaymentPlan {
  id: number;
  installationId: number;
  customerName?: string;
  customerId?: string | number;
  name?: string;
  description?: string;
  totalAmount?: number;
  remainingAmount?: number;
  installmentAmount?: number;
  monthlyPayment?: number;
  frequency?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  interestRate?: number;
  downPayment?: number;
  lateFeeAmount?: number;
  gracePeriodDays?: number;
  useDefaultGracePeriod?: boolean;
  useDefaultLateFee?: boolean;
  applyLateFee?: boolean;
  sendPaymentReminders?: boolean;
}

interface GracePeriodConfig {
  gracePeriodDays?: number;
  numberOfDays?: number;
  lateFeePercentage?: number;
  lateFeeFixedAmount?: number;
  lateFeesEnabled?: boolean;
}

interface ReminderConfig {
  autoSendReminders?: boolean;
  firstReminderDays?: number;
  secondReminderDays?: number;
  finalReminderDays?: number;
  reminderMethod?: string;
}

// Calculate end date from amounts, frequency, and start date
function calculateEndDateFromAmounts(startDate: Date | null | undefined, frequency: string, totalAmount: number, installmentAmount: number) {
  if (!startDate || !frequency || !totalAmount || !installmentAmount) return null;
  if (installmentAmount <= 0) return null;

  const paymentsNeeded = Math.ceil(totalAmount / installmentAmount);
  if (!Number.isFinite(paymentsNeeded) || paymentsNeeded <= 0) return null;

  const start = new Date(startDate);
  const end = new Date(start);

  switch (frequency) {
    case "WEEKLY":
      end.setDate(end.getDate() + paymentsNeeded * 7);
      break;
    case "BI_WEEKLY":
      end.setDate(end.getDate() + paymentsNeeded * 14);
      break;
    case "MONTHLY":
      end.setMonth(end.getMonth() + paymentsNeeded);
      break;
    case "QUARTERLY":
      end.setMonth(end.getMonth() + paymentsNeeded * 3);
      break;
    case "SEMI_ANNUALLY":
      end.setMonth(end.getMonth() + paymentsNeeded * 6);
      break;
    case "ANNUALLY":
      end.setFullYear(end.getFullYear() + paymentsNeeded);
      break;
    default:
      end.setMonth(end.getMonth() + paymentsNeeded);
  }

  return end;
}

export default function EditLoanPage({ params }: { params: Promise<EditLoanParams> }) {
  const router = useRouter()
  const { id: loanId } = use(params)
  const { resolvedTheme } = useTheme()
  const [loan, setLoan] = useState<PaymentPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [globalPaymentSettings, setGlobalPaymentSettings] = useState({
    gracePeriodDays: 7,
    lateFeePercentage: 0,
    lateFeeFixedAmount: 0,
    lateFeesEnabled: false
  });
  const [reminderSettings, setReminderSettings] = useState({
    autoSendReminders: true,
    firstReminderDays: 1,
    secondReminderDays: 3,
    finalReminderDays: 7,
    reminderMethod: "EMAIL"
  });
  const [loadingSettings, setLoadingSettings] = useState(true);

  // MUI theme for date pickers, respecting app theme
  const muiTheme = createTheme({
    palette: {
      mode: resolvedTheme === "dark" ? "dark" : "light",
    },
  });

  // Set up form with validation
  const form = useForm<LoanFormValues>({
    resolver: zodResolver(loanFormSchema) as unknown as Resolver<LoanFormValues>,
    defaultValues: {
      installationId: 0,
      name: "",
      description: "",
      installmentAmount: 0,
      frequency: "MONTHLY",
      startDate: new Date(),
      endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
      totalAmount: 0,
      interestRate: 0,
      downPayment: 0,
      lateFeeAmount: 0,
      gracePeriodDays: 7,
      useDefaultGracePeriod: false,
      useDefaultLateFee: false,
      applyLateFee: false,
      sendPaymentReminders: true,
    }
  });

  // Watch core payment fields for auto end-date calculation
  const watchedTotalAmount = form.watch("totalAmount");
  const watchedInstallmentAmount = form.watch("installmentAmount");
  const watchedFrequency = form.watch("frequency");
  const watchedStartDate = form.watch("startDate");

  // Automatically update end date based on amounts and frequency
  useEffect(() => {
    const autoEndDate = calculateEndDateFromAmounts(
      watchedStartDate,
      watchedFrequency,
      Number(watchedTotalAmount),
      Number(watchedInstallmentAmount)
    );

    if (!autoEndDate) return;

    const currentEndDate = form.getValues("endDate");
    if (currentEndDate && autoEndDate.getTime() === currentEndDate.getTime()) return;

    form.setValue("endDate", autoEndDate, { shouldValidate: true, shouldDirty: true });
  }, [
    watchedStartDate,
    watchedFrequency,
    watchedTotalAmount,
    watchedInstallmentAmount,
    form,
  ]);

  // Load global payment settings on component mount
  useEffect(() => {
    const fetchGlobalSettings = async () => {
      setLoadingSettings(true);
      try {
        // Fetch grace period config (late fees)
        const gracePeriodSettings = await paymentComplianceApi.getGracePeriodConfig() as GracePeriodConfig;
        console.log("Loaded grace period settings:", gracePeriodSettings);

        // Fetch reminder config
        const reminderConfigData = await paymentComplianceApi.getReminderConfig() as ReminderConfig;
        console.log("Loaded reminder settings:", reminderConfigData);

        // Update grace period state
        setGlobalPaymentSettings({
          gracePeriodDays: gracePeriodSettings.gracePeriodDays || gracePeriodSettings.numberOfDays || 7,
          lateFeePercentage: gracePeriodSettings.lateFeePercentage || 0,
          lateFeeFixedAmount: gracePeriodSettings.lateFeeFixedAmount || 0,
          lateFeesEnabled: gracePeriodSettings.lateFeesEnabled || false
        });

        // Update reminder state
        setReminderSettings({
          autoSendReminders: reminderConfigData.autoSendReminders !== false,
          firstReminderDays: reminderConfigData.firstReminderDays || 1,
          secondReminderDays: reminderConfigData.secondReminderDays || 3,
          finalReminderDays: reminderConfigData.finalReminderDays || 7,
          reminderMethod: reminderConfigData.reminderMethod || "EMAIL"
        });
      } catch (error) {
        console.error("Error loading global payment settings:", error);
        toast({
          title: "Warning",
          description: "Could not load global payment settings. Using default values.",
          variant: "destructive",
        });
      } finally {
        setLoadingSettings(false);
      }
    };

    fetchGlobalSettings();
  }, []);

  // Fetch loan details
  useEffect(() => {
    const fetchLoanDetails = async () => {
      try {
        setLoading(true)

        // Get the payment plan details
        const loanData = await paymentComplianceApi.getPaymentPlanById(loanId) as PaymentPlan

        if (loanData) {
          console.log("Retrieved loan data:", loanData)
          setLoan(loanData)

          // Format dates properly
          const startDate = loanData.startDate ? new Date(loanData.startDate) : new Date();
          const endDate = loanData.endDate ? new Date(loanData.endDate) : new Date(new Date().setFullYear(new Date().getFullYear() + 1));

          // Update form values
          form.reset({
            installationId: loanData.installationId || 0,
            name: loanData.name || "",
            description: loanData.description || "",
            installmentAmount: loanData.installmentAmount || loanData.monthlyPayment || 0,
            frequency: loanData.frequency || "MONTHLY",
            startDate: startDate,
            endDate: endDate,
            totalAmount: loanData.totalAmount || 0,
            interestRate: loanData.interestRate || 0,
            downPayment: loanData.downPayment || 0,
            lateFeeAmount: loanData.lateFeeAmount || 0,
            gracePeriodDays: loanData.gracePeriodDays || 7,
            useDefaultGracePeriod: loanData.useDefaultGracePeriod || false,
            useDefaultLateFee: loanData.useDefaultLateFee || false,
            applyLateFee: loanData.lateFeeAmount ? loanData.lateFeeAmount > 0 : false,
            sendPaymentReminders: loanData.sendPaymentReminders !== false,
          })
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
  }, [loanId, form])

  // Handle form submission
  const onSubmit = async (data: LoanFormValues) => {
    try {
      setSubmitting(true)

      if (!loan) {
        throw new Error("Loan details not found");
      }

      if (!loan.customerId) {
        throw new Error("Customer ID not found in loan details");
      }

      const customerId = String(loan.customerId);

      // Format the data for the API - explicitly map all fields
      const formattedData = {
        installationId: data.installationId,
        name: data.name || `Payment Plan for Installation #${data.installationId}`,
        totalAmount: data.totalAmount,
        installmentAmount: data.installmentAmount,
        frequency: data.frequency,
        startDate: format(data.startDate, "yyyy-MM-dd"),
        endDate: format(data.endDate, "yyyy-MM-dd"),
        interestRate: data.interestRate || 0,
        status: "ACTIVE",
        downPayment: data.downPayment || 0,
        // Set late fee amount only if applyLateFee is true
        lateFeeAmount: data.applyLateFee ? data.lateFeeAmount || 0 : 0,
        // Use global settings when checked but set to 0
        useGlobalLateFees: data.applyLateFee && data.lateFeeAmount === 0,
        // Grace period days (use global if set to 0)
        gracePeriodDays: data.gracePeriodDays || 0,
        // If grace period is 0, use global settings
        useGlobalGracePeriod: data.gracePeriodDays === 0,
        sendPaymentReminders: data.sendPaymentReminders,
        description: data.description || "Solar installation financing"
      };

      console.log("Submitting loan update:", {
        customerId,
        installationId: data.installationId,
        planId: Number.parseInt(loanId),
        loanData: formattedData
      });

      // Update the payment plan
      await paymentComplianceApi.updatePaymentPlan(customerId, loanId, formattedData)

      toast({
        title: "Success",
        description: "Loan details updated successfully",
      })

      // Navigate back to the loans list
      router.push("/admin/loans")
    } catch (error) {
      console.error("Error updating loan:", error)
      toast({
        title: "Error",
        description: "Failed to update loan details",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
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
            <BreadcrumbLink href={`/admin/loans/${loanId}`}>Loan #{loanId}</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Edit</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Edit Loan</h1>
          <p className="text-muted-foreground">
            Modify payment plan for {loan.customerName || `Installation #${loan.installationId}`}
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Payment Plan Details</CardTitle>
              <CardDescription>Modify the payment plan terms</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="totalAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total Loan Amount ($)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input 
                            type="number" 
                            step="0.01" 
                            placeholder="0.00" 
                            value={field.value}
                            onChange={field.onChange}
                            onWheel={(e) => e.currentTarget.blur()}
                            className="pl-9 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        </div>
                      </FormControl>
                      <FormDescription>Total amount to be financed</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="installmentAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Amount per Period ($)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input 
                            type="number" 
                            step="0.01" 
                            placeholder="0.00" 
                            value={field.value}
                            onChange={field.onChange}
                            onWheel={(e) => e.currentTarget.blur()}
                            className="pl-9 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        </div>
                      </FormControl>
                      <FormDescription>
                        Amount paid {getFrequencyLabel(form.watch("frequency"))} towards solar system financing
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                <FormField
                  control={form.control}
                  name="frequency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Frequency</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select frequency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {paymentFrequencies.map((frequency) => (
                            <SelectItem key={frequency.value} value={frequency.value}>
                              {frequency.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>How often payments are due</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="interestRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Interest Rate (%)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          placeholder="0.00" 
                          value={field.value}
                          onChange={field.onChange}
                          onWheel={(e) => e.currentTarget.blur()}
                          className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </FormControl>
                      <FormDescription>Annual interest rate (APR) - automatically adjusted per payment period (e.g., 12% annually = 1% monthly)</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col gap-2">
                      <FormLabel>Start Date</FormLabel>
                      <FormControl>
                        <ThemeProvider theme={muiTheme}>
                          <LocalizationProvider dateAdapter={AdapterDayjs}>
                            <DatePicker
                              label={undefined}
                              value={field.value ? dayjs(field.value) : null}
                              onChange={(date) => field.onChange(date ? date.toDate() : null)}
                              slotProps={{
                                textField: {
                                  fullWidth: true,
                                  variant: "outlined",
                                  error: !!form.formState.errors.startDate,
                                  helperText: form.formState.errors.startDate?.message,
                                  InputProps: {
                                    sx: {
                                      borderRadius: "0.75rem",
                                      boxShadow: "inset 0 2px 4px rgba(15, 23, 42, 0.08)",
                                      "& .MuiOutlinedInput-input": {
                                        padding: "0.5rem 2.5rem 0.5rem 1rem",
                                        fontSize: "0.875rem",
                                      },
                                      "& .MuiOutlinedInput-notchedOutline": {
                                        borderColor: "rgba(148, 163, 184, 0.35)",
                                      },
                                      "&:hover .MuiOutlinedInput-notchedOutline": {
                                        borderColor: "rgba(148, 163, 184, 0.45)",
                                      },
                                      "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                                        borderColor: "rgba(59, 130, 246, 0.8)",
                                      },
                                    },
                                  },
                                },
                              }}
                            />
                          </LocalizationProvider>
                        </ThemeProvider>
                      </FormControl>
                      <FormDescription className="mt-1">
                        When payments begin
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col gap-2">
                      <FormLabel>End Date</FormLabel>
                      <FormControl>
                        <ThemeProvider theme={muiTheme}>
                          <LocalizationProvider dateAdapter={AdapterDayjs}>
                            <DatePicker
                              label={undefined}
                              value={field.value ? dayjs(field.value) : null}
                              onChange={(date) => field.onChange(date ? date.toDate() : null)}
                              slotProps={{
                                textField: {
                                  fullWidth: true,
                                  variant: "outlined",
                                  error: !!form.formState.errors.endDate,
                                  helperText: form.formState.errors.endDate?.message,
                                  InputProps: {
                                    sx: {
                                      borderRadius: "0.75rem",
                                      boxShadow: "inset 0 2px 4px rgba(15, 23, 42, 0.08)",
                                      "& .MuiOutlinedInput-input": {
                                        padding: "0.5rem 2.5rem 0.5rem 1rem",
                                        fontSize: "0.875rem",
                                      },
                                      "& .MuiOutlinedInput-notchedOutline": {
                                        borderColor: "rgba(148, 163, 184, 0.35)",
                                      },
                                      "&:hover .MuiOutlinedInput-notchedOutline": {
                                        borderColor: "rgba(148, 163, 184, 0.45)",
                                      },
                                      "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                                        borderColor: "rgba(59, 130, 246, 0.8)",
                                      },
                                    },
                                  },
                                },
                              }}
                            />
                          </LocalizationProvider>
                        </ThemeProvider>
                      </FormControl>
                      <FormDescription className="mt-1">
                        When payments end
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Additional Terms</CardTitle>
              <CardDescription>Configure optional payment plan settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="interestRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Annual Interest Rate (%)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Percent className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            placeholder="0.00"
                            value={field.value}
                            onChange={field.onChange}
                            onWheel={(e) => e.currentTarget.blur()}
                            className="pl-9 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        </div>
                      </FormControl>
                      <FormDescription>
                        Annual interest rate applied per payment period (e.g., 5% annual = ~0.42% monthly for monthly payments)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="downPayment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Down Payment Amount ($)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input 
                            type="number" 
                            step="0.01" 
                            placeholder="0.00" 
                            value={field.value}
                            onChange={field.onChange}
                            onWheel={(e) => e.currentTarget.blur()}
                            className="pl-9 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                          />
                        </div>
                      </FormControl>
                      <FormDescription>Optional initial payment</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="applyLateFee"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={loadingSettings || !globalPaymentSettings.lateFeesEnabled}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className={getMutedClassName(globalPaymentSettings.lateFeesEnabled)}>
                          Apply Late Fees
                        </FormLabel>
                        <FormDescription>
                          {getLateFeeDescription(loadingSettings, globalPaymentSettings.lateFeesEnabled)}
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              {form.watch("applyLateFee") && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="lateFeeAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Late Fee Amount ($)</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                              type="number"
                              step="0.01"
                              placeholder={loadingSettings ? "Loading..." : `Global default: $${globalPaymentSettings.lateFeeFixedAmount}`}
                              value={field.value}
                              onChange={field.onChange}
                              onWheel={(e) => e.currentTarget.blur()}
                              className="pl-9 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                          </div>
                        </FormControl>
                        <FormDescription>
                          Fixed amount charged for late payments. {
                            !loadingSettings &&
                            `Global setting: $${globalPaymentSettings.lateFeeFixedAmount}. Set to 0 to use global setting.`
                          }
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="gracePeriodDays"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Grace Period (Days)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            value={field.value}
                            onChange={field.onChange}
                            onWheel={(e) => e.currentTarget.blur()}
                            placeholder={loadingSettings ? "Loading..." : `Global default: ${globalPaymentSettings.gracePeriodDays}`}
                            className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        </FormControl>
                        <FormDescription>
                          Days before late fee is applied. {
                            !loadingSettings &&
                            `Global setting: ${globalPaymentSettings.gracePeriodDays} days. Set to 0 to use global setting.`
                          }
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              <FormField
                control={form.control}
                name="sendPaymentReminders"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={loadingSettings || !reminderSettings.autoSendReminders}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className={getMutedClassName(reminderSettings.autoSendReminders)}>
                        Send Payment Reminders
                      </FormLabel>
                      <FormDescription>
                        {getReminderDescription(loadingSettings, reminderSettings.autoSendReminders)}
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input placeholder="Optional description of the payment plan" {...field} />
                    </FormControl>
                    <FormDescription>Additional notes about this payment plan</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="border-t p-6 flex flex-col sm:flex-row gap-4 items-center">
              <Button
                type="submit"
                className="w-full sm:w-auto"
                disabled={submitting}
              >
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Payment Plan
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => router.push(`/admin/loans/${loanId}`)}
                disabled={submitting}
              >
                Cancel
              </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>
    </div>
  )
}
