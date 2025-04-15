"use client"

import { useState } from "react"
import { MoreHorizontal, ArrowUpDown } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"

interface Customer {
  id: string
  name: string
  email: string
  status: "active" | "pending" | "inactive"
  installationDate: string
  lastPayment: string
}

const customers: Customer[] = [
  {
    id: "1",
    name: "John Smith",
    email: "john.smith@example.com",
    status: "active",
    installationDate: "2024-03-15",
    lastPayment: "2024-03-28",
  },
  {
    id: "2",
    name: "Sarah Johnson",
    email: "sarah.j@example.com",
    status: "active",
    installationDate: "2024-03-10",
    lastPayment: "2024-03-25",
  },
  {
    id: "3",
    name: "Michael Brown",
    email: "m.brown@example.com",
    status: "pending",
    installationDate: "2024-03-30",
    lastPayment: "N/A",
  },
  {
    id: "4",
    name: "Emily Davis",
    email: "emily.d@example.com",
    status: "inactive",
    installationDate: "2023-12-05",
    lastPayment: "2024-02-05",
  },
  {
    id: "5",
    name: "Robert Wilson",
    email: "r.wilson@example.com",
    status: "active",
    installationDate: "2024-02-20",
    lastPayment: "2024-03-20",
  },
]

export function AdminCustomerTable() {
  const [searchTerm, setSearchTerm] = useState("")

  const filteredCustomers = customers.filter(
    (customer) =>
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Input
          placeholder="Search customers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">
                <Button variant="ghost" className="p-0 hover:bg-transparent">
                  <span>Name</span>
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Installation Date</TableHead>
              <TableHead>Last Payment</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCustomers.map((customer) => (
              <TableRow key={customer.id}>
                <TableCell className="font-medium">{customer.name}</TableCell>
                <TableCell>{customer.email}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      customer.status === "active" ? "default" : customer.status === "pending" ? "outline" : "secondary"
                    }
                  >
                    {customer.status}
                  </Badge>
                </TableCell>
                <TableCell>{customer.installationDate}</TableCell>
                <TableCell>{customer.lastPayment}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem>View details</DropdownMenuItem>
                      <DropdownMenuItem>Edit customer</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>View payments</DropdownMenuItem>
                      <DropdownMenuItem>View installation</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive">Deactivate account</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

