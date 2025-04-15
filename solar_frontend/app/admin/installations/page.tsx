"use client"

import { useState, useEffect } from "react"
import {
  Sun,
  Download,
  Search,
  Filter,
  Plus,
  MapPin,
  CalendarClock,
  Zap,
  User,
  RefreshCw
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
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
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import { installationApi } from "@/lib/api"

export default function InstallationsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const [installations, setInstallations] = useState([])
  const [systemStats, setSystemStats] = useState({
    totalInstallations: 0,
    totalCapacity: 0,
    scheduledInstallations: 0,
    nextScheduledDate: null
  })

  // Fetch installations data
  useEffect(() => {
    const fetchInstallations = async () => {
      setLoading(true)
      try {
        // Prepare filter parameters
        const params = {
          page: 0,
          size: 100
        }

        if (statusFilter !== "all") {
          params.status = statusFilter
        }

        if (typeFilter !== "all") {
          params.type = typeFilter
        }

        if (searchTerm) {
          params.search = searchTerm
        }

        // Fetch installations from the API
        const response = await installationApi.getAllInstallations(params)

        if (response && response.content) {
          setInstallations(response.content)

          // Calculate system stats
          const stats = {
            totalInstallations: response.totalElements || response.content.length,
            totalCapacity: response.content.reduce((sum, inst) => sum + (parseFloat(inst.installedCapacityKW) || 0), 0),
            scheduledInstallations: response.content.filter(inst => inst.status === "PENDING").length,
            nextScheduledDate: null
          }

          // Find next scheduled date
          const pendingInstallations = response.content.filter(inst => inst.status === "PENDING")
          if (pendingInstallations.length > 0) {
            // Sort by install date and get the earliest
            const sorted = [...pendingInstallations].sort((a, b) =>
              new Date(a.installationDate).getTime() - new Date(b.installationDate).getTime()
            )
            stats.nextScheduledDate = sorted[0].installationDate
          }

          setSystemStats(stats)
        } else {
          setInstallations([])
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to load installations data. Please try again.",
          })
        }
      } catch (error) {
        console.error("Error fetching installations:", error)
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load installations data. Please try again.",
        })
        setInstallations([])
      } finally {
        setLoading(false)
      }
    }

    fetchInstallations()
  }, [statusFilter, typeFilter, searchTerm, toast])

  // Navigate to installation details
  const navigateToInstallationDetails = (id) => {
    router.push(`/admin/installations/${id}`)
  }

  // Handle export to CSV
  const handleExport = () => {
    try {
      // Prepare CSV data
      const headers = ["ID", "Name", "Customer", "Location", "Type", "Status", "Install Date", "Capacity", "Efficiency"]
      const csvData = installations.map(installation => [
        installation.id,
        installation.name || `Installation #${installation.id}`,
        installation.username || installation.customerName || "N/A",
        installation.location || "N/A",
        installation.type || "N/A",
        installation.status || "N/A",
        installation.installationDate ? new Date(installation.installationDate).toLocaleDateString() : "N/A",
        formatCapacity(installation.installedCapacityKW),
        installation.efficiency || "N/A"
      ])

      // Add headers
      csvData.unshift(headers)

      // Convert to CSV string
      const csvString = csvData.map(row => row.join(',')).join('\n')

      // Create a Blob and download
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.setAttribute('href', url)
      link.setAttribute('download', `installations_${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast({
        title: "Export successful",
        description: `Exported ${installations.length} installations to CSV.`,
      })
    } catch (error) {
      console.error("Error exporting data:", error)
      toast({
        variant: "destructive",
        title: "Export failed",
        description: "Unable to export installations data.",
      })
    }
  }

  // Format capacity display
  const formatCapacity = (capacity) => {
    if (!capacity && capacity !== 0) return "N/A"

    const numericCapacity = parseFloat(capacity.toString().replace("kW", "").trim())
    if (isNaN(numericCapacity)) return capacity

    if (numericCapacity >= 1000) {
      return `${(numericCapacity / 1000).toFixed(2)} MW`
    } else {
      return `${numericCapacity} kW`
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
                <BreadcrumbPage>Installations</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Solar Installations</h1>
          <p className="text-muted-foreground">
            Manage and monitor all solar panel installations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => router.push("/admin/installations/new")}>
            <Plus className="h-4 w-4 mr-2" />
            New Installation
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Installations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemStats.totalInstallations}</div>
            <p className="text-xs text-muted-foreground">
              {loading ? "Loading..." : `${installations.filter(i => i.status === "Active").length} active installations`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Capacity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCapacity(systemStats.totalCapacity)}</div>
            <p className="text-xs text-muted-foreground">
              Combined system capacity
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Scheduled Installations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemStats.scheduledInstallations}</div>
            <p className="text-xs text-muted-foreground">
              {systemStats.nextScheduledDate ? `Next: ${new Date(systemStats.nextScheduledDate).toLocaleDateString()}` : "No scheduled installations"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Installations</CardTitle>
          <CardDescription>
            Showing {installations.length} {statusFilter !== "all" || typeFilter !== "all" || searchTerm ? "filtered" : "total"} installations
          </CardDescription>

          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search installations..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Maintenance">Maintenance</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Installation Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="Residential">Residential</SelectItem>
                  <SelectItem value="Commercial">Commercial</SelectItem>
                  <SelectItem value="Industrial">Industrial</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" size="icon" onClick={() => {
                setSearchTerm("")
                setStatusFilter("all")
                setTypeFilter("all")
              }}>
                <RefreshCw className="h-4 w-4" />
              </Button>

              <Button variant="outline" size="icon" onClick={handleExport}>
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Installation</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="hidden md:table-cell">Location</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Installation Date</TableHead>
                  <TableHead>Capacity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : installations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      No installations found.
                    </TableCell>
                  </TableRow>
                ) : (
                  installations.map((installation) => (
                    <TableRow
                      key={installation.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigateToInstallationDetails(installation.id)}
                    >
                      <TableCell className="font-medium">
                        {installation.name || `Installation #${installation.id}`}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span>{installation.username || installation.customerName || "N/A"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span>{installation.location || "N/A"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{installation.type || "Unknown"}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            installation.status === "ACTIVE" ? "bg-green-500" :
                              installation.status === "MAINTENANCE" ? "bg-amber-500" :
                                installation.status === "PENDING" ? "bg-blue-500" :
                                  "bg-red-500"
                          }
                        >
                          {installation.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex items-center gap-2">
                          <CalendarClock className="h-4 w-4 text-muted-foreground" />
                          <span>{installation.installationDate ? new Date(installation.installationDate).toLocaleDateString() : "N/A"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Zap className="h-4 w-4 text-muted-foreground" />
                          <span>{formatCapacity(installation.installedCapacityKW)}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        <CardFooter className="border-t p-4 flex justify-between">
          <Button variant="outline" onClick={() => router.push("/admin/energy")}>
            View Energy Monitoring
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
} 