"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import React from "react"
import {
  ArrowLeft, Edit, ClipboardCheck, History, Settings,
  Zap, CreditCard, AlertCircle, Loader2, User,
  CheckCircle, XCircle, Lock, Clock, Pencil, Key
} from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/components/auth-provider"
import { customerApi, installationApi } from "@/lib/api"

export default function CustomerDetailsPage({ params }: { params: { id: string } }) {
  const { user } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const unwrappedParams = React.use(params)
  const customerId = unwrappedParams.id

  const [loading, setLoading] = useState(true)
  const [customer, setCustomer] = useState<any>(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [confirmAction, setConfirmAction] = useState({ type: "", description: "" })
  const [installations, setInstallations] = useState([])
  const [loadingInstallations, setLoadingInstallations] = useState(false)

  // Fetch customer data
  useEffect(() => {
    const fetchCustomer = async () => {
      if (!user || user.role !== "ADMIN") return

      try {
        setLoading(true)
        const data = await customerApi.getCustomerById(customerId)
        setCustomer(data)
        
        // Fetch installations for this customer
        try {
          setLoadingInstallations(true)
          const installationsData = await installationApi.getCustomerInstallations(customerId)
          if (Array.isArray(installationsData)) {
            setInstallations(installationsData)
          } else {
            setInstallations([])
          }
        } catch (error) {
          console.error("Error fetching customer installations:", error)
          setInstallations([])
        } finally {
          setLoadingInstallations(false)
        }
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
  }, [customerId, user, toast])

  // Format date 
  const formatDate = (dateString) => {
    if (!dateString) return "N/A"
    return new Date(dateString).toLocaleString()
  }

  // Get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case "ACTIVE":
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case "SUSPENDED":
        return <XCircle className="h-5 w-5 text-orange-500" />
      case "LOCKED":
        return <Lock className="h-5 w-5 text-red-500" />
      case "PENDING_VERIFICATION":
        return <Clock className="h-5 w-5 text-blue-500" />
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />
    }
  }

  // Open confirm dialog
  const openConfirmDialog = (type) => {
    let title = ""
    let description = ""

    switch (type) {
      case "reactivate":
        title = "Reactivate Customer"
        description = "Are you sure you want to reactivate this customer? They will regain access to the system once they verify their email and change their initial password."
        break
      case "deactivate":
        title = "Deactivate Customer"
        description = "Are you sure you want to deactivate this customer? They will no longer be able to access the system."
        break
      case "reset":
        title = "Reset Password"
        description = "Are you sure you want to reset this customer's password? They will receive an email with instructions and will need to change their password before accessing the system."
        break
    }

    setConfirmAction({ type, description })
    setShowConfirmDialog(true)
  }

  // Handle confirming action
  const handleConfirmAction = async () => {
    setShowConfirmDialog(false)

    try {
      setLoading(true)

      if (confirmAction.type === "reactivate") {
        await customerApi.reactivateCustomer(customerId)
        toast({
          title: "Customer reactivated",
          description: "Customer account has been reactivated successfully.",
        })
      } else if (confirmAction.type === "deactivate") {
        await customerApi.deactivateCustomer(customerId)
        toast({
          title: "Customer deactivated",
          description: "Customer account has been deactivated successfully.",
        })
      } else if (confirmAction.type === "reset") {
        await customerApi.resetCustomerPassword(customerId)
        toast({
          title: "Password reset",
          description: "Password reset link has been sent to the customer's email.",
        })
      }

      // Refresh customer data
      const updatedCustomer = await customerApi.getCustomerById(customerId)
      setCustomer(updatedCustomer)
    } catch (error) {
      console.error("Error performing action:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: error.response?.data?.message || "Failed to perform action. Please try again.",
      })
    } finally {
      setLoading(false)
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
            <BreadcrumbPage>
              {loading ? "Customer Details" : customer?.fullName || "Customer"}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{loading ? "Loading..." : customer?.fullName}</h1>
          <p className="text-muted-foreground">Customer profile and details</p>
        </div>
        <Button variant="outline" onClick={() => router.push("/admin/customers")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Customers
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Customer Profile Card */}
          <Card className="md:col-span-1">
            <CardHeader className="flex flex-row items-center space-x-4 pb-2">
              <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center">
                <User className="h-6 w-6 text-primary" />
              </div>
              <div className="space-y-1">
                <CardTitle>Customer Profile</CardTitle>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(customer.status)}
                  <Badge variant={
                    customer.status === "ACTIVE" ? "default" :
                      customer.status === "PENDING_VERIFICATION" ? "outline" :
                        customer.status === "LOCKED" ? "destructive" : "secondary"
                  }>
                    {customer.status === "ACTIVE" ? "Active" :
                      customer.status === "PENDING_VERIFICATION" ? "Pending Verification" :
                        customer.status === "SUSPENDED" ? "Suspended" :
                          customer.status === "LOCKED" ? "Locked" : customer.status}
                  </Badge>
                  {customer.status === "PENDING_VERIFICATION" && (
                    <div className="ml-2 text-xs text-muted-foreground">
                      (Email verification required)
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              <dl className="space-y-4 mt-4">
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Full Name</dt>
                  <dd className="text-base">{customer.fullName}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Email</dt>
                  <dd className="text-base flex items-center">
                    {customer.email}
                    {customer.emailVerified && (
                      <CheckCircle className="ml-2 h-4 w-4 text-green-500" />
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Phone</dt>
                  <dd className="text-base">{customer.phoneNumber}</dd>
                </div>
                {customer.address && (
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">Address</dt>
                    <dd className="text-base">{customer.address}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Account Created</dt>
                  <dd className="text-base">{formatDate(customer.createdAt)}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Last Login</dt>
                  <dd className="text-base">{formatDate(customer.lastLogin) || "Never"}</dd>
                </div>
              </dl>
            </CardContent>
            <CardFooter className="flex flex-col space-y-2 items-stretch">
              <Button
                className="w-full justify-start"
                variant="outline"
                onClick={() => router.push(`/admin/customers/${customerId}/edit`)}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Edit Profile
              </Button>

              <Button
                className="w-full justify-start"
                variant="outline"
                onClick={() => router.push(`/admin/customers/${customerId}/activity`)}
              >
                <History className="mr-2 h-4 w-4" />
                View Activity
              </Button>

              <Button
                className="w-full justify-start"
                variant="outline"
                onClick={() => openConfirmDialog("reset")}
              >
                <Key className="mr-2 h-4 w-4" />
                Reset Password
              </Button>

              {customer.status === "SUSPENDED" ? (
                <Button
                  className="w-full justify-start"
                  variant="outline"
                  onClick={() => openConfirmDialog("reactivate")}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Reactivate Account
                </Button>
              ) : customer.status === "ACTIVE" ? (
                <Button
                  className="w-full justify-start"
                  variant="outline"
                  onClick={() => openConfirmDialog("deactivate")}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Deactivate Account
                </Button>
              ) : null}
            </CardFooter>
          </Card>

          {/* Tabs for other information */}
          <div className="md:col-span-2">
            <Tabs defaultValue="installations">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="installations">
                  <Zap className="mr-2 h-4 w-4" />
                  Installations
                </TabsTrigger>
                <TabsTrigger value="payments">
                  <CreditCard className="mr-2 h-4 w-4" />
                  Payments
                </TabsTrigger>
                <TabsTrigger value="settings">
                  <Settings className="mr-2 h-4 w-4" />
                  Account Settings
                </TabsTrigger>
              </TabsList>

              <TabsContent value="installations" className="space-y-4 mt-6">
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle>Solar Installations</CardTitle>
                        <CardDescription>Customer's solar energy installations</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {loadingInstallations ? (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                        <p className="text-sm text-muted-foreground">Loading installations...</p>
                      </div>
                    ) : installations.length > 0 ? (
                      <div className="space-y-4">
                        {installations.map((installation) => (
                          <div 
                            key={installation.id} 
                            className="p-4 border rounded-md cursor-pointer hover:bg-muted/50"
                            onClick={() => router.push(`/admin/installations/${installation.id}`)}
                          >
                            <div className="flex justify-between items-center">
                              <div>
                                <h3 className="font-medium">{installation.name || `Installation #${installation.id}`}</h3>
                                <p className="text-sm text-muted-foreground">{installation.location || 'No location'}</p>
                              </div>
                              <Badge variant="outline">
                                {installation.status || 'Unknown'}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                              <div>
                                <span className="text-muted-foreground">Installed capacity:</span>{' '}
                                {installation.installedCapacityKW ? `${installation.installedCapacityKW} kW` : 'N/A'}
                              </div>
                              <div>
                                <span className="text-muted-foreground">Installation date:</span>{' '}
                                {installation.installationDate ? new Date(installation.installationDate).toLocaleDateString() : 'N/A'}
                              </div>
                              <div>
                                <span className="text-muted-foreground">Type:</span>{' '}
                                {installation.type || 'N/A'}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <Zap className="h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium">No Installations Yet</h3>
                        <p className="text-sm text-muted-foreground max-w-md mt-2">
                          This customer does not have any solar installations set up yet.
                        </p>
                        <Button className="mt-4">
                          Add Installation
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="payments" className="space-y-4 mt-6">
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle>Payment History</CardTitle>
                        <CardDescription>Customer's payment records</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {loadingInstallations ? (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                        <p className="text-sm text-muted-foreground">Loading payments...</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium">No Payment Records</h3>
                        <p className="text-sm text-muted-foreground max-w-md mt-2">
                          This customer does not have any payment records yet.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="settings" className="space-y-4 mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Account Settings</CardTitle>
                    <CardDescription>Manage customer account settings</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center pb-4 border-b">
                      <div>
                        <h3 className="font-medium">Email Verification</h3>
                        <p className="text-sm text-muted-foreground">
                          Verify customer email address
                        </p>
                      </div>
                      <Badge variant={customer.emailVerified ? "default" : "outline"}>
                        {customer.emailVerified ? "Verified" : "Not Verified"}
                      </Badge>
                    </div>

                    <div className="flex justify-between items-center pb-4 border-b">
                      <div>
                        <h3 className="font-medium">Password Status</h3>
                        <p className="text-sm text-muted-foreground">
                          Customer password status
                        </p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => openConfirmDialog("reset")}>
                        Reset Password
                      </Button>
                    </div>

                    <div className="flex justify-between items-center pb-4 border-b">
                      <div>
                        <h3 className="font-medium">Account Status</h3>
                        <p className="text-sm text-muted-foreground">
                          Control customer account access
                        </p>
                      </div>
                      {customer.status === "SUSPENDED" ? (
                        <Button
                          className="w-full justify-start"
                          variant="outline"
                          onClick={() => openConfirmDialog("reactivate")}
                        >
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Reactivate Account
                        </Button>
                      ) : customer.status === "ACTIVE" ? (
                        <Button
                          className="w-full justify-start"
                          variant="outline"
                          onClick={() => openConfirmDialog("deactivate")}
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          Deactivate Account
                        </Button>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="h-16 w-16 text-destructive mb-4" />
          <h2 className="text-2xl font-bold">Customer Not Found</h2>
          <p className="text-muted-foreground mt-2 mb-6">
            The customer you're looking for doesn't exist or may have been removed.
          </p>
          <Button onClick={() => router.push("/admin/customers")}>
            Go Back to Customers
          </Button>
        </div>
      )}

      {/* Confirm Action Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirmAction.type === "reactivate" ? "Reactivate Customer" : confirmAction.type === "deactivate" ? "Deactivate Customer" : "Reset Password"}</DialogTitle>
            <DialogDescription>
              {confirmAction.description}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancel
            </Button>
            <Button
              variant={confirmAction.type === "deactivate" ? "destructive" : "default"}
              onClick={handleConfirmAction}
              disabled={loading}
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 