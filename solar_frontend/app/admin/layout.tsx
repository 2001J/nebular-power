"use client"

import type React from "react"
import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BarChart3,
  Bell,
  CreditCard,
  LogOut,
  Settings,
  Shield,
  Sun,
  Users,
  FileText,
  AlertTriangle,
  LayoutDashboard,
  Search,
  Power,
  DollarSign,
  FileBarChart,
  ShieldCheck,
  ChevronRight,
  FileCheck,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/components/auth-provider"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarTrigger,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from "@/components/ui/sidebar"
import { ModeToggle } from "@/components/mode-toggle"
import { UserNav } from "@/components/user-nav"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuContent,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu"

import { ListItem } from "@/components/ui/list-item"
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, logout } = useAuth()
  const pathname = usePathname()
  const [notifications, setNotifications] = useState(0)
  const [searchTerm, setSearchTerm] = useState("")

  if (!user || user.role !== "ADMIN") return null

  const dashboardMenuItems = [
    {
      title: "Overview",
      icon: LayoutDashboard,
      href: "/admin",
    },
  ]

  const customerMenuItems = [
    {
      title: "All Customers",
      icon: Users,
      href: "/admin/customers",
    },
    {
      title: "Installations",
      icon: Sun,
      href: "/admin/installations",
    },
    {
      title: "Payment Operations",
      icon: DollarSign,
      href: "/admin/payments",
    },
    {
      title: "Payment Analytics",
      icon: FileBarChart,
      href: "/admin/payments/reports",
    },
    {
      title: "Loan Management",
      icon: CreditCard,
      href: "/admin/loans",
    },
  ]

  // Define the menu item type with an optional badge property
  type MenuItem = {
    title: string;
    icon: React.ElementType;
    href: string;
    badge?: number;
  }

  const systemMenuItems: MenuItem[] = [
    {
      title: "Energy Monitoring",
      icon: BarChart3,
      href: "/admin/energy",
    },
    {
      title: "Service Control",
      icon: Power,
      href: "/admin/service",
    },
    {
      title: "System Logs",
      icon: FileText,
      href: "/admin/logs",
    },
  ]

  // Define security and compliance menu items
  const securityMenuItems: MenuItem[] = [
    {
      title: "Security Monitoring",
      icon: Shield,
      href: "/admin/security",
    },
    {
      title: "Security Alerts",
      icon: Bell,
      href: "/admin/security/alerts",
    },
  ]

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <Sidebar variant="floating" className="border-r border-gray-200">
          <SidebarHeader className="h-16 flex items-center px-4 border-b">
            <div className="flex items-center gap-2">
              <Sun className="h-6 w-6 text-primary" />
              <span className="text-lg font-bold">SolarComply</span>
              <Badge variant="outline" className="ml-2">
                Admin
              </Badge>
            </div>
          </SidebarHeader>

          <SidebarContent className="p-2">
            <div className="mb-4 px-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9 bg-gray-50"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <SidebarGroup>
              <SidebarGroupLabel>Dashboard</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {dashboardMenuItems.map((item) => (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={pathname === item.href} tooltip={item.title}>
                        <Link href={item.href}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel>Customer Management</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {customerMenuItems.map((item) => (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={
                        pathname === item.href ||
                        (pathname.startsWith(`${item.href}/`) &&
                          // Exclude Payment Reports from highlighting Payment Compliance
                          !(item.href === "/admin/payments" && pathname === "/admin/payments/reports"))
                      } tooltip={item.title}>
                        <Link href={item.href}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel>System</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {systemMenuItems.map((item) => (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={pathname === item.href || pathname.startsWith(`${item.href}/`)} tooltip={item.title}>
                        <Link href={item.href} className="relative">
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                          {item.badge && <Badge className="ml-auto bg-red-500 text-white">{item.badge}</Badge>}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel>Security & Compliance</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {securityMenuItems.map((item) => (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={
                        pathname === item.href ||
                        (pathname.startsWith(`${item.href}/`) &&
                          // Exclude Security Alerts from highlighting Security Monitoring
                          !(item.href === "/admin/security" && pathname === "/admin/security/alerts"))
                      } tooltip={item.title}>
                        <Link href={item.href} className="relative">
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="border-t p-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9">
                <AvatarImage src="/placeholder.svg?height=36&width=36" alt={user.name} />
                <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-medium leading-none truncate">{user.name}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={logout}>
                <LogOut className="h-4 w-4" />
                <span className="sr-only">Log out</span>
              </Button>
            </div>
          </SidebarFooter>
        </Sidebar>

        <div className="flex-1 flex flex-col w-full">
          <header className="sticky top-0 z-50 flex h-16 items-center gap-4 border-b bg-background px-6">
            <SidebarTrigger className="md:hidden" />

            <div className="flex-1 flex justify-end items-center gap-4">
              <Button variant="outline" size="icon" className="relative">
                <Bell className="h-4 w-4" />
                {notifications > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs font-medium text-destructive-foreground">
                    {notifications}
                  </span>
                )}
              </Button>
              <ModeToggle />
              <UserNav user={user} />
            </div>
          </header>

          <main className="flex-1 w-full p-4 md:p-6 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}

