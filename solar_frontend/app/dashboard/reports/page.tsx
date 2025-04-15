"use client"

import { useState } from "react"
import { Download, FileText, Filter, Printer, Search } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState("energy")
  const [searchTerm, setSearchTerm] = useState("")
  const [dateRange, setDateRange] = useState("last30")

  // Mock data for reports
  const energyReports = [
    { id: 1, name: "Monthly Energy Production", date: "2025-03-01", type: "Production", format: "PDF", size: "1.2 MB" },
    {
      id: 2,
      name: "Quarterly Performance Analysis",
      date: "2025-01-15",
      type: "Performance",
      format: "XLSX",
      size: "3.5 MB",
    },
    { id: 3, name: "Annual Energy Summary 2024", date: "2025-01-01", type: "Summary", format: "PDF", size: "4.8 MB" },
    { id: 4, name: "System Efficiency Report", date: "2025-02-15", type: "Efficiency", format: "PDF", size: "2.1 MB" },
    { id: 5, name: "Weather Impact Analysis", date: "2025-03-10", type: "Analysis", format: "XLSX", size: "2.7 MB" },
  ]

  const financialReports = [
    { id: 1, name: "Loan Payment Schedule", date: "2025-01-01", type: "Payment", format: "PDF", size: "0.8 MB" },
    { id: 2, name: "ROI Analysis", date: "2025-01-15", type: "Financial", format: "XLSX", size: "1.5 MB" },
    { id: 3, name: "Tax Credit Documentation", date: "2024-12-15", type: "Tax", format: "PDF", size: "3.2 MB" },
    { id: 4, name: "Energy Savings Report", date: "2025-02-01", type: "Savings", format: "PDF", size: "1.9 MB" },
    { id: 5, name: "Loan Balance Statement", date: "2025-03-01", type: "Statement", format: "PDF", size: "0.6 MB" },
  ]

  const maintenanceReports = [
    { id: 1, name: "System Health Check", date: "2025-03-15", type: "Health", format: "PDF", size: "1.1 MB" },
    { id: 2, name: "Maintenance Schedule", date: "2025-01-10", type: "Schedule", format: "PDF", size: "0.9 MB" },
    {
      id: 3,
      name: "Component Replacement History",
      date: "2025-02-05",
      type: "History",
      format: "XLSX",
      size: "1.8 MB",
    },
    { id: 4, name: "Warranty Information", date: "2024-12-20", type: "Warranty", format: "PDF", size: "1.3 MB" },
    { id: 5, name: "System Alerts Log", date: "2025-03-10", type: "Alerts", format: "XLSX", size: "2.2 MB" },
  ]

  // Filter reports based on search term
  const filteredEnergyReports = energyReports.filter(
    (report) =>
      report.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.type.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const filteredFinancialReports = financialReports.filter(
    (report) =>
      report.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.type.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const filteredMaintenanceReports = maintenanceReports.filter(
    (report) =>
      report.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.type.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <h1 className="text-2xl font-bold">Reports</h1>

        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9 w-[250px]"
              placeholder="Search reports..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Date range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last30">Last 30 days</SelectItem>
              <SelectItem value="last90">Last 90 days</SelectItem>
              <SelectItem value="year2025">2025</SelectItem>
              <SelectItem value="year2024">2024</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card className="border">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle>Available Reports</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="energy" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="energy">Energy Reports</TabsTrigger>
              <TabsTrigger value="financial">Financial Reports</TabsTrigger>
              <TabsTrigger value="maintenance">Maintenance Reports</TabsTrigger>
            </TabsList>

            <TabsContent value="energy">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Report Name</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Format</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEnergyReports.length > 0 ? (
                    filteredEnergyReports.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-blue-500" />
                            {report.name}
                          </div>
                        </TableCell>
                        <TableCell>{report.date}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{report.type}</Badge>
                        </TableCell>
                        <TableCell>{report.format}</TableCell>
                        <TableCell>{report.size}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                Actions
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Download className="h-4 w-4 mr-2" />
                                Download
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Printer className="h-4 w-4 mr-2" />
                                Print
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Search className="h-4 w-4 mr-2" />
                                View
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
                        No reports found matching your search criteria.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="financial">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Report Name</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Format</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFinancialReports.length > 0 ? (
                    filteredFinancialReports.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-green-500" />
                            {report.name}
                          </div>
                        </TableCell>
                        <TableCell>{report.date}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{report.type}</Badge>
                        </TableCell>
                        <TableCell>{report.format}</TableCell>
                        <TableCell>{report.size}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                Actions
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Download className="h-4 w-4 mr-2" />
                                Download
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Printer className="h-4 w-4 mr-2" />
                                Print
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Search className="h-4 w-4 mr-2" />
                                View
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
                        No reports found matching your search criteria.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="maintenance">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Report Name</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Format</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMaintenanceReports.length > 0 ? (
                    filteredMaintenanceReports.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-orange-500" />
                            {report.name}
                          </div>
                        </TableCell>
                        <TableCell>{report.date}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{report.type}</Badge>
                        </TableCell>
                        <TableCell>{report.format}</TableCell>
                        <TableCell>{report.size}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                Actions
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Download className="h-4 w-4 mr-2" />
                                Download
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Printer className="h-4 w-4 mr-2" />
                                Print
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Search className="h-4 w-4 mr-2" />
                                View
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
                        No reports found matching your search criteria.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card className="border">
        <CardHeader>
          <CardTitle>Report Generation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border">
              <CardContent className="p-4">
                <div className="flex flex-col items-center text-center gap-2">
                  <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                    <FileText className="h-6 w-6 text-blue-500" />
                  </div>
                  <h3 className="font-medium">Custom Energy Report</h3>
                  <p className="text-sm text-gray-500">
                    Generate a custom report for your energy production and consumption
                  </p>
                  <Button className="mt-2 w-full">Generate</Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border">
              <CardContent className="p-4">
                <div className="flex flex-col items-center text-center gap-2">
                  <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                    <FileText className="h-6 w-6 text-green-500" />
                  </div>
                  <h3 className="font-medium">Financial Summary</h3>
                  <p className="text-sm text-gray-500">
                    Generate a financial summary report including loan status and savings
                  </p>
                  <Button className="mt-2 w-full">Generate</Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border">
              <CardContent className="p-4">
                <div className="flex flex-col items-center text-center gap-2">
                  <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center">
                    <FileText className="h-6 w-6 text-orange-500" />
                  </div>
                  <h3 className="font-medium">System Health Report</h3>
                  <p className="text-sm text-gray-500">Generate a comprehensive system health and maintenance report</p>
                  <Button className="mt-2 w-full">Generate</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

