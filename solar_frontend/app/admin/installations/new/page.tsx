"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import {
  ArrowLeft,
  Save,
  User,
  MapPin,
  Zap,
  Calendar,
  Tag,
  Fingerprint,
} from "lucide-react"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { useToast } from "@/components/ui/use-toast"
import { installationApi, customerApi } from "@/lib/api"

// Form schema validation
const formSchema = z.object({
  name: z.string().min(1, "Installation name is required"),
  customerId: z.string().min(1, "Customer is required"),
  installedCapacityKW: z.string().min(1, "Capacity is required"),
  location: z.string().min(1, "Location is required"),
  installDate: z.string().min(1, "Installation date is required"),
  type: z.string().min(1, "Installation type is required"),
  notes: z.string().optional(),
})

export default function NewInstallationPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [customers, setCustomers] = useState([])
  const [isLoading, setIsLoading] = useState(false)

  // Set up form with validation
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      customerId: "",
      installedCapacityKW: "",
      location: "",
      installDate: new Date().toISOString().split('T')[0],
      type: "Residential", // Default to Residential
      notes: "",
    },
  })

  // Load customers for dropdown
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const customersData = await customerApi.getAllCustomers()
        console.log('Fetched customers data:', customersData)

        if (customersData && Array.isArray(customersData)) {
          setCustomers(customersData)
        } else if (customersData && customersData.content && Array.isArray(customersData.content)) {
          setCustomers(customersData.content)
        } else {
          console.error('Invalid customer data format:', customersData)
          setCustomers([])
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to load customers in expected format.",
          })
        }
      } catch (error) {
        console.error("Error fetching customers:", error)
        setCustomers([])
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load customers. Please try again.",
        })
      }
    }

    fetchCustomers()
  }, [toast])

  // Handle form submission
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true)

    try {
      // Prepare installation data for API
      const installationData = {
        name: values.name,
        userId: parseInt(values.customerId), // Convert to number as required by backend
        installedCapacityKW: parseFloat(values.installedCapacityKW.replace('kW', '').trim()),
        location: values.location,
        installationDate: new Date(values.installDate).toISOString(), // Format date properly
        status: "ACTIVE", // Use enum value from backend
        type: values.type, // Include the installation type
        notes: values.notes || ""
      }

      console.log("Submitting installation data:", installationData)

      // Submit to API with explicit content type and proper URL
      const response = await installationApi.createInstallation(installationData)

      console.log("Installation created successfully:", response)

      // Show success message
      toast({
        title: "Installation Created",
        description: "The solar installation has been successfully created.",
      })

      // Navigate to installations list
      router.push("/admin/installations")
    } catch (error) {
      console.error("Error creating installation:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create installation. Please try again.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <Breadcrumb className="mb-2">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/admin">Admin</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href="/admin/installations">Installations</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>New Installation</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => router.back()} className="mr-2">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">New Installation</h1>
          </div>
          <p className="text-muted-foreground">
            Create a new solar panel installation
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Installation Details</CardTitle>
              <CardDescription>
                Enter the details for the new solar panel installation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Installation Name</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Tag className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input placeholder="Enter installation name" className="pl-9" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="customerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger className="pl-9">
                              <SelectValue placeholder="Select customer" />
                            </SelectTrigger>
                            <SelectContent>
                              {customers.length === 0 ? (
                                <SelectItem value="no-customers" disabled>
                                  No customers found
                                </SelectItem>
                              ) : (
                                customers.map((customer) => (
                                  <SelectItem
                                    key={customer.id}
                                    value={customer.id.toString()}
                                  >
                                    {customer.fullName || customer.email || customer.username || customer.id}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="installedCapacityKW"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Capacity (kW)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Zap className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input placeholder="e.g. 5.6 kW" className="pl-9" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input placeholder="Enter address" className="pl-9" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Installation Type</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Tag className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger className="pl-9">
                              <SelectValue placeholder="Select installation type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Residential">Residential</SelectItem>
                              <SelectItem value="Commercial">Commercial</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="installDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Installation Date</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input type="date" className="pl-9" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter additional notes or instructions (optional)"
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="flex justify-between border-t p-4">
              <Button
                variant="outline"
                onClick={() => router.push("/admin/installations")}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <span className="mr-2">Creating...</span>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Create Installation
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>
    </div>
  )
}