"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, CreditCard, ArrowUpDown, Banknote, Calendar, Plus, Settings } from "lucide-react"
import { format } from "date-fns"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Badge } from "@/components/ui/badge"
import { paymentComplianceApi } from "@/lib/api"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Switch } from "@/components/ui/switch"
import { Calendar as CalendarIcon, DollarSign, Mail, MessageSquare } from "lucide-react"
import { Toaster } from "@/components/ui/toaster"
import { useToast } from "@/components/ui/use-toast"

// Define Payment type for improved type checking
interface Payment {
  id: string;
  customerId: string | number;
  customerName: string;
  amount: number;
  dueDate: string;
  status: string;
  [key: string]: any; // Allow other properties
}

export default function AdminPaymentsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("overdue")
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [totalPages, setTotalPages] = useState(0)
  const [totalElements, setTotalElements] = useState(0)
  const [sortBy, setSortBy] = useState("dueDate")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [overduePayments, setOverduePayments] = useState<Payment[]>([])
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null)
  const [sendReminderDialogOpen, setSendReminderDialogOpen] = useState(false)
  const [recordPaymentDialogOpen, setRecordPaymentDialogOpen] = useState(false)
  const [reminderType, setReminderType] = useState("EMAIL")
  const [paymentAmount, setPaymentAmount] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("BANK_TRANSFER")
  const [transactionId, setTransactionId] = useState("")
  const [gracePeriodConfig, setGracePeriodConfig] = useState({
    numberOfDays: 7,
    gracePeriodDays: 7,
    reminderFrequency: 2,
    autoSuspendEnabled: true,
    lateFeesEnabled: false,
    lateFeePercentage: 0,
    lateFeeFixedAmount: 0
  });
  const [reminderConfig, setReminderConfig] = useState({
    autoSendReminders: true,
    firstReminderDays: 1,
    secondReminderDays: 3,
    finalReminderDays: 7,
    reminderMethod: "EMAIL"
  });
  const [showGracePeriodModal, setShowGracePeriodModal] = useState(false);
  const [showReminderConfigModal, setShowReminderConfigModal] = useState(false);
  const [configSaving, setConfigSaving] = useState(false)
  const [configRefreshKey, setConfigRefreshKey] = useState(0)

  const [updatedGracePeriodConfig, setUpdatedGracePeriodConfig] = useState({
    numberOfDays: 7,
    gracePeriodDays: 7,
    reminderFrequency: 2,
    autoSuspendEnabled: true,
    lateFeesEnabled: false,
    lateFeePercentage: 0,
    lateFeeFixedAmount: 0
  });

  const [updatedReminderConfig, setUpdatedReminderConfig] = useState({
    autoSendReminders: true,
    firstReminderDays: 1,
    secondReminderDays: 3,
    finalReminderDays: 7,
    reminderMethod: "EMAIL"
  });

  const [showGracePeriodDialog, setShowGracePeriodDialog] = useState(false);
  const [showReminderDialog, setShowReminderDialog] = useState(false);

  const normalizeGraceConfig = (configData: any) => {
    const numberOfDays = parseInt(configData?.numberOfDays?.toString() || configData?.gracePeriodDays?.toString() || '7');
    const reminderFrequency = parseInt(configData?.reminderFrequency?.toString() || '2');

    const lateFeePercentage = parseFloat(configData?.lateFeePercentage?.toString() || '0');
    const lateFeeFixedAmount = parseFloat(configData?.lateFeeFixedAmount?.toString() || '0');

    return {
      numberOfDays: Number.isNaN(numberOfDays) ? 7 : numberOfDays,
      gracePeriodDays: Number.isNaN(numberOfDays) ? 7 : numberOfDays,
      reminderFrequency: Number.isNaN(reminderFrequency) ? 2 : reminderFrequency,
      autoSuspendEnabled: configData?.autoSuspendEnabled === true,
      lateFeesEnabled: configData?.lateFeesEnabled === true,
      lateFeePercentage: Number.isNaN(lateFeePercentage) ? 0 : lateFeePercentage,
      lateFeeFixedAmount: Number.isNaN(lateFeeFixedAmount) ? 0 : lateFeeFixedAmount
    };
  };

  const fetchOverduePayments = async () => {
    try {
      setLoading(true);
      const data = await paymentComplianceApi.getOverduePayments(page, pageSize, sortBy, sortDirection);
      setOverduePayments(data.content || []);
      setTotalPages(data.totalPages || 1);
      setTotalElements(data.totalElements || (data.content?.length || 0));

      // Fetch grace period configuration
      try {
        const configData = await paymentComplianceApi.getGracePeriodConfig();
        console.log("Loaded grace period config from API:", configData);

        // Ensure all fields exist with correct types
        const enhancedConfigData = normalizeGraceConfig(configData);

        console.log("Enhanced grace period config:", enhancedConfigData);
        setGracePeriodConfig(enhancedConfigData)
        setUpdatedGracePeriodConfig(enhancedConfigData)
      } catch (gracePeriodError) {
        console.error("Error fetching grace period config:", gracePeriodError);
        // Use defaults for grace period config
        const defaultGracePeriodConfig = normalizeGraceConfig({
          numberOfDays: 7,
          gracePeriodDays: 7,
          reminderFrequency: 2,
          autoSuspendEnabled: true,
          lateFeesEnabled: false,
          lateFeePercentage: 0,
          lateFeeFixedAmount: 0
        });
        setGracePeriodConfig(defaultGracePeriodConfig);
        setUpdatedGracePeriodConfig(defaultGracePeriodConfig);
      }

      // Fetch reminder configuration
      try {
        const reminderConfigData = await paymentComplianceApi.getReminderConfig()
        console.log("Loaded reminder config from API:", reminderConfigData);

        // Ensure all fields exist with correct types and normalize to descending order for UI
        const srvFirst = parseInt(reminderConfigData.firstReminderDays?.toString()) || 1;
        const srvSecond = parseInt(reminderConfigData.secondReminderDays?.toString()) || 3;
        const srvFinal = parseInt(reminderConfigData.finalReminderDays?.toString()) || 7;

        const daysDesc = [srvFirst, srvSecond, srvFinal].sort((a, b) => b - a);

        const enhancedReminderConfig = {
          autoSendReminders: reminderConfigData.autoSendReminders === false ? false : true,
          firstReminderDays: daysDesc[0],
          secondReminderDays: daysDesc[1],
          finalReminderDays: daysDesc[2],
          reminderMethod: reminderConfigData.reminderMethod || "EMAIL"
        };

        console.log("Enhanced reminder config:", enhancedReminderConfig);
        setReminderConfig(enhancedReminderConfig)
        setUpdatedReminderConfig(enhancedReminderConfig)
      } catch (reminderError) {
        console.error("Error fetching reminder config:", reminderError)
        // Use default values
        const defaultReminderConfig = {
          autoSendReminders: true,
          firstReminderDays: 1,
          secondReminderDays: 3,
          finalReminderDays: 7,
          reminderMethod: "EMAIL"
        };
        setReminderConfig(defaultReminderConfig);
        setUpdatedReminderConfig(defaultReminderConfig);
      }
    } catch (error) {
      console.error("Error fetching overdue payments or configuration:", error)

      // Set sensible defaults if we couldn't load configuration
      const defaultGracePeriodConfig = {
        gracePeriodDays: 7,
        numberOfDays: 7,
        reminderFrequency: 2,
        autoSuspendEnabled: true,
        lateFeesEnabled: false,
        lateFeePercentage: 0,
        lateFeeFixedAmount: 0
      };
      setGracePeriodConfig(defaultGracePeriodConfig);
      setUpdatedGracePeriodConfig(defaultGracePeriodConfig);

      const defaultReminderConfig = {
        autoSendReminders: true,
        firstReminderDays: 1,
        secondReminderDays: 3,
        finalReminderDays: 7,
        reminderMethod: "EMAIL"
      };
      setReminderConfig(defaultReminderConfig);
      setUpdatedReminderConfig(defaultReminderConfig);

      toast({
        title: "Error",
        description: "Failed to load payment data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  };

  useEffect(() => {
    fetchOverduePayments()
  }, [page, pageSize, sortBy, sortDirection, configRefreshKey])

  const handleSort = (column: string) => {
    if (column === sortBy) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortBy(column)
      setSortDirection("asc")
    }
  }

  // Fetch payment reminders for a payment when selected
  const fetchPaymentReminders = async (paymentId: string) => {
    if (!paymentId) return [];

    try {
      const reminders = await paymentComplianceApi.getPaymentReminders(paymentId);
      return reminders;
    } catch (error) {
      console.error("Error fetching payment reminders:", error);
      return [];
    }
  }

  // When selecting a payment for reminder
  const handleOpenReminderDialog = async (payment: any) => {
    setSelectedPayment(payment);
    setSendReminderDialogOpen(true);

    // Try to fetch previous reminders for this payment
    try {
      const reminders = await fetchPaymentReminders(payment.id);
      if (reminders && reminders.length > 0) {
        // Show toast with reminder history
        toast({
          title: "Reminder History",
          description: `This payment has ${reminders.length} previous reminders sent.`,
          variant: "default",
        });
      }
    } catch (error) {
      console.error("Error fetching reminder history:", error);
    }
  }

  const handleSendReminder = async () => {
    if (!selectedPayment) return

    try {
      setConfigSaving(true); // Use the same loading state
      await paymentComplianceApi.sendManualReminder(selectedPayment.id, reminderType)

      toast({
        title: "Reminder Sent",
        description: `A ${reminderType.toLowerCase().replace('_', ' ')} reminder has been sent to the customer.`,
        variant: "default",
      })

      setSendReminderDialogOpen(false)
    } catch (error) {
      console.error("Error sending reminder:", error)
      toast({
        title: "Error",
        description: "Failed to send payment reminder",
        variant: "destructive",
      })
    } finally {
      setConfigSaving(false);
    }
  }

  const handleRecordPayment = async () => {
    if (!selectedPayment) return

    try {
      setConfigSaving(true)

      // Close dialog first for better UX
      setRecordPaymentDialogOpen(false)

      const amountValue = parseFloat(paymentAmount)
      if (isNaN(amountValue) || amountValue <= 0) {
        toast({
          title: "Invalid amount",
          description: "Enter a valid payment amount greater than zero.",
          variant: "destructive",
        })
        setConfigSaving(false)
        return
      }

      const paymentData = {
        paymentId: selectedPayment.id,
        amount: amountValue,
        paymentMethod: paymentMethod,
        transactionId: transactionId || undefined
      }

      // Call API to record payment
      await paymentComplianceApi.recordManualPayment(selectedPayment.customerId, paymentData)

      // Show success message
      toast({
        title: "Payment Recorded",
        description: `Payment of ${formatCurrency(parseFloat(paymentAmount))} has been recorded successfully.`,
        variant: "default",
      })

      // Refresh data
      await fetchOverduePayments()

      // Reset form
      setPaymentAmount('')
      setPaymentMethod('BANK_TRANSFER')
      setTransactionId('')
    } catch (error) {
      console.error("Error recording payment:", error)
      toast({
        title: "Error",
        description: "Failed to record payment",
        variant: "destructive",
      })
    } finally {
      setConfigSaving(false)
    }
  }

  const handleUpdateGracePeriodConfig = async () => {
    try {
      setConfigSaving(true)

      // Validate grace period config before saving
      const isValid = validateGracePeriodConfig()

      if (!isValid) {
        return
      }

      const parseOrZero = (value: number | string) => {
        const parsed = typeof value === "string" ? parseFloat(value) : value;
        return Number.isFinite(parsed) ? parsed : 0;
      };

      const parsedDays = parseInt(updatedGracePeriodConfig.numberOfDays.toString());
      const parsedReminderFrequency = parseInt(updatedGracePeriodConfig.reminderFrequency.toString());
      const parsedLateFeePercentage = parseOrZero(updatedGracePeriodConfig.lateFeePercentage);
      const parsedLateFeeFixedAmount = parseOrZero(updatedGracePeriodConfig.lateFeeFixedAmount);

      // Ensure the correct field mapping and type conversion
      const configToUpdate = {
        numberOfDays: Number.isNaN(parsedDays) ? gracePeriodConfig.numberOfDays : parsedDays,
        gracePeriodDays: Number.isNaN(parsedDays) ? gracePeriodConfig.gracePeriodDays : parsedDays,
        autoSuspendEnabled: Boolean(updatedGracePeriodConfig.autoSuspendEnabled),
        reminderFrequency: Number.isNaN(parsedReminderFrequency) ? gracePeriodConfig.reminderFrequency : parsedReminderFrequency,
        lateFeesEnabled: Boolean(updatedGracePeriodConfig.lateFeesEnabled),
        lateFeePercentage: parsedLateFeePercentage,
        lateFeeFixedAmount: parsedLateFeeFixedAmount
      };

      console.log("Updating grace period config with:", configToUpdate);

      // Call API to update configuration
      await paymentComplianceApi.updateGracePeriodConfig(configToUpdate)

      // Re-fetch to ensure we reflect persisted state exactly
      const latestConfig = await paymentComplianceApi.getGracePeriodConfig()
      console.log("Latest grace period config from server:", latestConfig);

      const normalizedConfig = normalizeGraceConfig(latestConfig)
      setGracePeriodConfig(normalizedConfig)
      setUpdatedGracePeriodConfig(normalizedConfig)

      // Refresh any dependent data
      setConfigRefreshKey(prevKey => prevKey + 1)

      // Close dialog after successful save
      setShowGracePeriodDialog(false)

      // Show success message to user
      toast({
        title: "Changes Saved",
        description: "Payment compliance settings have been updated successfully",
        variant: "default",
      })
    } catch (error) {
      console.error("Error updating grace period config:", error)

      // Show error message
      toast({
        title: "Error",
        description: (error as any)?.response?.data?.message || "Failed to update grace period configuration. Please try again.",
        variant: "destructive",
      })
    } finally {
      setConfigSaving(false)
    }
  }

  const handleSaveReminderConfig = async () => {
    try {
      setConfigSaving(true)

      // Force dialog to close first for better UX
      setShowReminderDialog(false)

      // Validate reminder config before saving
      const isValid = validateReminderConfig()

      if (!isValid) {
        setConfigSaving(false)
        return
      }

      // Ensure values are properly formatted
      const configToUpdate = {
        // Respect admin toggle for automated reminders
        autoSendReminders: Boolean(updatedReminderConfig.autoSendReminders),
        // Ensure days are properly numeric and have defaults
        firstReminderDays: parseInt(updatedReminderConfig.firstReminderDays.toString()) || 1,
        secondReminderDays: parseInt(updatedReminderConfig.secondReminderDays.toString()) || 3,
        finalReminderDays: parseInt(updatedReminderConfig.finalReminderDays.toString()) || 7,
        // Set default reminder method
        reminderMethod: updatedReminderConfig.reminderMethod || "EMAIL"
      };

      console.log("Updating reminder config with:", configToUpdate);

      // Call API
      await paymentComplianceApi.updateReminderConfig(configToUpdate)

      // Update local state with new configuration
      setReminderConfig({ ...configToUpdate })

      // Force a refresh of the config data from the server
      setConfigRefreshKey(prevKey => prevKey + 1)

      // Show success message
      toast({
        title: "Changes Saved",
        description: "Payment compliance settings have been updated successfully",
        variant: "default",
      })
    } catch (error) {
      console.error("Error updating reminder config:", error)

      // Show error message
      toast({
        title: "Error",
        description: (error as any)?.response?.data?.message || "Failed to update reminder configuration. Please try again.",
        variant: "destructive",
      })
    } finally {
      setConfigSaving(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OVERDUE':
        return <Badge variant="destructive">Overdue</Badge>
      case 'PARTIALLY_PAID':
        return <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">Partially Paid</Badge>
      case 'PENDING':
        return <Badge variant="outline">Pending</Badge>
      case 'PAID':
        return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">Paid</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  // Validate grace period config before saving
  const validateGracePeriodConfig = () => {
    let isValid = true;
    const errors = [];

    // Convert string inputs to numbers for validation
    const gracePeriodDays = parseInt(updatedGracePeriodConfig.numberOfDays?.toString() || '7');
    const reminderFrequency = parseInt(updatedGracePeriodConfig.reminderFrequency?.toString() || '2');

    // Validate grace period days
    if (isNaN(gracePeriodDays) || gracePeriodDays < 1 || gracePeriodDays > 30) {
      isValid = false;
      errors.push("Grace period must be between 1 and 30 days");
    }

    // Validate reminder frequency
    if (isNaN(reminderFrequency) || reminderFrequency < 1 || reminderFrequency > gracePeriodDays) {
      isValid = false;
      errors.push(`Reminder frequency must be between 1 and ${gracePeriodDays} days`);
    }

    // Validate late fee settings
    if (updatedGracePeriodConfig.lateFeesEnabled) {
      const lateFeePercentage = parseFloat(updatedGracePeriodConfig.lateFeePercentage?.toString() || '0');
      const lateFeeFixedAmount = parseFloat(updatedGracePeriodConfig.lateFeeFixedAmount?.toString() || '0');

      const hasPercentage = !isNaN(lateFeePercentage) && lateFeePercentage > 0 && lateFeePercentage <= 100;
      const hasFixedAmount = !isNaN(lateFeeFixedAmount) && lateFeeFixedAmount > 0 && lateFeeFixedAmount <= 1000;

      if (!hasPercentage && !hasFixedAmount) {
        isValid = false;
        errors.push("Provide at least a percentage or fixed amount when late fees are enabled");
      }

      if (!isNaN(lateFeePercentage) && (lateFeePercentage < 0 || lateFeePercentage > 100)) {
        isValid = false;
        errors.push("Late fee percentage must be between 0 and 100");
      }

      if (!isNaN(lateFeeFixedAmount) && (lateFeeFixedAmount < 0 || lateFeeFixedAmount > 1000)) {
        isValid = false;
        errors.push("Late fee fixed amount must be between $0 and $1000");
      }
    }

    // If not valid, show toast with error messages and guide focus
    if (!isValid) {
      toast({
        title: "Validation Error",
        description: errors.join(". "),
        variant: "destructive",
        // @ts-ignore allow duration on toast API if supported
        duration: 5000,
      });

      // If late fees are enabled but nothing entered, focus the first fee field
      if (updatedGracePeriodConfig.lateFeesEnabled) {
        const perc = parseFloat(updatedGracePeriodConfig.lateFeePercentage?.toString() || '0');
        const fixed = parseFloat(updatedGracePeriodConfig.lateFeeFixedAmount?.toString() || '0');
        const hasPerc = !isNaN(perc) && perc > 0;
        const hasFixed = !isNaN(fixed) && fixed > 0;
        if (!hasPerc && !hasFixed) {
          setTimeout(() => {
            const el = document?.getElementById('lateFeePercentage');
            if (el && 'focus' in el) (el as HTMLElement).focus();
          }, 0);
        }
      }
    }

    return isValid;
  };

  // Validate reminder config before saving
  const validateReminderConfig = () => {
    let isValid = true;
    const errors = [];

    // Convert string inputs to numbers for validation
    const firstDays = parseInt(updatedReminderConfig.firstReminderDays?.toString() || '1');
    const secondDays = parseInt(updatedReminderConfig.secondReminderDays?.toString() || '3');
    const finalDays = parseInt(updatedReminderConfig.finalReminderDays?.toString() || '7');

    // Validate that all reminder days are positive integers (days BEFORE due date)
    if (isNaN(firstDays) || firstDays < 1) {
      isValid = false;
      errors.push("First reminder must be at least 1 day before due date");
    }

    if (isNaN(secondDays) || secondDays < 1) {
      isValid = false;
      errors.push("Second reminder must be at least 1 day before due date");
    }

    if (isNaN(finalDays) || finalDays < 1) {
      isValid = false;
      errors.push("Final reminder must be at least 1 day before due date");
    }

    // Validate that reminder days are in descending order (e.g., 14 > 7 > 3 days before)
    if (firstDays <= secondDays) {
      isValid = false;
      errors.push("First reminder must be scheduled earlier than (more days before) second reminder");
    }

    if (secondDays <= finalDays) {
      isValid = false;
      errors.push("Second reminder must be scheduled earlier than (more days before) final reminder");
    }

    // Validate maximum days (reasonable limit)
    if (firstDays > 60 || secondDays > 60 || finalDays > 60) {
      isValid = false;
      errors.push("Reminders cannot be more than 60 days before due date");
    }

    // Ensure reminder method is selected
    if (!updatedReminderConfig.reminderMethod) {
      isValid = false;
      errors.push("Please select a reminder delivery method");
    }

    // If not valid, show toast with error messages
    if (!isValid) {
      toast({
        title: "Validation Error",
        description: errors.join(". "),
        variant: "destructive",
      });
    }

    return isValid;
  };

  // Fix Badge variants in UI
  const CardWithBadges = () => (
    <CardContent className="pt-4">
      <dl className="space-y-3">
        <div className="flex justify-between items-center">
          <dt className="text-sm font-medium">Grace Period</dt>
          <dd className="text-sm">
            <Badge variant={gracePeriodConfig.numberOfDays > 0 ? "default" : "destructive"} className={gracePeriodConfig.numberOfDays > 0 ? "bg-green-100 text-green-800 border-green-300" : ""}>
              {gracePeriodConfig.numberOfDays} days
            </Badge>
          </dd>
        </div>
        <div className="flex justify-between items-center">
          <dt className="text-sm font-medium">Auto-Suspension</dt>
          <dd className="text-sm">
            {gracePeriodConfig.autoSuspendEnabled ? (
              <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-300">Enabled</Badge>
            ) : (
              <Badge variant="outline">Disabled</Badge>
            )}
          </dd>
        </div>
        <div className="flex justify-between items-center">
          <dt className="text-sm font-medium">Reminder Frequency</dt>
          <dd className="text-sm">Every {gracePeriodConfig.reminderFrequency} day(s)</dd>
        </div>
        <div className="flex justify-between items-center">
          <dt className="text-sm font-medium">Late Fee Status</dt>
          <dd className="text-sm">
            {gracePeriodConfig.lateFeesEnabled ? (
              <Badge variant="default">Enabled</Badge>
            ) : (
              <Badge variant="outline">Disabled</Badge>
            )}
          </dd>
        </div>
        {gracePeriodConfig.lateFeesEnabled && (
          (() => {
            const hasPercentage = !!gracePeriodConfig.lateFeePercentage && gracePeriodConfig.lateFeePercentage > 0;
            const hasFixed = !!gracePeriodConfig.lateFeeFixedAmount && gracePeriodConfig.lateFeeFixedAmount > 0;
            const parts = [] as string[];
            if (hasPercentage) parts.push(`${gracePeriodConfig.lateFeePercentage}% of installment`);
            if (hasFixed) parts.push(`$${gracePeriodConfig.lateFeeFixedAmount} fixed`);
            const exampleAmount = (100 * (hasPercentage ? gracePeriodConfig.lateFeePercentage / 100 : 0) + (hasFixed ? gracePeriodConfig.lateFeeFixedAmount : 0)).toFixed(2);
            return (
              <>
                <div className="flex justify-between items-center">
                  <dt className="text-sm font-medium">Late Fee Amount</dt>
                  <dd className="text-sm">{parts.join(' + ')}</dd>
                </div>
                <div className="mt-2 text-xs text-muted-foreground p-2 bg-muted/50 rounded">
                  Example: For a $100 installment, late fee would be ${exampleAmount}
                </div>
              </>
            );
          })()
        )}
      </dl>
      <div className="mt-3 text-xs text-muted-foreground">
        Note: These settings apply globally to all customers and payment plans. Percent fees are calculated as a percentage of each plan's installment amount.
      </div>
    </CardContent>
  );

  return (
    <div className="w-full space-y-4">
      {/* Ensure toasts render above dialog overlays on this page */}
      <Toaster />
      <Breadcrumb className="mb-4">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/admin">Admin</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Payment Operations</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Payment Operations</h1>
          <p className="text-muted-foreground">
            Process overdue payments, send reminders, and manage payment settings
          </p>
        </div>
      </div>

      <Tabs defaultValue="overdue" className="w-full">
        <TabsList>
          <TabsTrigger value="overdue">Overdue Payments</TabsTrigger>
          <TabsTrigger value="settings">Payment Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overdue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Overdue Payments</CardTitle>
              <CardDescription>
                Manage all payments past their due date
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="py-10 text-center">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
                  <p className="mt-2 text-sm text-muted-foreground">Loading payments...</p>
                </div>
              ) : (
                <div>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[100px]">
                            <Button variant="ghost" className="p-0 font-medium" onClick={() => handleSort("id")}>
                              ID
                              {sortBy === "id" && (
                                <ArrowUpDown className="ml-2 h-4 w-4" />
                              )}
                            </Button>
                          </TableHead>
                          <TableHead>
                            <span className="p-0 font-medium">Customer</span>
                          </TableHead>
                          <TableHead>
                            <Button variant="ghost" className="p-0 font-medium" onClick={() => handleSort("amount")}>
                              Amount
                              {sortBy === "amount" && (
                                <ArrowUpDown className="ml-2 h-4 w-4" />
                              )}
                            </Button>
                          </TableHead>
                          <TableHead>
                            <Button variant="ghost" className="p-0 font-medium" onClick={() => handleSort("dueDate")}>
                              Due Date
                              {sortBy === "dueDate" && (
                                <ArrowUpDown className="ml-2 h-4 w-4" />
                              )}
                            </Button>
                          </TableHead>
                          <TableHead>
                            <Button variant="ghost" className="p-0 font-medium" onClick={() => handleSort("daysOverdue")}>
                              Days Overdue
                              {sortBy === "daysOverdue" && (
                                <ArrowUpDown className="ml-2 h-4 w-4" />
                              )}
                            </Button>
                          </TableHead>
                          <TableHead>
                            <Button variant="ghost" className="p-0 font-medium" onClick={() => handleSort("status")}>
                              Status
                              {sortBy === "status" && (
                                <ArrowUpDown className="ml-2 h-4 w-4" />
                              )}
                            </Button>
                          </TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {overduePayments.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="h-24 text-center">
                              No overdue payments found
                            </TableCell>
                          </TableRow>
                        ) : (
                          overduePayments.map((payment) => (
                            <TableRow key={payment.id}>
                              <TableCell className="font-medium">{payment.id}</TableCell>
                              <TableCell>
                                {payment.customerName}
                              </TableCell>
                              <TableCell>{formatCurrency(payment.amount)}</TableCell>
                              <TableCell>
                                <div className="flex items-center">
                                  <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                                  <span>{format(new Date(payment.dueDate), "PPP")}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">{payment.daysOverdue ?? payment.daysPastDue ?? 0} days</Badge>
                              </TableCell>
                              <TableCell>
                                {getStatusBadge(payment.status)}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedPayment(payment)
                                      handleOpenReminderDialog(payment)
                                    }}
                                  >
                                    <AlertCircle className="mr-2 h-4 w-4" />
                                    Send Reminder
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedPayment(payment)
                                      setRecordPaymentDialogOpen(true)
                                      setPaymentAmount(payment.amount.toString())
                                    }}
                                  >
                                    <CreditCard className="mr-2 h-4 w-4" />
                                    Record Payment
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="mt-4 flex items-center justify-end space-x-2">
                    <div className="flex-1 text-sm text-muted-foreground">
                      Showing <span className="font-medium">{overduePayments.length}</span> of{" "}
                      <span className="font-medium">{totalElements}</span> results
                    </div>

                    <div className="space-x-2">
                      <Pagination>
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious
                              onClick={() => setPage(Math.max(0, page - 1))}
                              aria-disabled={page === 0}
                              className={page === 0 ? "pointer-events-none opacity-50" : ""}
                            />
                          </PaginationItem>

                          {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                            const pageNumber = i
                            const isVisible = pageNumber < 3 || pageNumber >= totalPages - 2 || Math.abs(pageNumber - page) < 2

                            if (!isVisible && i === 2 && totalPages > 5) {
                              return <PaginationEllipsis key="ellipsis" />
                            }

                            if (isVisible) {
                              return (
                                <PaginationItem key={pageNumber}>
                                  <PaginationLink
                                    isActive={pageNumber === page}
                                    onClick={() => setPage(pageNumber)}
                                  >
                                    {pageNumber + 1}
                                  </PaginationLink>
                                </PaginationItem>
                              )
                            }

                            return null
                          })}

                          <PaginationItem>
                            <PaginationNext
                              onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                              aria-disabled={page === totalPages - 1}
                              className={page === totalPages - 1 ? "pointer-events-none opacity-50" : ""}
                            />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment Configuration</CardTitle>
              <CardDescription>
                Configure payment settings, grace periods, and reminder schedules
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Grace Period Card */}
                  <Card className="overflow-hidden border-2">
                    <CardHeader className="bg-muted/50 pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">Grace Period Settings</CardTitle>
                        <Button variant="ghost" size="sm" onClick={() => setShowGracePeriodDialog(true)} className="h-8">
                          <Settings className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                      </div>
                      <CardDescription>
                        Payment flexibility and late fee settings
                      </CardDescription>
                    </CardHeader>
                    <CardWithBadges />
                  </Card>

                  {/* Reminder Settings Card */}
                  <Card className="overflow-hidden border-2">
                    <CardHeader className="bg-muted/50 pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">Reminder Schedule</CardTitle>
                        <Button variant="ghost" size="sm" onClick={() => setShowReminderDialog(true)} className="h-8">
                          <Settings className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                      </div>
                      <CardDescription>
                        Automated payment reminder timelines
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-4">
                      {/* Robust timeline visualization */}
                      <div className="space-y-2">
                        <div className="relative w-full h-6 rounded-full overflow-hidden">
                          {/* Base rail */}
                          <div className="absolute inset-y-2 left-0 right-0 bg-muted rounded-full" />
                          {/* Markers centered vertically to avoid overlap */}
                          <div className="absolute top-1/2 -translate-y-1/2 right-0 w-2 h-2 bg-primary rounded-full" />
                          <div
                            className="absolute top-1/2 -translate-y-1/2 w-2 h-2 bg-primary rounded-full"
                            style={{ left: `${Math.max(0, 100 - (Number(reminderConfig.firstReminderDays || 1) / 30) * 100)}%` }}
                          />
                          <div
                            className="absolute top-1/2 -translate-y-1/2 w-2 h-2 bg-primary rounded-full"
                            style={{ left: `${Math.max(0, 100 - (Number(reminderConfig.secondReminderDays || 3) / 30) * 100)}%` }}
                          />
                          <div
                            className="absolute top-1/2 -translate-y-1/2 w-2 h-2 bg-primary rounded-full"
                            style={{ left: `${Math.max(0, 100 - (Number(reminderConfig.finalReminderDays || 7) / 30) * 100)}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>30 Days Before</span>
                          <span>Due Date</span>
                        </div>
                      </div>

                      <dl className="space-y-3">
                        <div className="flex justify-between items-center">
                          <dt className="text-sm font-medium">Auto-Send Status</dt>
                          <dd className="text-sm">
                            <Badge
                              variant="outline"
                              className={
                                reminderConfig.autoSendReminders
                                  ? "bg-emerald-500/10 text-emerald-700 border-emerald-200"
                                  : "bg-destructive/10 text-destructive border-destructive/40"
                              }
                            >
                              {reminderConfig.autoSendReminders ? "Enabled" : "Disabled"}
                            </Badge>
                          </dd>
                        </div>
                        <div className="flex justify-between items-center">
                          <dt className="text-sm font-medium">First Reminder</dt>
                          <dd className="text-sm">{reminderConfig.firstReminderDays} days before due date</dd>
                        </div>
                        <div className="flex justify-between items-center">
                          <dt className="text-sm font-medium">Second Reminder</dt>
                          <dd className="text-sm">{reminderConfig.secondReminderDays} days before due date</dd>
                        </div>
                        <div className="flex justify-between items-center">
                          <dt className="text-sm font-medium">Final Reminder</dt>
                          <dd className="text-sm">{reminderConfig.finalReminderDays} days before due date</dd>
                        </div>
                        <div className="flex justify-between items-center">
                          <dt className="text-sm font-medium">Delivery Method</dt>
                          <dd className="text-sm">
                            <Badge variant="outline">
                              {reminderConfig.reminderMethod === "EMAIL" ? "Email Only" :
                                reminderConfig.reminderMethod === "SMS" ? "SMS Only" :
                                  "Email & SMS"}
                            </Badge>
                          </dd>
                        </div>
                      </dl>

                      <div className="rounded-md border bg-muted/30 p-3">
                        <p className="text-xs text-muted-foreground">
                          {reminderConfig.autoSendReminders
                            ? "Auto-send reminders follow this schedule exactly. Update the settings if you need to pause automated messaging."
                            : "Auto-send reminders are off. No customers will receive automated messages until you enable the feature or send reminders manually."}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="rounded-md border p-4 bg-muted/20">
                  <h3 className="text-sm font-medium mb-2">System Behavior</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li className="text-muted-foreground">Services are automatically suspended after the grace period expires</li>
                    <li className="text-muted-foreground">Reminders are sent according to the configured schedule</li>
                    <li className="text-muted-foreground">Late fees are applied only for payments received after the grace period</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Send Reminder Dialog */}
      <Dialog open={sendReminderDialogOpen} onOpenChange={setSendReminderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Payment Reminder</DialogTitle>
            <DialogDescription>
              Send a reminder to the customer about their overdue payment.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="customer">Customer</Label>
              <Input id="customer" value={selectedPayment?.customerName || ""} readOnly />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount Due</Label>
              <Input
                id="amount"
                value={selectedPayment ? formatCurrency(selectedPayment.amount) : ""}
                readOnly
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reminderType">Reminder Type</Label>
              <Select value={reminderType} onValueChange={setReminderType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select reminder type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EMAIL">Email</SelectItem>
                  <SelectItem value="SMS">SMS</SelectItem>
                  <SelectItem value="FIRST_REMINDER">First Reminder</SelectItem>
                  <SelectItem value="FINAL_NOTICE">Final Notice</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="mt-4 pt-2 border-t">
              <h4 className="text-sm font-medium mb-2">Delivery Information</h4>
              <p className="text-xs text-muted-foreground mb-2">
                The reminder will be sent to the customer's {reminderType === "SMS" ? "phone number" : "email address"} on file.
              </p>
              <p className="text-xs text-muted-foreground">
                Delivery channel: <Badge variant="outline">{reminderType === "SMS" ? "SMS" : "EMAIL"}</Badge>
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSendReminderDialogOpen(false)} disabled={configSaving}>
              Cancel
            </Button>
            <Button onClick={handleSendReminder} disabled={configSaving}>
              {configSaving ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                  Sending...
                </>
              ) : (
                "Send Reminder"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record Payment Dialog */}
      <Dialog open={recordPaymentDialogOpen} onOpenChange={setRecordPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Manual Payment</DialogTitle>
            <DialogDescription>
              Record a payment made by the customer outside the system.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="payment-customer">Customer</Label>
              <Input id="payment-customer" value={selectedPayment?.customerName || ""} readOnly />
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentAmount">Payment Amount</Label>
              <div className="relative">
                <Banknote className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="paymentAmount"
                  className="pl-9"
                  placeholder="0.00"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                  <SelectItem value="CHECK">Check</SelectItem>
                  <SelectItem value="CREDIT_CARD">Credit Card</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="transactionId">Transaction ID (Optional)</Label>
              <Input
                id="transactionId"
                placeholder="Enter transaction ID"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRecordPaymentDialogOpen(false)} disabled={configSaving}>
              Cancel
            </Button>
            <Button onClick={handleRecordPayment} disabled={configSaving}>
              {configSaving ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                  Recording...
                </>
              ) : (
                "Record Payment"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Grace Period Configuration Dialog */}
      <Dialog open={showGracePeriodDialog} onOpenChange={(open) => {
        if (!open) {
          // Reset to original values if dialog is closed without saving
          setUpdatedGracePeriodConfig({ ...gracePeriodConfig });
        }
        setShowGracePeriodDialog(open);
      }}>
        <DialogContent className="w-[95vw] max-w-lg sm:max-w-xl md:max-w-2xl mx-auto max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Grace Period Settings</DialogTitle>
            <DialogDescription>
              Configure the grace period for overdue payments and late fee application.
            </DialogDescription>
          </DialogHeader>

          {/* Scrollable content area */}
          <div className="dialog-scroll space-y-6 py-4 overflow-y-auto flex-1 px-3 pr-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="gracePeriodDays">Grace Period Duration</Label>
                <div className="relative">
                  <Input
                    id="gracePeriodDays"
                    type="number"
                    min="0"
                    max="30"
                    value={updatedGracePeriodConfig.numberOfDays}
                    onChange={(e) => setUpdatedGracePeriodConfig({
                      ...updatedGracePeriodConfig,
                      numberOfDays: parseInt(e.target.value) || 0,
                      gracePeriodDays: parseInt(e.target.value) || 0
                    })}
                    className="pr-12" // Add padding to the right to make room for the "days" label
                  />
                  <span className="absolute right-3 top-2.5 text-sm text-muted-foreground">days</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Number of days after due date before service suspension
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reminderFrequency">Reminder Frequency</Label>
                <div className="relative">
                  <Input
                    id="reminderFrequency"
                    type="number"
                    min="1"
                    max="14"
                    value={updatedGracePeriodConfig.reminderFrequency}
                    onChange={(e) => setUpdatedGracePeriodConfig({
                      ...updatedGracePeriodConfig,
                      reminderFrequency: parseInt(e.target.value) || 1
                    })}
                    className="pr-12" // Add padding to the right to make room for the "days" label
                  />
                  <span className="absolute right-3 top-2.5 text-sm text-muted-foreground">days</span>
                </div>
                <p className="text-xs text-muted-foreground">Send payment reminders every X days during grace period</p>
              </div>
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm font-medium mb-3">System Behavior After Grace Period</p>
              <div className="flex items-center justify-between mb-3 bg-muted/30 p-3 rounded-md">
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className={updatedGracePeriodConfig.autoSuspendEnabled ? "bg-red-100 text-red-800 border-red-300" : ""}>
                    Auto-Suspension
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {updatedGracePeriodConfig.autoSuspendEnabled ? "Service is automatically suspended after grace period ends" : "Service is not automatically suspended after grace period"}
                  </span>
                </div>
                <Switch
                  id="autoSuspendEnabled"
                  checked={updatedGracePeriodConfig.autoSuspendEnabled === true}
                  onCheckedChange={(checked) => setUpdatedGracePeriodConfig({
                    ...updatedGracePeriodConfig,
                    autoSuspendEnabled: checked
                  })}
                />
              </div>
            </div>

            <div className="pt-4 border-t">
              <div className="flex items-center justify-between">
                <Label htmlFor="lateFeesEnabled" className="text-base font-medium">Apply Late Fees</Label>
                <Switch
                  id="lateFeesEnabled"
                  checked={updatedGracePeriodConfig.lateFeesEnabled === true}
                  onCheckedChange={(checked) => setUpdatedGracePeriodConfig(prev => ({
                    ...prev,
                    lateFeesEnabled: checked,
                    lateFeePercentage: checked ? prev.lateFeePercentage || 0 : 0,
                    lateFeeFixedAmount: checked ? prev.lateFeeFixedAmount || 0 : 0
                  }))}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1 mb-3">Add fees to payments made after the grace period</p>
            </div>

            {updatedGracePeriodConfig.lateFeesEnabled && (
              <div className="space-y-4 pl-3 border-l-2 border-muted">
                <div className="space-y-2">
                  <Label htmlFor="lateFeePercentage">Percentage Fee (% of installment)</Label>
                  <div className="relative">
                  <Input
                    id="lateFeePercentage"
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9]*[.]?[0-9]*"
                    onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
                    value={updatedGracePeriodConfig.lateFeePercentage}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^0-9.]/g, '');
                      const val = parseFloat(raw);
                      setUpdatedGracePeriodConfig({
                        ...updatedGracePeriodConfig,
                        lateFeePercentage: isNaN(val) ? 0 : val
                      })
                    }}
                  />
                    <span className="absolute right-3 top-2 text-sm text-muted-foreground">%</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Percentage of installment amount</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lateFeeFixedAmount">Fixed Fee</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-sm text-muted-foreground">$</span>
                    <Input
                      id="lateFeeFixedAmount"
                      type="text"
                      inputMode="decimal"
                      pattern="[0-9]*[.]?[0-9]*"
                      onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
                      className="pl-7"
                      value={updatedGracePeriodConfig.lateFeeFixedAmount}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^0-9.]/g, '');
                        const val = parseFloat(raw);
                        setUpdatedGracePeriodConfig({
                          ...updatedGracePeriodConfig,
                          lateFeeFixedAmount: isNaN(val) ? 0 : val
                        })
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Fixed dollar amount added to late payments</p>
                </div>

                <div className="rounded-md bg-muted p-3">
                  <p className="text-xs">
                    <strong>Example:</strong> For a $100 payment, a late fee would be ${(100 * (updatedGracePeriodConfig.lateFeePercentage / 100) + updatedGracePeriodConfig.lateFeeFixedAmount).toFixed(2)}
                    ({updatedGracePeriodConfig.lateFeePercentage}% + ${updatedGracePeriodConfig.lateFeeFixedAmount} fixed fee)
                  </p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex space-x-2 justify-end px-0 pt-3 pb-1">
            <Button variant="outline" onClick={() => setShowGracePeriodDialog(false)} disabled={configSaving}>
              Cancel
            </Button>
            <Button onClick={handleUpdateGracePeriodConfig} disabled={configSaving || updatedGracePeriodConfig.numberOfDays < 0}>
              {configSaving ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                  Saving...
                </>
              ) : (
                "Save Settings"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reminder Configuration Dialog */}
      <Dialog open={showReminderDialog} onOpenChange={(open) => {
        if (!open) {
          // Reset to original values if dialog is closed without saving
          setUpdatedReminderConfig({ ...reminderConfig })
        }
        setShowReminderDialog(open)
      }}>
        <DialogContent className="w-[95vw] max-w-lg sm:max-w-xl md:max-w-2xl mx-auto max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Payment Reminder Schedule</DialogTitle>
            <DialogDescription>
              Configure when pre‑due reminder notifications are sent. Post‑due reminders are controlled by Grace Period settings.
            </DialogDescription>
          </DialogHeader>

          {/* Scrollable content area */}
          <div className="dialog-scroll space-y-6 py-4 overflow-y-auto flex-1 px-3 pr-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="autoSendReminders" className="text-base font-medium">Automatically Send Reminders</Label>
                <p className="text-xs text-muted-foreground">When enabled, the system sends pre‑due reminders as scheduled below.</p>
              </div>
              <Switch
                id="autoSendReminders"
                checked={updatedReminderConfig.autoSendReminders === true}
                onCheckedChange={(checked) => setUpdatedReminderConfig({
                  ...updatedReminderConfig,
                  autoSendReminders: checked
                })}
              />
            </div>
            {/* Timeline Preview */}
            <div className="mb-4 bg-muted/30 rounded-lg p-4 border border-muted">
              <h4 className="text-sm font-medium mb-3 flex items-center">
                <Calendar className="h-4 w-4 mr-2" /> Reminder Timeline
              </h4>
              <div className="relative w-full h-8">
                {/* Base rail */}
                <div className="absolute inset-y-3 left-0 right-0 bg-muted rounded-full" />
                {/* Markers, vertically centered to avoid overlap */}
                <div className="absolute top-1/2 -translate-y-1/2 right-0 w-3 h-3 bg-primary rounded-full" />
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-blue-400 rounded-full"
                  style={{ left: `${Math.min(Math.max(100 - (Number(updatedReminderConfig.firstReminderDays || 1) / 30) * 100, 2), 98)}%` }}
                />
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-amber-400 rounded-full"
                  style={{ left: `${Math.min(Math.max(100 - (Number(updatedReminderConfig.secondReminderDays || 3) / 30) * 100, 2), 98)}%` }}
                />
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-red-400 rounded-full"
                  style={{ left: `${Math.min(Math.max(100 - (Number(updatedReminderConfig.finalReminderDays || 7) / 30) * 100, 2), 98)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <span>30 Days Before</span>
                <span>Due Date</span>
              </div>
              {/* Legend to clarify marker colors and reduce confusion */}
              <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                <div className="flex items-center space-x-2">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-400" />
                  <span>First</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <span>Second</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-400" />
                  <span>Final</span>
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
              <Label htmlFor="firstReminderDays">First Reminder (days before due date)</Label>
              <div className="relative">
                  <Input
                    id="firstReminderDays"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    min={Math.max(1, parseInt(updatedReminderConfig.secondReminderDays?.toString() || '0') + 1)}
                    max={60}
                    value={updatedReminderConfig.firstReminderDays}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                    setUpdatedReminderConfig({
                      ...updatedReminderConfig,
                      firstReminderDays: isNaN(value) ? 1 : value
                    });
                  }}
                  className="pr-16"
                />
                <span className="absolute right-3 top-2.5 text-sm text-muted-foreground select-none pointer-events-none">days</span>
              </div>
                <p className="text-xs text-muted-foreground">
                  First gentle reminder sent this many days before due date.
                </p>
              </div>

              <div className="space-y-2">
              <Label htmlFor="secondReminderDays">Second Reminder (days before due date)</Label>
              <div className="relative">
                  <Input
                    id="secondReminderDays"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    min={Math.max(1, parseInt(updatedReminderConfig.finalReminderDays?.toString() || '0') + 1)}
                    max={Math.max(1, parseInt(updatedReminderConfig.firstReminderDays?.toString() || '60') - 1)}
                    value={updatedReminderConfig.secondReminderDays}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                    setUpdatedReminderConfig({
                      ...updatedReminderConfig,
                      secondReminderDays: isNaN(value) ? 3 : value
                    });
                  }}
                  className="pr-16"
                />
                <span className="absolute right-3 top-2.5 text-sm text-muted-foreground select-none pointer-events-none">days</span>
              </div>
                <p className="text-xs text-muted-foreground">
                  Second, more urgent reminder sent this many days before due date.
                </p>
              </div>

              <div className="space-y-2">
              <Label htmlFor="finalReminderDays">Final Reminder (days before due date)</Label>
              <div className="relative">
                  <Input
                    id="finalReminderDays"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    min={1}
                    max={Math.max(1, parseInt(updatedReminderConfig.secondReminderDays?.toString() || '2') - 1)}
                    value={updatedReminderConfig.finalReminderDays}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                    setUpdatedReminderConfig({
                      ...updatedReminderConfig,
                      finalReminderDays: isNaN(value) ? 7 : value
                    });
                  }}
                  className="pr-16"
                />
                <span className="absolute right-3 top-2.5 text-sm text-muted-foreground select-none pointer-events-none">days</span>
              </div>
                <p className="text-xs text-muted-foreground">
                  Final notice before due date (service actions after due date follow Grace Period settings).
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reminderMethod">Delivery Method</Label>
                <Select
                  value={updatedReminderConfig.reminderMethod}
                  onValueChange={(value) => setUpdatedReminderConfig({
                    ...updatedReminderConfig,
                    reminderMethod: value
                  })}
                >
                  <SelectTrigger id="reminderMethod">
                    <SelectValue placeholder="Select delivery method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EMAIL">Email Only</SelectItem>
                    <SelectItem value="SMS">SMS Only</SelectItem>
                    <SelectItem value="BOTH">Email & SMS</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Choose how payment reminders will be delivered to customers.
                </p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t">
              <div className="text-xs text-muted-foreground bg-muted p-3 rounded-md">
                <p className="font-medium mb-1">Note:</p>
                <p>These settings control pre‑due reminders. Customers receive at most one reminder per day.</p>
                <p className="mt-1">After the due date, Grace Period settings determine post‑due communications.</p>
              </div>
            </div>
          </div>

          <DialogFooter className="flex space-x-2 justify-end px-0 pt-3 pb-1">
            <Button variant="outline" onClick={() => setShowReminderDialog(false)} disabled={configSaving}>
              Cancel
            </Button>
            <Button onClick={handleSaveReminderConfig} disabled={configSaving}>
              {configSaving ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <style jsx global>{`
        /* Thin, subtle scrollbars just for dialog content */
        .dialog-scroll {
          scrollbar-width: thin; /* Firefox */
          scrollbar-color: rgba(100, 100, 100, 0.25) transparent; /* Firefox */
          scrollbar-gutter: stable both-edges; /* Reserve space for scrollbar to avoid overlaying content */
          -webkit-overflow-scrolling: touch; /* Smooth on iOS */
        }
        .dialog-scroll::-webkit-scrollbar {
          width: 6px; /* Chrome, Safari */
          height: 6px;
        }
        .dialog-scroll::-webkit-scrollbar-thumb {
          background-color: rgba(100, 100, 100, 0.25);
          border-radius: 9999px;
        }
        .dialog-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
      `}</style>
    </div>
  )
}
