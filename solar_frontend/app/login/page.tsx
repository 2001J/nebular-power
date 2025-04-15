"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Eye, EyeOff, Sun } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/components/auth-provider"

const loginSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  rememberMe: z.boolean().optional(),
})

type LoginFormValues = z.infer<typeof loginSchema>

export default function LoginPage() {
  const { login } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  })

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true)
    setError("")

    try {
      console.log("Attempting login with:", data.email)
      await login(data.email, data.password, data.rememberMe)
      toast({
        title: "Login successful",
        description: "You have been logged in successfully.",
      })
    } catch (error: any) {
      console.error("Login error:", error)
      console.error("Error details:", {
        message: error.message,
        response: error.response ? {
          status: error.response.status,
          data: error.response.data
        } : 'No response',
        stack: error.stack
      })

      // Handle different error responses
      if (error.message === "Invalid user data received from server") {
        setError("The server returned invalid user data. Please contact support.")
      } else if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        if (error.response.status === 401) {
          setError("Invalid email or password. Please try again.")
        } else if (error.response.status === 403) {
          setError("Your account is not activated or has been suspended.")
        } else if (error.response.status === 500) {
          setError("Server error. This could be related to database initialization. Please try again later.")
        } else if (error.response.data && error.response.data.message) {
          setError(error.response.data.message)
        } else {
          setError("Login failed. Please try again.")
        }
      } else if (error.request) {
        // The request was made but no response was received
        setError("No response from server. Please check your connection and try again.")
      } else {
        // Something happened in setting up the request that triggered an Error
        setError("An error occurred. Please try again.")
      }

      toast({
        variant: "destructive",
        title: "Login failed",
        description: error.response?.data?.message || error.message || "Please check your credentials and try again.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* Left panel - Brand section */}
      <div className="hidden md:flex md:w-1/2 bg-[#1e2e4a] text-white p-8 flex-col justify-between">
        <div className="flex items-center gap-2">
          <Sun className="h-6 w-6" />
          <span className="text-lg font-bold">SolarMonitor</span>
        </div>

        <div className="space-y-6 max-w-md">
          <h1 className="text-4xl font-bold tracking-tight">Renewable Energy Solutions within your reach</h1>
          <p className="text-lg text-gray-300">
            Track production, manage payments, and optimize your solar energy system all in one place.
          </p>
          <div className="flex space-x-4">
            <div className="bg-[#2a3e64] rounded-lg p-4 flex-1">
              <p className="text-xl font-bold">98%</p>
              <p className="text-sm text-gray-300">Customer satisfaction</p>
            </div>
            <div className="bg-[#2a3e64] rounded-lg p-4 flex-1">
              <p className="text-xl font-bold">+14%</p>
              <p className="text-sm text-gray-300">Energy efficiency</p>
            </div>
          </div>
        </div>

        <p className="text-sm text-gray-300">&copy; {new Date().getFullYear()} SolarMonitor. All rights reserved.</p>
      </div>

      {/* Right panel - Login form */}
      <div className="flex-1 p-6 md:p-12 flex flex-col justify-center">
        <div className="max-w-md mx-auto w-full space-y-8">
          <div className="flex justify-between items-center">
            <div className="md:hidden flex items-center gap-2">
              <Sun className="h-6 w-6 text-[#1e2e4a]" />
              <span className="text-lg font-bold text-[#1e2e4a]">SolarMonitor</span>
            </div>
            <div className="text-sm text-gray-500">
              <span className="flex items-center">
                <span className="mr-1">❗</span> Accounts are created by administrators after system installation
              </span>
            </div>
          </div>

          <div className="space-y-2 md:pt-8">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900">WELCOME BACK</h1>
            <p className="text-gray-600">Sign in to monitor and manage your solar energy system.</p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            {error && (
              <div className="p-3 text-sm bg-red-50 border border-red-200 text-red-600 rounded-md">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <div className="relative">
                <Input id="email" type="email" className="h-12 rounded-lg" {...register("email")} />
                {errors.email && <p className="mt-1 text-sm text-destructive">{errors.email.message}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  className="h-12 rounded-lg pr-10"
                  {...register("password")}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
                {errors.password && <p className="mt-1 text-sm text-destructive">{errors.password.message}</p>}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  {...register("rememberMe")}
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                  Remember me
                </label>
              </div>
              <Link href="/forgot-password" className="text-sm font-medium text-primary">
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              className="w-full h-12 rounded-lg bg-[#1e2e4a] hover:bg-[#2a3e64] text-white"
              disabled={isLoading}
            >
              {isLoading ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t"></span>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-gray-500">or sign in with</span>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full h-12 rounded-lg flex items-center justify-center gap-2 border border-gray-300"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-5 w-5">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
                <path d="M1 1h22v22H1z" fill="none" />
              </svg>
              Sign in with Google
            </Button>
            <Button
              variant="outline"
              className="w-full h-12 rounded-lg flex items-center justify-center gap-2 border border-gray-300"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-5 w-5">
                <path
                  d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z"
                  fill="#1877F2"
                />
              </svg>
              Sign in with Facebook
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

