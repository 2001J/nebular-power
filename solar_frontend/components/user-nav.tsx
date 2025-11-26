"use client"

import Link from "next/link"
import { LogOut, User as UserIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useAuth } from "./auth-provider"

interface UserNavProps {
  user: {
    name: string
    email: string
    image?: string
    role: string
  }
}

export function UserNav({ user }: Readonly<UserNavProps>) {
  const { logout } = useAuth()
  const profileHref = user.role === "ADMIN" ? "/admin/profile" : "/customer/profile"

  return (
    <div className="flex items-center gap-2">
      <Button
        asChild
        variant="outline"
        className="h-9 rounded-xl border-border/60 bg-card/70 px-3 text-sm font-medium tracking-tight shadow-sm hover:bg-card"
      >
        <Link href={profileHref} className="flex items-center gap-2">
          <UserIcon className="h-4 w-4 text-muted-foreground" />
          <div className="flex flex-col leading-tight text-left">
            <span className="text-xs uppercase text-muted-foreground">{user.role.toLowerCase()}</span>
            <span className="text-sm font-semibold text-foreground">{user.name}</span>
          </div>
        </Link>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 rounded-xl text-muted-foreground hover:text-destructive"
        onClick={logout}
      >
        <LogOut className="h-4 w-4" />
        <span className="sr-only">Sign out</span>
      </Button>
    </div>
  )
}

