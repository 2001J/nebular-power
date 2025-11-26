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
import { ModeToggle } from "@/components/mode-toggle"

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
    <div className="flex min-h-screen flex-col md:flex-row bg-white dark:bg-[#0f1419]">
      {/* Theme toggle - Fixed top right corner */}
      <div className="fixed top-6 right-6 z-50">
        <ModeToggle />
      </div>

      {/* Left panel - Brand section */}
      <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 dark:from-[#0a0f1a] dark:via-[#0f1419] dark:to-[#0a0f1a] text-white p-12 flex-col justify-between relative overflow-hidden">
        {/* Background solar panel image */}
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1509391366360-2e959784a276?w=800')] bg-cover bg-center opacity-20 dark:opacity-10"></div>
        
        {/* Subtle background pattern and gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/90 via-slate-900/80 to-slate-900/90 dark:from-gray-950/90 dark:via-gray-900/80 dark:to-gray-950/90"></div>
        <div className="absolute inset-0 bg-grid-white/[0.02]"></div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-2">
            <Sun className="h-7 w-7 text-amber-400" />
            <span className="text-xl font-bold">NebulaPower</span>
          </div>
        </div>

        <div className="space-y-8 max-w-md relative z-10">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight">Renewable Energy Solutions within your reach</h1>
          <p className="text-lg text-white/80 dark:text-white/60 leading-relaxed">
            Track production, manage payments, and optimize your solar energy system all in one place.
          </p>
          <div className="flex space-x-4">
            <div className="bg-white/10 dark:bg-white/5 backdrop-blur-sm rounded-xl p-5 flex-1 border border-white/20 dark:border-white/10">
              <p className="text-2xl font-bold">98%</p>
              <p className="text-sm text-white/80 dark:text-white/60 mt-1">Customer satisfaction</p>
            </div>
            <div className="bg-white/10 dark:bg-white/5 backdrop-blur-sm rounded-xl p-5 flex-1 border border-white/20 dark:border-white/10">
              <p className="text-2xl font-bold">+14%</p>
              <p className="text-sm text-white/80 dark:text-white/60 mt-1">Energy efficiency</p>
            </div>
          </div>
        </div>

        <p className="text-sm text-white/70 dark:text-white/50 relative z-10">&copy; {new Date().getFullYear()} NebulaPower. All rights reserved.</p>
      </div>

      {/* Right panel - Login form */}
      <div className="flex-1 p-6 md:p-12 flex flex-col justify-center dark:bg-[#0f1419]">
        <div className="max-w-md mx-auto w-full space-y-8">
          <div className="flex justify-between items-start">
            <div className="md:hidden flex items-center gap-2">
              <Sun className="h-7 w-7 text-primary dark:text-amber-400" />
              <span className="text-xl font-bold text-gray-900 dark:text-white">NebulaPower</span>
            </div>
          </div>

          <div className="space-y-3 md:pt-8">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900 dark:text-white">WELCOME BACK</h1>
            <p className="text-base text-gray-600 dark:text-gray-400 leading-relaxed">Sign in to monitor and manage your solar energy system.</p>
            <div className="text-sm text-gray-500 dark:text-gray-500 flex items-start gap-2 pt-2">
              <span className="text-amber-500 dark:text-amber-400">ℹ️</span>
              <span>Accounts are created by administrators after system installation</span>
            </div>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
            {error && (
              <div className="p-4 text-sm bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/30 text-red-600 dark:text-red-400 rounded-lg">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Email
              </label>
              <div className="relative">
                <Input 
                  id="email" 
                  type="email" 
                  className="h-11 rounded-lg border-gray-300 bg-white focus:border-[#192f50] dark:bg-[#0a0f1a] dark:border-gray-700 dark:focus:border-blue-500 dark:text-gray-100 dark:placeholder:text-gray-500" 
                  {...register("email")} 
                />
                {errors.email && <p className="mt-2 text-sm text-destructive dark:text-red-400">{errors.email.message}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Password
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  className="h-11 rounded-lg pr-10 border-gray-300 bg-white focus:border-[#192f50] dark:bg-[#0a0f1a] dark:border-gray-700 dark:focus:border-blue-500 dark:text-gray-100 dark:placeholder:text-gray-500"
                  {...register("password")}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 hover:scale-110 transition-transform"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 dark:text-white/40" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 dark:text-white/40" />
                  )}
                </button>
                {errors.password && <p className="mt-2 text-sm text-destructive dark:text-red-400">{errors.password.message}</p>}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 dark:border-gray-700 text-primary focus:ring-primary dark:bg-[#0a0f1a]"
                  {...register("rememberMe")}
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                  Remember me
                </label>
              </div>
              <Link href="/forgot-password" className="text-sm font-medium text-[#192f50] dark:text-blue-400 hover:underline">
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              className="w-full h-11 rounded-lg bg-[#192f50] hover:bg-[#192f50]/90 dark:bg-gradient-to-r dark:from-primary dark:to-primary/90 dark:hover:from-primary/90 dark:hover:to-primary/80 text-white shadow-lg hover:shadow-xl transition-all font-medium"
              disabled={isLoading}
            >
              {isLoading ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t dark:border-gray-700"></span>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background dark:bg-[#0f1419] px-2 text-gray-500 dark:text-gray-500">or sign in with</span>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full h-11 rounded-lg flex items-center justify-center gap-2 border border-gray-300 dark:border-gray-700 dark:bg-[#0a0f1a] dark:hover:bg-[#1a2332] dark:text-gray-300 transition-all"
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
              <span className="dark:text-gray-300">Sign in with Google</span>
            </Button>
            <Button
              variant="outline"
              className="w-full h-11 rounded-lg flex items-center justify-center gap-2 border border-gray-300 dark:border-gray-700 dark:bg-[#0a0f1a] dark:hover:bg-[#1a2332] dark:text-gray-300 transition-all"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-5 w-5">
                <path
                  d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z"
                  fill="#1877F2"
                />
              </svg>
              <span className="dark:text-gray-300">Sign in with Facebook</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

