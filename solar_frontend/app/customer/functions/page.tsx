"use client"

import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Calculator,
  ChevronRight,
  Minus,
  Plus,
  RefreshCw,
  Search,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function FunctionsPage() {
  const functions = [
    {
      id: "calculator",
      title: "Calculator",
      description: "Calculate the amount and efficiency",
      icon: Calculator,
      color: "bg-blue-500",
      href: "/customer/functions/calculator",
    },
    {
      id: "buy-assets",
      title: "Buy assets",
      description: "Buy electricity generating assets",
      icon: Plus,
      color: "bg-green-500",
      href: "/customer/functions/buy",
    },
    {
      id: "sell-asset",
      title: "Sell asset",
      description: "Sell your electricity generating assets",
      icon: Minus,
      color: "bg-red-500",
      href: "/customer/functions/sell",
    },
    {
      id: "rent-asset",
      title: "Rent asset",
      description: "Rent your electricity generating assets",
      icon: RefreshCw,
      color: "bg-purple-500",
      href: "/customer/functions/rent",
    },
    {
      id: "deposit",
      title: "Deposit",
      description: "Deposit money or crypto",
      icon: ArrowDownToLine,
      color: "bg-amber-500",
      href: "/customer/functions/deposit",
    },
    {
      id: "withdraw",
      title: "Withdraw",
      description: "Withdraw money or crypto",
      icon: ArrowUpFromLine,
      color: "bg-cyan-500",
      href: "/customer/functions/withdraw",
    },
  ]

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">Functions</h1>
        </div>

        <div className="relative w-full md:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9 w-full md:w-[300px]" placeholder="Search functions..." />
        </div>
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All Functions</TabsTrigger>
          <TabsTrigger value="recent">Recent</TabsTrigger>
          <TabsTrigger value="favorites">Favorites</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {functions.map((func) => (
              <Link
                key={func.id}
                href={func.href}
                className="flex items-center gap-4 bg-white border rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className={`h-10 w-10 rounded-full ${func.color} flex items-center justify-center`}>
                  <func.icon className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">{func.title}</h3>
                  <p className="text-sm text-gray-500">{func.description}</p>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </Link>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="recent" className="mt-4">
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-3 bg-white border rounded-lg">
              <div className="h-10 w-10 rounded-full bg-green-500 flex items-center justify-center">
                <Plus className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-medium">Purchased 2 solar panels</p>
                <p className="text-sm text-gray-500">April 2, 2025</p>
              </div>
              <span className="text-green-500 font-medium">+$3,450</span>
            </div>
            <div className="flex items-center gap-4 p-3 bg-white border rounded-lg">
              <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center">
                <Calculator className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-medium">ROI calculation</p>
                <p className="text-sm text-gray-500">March 28, 2025</p>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </div>
            <div className="flex items-center gap-4 p-3 bg-white border rounded-lg">
              <div className="h-10 w-10 rounded-full bg-amber-500 flex items-center justify-center">
                <ArrowDownToLine className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-medium">Deposited funds</p>
                <p className="text-sm text-gray-500">March 25, 2025</p>
              </div>
              <span className="text-green-500 font-medium">+$5,000</span>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="favorites" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/customer/functions/buy"
              className="flex items-center gap-3 p-4 bg-white border rounded-lg hover:shadow-md transition-shadow"
            >
              <div className="h-10 w-10 rounded-full bg-green-500 flex items-center justify-center">
                <Plus className="h-5 w-5 text-white" />
              </div>
              <span className="font-medium">Buy assets</span>
            </Link>
            <Link
              href="/customer/functions/calculator"
              className="flex items-center gap-3 p-4 bg-white border rounded-lg hover:shadow-md transition-shadow"
            >
              <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center">
                <Calculator className="h-5 w-5 text-white" />
              </div>
              <span className="font-medium">Calculator</span>
            </Link>
            <Link
              href="/customer/functions/withdraw"
              className="flex items-center gap-3 p-4 bg-white border rounded-lg hover:shadow-md transition-shadow"
            >
              <div className="h-10 w-10 rounded-full bg-cyan-500 flex items-center justify-center">
                <ArrowUpFromLine className="h-5 w-5 text-white" />
              </div>
              <span className="font-medium">Withdraw</span>
            </Link>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

