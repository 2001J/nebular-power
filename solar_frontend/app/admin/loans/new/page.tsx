"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, DollarSign, Loader2 } from "lucide-react"
import { useTheme } from "next-themes"
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
import { customerApi } from "@/lib/api/customers"
import { installationApi } from "@/lib/api/installations"
import { paymentComplianceApi } from "@/lib/api/paymentCompliance"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import { createTheme, ThemeProvider } from '@mui/material/styles';

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

// Payment frequency options
const paymentFrequencies = [
  { value: "WEEKLY", label: "Weekly" },
  { value: "BI_WEEKLY", label: "Bi-Weekly" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "QUARTERLY", label: "Quarterly" },
  { value: "SEMI_ANNUALLY", label: "Semi-Annually" },
  { value: "ANNUALLY", label: "Annually" },
]

// Form schema with validation
const loanFormSchema = z.object({
  customerId: z.string().min(1, "Please select a customer"),
  installationId: z.string().min(1, "Please select an installation"),
  totalAmount: z.coerce.number().positive("Total amount must be positive"),
  installmentAmount: z.coerce.number().positive("Installment amount must be positive"),
  frequency: z.string().min(1, "Payment frequency is required"),
  startDate: z.date(),
  endDate: z.date(),
  interestRate: z.coerce.number().optional(),
  downPayment: z.coerce.number().optional(),
  lateFeeAmount: z.coerce.number().optional(),
  gracePeriodDays: z.coerce.number().optional(),
  includeLateFees: z.boolean().default(false),
  sendPaymentReminders: z.boolean().default(true),
  description: z.string().optional(),
}).refine(data => data.endDate > data.startDate, {
  message: "End date must be after start date",
  path: ["endDate"],
}).refine(data => data.installmentAmount * getNumberOfPayments(data.startDate, data.endDate, data.frequency) <= data.totalAmount * 1.5, {
  message: "Total of all installments exceeds reasonable amount",
  path: ["installmentAmount"],
});

// Helper function to convert frequency to readable label
function getFrequencyLabel(frequency: string): string {
  const labels = {
    WEEKLY: "weekly",
    BI_WEEKLY: "bi-weekly",
    MONTHLY: "monthly",
    QUARTERLY: "quarterly",
    SEMI_ANNUALLY: "semi-annually",
    ANNUALLY: "annually",
  };
  return labels[frequency] || "monthly";
}

// Helper to get muted className based on enabled state
function getMutedClassName(isEnabled: boolean): string {
  return isEnabled ? "" : "text-muted-foreground";
}

// Helper to get reminder description based on settings
function getReminderDescription(loadingSettings: boolean, autoSendEnabled: boolean): string {
  if (loadingSettings) return "Loading settings...";
  if (autoSendEnabled) return "Automatically notify customer about upcoming payments (controlled by global settings)";
  return "Payment reminders are disabled in global payment settings";
}

// Helper to get late fee description based on settings
function getLateFeeDescription(loadingSettings: boolean, lateFeesEnabled: boolean): string {
  if (loadingSettings) return "Loading settings...";
  if (lateFeesEnabled) return "Charge additional fees for late payments (controlled by global settings)";
  return "Late fees are disabled in global payment settings";
}

// Calculate number of payments based on frequency and dates
function getNumberOfPayments(startDate, endDate, frequency) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffInMonths = (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth();
  const diffInWeeks = Math.floor((end.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000));

  switch (frequency) {
    case "WEEKLY":
      return diffInWeeks;
    case "BI_WEEKLY":
      return Math.floor(diffInWeeks / 2);
    case "MONTHLY":
      return diffInMonths;
    case "QUARTERLY":
      return Math.floor(diffInMonths / 3);
    case "SEMI_ANNUALLY":
      return Math.floor(diffInMonths / 6);
    case "ANNUALLY":
      return Math.floor(diffInMonths / 12);
    default:
      return diffInMonths;
  }
}

