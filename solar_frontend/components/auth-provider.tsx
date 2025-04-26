"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { authApi, userApi } from "@/lib/api"
import { useToast } from "@/components/ui/use-toast"

type User = {
  id: string
  email: string
  name: string
  role: "ADMIN" | "CUSTOMER"
}

type AuthContextType = {
  user: User | null
  token: string | null
  login: (email: string, password: string, remember?: boolean) => Promise<void>
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()
  const { toast } = useToast()

  // On mount, check for token and fetch user data
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Check for token in localStorage - consistent naming with api.ts
        const storedToken = localStorage.getItem("token") || sessionStorage.getItem("token");
        if (!storedToken) {
          console.log("No token found in storage, no auto-login possible");
          setIsLoading(false);
          return;
        }

        console.log("Found stored token, setting token state");
        setToken(storedToken);

        // Fetch current user profile
        try {
          console.log("Fetching current user profile with token", storedToken.substring(0, 10) + "...");

          // Add specific debug logging for this API call
          const userData = await userApi.getCurrentUser();
          console.log("User profile successfully received:", JSON.stringify(userData));

          // Extract data with defaults to prevent undefined errors
          const {
            id = '',
            email = '',
            fullName = '',
            role = '',
            passwordChangeRequired = false
          } = userData || {};

          // The data is directly in the response, not nested
          // Verify that userData has all required fields
          if (!email || !role) {
            console.error("Invalid user profile data:", userData);
            throw new Error("Invalid user data received from server");
          }

          console.log("Setting user state with role:", role);
          setUser({
            id: id ? id.toString() : '',
            email: email,
            name: fullName || email,
            role: role === 'ADMIN' ? 'ADMIN' : 'CUSTOMER',
          });

          // Check if password change is required
          if (passwordChangeRequired) {
            console.log("Password change required, redirecting");
            router.push("/change-password");
          }
        } catch (error) {
          console.error("Failed to fetch user profile:", error)
          // If we can't get the user profile, clear the token
          localStorage.removeItem("token")
          sessionStorage.removeItem("token")
          setToken(null)
          setUser(null)
        }
      } catch (error) {
        console.error("Auth initialization error:", error)
      } finally {
        setIsLoading(false)
      }
    }

    initAuth()
  }, [router])

  // Protect routes based on authentication and roles
  useEffect(() => {
    if (isLoading) return

    // Public routes accessible to all
    const publicRoutes = ["/", "/login", "/register", "/forgot-password", "/reset-password", "/verify-email", "/change-password"]
    if (publicRoutes.includes(pathname)) return

    // If not authenticated and trying to access protected route
    if (!user && !publicRoutes.includes(pathname)) {
      console.log("User not authenticated, redirecting to login")
      // Prevent redirect loops by checking the URL parameters
      const currentUrl = window.location.href;
      // Only redirect to login if we haven't already been redirected due to an auth error
      if (!currentUrl.includes('?reason=')) {
        router.push("/login")
      }
      return
    }

    // Role-based route protection
    if (user) {
      try {
        if (pathname.startsWith("/admin") && user.role !== "ADMIN") {
          console.log("Access denied: User is not an admin, redirecting to customer dashboard")
          toast({
            title: "Access Denied",
            description: "You don't have permission to access the admin area.",
            variant: "destructive",
          })
          router.push("/customer")
        } else if (pathname.startsWith("/dashboard") && user.role === "ADMIN") {
          console.log("Admin user, redirecting to admin dashboard")
          router.push("/admin")
        }
      } catch (error) {
        console.error("Error during route protection:", error)
        // Don't automatically reset auth state and redirect on navigation errors
        // This can create login loops
        if (error instanceof Error && error.message.includes('Authentication failed')) {
          // Only clear tokens and redirect for actual authentication failures
          localStorage.removeItem("token")
          sessionStorage.removeItem("token")
          setToken(null)
          setUser(null)
          router.push("/login")
        }
      }
    }
  }, [user, pathname, isLoading, router, toast])

  const login = async (email: string, password: string, remember = false) => {
    setIsLoading(true)
    try {
      console.log("Attempting login with email:", email)
      // Call the login API
      const response = await authApi.login(email, password)

      // Only log non-sensitive information in production
      if (process.env.NODE_ENV === 'development') {
        console.log("Login response received with data")
      }

      // Extract the data from the response
      const {
        accessToken = '',  // Not 'token' but 'accessToken'
        refreshToken = '', // Store refresh token if available
        id = '',
        email: userEmail = '',
        fullName = '',
        role = '',
        passwordChangeRequired = false
      } = response || {}

      // Check if required fields exist
      if (!accessToken || !userEmail || !role) {
        console.error("Invalid login response structure")
        throw new Error("Invalid user data received from server");
      }

      console.log("Authentication successful")
      setToken(accessToken)
      setUser({
        id: id ? id.toString() : '',
        email: userEmail,
        name: fullName || userEmail,
        role: role === 'ADMIN' ? 'ADMIN' : 'CUSTOMER',
      })

      // Store tokens based on remember me setting
      if (remember) {
        localStorage.setItem("token", accessToken)
        // Store refresh token if available
        if (refreshToken) {
          localStorage.setItem("refreshToken", refreshToken)
        }
      } else {
        sessionStorage.setItem("token", accessToken)
        // Store refresh token if available
        if (refreshToken) {
          sessionStorage.setItem("refreshToken", refreshToken)
        }
      }

      // Check if password change is required
      if (passwordChangeRequired) {
        console.log("Password change required, redirecting")
        router.push("/change-password")
        return
      }

      // Redirect based on role
      if (role === 'ADMIN') {
        console.log("Admin user logged in, redirecting to admin dashboard")
        router.push("/admin")
      } else {
        console.log("Customer logged in, redirecting to customer dashboard")
        router.push("/customer")
      }

      return response
    } catch (error) {
      console.error("Login failed")
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    setToken(null)
    setUser(null)
    // Clear all auth tokens
    localStorage.removeItem("token")
    sessionStorage.removeItem("token")
    localStorage.removeItem("refreshToken")
    sessionStorage.removeItem("refreshToken")

    // Redirect to login
    router.push("/login")
  }

  return <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

export type { User }

