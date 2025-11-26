"use client"

import type React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BarChart3,
  CreditCard,
  Shield,
  ShieldAlert,
  Sun,
  Users,
  FileText,
  LayoutDashboard,
  Power,
  DollarSign,
  FileBarChart,
  User,
} from "lucide-react"

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
import { Badge } from "@/components/ui/badge"

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const { user } = useAuth()
  const pathname = usePathname()
  const currentPath = pathname ?? ''

  if (user?.role !== "ADMIN") return null

  const dashboardMenuItems = [
    {
      title: "Overview",
      icon: LayoutDashboard,
      href: "/admin",
    },
    {
      title: "Profile",
      icon: User,
      href: "/admin/profile",
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
      icon: ShieldAlert,
      href: "/admin/security/alerts",
    },
  ]

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background overflow-hidden">
        <Sidebar variant="floating" className="border-r border-border/40 bg-sidebar flex-shrink-0 overscroll-none">
          <SidebarHeader className="h-14 sm:h-16 flex items-center px-4 sm:px-6 border-b border-border/40 flex-shrink-0">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-primary/10">
                <Sun className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm sm:text-base font-semibold tracking-tight">NebulaPower</span>
                <span className="text-[10px] sm:text-2xs text-muted-foreground font-medium">Admin Portal</span>
              </div>
            </div>
          </SidebarHeader>

          <SidebarContent className="px-2 sm:px-3 py-3 sm:py-4 overscroll-contain">
            <SidebarGroup className="mb-6">
              <SidebarGroupLabel className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground/70 px-3 mb-2">
                Dashboard
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="space-y-0.5">
                  {dashboardMenuItems.map((item) => (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton 
                        asChild 
                        isActive={currentPath === item.href} 
                        tooltip={item.title}
                        className="h-9 rounded-lg hover:bg-sidebar-accent transition-all duration-200 data-[active=true]:bg-primary/10 data-[active=true]:text-primary data-[active=true]:font-medium"
                      >
                        <Link href={item.href} className="flex items-center gap-3 px-3">
                          <item.icon className="h-4 w-4 flex-shrink-0" />
                          <span className="text-sm">{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup className="mb-6">
              <SidebarGroupLabel className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground/70 px-3 mb-2">
                Customer Management
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="space-y-0.5">
                  {customerMenuItems.map((item) => (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton 
                        asChild 
                        isActive={
                          currentPath === item.href ||
                          (currentPath.startsWith(`${item.href}/`) &&
                            !(item.href === "/admin/payments" && currentPath === "/admin/payments/reports"))
                        } 
                        tooltip={item.title}
                        className="h-9 rounded-lg hover:bg-sidebar-accent transition-all duration-200 data-[active=true]:bg-primary/10 data-[active=true]:text-primary data-[active=true]:font-medium"
                      >
                        <Link href={item.href} className="flex items-center gap-3 px-3">
                          <item.icon className="h-4 w-4 flex-shrink-0" />
                          <span className="text-sm">{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup className="mb-6">
              <SidebarGroupLabel className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground/70 px-3 mb-2">
                System
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="space-y-0.5">
                  {systemMenuItems.map((item) => (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton 
                        asChild 
                        isActive={currentPath === item.href || currentPath.startsWith(`${item.href}/`)} 
                        tooltip={item.title}
                        className="h-9 rounded-lg hover:bg-sidebar-accent transition-all duration-200 data-[active=true]:bg-primary/10 data-[active=true]:text-primary data-[active=true]:font-medium"
                      >
                        <Link href={item.href} className="flex items-center gap-3 px-3 relative">
                          <item.icon className="h-4 w-4 flex-shrink-0" />
                          <span className="text-sm flex-1">{item.title}</span>
                          {item.badge && (
                            <Badge className="ml-auto h-5 px-1.5 text-xs bg-destructive text-destructive-foreground">
                              {item.badge}
                            </Badge>
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground/70 px-3 mb-2">
                Security
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="space-y-0.5">
                  {securityMenuItems.map((item) => (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton 
                        asChild 
                        isActive={
                          currentPath === item.href ||
                          (currentPath.startsWith(`${item.href}/`) &&
                            !(item.href === "/admin/security" && currentPath === "/admin/security/alerts"))
                        } 
                        tooltip={item.title}
                        className="h-9 rounded-lg hover:bg-sidebar-accent transition-all duration-200 data-[active=true]:bg-primary/10 data-[active=true]:text-primary data-[active=true]:font-medium"
                      >
                        <Link href={item.href} className="flex items-center gap-3 px-3">
                          <item.icon className="h-4 w-4 flex-shrink-0" />
                          <span className="text-sm">{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="border-t border-border/40 p-3 sm:p-4">
            <div className="flex justify-center">
              <ModeToggle />
            </div>
          </SidebarFooter>
        </Sidebar>

        <div className="flex-1 flex flex-col w-full min-w-0 overflow-hidden">
          <header className="sticky top-0 z-50 flex h-14 sm:h-16 items-center gap-2 sm:gap-4 border-b border-border/40 bg-background/80 backdrop-blur-md px-4 sm:px-6 flex-shrink-0">
            <SidebarTrigger className="lg:hidden -ml-1" />

            <div className="flex-1 flex justify-end items-center gap-1 sm:gap-2">
              <UserNav user={user} />
            </div>
          </header>

          <main className="flex-1 overflow-y-auto bg-background">
            <div className="p-4 sm:p-6 md:p-8 lg:p-10">
              <div className="max-w-[1600px] mx-auto">
                {children}
              </div>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}
