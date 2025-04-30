"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import React from "react"
import { ArrowLeft, Calendar, DollarSign, Loader2 } from "lucide-react"
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
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { toast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { paymentComplianceApi } from "@/lib/api"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

// Payment frequency options
const paymentFrequencies = [
  { value: "MONTHLY", label: "Monthly" },
  { value: "QUARTERLY", label: "Quarterly" },
  { value: "SEMI_ANNUALLY", label: "Semi-Annually" },
  { value: "ANNUALLY", label: "Annually" },
]

// Form schema with validation
const loanFormSchema = z.object({
  installationId: z.coerce.number(),
  name: z.string().optional(),
  description: z.string().optional(),
  installmentAmount: z.coerce.number({
    required_error: "Monthly payment amount is required",
    invalid_type_error: "Monthly payment amount must be a number",
  }).positive("Installment amount must be positive"),
  frequency: z.string().min(1, "Payment frequency is required"),
  startDate: z.date({
    required_error: "Start date is required",
  }),
  endDate: z.date({
    required_error: "End date is required",
  }),
  totalAmount: z.coerce.number().positive("Total amount must be positive"),
  interestRate: z.coerce.number().min(0, "Interest rate cannot be negative").default(0),
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
  lateFeeAmount?: number;
  gracePeriodDays?: number;
  useDefaultGracePeriod?: boolean;
  useDefaultLateFee?: boolean;
  applyLateFee?: boolean;
  sendPaymentReminders?: boolean;
}

export default function EditLoanPage({ params }: { params: EditLoanParams }) {
  const router = useRouter()
  const unwrappedParams = React.use(params)
  const loanId = unwrappedParams.id
  const [loan, setLoan] = useState<PaymentPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Set up form with validation
  const form = useForm<LoanFormValues>({
    resolver: zodResolver(loanFormSchema),
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
      lateFeeAmount: 0,
      gracePeriodDays: 7,
      useDefaultGracePeriod: false,
      useDefaultLateFee: false,
      applyLateFee: false,
      sendPaymentReminders: true,
    }
  });

  // Fetch loan details
  useEffect(() => {
    const fetchLoanDetails = async () => {
      try {
        setLoading(true)

        // Get the payment plan details
        const loanData = await paymentComplianceApi.getPaymentPlanById(loanId)

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

      // Format the data for the API
      const formattedData = {
        ...data,
        id: parseInt(unwrappedParams.id),
        startDate: format(data.startDate, "yyyy-MM-dd"),
        endDate: format(data.endDate, "yyyy-MM-dd"),
      }

      if (!loan) {
        throw new Error("Loan details not found");
      }

      // Get installation ID from the form data
      const installationId = data.installationId;

      console.log("Submitting loan update:", {
        installationId,
        planId: parseInt(unwrappedParams.id),
        loanData: formattedData
      });

      // Update the payment plan
      await paymentComplianceApi.updatePaymentPlan(
        loan.customerId, // This should be the user ID associated with the installation
        parseInt(unwrappedParams.id), // planId
        formattedData // planData
      )

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
            <BreadcrumbLink href={`/admin/loans/${unwrappedParams.id}`}>Loan #{unwrappedParams.id}</BreadcrumbLink>
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
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Plan Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Name for this payment plan" {...field} />
                      </FormControl>
                      <FormDescription>Optional descriptive name</FormDescription>
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
                      <FormDescription>
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
                              date <= (form.getValues("startDate") || new Date())
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormDescription>
                        When payments end
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input placeholder="Brief description of this payment plan" {...field} />
                    </FormControl>
                    <FormDescription>Optional additional information</FormDescription>
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

              <div className="pt-4 border-t">
                <h3 className="font-medium mb-3">Late Payment Settings</h3>
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
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Apply Late Fees</FormLabel>
                          <FormDescription>
                            Apply fees for overdue payments
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="useDefaultLateFee"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={!form.watch("applyLateFee")}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Use Default Late Fee</FormLabel>
                          <FormDescription>
                            Use system-defined late fees
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
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
                              placeholder="0.00"
                              {...field}
                              disabled={!form.watch("applyLateFee") || form.watch("useDefaultLateFee")}
                              className="pl-9"
                            />
                          </div>
                        </FormControl>
                        <FormDescription>Fixed fee for late payments</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="gracePeriodDays"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Grace Period (days)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="0"
                            {...field}
                            disabled={!form.watch("applyLateFee") || form.watch("useDefaultGracePeriod")}
                          />
                        </FormControl>
                        <FormDescription>Days before late fees apply</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="mt-4">
                  <FormField
                    control={form.control}
                    name="useDefaultGracePeriod"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={!form.watch("applyLateFee")}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Use Default Grace Period</FormLabel>
                          <FormDescription>
                            Use system-defined grace period
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
              </div>
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
                onClick={() => router.push(`/admin/loans/${unwrappedParams.id}`)}
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
