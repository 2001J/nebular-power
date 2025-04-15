"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Calendar, Clock, Search, User, Loader2, Server } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious
} from "@/components/ui/pagination"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/components/auth-provider"
import { customerApi } from "@/lib/api"

export default function CustomerActivityPage({ params }: { params: { id: string } }) {
  const { user } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const customerId = params.id

  const [loading, setLoading] = useState(true)
  const [customer, setCustomer] = useState<any>(null)
  const [activityLogs, setActivityLogs] = useState([])
  const [searchTerm, setSearchTerm] = useState("")
  const [pagination, setPagination] = useState({
    currentPage: 0,
    totalPages: 0,
    totalElements: 0,
    pageSize: 10
  })

  // Fetch customer data and activity logs
  useEffect(() => {
    const fetchData = async () => {
      if (!user || user.role !== "ADMIN") return

      try {
        setLoading(true)

        // Fetch customer details
        const customerData = await customerApi.getCustomerById(customerId)
        setCustomer(customerData)

        // Fetch activity logs
        const logsResponse = await customerApi.getCustomerActivityLogs(customerId, 0, 10)

        if (logsResponse.content) {
          setActivityLogs(logsResponse.content)
          setPagination({
            currentPage: logsResponse.number,
            totalPages: logsResponse.totalPages,
            totalElements: logsResponse.totalElements,
            pageSize: logsResponse.size
          })
        } else {
          setActivityLogs(Array.isArray(logsResponse) ? logsResponse : [])
        }
      } catch (error) {
        console.error("Error fetching data:", error)
        toast({
          variant: "destructive",
          title: "Error loading data",
          description: "Failed to load customer activity logs. Please try again.",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [customerId, user, toast])

  // Handle page change
  const handlePageChange = async (page) => {
    try {
      setLoading(true)
      const logsResponse = await customerApi.getCustomerActivityLogs(customerId, page, pagination.pageSize)

      if (logsResponse.content) {
        setActivityLogs(logsResponse.content)
        setPagination({
          currentPage: logsResponse.number,
          totalPages: logsResponse.totalPages,
          totalElements: logsResponse.totalElements,
          pageSize: logsResponse.size
        })
      } else {
        setActivityLogs(Array.isArray(logsResponse) ? logsResponse : [])
      }
    } catch (error) {
      console.error("Error fetching activity logs:", error)
      toast({
        variant: "destructive",
        title: "Error loading activity logs",
        description: "Failed to load activity logs. Please try again.",
      })
    } finally {
      setLoading(false)
    }
  }

  // Filter activity logs based on search term
  const filteredLogs = searchTerm
    ? activityLogs.filter((log) =>
      log.activityType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    : activityLogs

  // Get activity type badge variant
  const getActivityBadgeVariant = (activityType) => {
    switch (activityType) {
      case "SYSTEM_ACCESS":
        return "default"
      case "PROFILE_UPDATE":
        return "secondary"
      case "PASSWORD_CHANGE":
        return "outline"
      case "ACCOUNT_STATUS_CHANGE":
        return "destructive"
      default:
        return "outline"
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
            <BreadcrumbPage>Activity Logs</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Activity Logs</h1>
          <p className="text-muted-foreground">
            {customer && `View activity history for ${customer.fullName}`}
          </p>
        </div>
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
            <div>
              <CardTitle>Customer Activities</CardTitle>
              <CardDescription>
                {loading
                  ? "Loading activity logs..."
                  : `${filteredLogs.length} activities found ${searchTerm ? `matching "${searchTerm}"` : ""}`
                }
              </CardDescription>
            </div>

            <div className="relative w-full md:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search activities..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button
                  className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground hover:text-foreground"
                  onClick={() => setSearchTerm("")}
                  aria-label="Clear search"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="flex flex-col items-center space-y-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Loading activity logs...</p>
              </div>
            </div>
          ) : activityLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Server className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No Activity Logs Found</h3>
              <p className="text-sm text-muted-foreground max-w-md mt-2">
                This customer has no recorded activity yet.
              </p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Search className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No Results Found</h3>
              <p className="text-sm text-muted-foreground max-w-md mt-2">
                No activities match your search for "{searchTerm}". Try a different search term.
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setSearchTerm("")}
              >
                Clear Search
              </Button>
            </div>
          ) : (
            <>
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[180px]">Date & Time</TableHead>
                      <TableHead className="w-[150px]">Activity Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="hidden md:table-cell">IP Address</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-mono text-xs">
                          <div className="flex flex-col">
                            <div className="flex items-center">
                              <Calendar className="mr-1 h-3 w-3" />
                              {new Date(log.timestamp).toLocaleDateString()}
                            </div>
                            <div className="flex items-center text-muted-foreground">
                              <Clock className="mr-1 h-3 w-3" />
                              {new Date(log.timestamp).toLocaleTimeString()}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getActivityBadgeVariant(log.activityType)}>
                            {log.activityType}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{log.description}</p>
                            {log.details && (
                              <p className="text-sm text-muted-foreground">{log.details}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell font-mono text-xs">
                          {log.ipAddress}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {!searchTerm && pagination.totalPages > 1 && (
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
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 