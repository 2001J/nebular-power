"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, CreditCard, Calendar, DollarSign, Info, Loader2 } from "lucide-react"
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
import { Label } from "@/components/ui/label"
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
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { toast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { customerApi, installationApi, paymentComplianceApi } from "@/lib/api"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

// Payment frequency options
const paymentFrequencies = [
  { value: "MONTHLY", label: "Monthly" },
  { value: "QUARTERLY", label: "Quarterly" },
  { value: "SEMI_ANNUALLY", label: "Semi-Annually" },
  { value: "ANNUALLY", label: "Annually" },
]

// Form schema with validation
const loanFormSchema = z.object({
  customerId: z.string({
    required_error: "Please select a customer",
  }),
  installationId: z.string({
    required_error: "Please select an installation",
  }),
  totalAmount: z.coerce.number({
    required_error: "Total loan amount is required",
    invalid_type_error: "Total loan amount must be a number",
  }).positive("Total amount must be positive"),
  installmentAmount: z.coerce.number({
    required_error: "Monthly payment amount is required",
    invalid_type_error: "Monthly payment amount must be a number",
  }).positive("Installment amount must be positive"),
  frequency: z.string({
    required_error: "Payment frequency is required",
  }),
  startDate: z.date({
    required_error: "Start date is required",
  }),
  endDate: z.date({
    required_error: "End date is required",
  }),
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

// Calculate number of payments based on frequency and dates
function getNumberOfPayments(startDate, endDate, frequency) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffInMonths = (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth();

  switch (frequency) {
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

export default function NewLoanPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState([]);
  const [installations, setInstallations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [loadingInstallations, setLoadingInstallations] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [globalPaymentSettings, setGlobalPaymentSettings] = useState({
    gracePeriodDays: 7, // Default fallback value
    lateFeePercentage: 0,
    lateFeeFixedAmount: 0,
    lateFeesEnabled: false
  });
  const [loadingSettings, setLoadingSettings] = useState(true);

  // Set up form with validation
  const form = useForm({
    resolver: zodResolver(loanFormSchema),
    defaultValues: {
      customerId: "",
      installationId: "",
      totalAmount: undefined,
      installmentAmount: undefined,
      frequency: "MONTHLY",
      startDate: new Date(),
      endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 5)),
      interestRate: 0,
      downPayment: 0,
      lateFeeAmount: 0,
      gracePeriodDays: 7, // Will be updated when global settings load
      includeLateFees: false,
      sendPaymentReminders: true,
      description: ""
    }
  });

  // Load global payment settings on component mount
  useEffect(() => {
    const fetchGlobalSettings = async () => {
      setLoadingSettings(true);
      try {
        const settings = await paymentComplianceApi.getGracePeriodConfig();
        console.log("Loaded global payment settings:", settings);

        // Update state with fetched settings
        setGlobalPaymentSettings({
          gracePeriodDays: settings.gracePeriodDays || settings.numberOfDays || 7,
          lateFeePercentage: settings.lateFeePercentage || 0,
          lateFeeFixedAmount: settings.lateFeeFixedAmount || 0,
          lateFeesEnabled: settings.lateFeesEnabled || false
        });

        // Update form default values with global settings
        form.setValue("gracePeriodDays", settings.gracePeriodDays || settings.numberOfDays || 7);

        if (settings.lateFeesEnabled) {
          form.setValue("includeLateFees", true);
          form.setValue("lateFeeAmount", settings.lateFeeFixedAmount || 0);
        }
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
    const fetchInstallations = async (customerId) => {
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

    const customerId = form.watch("customerId");
    console.log("Customer ID changed to:", customerId);

    if (customerId) {
      fetchInstallations(customerId);
      // Convert IDs to strings for consistent comparison
      const customer = customers.find(c => String(c.id) === String(customerId));
      console.log("Selected customer:", customer);
      setSelectedCustomer(customer || null);
    } else {
      setInstallations([]);
      setSelectedCustomer(null);
    }
  }, [form.watch("customerId"), customers]);

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
      const response = await paymentComplianceApi.createPaymentPlan(data.customerId, paymentPlanData);

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
                                  ? installations.find(i => i.id === field.value)?.name || `Installation #${field.value}`
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
                          installations.map((installation) => (
                            <SelectItem key={installation.id} value={installation.id}>
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
                      <FormLabel>Total Amount ($)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input type="number" step="0.01" placeholder="0.00" {...field} className="pl-9" />
                        </div>
                      </FormControl>
                      <FormDescription>The total loan amount</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="installmentAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Installment Amount ($)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input type="number" step="0.01" placeholder="0.00" {...field} className="pl-9" />
                        </div>
                      </FormControl>
                      <FormDescription>The amount of each payment</FormDescription>
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
                      <FormLabel>Interest Rate (% per annum)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="0.00" {...field} />
                      </FormControl>
                      <FormDescription>Optional, leave at 0 for interest-free</FormDescription>
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
                    <FormItem className="flex flex-col">
                      <FormLabel>Start Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <Calendar className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date < new Date(new Date().setDate(new Date().getDate() - 1))
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormDescription>When the first payment is due</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>End Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <Calendar className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date <= form.watch("startDate") ||
                              date < new Date(new Date().setDate(new Date().getDate()))
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormDescription>When the final payment is due</FormDescription>
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
                          <Input type="number" step="0.01" placeholder="0.00" {...field} className="pl-9" />
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
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          Apply Late Fees
                        </FormLabel>
                        <FormDescription>
                          Charge additional fees for late payments
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
                              {...field}
                              className="pl-9"
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
                            {...field}
                            placeholder={loadingSettings ? "Loading..." : `Global default: ${globalPaymentSettings.gracePeriodDays}`}
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
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        Send Payment Reminders
                      </FormLabel>
                      <FormDescription>
                        Automatically notify customer about upcoming payments
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