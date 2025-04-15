"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowUpDown,
  Download,
  Search,
  Plus,
  MoreHorizontal,
  AlertCircle,
  User,
  Pencil,
  Clock,
  Ban,
  CheckCircle,
  Loader2,
  UserX,
  Key
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
import { debounce } from "lodash"
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination"

export default function CustomersPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [searching, setSearching] = useState(false)
  const [statusFilter, setStatusFilter] = useState("all")
  const [paymentFilter, setPaymentFilter] = useState("all")
  const [sortField, setSortField] = useState("fullName")
  const [sortDirection, setSortDirection] = useState("asc")
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [confirmAction, setConfirmAction] = useState({ type: "", customerId: "" })
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  // Pagination state
  const [pagination, setPagination] = useState({
    currentPage: 0,
    totalPages: 0,
    totalElements: 0,
    pageSize: 10
  })

  // Debounce search term
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("")

  // Fetch customers with search term
  useEffect(() => {
    const fetchCustomers = async () => {
      if (!user || user.role !== "ADMIN") return

      try {
        setLoading(true)
        setError(null) // Clear any previous errors

        let response
        if (debouncedSearchTerm) {
          setSearching(true)
          response = await customerApi.searchCustomers(debouncedSearchTerm, pagination.currentPage, pagination.pageSize)
        } else {
          response = await customerApi.getAllCustomers(pagination.currentPage, pagination.pageSize)
        }

        if (response.content) {
          setCustomers(response.content)
          setPagination({
            currentPage: response.number,
            totalPages: response.totalPages,
            totalElements: response.totalElements,
            pageSize: response.size
          })
        } else if (debouncedSearchTerm && (!response || (Array.isArray(response) && response.length === 0))) {
          // Handle the case where search returned no results
          setCustomers([])
          setPagination({
            currentPage: 0,
            totalPages: 0,
            totalElements: 0,
            pageSize: pagination.pageSize
          })
        } else {
          setCustomers(Array.isArray(response) ? response : [])
        }
      } catch (error) {
        console.error("Error fetching customers:", error)
        setError("Failed to load customer data. Please try again.")
        toast({
          variant: "destructive",
          title: "Error loading customers",
          description: "Failed to load customer data. Please try again.",
        })
        setCustomers([])
      } finally {
        setLoading(false)
        setSearching(false)
      }
    }

    fetchCustomers()
  }, [user, toast, debouncedSearchTerm, pagination.currentPage, pagination.pageSize])

  // Handle page change
  const handlePageChange = (page) => {
    setPagination({ ...pagination, currentPage: page })
  }

  // Filter customers by status
  const filteredCustomers = customers.filter(customer => {
    if (statusFilter === "all") return true
    return customer.status === statusFilter
  })

  // Export customers to CSV
  const exportToCSV = () => {
    if (filteredCustomers.length === 0) {
      toast({
        variant: "destructive",
        title: "No data to export",
        description: "There are no customers to export to CSV.",
      })
      return
    }

    const headers = [
      "ID",
      "Name",
      "Email",
      "Phone",
      "Status",
      "Installation Date",
      "Payment Status",
    ]
    const csvData = filteredCustomers.map((customer) => [
      customer.id,
      customer.fullName || "",
      customer.email || "",
      customer.phoneNumber || "",
      customer.status || "",
      customer.installationDate || "",
      customer.paymentStatus || "",
    ])

    const csvContent = [headers.join(","), ...csvData.map((row) => row.join(","))].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", "customers.csv")
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Handle customer deletion confirmation
  const confirmDeleteCustomer = (customer) => {
    setSelectedCustomer(customer)
    setShowDeleteDialog(true)
  }

  // Handle customer deletion
  const handleDeleteCustomer = async () => {
    if (!selectedCustomer) return

    try {
      setLoading(true)
      await customerApi.deactivateCustomer(selectedCustomer.id)

      // Refresh customer list after deletion
      const updatedCustomers = await customerApi.getAllCustomers()
      setCustomers(Array.isArray(updatedCustomers) ? updatedCustomers : [])

      setShowDeleteDialog(false)
      setSelectedCustomer(null)

      toast({
        title: "Customer deactivated",
        description: "The customer account has been deactivated.",
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error deactivating customer",
        description: error.response?.data?.message || "Failed to deactivate customer. Please try again.",
      })
    } finally {
      setLoading(false)
    }
  }

  // Handle sort
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 500)

    return () => clearTimeout(timer)
  }, [searchTerm])

  // Listen for customer verification events
  useEffect(() => {
    const handleCustomerVerified = (event: CustomEvent) => {
      console.log("Received customerVerified event:", event.detail);

      // Immediately refresh the customer list
      if (!loading && !searching) {
        console.log("Triggering immediate customer list refresh after verification");
        customerApi.getAllCustomers(pagination.currentPage, pagination.pageSize)
          .then(response => {
            if (response.content) {
              setCustomers(response.content);
              setPagination({
                currentPage: response.number,
                totalPages: response.totalPages,
                totalElements: response.totalElements,
                pageSize: response.size
              });
              toast({
                title: "Customer Verified",
                description: `A customer has successfully verified their email: ${event.detail.email}`,
              });
            }
          })
          .catch(err => console.error("Error refreshing after verification:", err));
      }
    };

    // Add event listener for our custom event
    window.addEventListener('customerVerified', handleCustomerVerified as EventListener);

    // Clean up
    return () => {
      window.removeEventListener('customerVerified', handleCustomerVerified as EventListener);
    };
  }, [loading, searching, pagination.currentPage, pagination.pageSize, toast]);

  // Poll for updates when tab is focused
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    const pollForUpdates = async () => {
      // Only poll when the page is not already loading data
      if (!loading && !searching) {
        console.log("Polling for customer status updates...");
        try {
          // Use current page and size from pagination state with force refresh
          const response = await customerApi.getAllCustomers(
            pagination.currentPage,
            pagination.pageSize,
            true // Force refresh to bypass caching
          );

          if (response.content) {
            // Create fingerprint of current customers by ID and status
            const currentCustomerMap = Object.fromEntries(
              customers.map(c => [`${c.id}`, c.status])
            );

            // Check for any changes between current and new customers
            let hasChanges = false;
            let verifiedCustomers = [];

            for (const newCustomer of response.content) {
              // Store customers that have been newly verified
              if (currentCustomerMap[newCustomer.id] === "PENDING_VERIFICATION" &&
                newCustomer.status === "ACTIVE") {
                verifiedCustomers.push(newCustomer);
              }

              // If customer exists and status changed or customer is new
              if (currentCustomerMap[newCustomer.id] !== newCustomer.status) {
                hasChanges = true;
              }
            }

            if (hasChanges || response.content.length !== customers.length) {
              console.log("Customer status changes detected, updating list");
              setCustomers(response.content);
              setPagination({
                currentPage: response.number,
                totalPages: response.totalPages,
                totalElements: response.totalElements,
                pageSize: response.size
              });

              // Notify about newly verified customers
              if (verifiedCustomers.length > 0) {
                toast({
                  title: `${verifiedCustomers.length > 1 ? "Multiple customers" : "Customer"} verified`,
                  description: verifiedCustomers.length > 1
                    ? `${verifiedCustomers.length} customers have verified their email addresses`
                    : `${verifiedCustomers[0].fullName || verifiedCustomers[0].email} has verified their email address`,
                });
              }
            }
          }
        } catch (err) {
          console.error("Error polling for updates:", err);
        }
      }
    };

    // Initial poll immediately
    pollForUpdates();

    // Set up polling interval (every 3 seconds - more frequent)
    intervalId = setInterval(pollForUpdates, 3000);

    // Set up visibility change listener to immediately poll when tab becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        pollForUpdates();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Clean up interval and event listener on component unmount
    return () => {
      if (intervalId) clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [customers, loading, searching, pagination.currentPage, pagination.pageSize, toast]);

  // Handle confirming action
  const handleConfirmAction = async () => {
    setShowConfirmDialog(false)

    try {
      setLoading(true)

      if (confirmAction.type === "reactivate") {
        await customerApi.reactivateCustomer(confirmAction.customerId)
        toast({
          title: "Customer reactivated",
          description: "Customer account has been reactivated successfully.",
        })
      } else if (confirmAction.type === "deactivate") {
        await customerApi.deactivateCustomer(confirmAction.customerId)
        toast({
          title: "Customer deactivated",
          description: "Customer account has been deactivated successfully.",
        })
      } else if (confirmAction.type === "reset") {
        await customerApi.resetCustomerPassword(confirmAction.customerId)
        toast({
          title: "Password reset",
          description: "Password reset link has been sent to the customer's email.",
        })
      }

      // Refresh customer list after action
      const updatedCustomers = await customerApi.getAllCustomers(pagination.currentPage, pagination.pageSize)
      if (updatedCustomers.content) {
        setCustomers(updatedCustomers.content)
      } else {
        setCustomers(Array.isArray(updatedCustomers) ? updatedCustomers : [])
      }
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

  // Open confirm dialog
  const openConfirmDialog = (type, customerId) => {
    setConfirmAction({ type, customerId })
    setShowConfirmDialog(true)
  }

  // Handle viewing customer details
  const handleViewCustomer = (customerId) => {
    router.push(`/admin/customers/${customerId}`)
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
            <BreadcrumbPage>Customers</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customer Management</h1>
          <p className="text-muted-foreground">Manage all customer accounts and installations.</p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={exportToCSV} disabled={customers.length === 0}>
            <Download className="h-4 w-4" />
          </Button>

          <Button onClick={() => router.push("/admin/customers/create")}>
            <Plus className="h-4 w-4 mr-2" />
            Add Customer
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Customers</CardTitle>
          <CardDescription>
            {loading ? (
              searchTerm && searchTerm.length >= 2 ? `Searching for "${searchTerm}"...` : "Loading customers..."
            ) : (
              customers.length === 0 ? (
                searchTerm && searchTerm.length >= 2 ?
                  `No customers found matching "${searchTerm}"` :
                  "No customers have been created yet"
              ) : (
                `Showing ${filteredCustomers.length} of ${customers.length} total customers`
              )
            )}
            {!loading && customers.length > 0 && (
              <span className="block text-xs mt-1">
                You can search customers by full name or email address
              </span>
            )}
          </CardDescription>

          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              <div className="relative w-full md:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  type="text"
                  placeholder="Search by name or email..."
                  className={`pl-8 ${loading && searchTerm && searchTerm.length >= 2 ? 'pr-8 bg-gray-50' : ''}`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {loading && searchTerm && searchTerm.length >= 2 && (
                  <div className="absolute right-2.5 top-2.5">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                  </div>
                )}
                {searchTerm && searchTerm.length > 0 && !loading && (
                  <button
                    className="absolute right-2.5 top-2.5 h-4 w-4 text-gray-500 hover:text-gray-700"
                    onClick={() => {
                      setSearchTerm("")
                      setPagination({ ...pagination, currentPage: 0 })
                    }}
                    aria-label="Clear search"
                  >
                    ✕
                  </button>
                )}
                {searchTerm && searchTerm.length > 0 && searchTerm.length < 2 && (
                  <div className="absolute -bottom-5 left-0 text-xs text-muted-foreground">
                    Type at least 2 characters to search
                  </div>
                )}
              </div>
              <Select
                value={statusFilter}
                onValueChange={setStatusFilter}
                disabled={loading || customers.length === 0}
              >
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="PENDING_VERIFICATION">Pending Verification</SelectItem>
                  <SelectItem value="SUSPENDED">Suspended</SelectItem>
                  <SelectItem value="LOCKED">Locked</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={paymentFilter}
                onValueChange={setPaymentFilter}
                disabled={loading || customers.length === 0}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="All Payments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Payments</SelectItem>
                  <SelectItem value="current">Current</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="flex flex-col items-center space-y-2">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <p className="text-sm text-muted-foreground">
                  {searchTerm && searchTerm.length >= 2
                    ? `Searching for "${searchTerm}"...`
                    : "Loading customers..."}
                </p>
              </div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <AlertCircle className="h-12 w-12 text-destructive mb-4" />
              <h3 className="text-lg font-medium">
                {error.includes("No customers found matching")
                  ? "No Search Results"
                  : "Error Loading Customers"}
              </h3>
              <p className="text-sm text-muted-foreground max-w-md mt-2">{error}</p>
              {searchTerm && searchTerm.length >= 2 && (
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => {
                    setError(null);
                    setSearchTerm("");
                    setPagination({ ...pagination, currentPage: 0 });
                  }}
                >
                  Retry
                </Button>
              )}
            </div>
          ) : customers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              {searchTerm && searchTerm.length >= 2 ? (
                // No search results found
                <>
                  <Search className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No Results Found</h3>
                  <p className="text-sm text-muted-foreground max-w-md mt-2">
                    No customers were found matching "{searchTerm}".
                    Try different search terms or check your spelling.
                  </p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => {
                      setSearchTerm("")
                      setPagination({ ...pagination, currentPage: 0 })
                    }}
                  >
                    Clear Search
                  </Button>
                </>
              ) : (
                // No customers exist yet
                <>
                  <User className="h-12 w-12 text-primary mb-4" />
                  <h3 className="text-lg font-medium">No Customers Found</h3>
                  <p className="text-sm text-muted-foreground max-w-md mt-2">
                    There are no customers yet. Click the "Add Customer" button to create your first customer.
                  </p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => router.push("/admin/customers/create")}
                  >
                    Add Customer
                  </Button>
                </>
              )}
            </div>
          ) : (
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">
                      <Button variant="ghost" className="p-0 hover:bg-transparent" onClick={() => handleSort("fullName")}>
                        <span>Name</span>
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button variant="ghost" className="p-0 hover:bg-transparent" onClick={() => handleSort("email")}>
                        <span>Email</span>
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button variant="ghost" className="p-0 hover:bg-transparent" onClick={() => handleSort("status")}>
                        <span>Status</span>
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead>Installation Date</TableHead>
                    <TableHead>Payment Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24">
                        <div className="flex items-center justify-center space-x-2">
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                          <div>{searchTerm && searchTerm.length >= 2 ? `Searching for "${searchTerm}"...` : "Loading customers..."}</div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : error ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 py-8">
                        <div className="flex flex-col items-center justify-center text-center">
                          <AlertCircle className="h-10 w-10 text-destructive mb-3" />
                          <h3 className="font-medium text-lg mb-1">Error loading customers</h3>
                          <p className="text-sm text-muted-foreground max-w-sm mb-4">{error}</p>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setError(null);
                              setSearchTerm("");
                              setPagination({ ...pagination, currentPage: 0 });
                            }}
                          >
                            Retry
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredCustomers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                        {searchTerm && searchTerm.length >= 2 ? (
                          <>
                            <div className="flex flex-col items-center justify-center py-4">
                              <Search className="h-8 w-8 text-muted-foreground mb-2" />
                              <p className="font-medium mb-1">No search results found</p>
                              <p className="text-sm text-muted-foreground mb-3">
                                No customers match "{searchTerm}"
                              </p>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSearchTerm("");
                                  setPagination({ ...pagination, currentPage: 0 });
                                }}
                              >
                                Clear Search
                              </Button>
                            </div>
                          </>
                        ) : statusFilter !== "all" ? (
                          <>
                            <p className="font-medium mb-1">No customers with selected status</p>
                            <p className="text-sm text-muted-foreground mb-3">
                              No {statusFilter.toLowerCase().replace("_", " ")} customers found
                            </p>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setStatusFilter("all");
                              }}
                            >
                              Clear Filter
                            </Button>
                          </>
                        ) : (
                          <p>No customers found.</p>
                        )}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCustomers.map((customer) => (
                      <TableRow
                        key={customer.id}
                        className="cursor-pointer"
                        onClick={() => handleViewCustomer(customer.id)}
                      >
                        <TableCell className="font-medium">{customer.fullName || customer.name || "Unnamed"}</TableCell>
                        <TableCell>{customer.email}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              customer.status === "ACTIVE"
                                ? "default"
                                : customer.status === "PENDING_VERIFICATION"
                                  ? "outline"
                                  : customer.status === "LOCKED"
                                    ? "destructive"
                                    : "secondary"
                            }
                          >
                            {customer.status === "ACTIVE" ? "Active" :
                              customer.status === "PENDING_VERIFICATION" ? "Pending Verification" :
                                customer.status === "SUSPENDED" ? "Suspended" :
                                  customer.status === "LOCKED" ? "Locked" : customer.status || "N/A"}
                          </Badge>
                        </TableCell>
                        <TableCell>{customer.installationDate || "None"}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              customer.paymentStatus === "current" || customer.paymentStatus === "CURRENT"
                                ? "default"
                                : customer.paymentStatus === "pending" || customer.paymentStatus === "PENDING"
                                  ? "outline"
                                  : "destructive"
                            }
                          >
                            {customer.paymentStatus || "N/A"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(`/admin/customers/${customer.id}`);
                                }}
                              >
                                View details
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {customer.status === "ACTIVE" ? (
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openConfirmDialog("deactivate", customer.id);
                                  }}
                                  className="text-destructive"
                                >
                                  <Ban className="mr-2 h-4 w-4" />
                                  Deactivate
                                </DropdownMenuItem>
                              ) : customer.status === "SUSPENDED" ? (
                                <DropdownMenuItem onClick={(e) => {
                                  e.stopPropagation();
                                  openConfirmDialog("reactivate", customer.id);
                                }}>
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  Reactivate
                                </DropdownMenuItem>
                              ) : null}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="mt-4 flex justify-center">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => handlePageChange(Math.max(0, pagination.currentPage - 1))}
                      className={pagination.currentPage === 0 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>

                  {Array.from({ length: Math.min(5, pagination.totalPages) }).map((_, i) => {
                    let pageNum;
                    if (pagination.totalPages <= 5) {
                      pageNum = i;
                    } else if (pagination.currentPage < 3) {
                      pageNum = i;
                    } else if (pagination.currentPage > pagination.totalPages - 3) {
                      pageNum = pagination.totalPages - 5 + i;
                    } else {
                      pageNum = pagination.currentPage - 2 + i;
                    }

                    return (
                      <PaginationItem key={pageNum}>
                        <PaginationLink
                          onClick={() => handlePageChange(pageNum)}
                          isActive={pagination.currentPage === pageNum}
                        >
                          {pageNum + 1}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}

                  {pagination.totalPages > 5 && pagination.currentPage < pagination.totalPages - 3 && (
                    <>
                      <PaginationItem>
                        <PaginationEllipsis />
                      </PaginationItem>
                      <PaginationItem>
                        <PaginationLink onClick={() => handlePageChange(pagination.totalPages - 1)}>
                          {pagination.totalPages}
                        </PaginationLink>
                      </PaginationItem>
                    </>
                  )}

                  <PaginationItem>
                    <PaginationNext
                      onClick={() => handlePageChange(Math.min(pagination.totalPages - 1, pagination.currentPage + 1))}
                      className={pagination.currentPage === pagination.totalPages - 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirm Action Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirmAction.type === "reactivate" ? "Reactivate Customer" : confirmAction.type === "deactivate" ? "Deactivate Customer" : "Reset Password"}</DialogTitle>
            <DialogDescription>
              {confirmAction.type === "deactivate"
                ? "Are you sure you want to deactivate this customer? They will no longer be able to access the system."
                : confirmAction.type === "reactivate"
                  ? "Are you sure you want to reactivate this customer? They will regain access to the system."
                  : "Are you sure you want to reset this customer's password? They will receive an email with a temporary password that they must change on first login."}
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
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deactivation</DialogTitle>
            <DialogDescription>
              Are you sure you want to deactivate {selectedCustomer?.name}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteCustomer} disabled={loading}>
              Deactivate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