// Calculate end date from amounts, frequency, and start date
function calculateEndDateFromAmounts(startDate, frequency, totalAmount, installmentAmount) {
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

export default function NewLoanPage() {
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const [customers, setCustomers] = useState<any[]>([]);
  const [installations, setInstallations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [loadingInstallations, setLoadingInstallations] = useState(false);
  const [globalPaymentSettings, setGlobalPaymentSettings] = useState({
    gracePeriodDays: 7, // Default fallback value
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

  // Create MUI theme based on resolved theme (respects system preferences)
  const muiTheme = createTheme({
    palette: {
      mode: resolvedTheme === 'dark' ? 'dark' : 'light',
    },
  });

  // Set up form with validation
  const form = useForm<any>({
    resolver: zodResolver(loanFormSchema),
    defaultValues: {
      customerId: "",
      installationId: "",
      totalAmount: "" as any,
      installmentAmount: "" as any,
      frequency: "MONTHLY",
      startDate: new Date(),
      endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 5)),
      interestRate: "" as any,
      downPayment: "" as any,
      lateFeeAmount: "" as any,
      gracePeriodDays: "" as any, // Will be updated when global settings load
      includeLateFees: false,
      sendPaymentReminders: true,
      description: ""
    }
  });

  // Watch customerId changes once per render
  const watchedCustomerId = form.watch("customerId");

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

    const currentEndDate: Date | undefined = form.getValues("endDate");
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

        // Update form default values with global settings
        form.setValue("gracePeriodDays", gracePeriodSettings.gracePeriodDays || gracePeriodSettings.numberOfDays || 7);

        // Set late fees based on global setting
        if (gracePeriodSettings.lateFeesEnabled) {
          form.setValue("includeLateFees", true);
          form.setValue("lateFeeAmount", gracePeriodSettings.lateFeeFixedAmount || 0);
        } else {
          form.setValue("includeLateFees", false);
        }

        // Set payment reminders based on global setting
        form.setValue("sendPaymentReminders", reminderConfigData.autoSendReminders !== false);
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
  }, [form]);

  // Load customers on component mount
  useEffect(() => {
    const fetchCustomers = async () => {
      setLoadingCustomers(true);
      try {
        const response = await customerApi.getAllCustomers();
        if (response && (Array.isArray(response) || Array.isArray(response.content))) {
          const customersList = Array.isArray(response) ? response : response.content;
          // Only include active customers
          const activeCustomers = customersList.filter(
            customer => customer.status === "ACTIVE" || customer.status === "Active"
          );
          setCustomers(activeCustomers);
        } else {
          toast({
            title: "Error loading customers",
            description: "Could not retrieve customer list",
            variant: "destructive",
          });
          setCustomers([]);
        }
      } catch (error) {
        console.error("Error fetching customers:", error);
        toast({
          title: "Error",
          description: "Failed to load customers. Please try again.",
          variant: "destructive",
        });
        setCustomers([]);
      } finally {
        setLoadingCustomers(false);
      }
    };

    fetchCustomers();
  }, []);

  // Load installations when customer changes
  useEffect(() => {
    const fetchInstallations = async (customerId: string) => {
      if (!customerId) {
        setInstallations([]);
        return;
      }

      setLoadingInstallations(true);
      try {
        const response = await installationApi.getCustomerInstallations(customerId);
        if (response && Array.isArray(response)) {
          // Only include active installations
          const activeInstallations = response.filter(
            installation => installation.status === "ACTIVE" ||
              installation.status === "Active" ||
              installation.status === "OPERATIONAL"
          );
          setInstallations(activeInstallations);
        } else {
          setInstallations([]);
        }
      } catch (error) {
        console.error(`Error fetching installations for customer ${customerId}:`, error);
        setInstallations([]);
        toast({
          title: "Error",
          description: "Failed to load customer installations",
          variant: "destructive",
        });
      } finally {
        setLoadingInstallations(false);
      }
    };

    const customerId = watchedCustomerId;
    console.log("Customer ID changed to:", customerId);

    if (customerId) {
      fetchInstallations(customerId);
      // Convert IDs to strings for consistent comparison
      const customer = customers.find(c => String(c.id) === String(customerId));
      console.log("Selected customer:", customer);
    } else {
      setInstallations([]);
    }
  }, [watchedCustomerId, customers]);

  // Handle form submission
  const onSubmit = async (data) => {
    setLoading(true);
    try {
      // Format the data for the API
      const paymentPlanData = {
        installationId: data.installationId,
        name: `Payment Plan for Installation #${data.installationId}`,
        totalAmount: data.totalAmount,
        installmentAmount: data.installmentAmount,
        frequency: data.frequency,
        startDate: format(data.startDate, "yyyy-MM-dd"),
        endDate: format(data.endDate, "yyyy-MM-dd"),
        interestRate: data.interestRate || 0,
        status: "ACTIVE",
        downPayment: data.downPayment || 0,
        // Set late fee amount only if includeLateFees is true
        lateFeeAmount: data.includeLateFees ? data.lateFeeAmount || 0 : 0,
        // Use global settings when checked but set to 0
        useGlobalLateFees: data.includeLateFees && data.lateFeeAmount === 0,
        // Grace period days (use global if set to 0)
        gracePeriodDays: data.gracePeriodDays || 0,
        // If grace period is 0, use global settings
        useGlobalGracePeriod: data.gracePeriodDays === 0,
        sendPaymentReminders: data.sendPaymentReminders,
        description: data.description || "Solar installation financing"
      };

      console.log(`Creating payment plan for customer ID: ${data.customerId}`, paymentPlanData);

      // Call API to create payment plan
      await paymentComplianceApi.createPaymentPlan(data.customerId, paymentPlanData);

      toast({
        title: "Payment Plan Created",
        description: "The payment plan has been successfully created",
        variant: "default",
      });

      // Redirect to the loans page after successful creation
      router.push("/admin/loans");
    } catch (error) {
      console.error("Error creating payment plan:", error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to create payment plan. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container max-w-5xl mx-auto py-6">
      <Breadcrumb className="mb-6">
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
            <BreadcrumbPage>New Payment Plan</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Create New Payment Plan</h1>
          <p className="text-muted-foreground">Set up a new financing arrangement for a customer</p>
        </div>
        <Button variant="outline" onClick={() => router.back()}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Customer Information</CardTitle>
              <CardDescription>Select a customer and their solar installation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="customerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer</FormLabel>
                    <Select
                      disabled={loadingCustomers}
                      onValueChange={field.onChange}
                      value={field.value}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue>
                            {loadingCustomers
                              ? "Loading customers..."
                              : field.value
                                ? customers.find(c => String(c.id) === String(field.value))?.fullName ||
                                customers.find(c => String(c.id) === String(field.value))?.email ||
                                "Select a customer"
                                : "Select a customer"
                            }
                          </SelectValue>
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {customers.length === 0 ? (
                          <SelectItem value="no-customers" disabled>
                            No active customers found
                          </SelectItem>
                        ) : (
                          customers.map((customer) => (
                            <SelectItem key={customer.id} value={String(customer.id)}>
                              {customer.fullName || customer.email}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="installationId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Installation</FormLabel>
                    <Select
                      disabled={loadingInstallations || !form.watch("customerId")}
                      onValueChange={field.onChange}
                      value={field.value}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue>
                            {!form.watch("customerId")
                              ? "First select a customer"
                              : loadingInstallations
                                ? "Loading installations..."
                          : field.value
                            ? installations.find(i => String(i.id) === String(field.value))?.name || `Installation #${field.value}`
                              : "Select an installation"
                            }
                          </SelectValue>
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {installations.length === 0 ? (
                          <SelectItem value="no-installations" disabled>
                            {form.watch("customerId") ? "No active installations found" : "Select a customer first"}
                          </SelectItem>
                        ) : (
                          installations.map((installation: any) => (
                            <SelectItem key={installation.id} value={String(installation.id)}>
                              {installation.name || `Installation #${installation.id}`} - {installation.type || "Solar"}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payment Plan Details</CardTitle>
              <CardDescription>Configure the payment plan terms</CardDescription>
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
                      <FormLabel>Annual Interest Rate (%)</FormLabel>
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
                      <FormDescription>Annual interest rate applied per payment period (e.g., 5% annual = ~0.42% monthly for monthly payments)</FormDescription>
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
                                  helperText: form.formState.errors.startDate?.message as string,
                                  InputProps: {
                                    sx: {
                                      borderRadius: '0.75rem',
                                      boxShadow: 'inset 0 2px 4px rgba(15, 23, 42, 0.08)', // shadow-inner
                                      '& .MuiOutlinedInput-input': {
                                        padding: '0.5rem 2.5rem 0.5rem 1rem',
                                        fontSize: '0.875rem',
                                      },
                                      '& .MuiOutlinedInput-notchedOutline': {
                                        borderColor: 'rgba(148, 163, 184, 0.35)', // border-border/70
                                      },
                                      '&:hover .MuiOutlinedInput-notchedOutline': {
                                        borderColor: 'rgba(148, 163, 184, 0.45)',
                                      },
                                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                        borderColor: 'rgba(59, 130, 246, 0.8)', // ring-ring
                                      },
                                    },
                                  },
                                },
                              }}
                            />
                          </LocalizationProvider>
                        </ThemeProvider>
                      </FormControl>
                      <FormDescription className="mt-1">When the first payment is due</FormDescription>
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
                                  helperText: form.formState.errors.endDate?.message as string,
                                  InputProps: {
                                    sx: {
                                      borderRadius: '0.75rem',
                                      boxShadow: 'inset 0 2px 4px rgba(15, 23, 42, 0.08)',
                                      '& .MuiOutlinedInput-input': {
                                        padding: '0.5rem 2.5rem 0.5rem 1rem',
                                        fontSize: '0.875rem',
                                      },
                                      '& .MuiOutlinedInput-notchedOutline': {
                                        borderColor: 'rgba(148, 163, 184, 0.35)',
                                      },
                                      '&:hover .MuiOutlinedInput-notchedOutline': {
                                        borderColor: 'rgba(148, 163, 184, 0.45)',
                                      },
                                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                        borderColor: 'rgba(59, 130, 246, 0.8)',
                                      },
                                    },
                                  },
                                },
                              }}
                            />
                          </LocalizationProvider>
                        </ThemeProvider>
                      </FormControl>
                      <FormDescription className="mt-1">When the final payment is due</FormDescription>
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

                <FormField
                  control={form.control}
                  name="includeLateFees"
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

              {form.watch("includeLateFees") && (
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
                disabled={loading || loadingCustomers || loadingInstallations}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Payment Plan
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => router.push("/admin/loans")}
                disabled={loading}
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
