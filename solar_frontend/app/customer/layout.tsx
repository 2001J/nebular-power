"use client"

import type React from "react"
import { usePathname, useRouter } from "next/navigation"
import { AlertTriangle, BarChart3, CreditCard, Home, Sun, } from "lucide-react"

import { useAuth } from "@/components/auth-provider"
import { ModeToggle } from "@/components/mode-toggle"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, logout } = useAuth()
  const pathname = usePathname()
  const router = useRouter()

  if (!user) return null

  const navItems = [
    {
      href: "/customer",
      label: "Dashboard",
      icon: Home,
    },
    {
      href: "/customer/charts",
      label: "Energy Charts",
      icon: BarChart3,
    },
    {
      href: "/customer/payments",
      label: "Payments",
      icon: CreditCard,
    },
    {
      href: "/customer/alerts",
      label: "System Alerts",
      icon: AlertTriangle,
    },
  ]

  // Handle navigation with loading state
  const handleNavigation = (href) => {
    router.push(href)
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Top header */}
      <header className="fixed top-0 left-0 right-0 z-50 h-14 bg-card border-b flex items-center px-4">
        <div className="flex items-center gap-2 mr-8">
          <Sun className="h-6 w-6 text-red-500" />
          <span className="text-lg font-bold">NebulaPower</span>
        </div>

        <nav className="hidden md:flex items-center space-x-4">
          {navItems.slice(0, 4).map((item) => (
            <button
              key={item.href}
              onClick={() => handleNavigation(item.href)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md",
                pathname === item.href
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <item.icon className="h-4 w-4" />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-4">
          <span className="text-sm text-muted-foreground">Welcome, {user.name}</span>

          <ModeToggle />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                <Avatar className="h-9 w-9">
                  <AvatarImage src="/placeholder.svg?height=36&width=36" alt={user.name} />
                  <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user.name}</p>
                  <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleNavigation("/customer/profile")}>Profile</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleNavigation("/customer/settings")}>Settings</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout}>Log out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Main content */}
      <div className="w-full pt-14">
        <main className="min-h-[calc(100vh-3.5rem)]">{children}</main>
      </div>

      {/* Mobile navigation */}
      <div className="fixed bottom-0 left-0 right-0 md:hidden bg-card border-t flex justify-around py-2">
        {navItems.map((item) => (
          <button
            key={item.href}
            onClick={() => handleNavigation(item.href)}
            className={cn("flex flex-col items-center p-2", pathname === item.href ? "text-primary" : "text-muted-foreground")}
          >
            <item.icon className="h-5 w-5" />
            <span className="text-xs mt-1">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
