"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Save, Loader2, AlertCircle } from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
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
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/components/auth-provider"
import { customerApi } from "@/lib/api"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"

// Define form schema with validation rules
const formSchema = z.object({
  fullName: z.string().min(2, { message: "Full name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  phoneNumber: z.string().optional(),
  address: z.string().optional()
})

export default function EditCustomerPage({ params }: { params: { id: string } }) {
  const { user } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const customerId = params.id

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [customer, setCustomer] = useState<any>(null)

  // Initialize form with default values
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phoneNumber: "",
      address: ""
    }
  })

  // Fetch customer data
  useEffect(() => {
    const fetchCustomer = async () => {
      if (!user || user.role !== "ADMIN") return

      try {
        setLoading(true)
        const data = await customerApi.getCustomerById(customerId)
        setCustomer(data)

        // Set form values from customer data
        form.reset({
          fullName: data.fullName || "",
          email: data.email || "",
          phoneNumber: data.phoneNumber || "",
          address: data.address || ""
        })
      } catch (error) {
        console.error("Error fetching customer:", error)
        toast({
          variant: "destructive",
          title: "Error loading customer",
          description: "Failed to load customer details. Please try again.",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchCustomer()
  }, [customerId, user, toast, form])

  // Handle form submission
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setSaving(true)

      // Prepare data for API
      const customerData = {
        ...values
      }

      // Submit to API
      await customerApi.updateCustomer(customerId, customerData)

      toast({
        title: "Customer updated",
        description: "Customer information has been updated successfully.",
      })

      // Navigate back to customer details page
      router.push(`/admin/customers/${customerId}`)
    } catch (error) {
      console.error("Error updating customer:", error)
      toast({
        variant: "destructive",
        title: "Error updating customer",
        description: error.response?.data?.message || "An unexpected error occurred.",
      })
    } finally {
      setSaving(false)
    }
  }

  if (!user || user.role !== "ADMIN") return null

  return (
    <div className="space-y-6">
      <Breadcrumb className="mb-4">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/admin">Admin</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/admin/customers">Customers</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href={`/admin/customers/${customerId}`}>
              {customer ? customer.fullName : "Customer"}
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Edit Profile</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Customer Profile</h1>
          <p className="text-muted-foreground">
            Update {customer?.fullName}'s profile information
          </p>
        </div>
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="flex flex-col items-center space-y-2">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-lg text-muted-foreground">Loading customer details...</p>
          </div>
        </div>
      ) : customer ? (
        <Card>
          <CardHeader>
            <CardTitle>Customer Information</CardTitle>
            <CardDescription>
              Update the customer's personal information and account settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Personal Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="fullName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter full name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="Enter email address" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="phoneNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter phone number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Address</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter address" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Account Status</h3>
                  <div className="flex items-center space-x-2">
                    <div className={`h-3 w-3 rounded-full ${customer?.status === "ACTIVE" ? "bg-green-500" :
                        customer?.status === "PENDING_VERIFICATION" ? "bg-yellow-500" :
                          customer?.status === "SUSPENDED" ? "bg-red-500" : "bg-gray-500"
                      }`} />
                    <span>{customer?.status === "ACTIVE" ? "Active" :
                      customer?.status === "PENDING_VERIFICATION" ? "Pending Verification" :
                        customer?.status === "SUSPENDED" ? "Suspended" :
                          customer?.status === "LOCKED" ? "Locked" : "Unknown"}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Customer status cannot be changed directly. Status changes happen automatically based on account actions.
                  </p>
                </div>

                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    className="mr-2"
                    onClick={() => router.back()}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving || !form.formState.isDirty}>
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="h-16 w-16 text-destructive mb-4" />
          <h2 className="text-2xl font-bold">Customer Not Found</h2>
          <p className="text-muted-foreground mt-2 mb-6">
            The customer you're trying to edit doesn't exist or may have been removed.
          </p>
          <Button onClick={() => router.push("/admin/customers")}>
            Go Back to Customers
          </Button>
        </div>
      )}
    </div>
  )
} 