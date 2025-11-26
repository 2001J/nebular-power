"use client"

import type React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { AlertTriangle, BarChart3, CreditCard, Home, Sun, User, LogOut, ChevronDown } from "lucide-react"

import { useAuth } from "@/components/auth-provider"
import { ModeToggle } from "@/components/mode-toggle"
import { cn } from "@/lib/utils"
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
}: Readonly<{
  children: React.ReactNode
}>) {
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
    {
      href: "/customer/profile",
      label: "Profile",
      icon: User,
    },
  ]

  const desktopNavItems = navItems.filter((item) => item.href !== "/customer/profile")

  // Handle navigation with loading state
  const handleNavigation = (href) => {
    router.push(href)
  }

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-[#0a0f1a]">
      {/* Top header */}
      <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-white dark:bg-[#0f1419] border-b border-gray-200 dark:border-gray-800 flex items-center px-6 backdrop-blur-xl bg-white/80 dark:bg-[#0f1419]/80">
        <div className="flex items-center gap-2 mr-10">
          <Sun className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          <span className="text-lg font-semibold text-gray-900 dark:text-white">NebulaPower</span>
        </div>

        <nav className="hidden md:flex items-center gap-2">
          {desktopNavItems.map((item) => (
            <button
              key={item.href}
              onClick={() => handleNavigation(item.href)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all",
                pathname === item.href
                  ? "bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#1a2332] hover:text-gray-900 dark:hover:text-gray-200",
              )}
            >
              <item.icon className="h-4 w-4" />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <span className="hidden lg:block text-sm text-gray-600 dark:text-gray-400">
            Welcome, <span className="font-medium text-gray-900 dark:text-gray-200">{user.name}</span>
          </span>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white/80 dark:bg-white/5 px-4 py-2 text-sm font-semibold shadow-sm hover:bg-white"
              >
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-500 dark:text-white/60" />
                  <div className="leading-tight text-left">
                    <span className="text-[10px] uppercase text-gray-500 dark:text-white/50">Customer</span>
                    <span className="block text-sm text-gray-900 dark:text-white">{user.name}</span>
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 text-gray-400 dark:text-white/50" />
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-60 dark:bg-[#0f1419] dark:border-white/10" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-semibold leading-none text-gray-900 dark:text-gray-100">{user.name}</p>
                  <p className="text-xs leading-none text-gray-500 dark:text-gray-400">{user.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="dark:bg-white/10" />
              <DropdownMenuItem asChild className="cursor-pointer text-gray-600 dark:text-gray-200">
                <Link href="/customer/profile">Profile &amp; preferences</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="cursor-pointer text-gray-600 dark:text-gray-200">
                <Link href="/customer/settings">Billing &amp; settings</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="dark:bg-white/10" />
              <DropdownMenuItem
                className="text-red-600 dark:text-red-400"
                onClick={() => logout()}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Main content */}
      <div className="w-full pt-16">
        <main className="min-h-[calc(100vh-4rem)]">{children}</main>
      </div>

      {/* Mobile navigation */}
      <div className="fixed bottom-0 left-0 right-0 md:hidden bg-white dark:bg-[#0f1419] border-t border-gray-200 dark:border-gray-800 flex justify-around py-3 px-2 backdrop-blur-xl bg-white/80 dark:bg-[#0f1419]/80">
        {navItems.map((item) => (
          <button
            key={item.href}
            onClick={() => handleNavigation(item.href)}
            className={cn(
              "flex flex-col items-center p-2 rounded-lg transition-all",
              pathname === item.href 
                ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30" 
                : "text-gray-600 dark:text-gray-400"
            )}
          >
            <item.icon className="h-5 w-5" />
            <span className="text-xs mt-1 font-medium">{item.label}</span>
          </button>
        ))}
      </div>

      {/* Floating theme toggle */}
      <div className="fixed right-4 bottom-20 md:bottom-6 md:right-6 z-50 drop-shadow-xl">
        <ModeToggle />
      </div>
    </div>
  )
}
