"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Eye, EyeOff, Lock } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { authApi } from "@/lib/api"

const passwordChangeSchema = z
  .object({
    newPassword: z.string()
      .min(8, { message: "Password must be at least 8 characters" })
      .regex(/[A-Z]/, { message: "Password must contain at least one uppercase letter" })
      .regex(/[a-z]/, { message: "Password must contain at least one lowercase letter" })
      .regex(/[0-9]/, { message: "Password must contain at least one number" }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })

type PasswordChangeFormValues = z.infer<typeof passwordChangeSchema>

// Create a wrapped component that uses useSearchParams
function ChangePasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [email, setEmail] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PasswordChangeFormValues>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  })

  useEffect(() => {
    // Get email from query params
    const emailParam = searchParams.get("email")
    if (!emailParam) {
      toast({
        variant: "destructive",
        title: "Missing information",
        description: "Email address is required to change your password",
      })
      router.push("/login")
      return
    }

    setEmail(emailParam)
  }, [searchParams, router, toast])

  const onSubmit = async (data: PasswordChangeFormValues) => {
    if (!email) return

    setIsLoading(true)
    setErrorMessage(null)

    try {
      await authApi.changeInitialPassword(
        email,
        data.newPassword,
        data.confirmPassword
      )

      toast({
        title: "Password changed",
        description: "Your password has been successfully updated. You can now log in.",
      })

      router.push("/login")
    } catch (error: any) {
      console.error("Password change error:", error)
      setErrorMessage(error.response?.data?.message || "Failed to change password. Please try again.")

      toast({
        variant: "destructive",
        title: "Error",
        description: "There was a problem changing your password",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Create New Password</CardTitle>
          <CardDescription>
            Your email has been verified. Please set a new password for your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {errorMessage && (
              <div className="p-3 text-sm bg-red-50 border border-red-200 text-red-600 rounded-md">
                {errorMessage}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="newPassword" className="text-sm font-medium">
                New Password
              </label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showPassword ? "text" : "password"}
                  className="h-12 rounded-lg pr-10"
                  {...register("newPassword")}
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
                {errors.newPassword && <p className="mt-1 text-sm text-destructive">{errors.newPassword.message}</p>}
              </div>
              <p className="text-xs text-muted-foreground">
                Password must be at least 8 characters and include uppercase, lowercase, and numbers.
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium">
                Confirm Password
              </label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  className="h-12 rounded-lg pr-10"
                  {...register("confirmPassword")}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
                {errors.confirmPassword && (
                  <p className="mt-1 text-sm text-destructive">{errors.confirmPassword.message}</p>
                )}
              </div>
            </div>

            <div className="pt-4">
              <Button
                type="submit"
                className="w-full h-12 rounded-lg bg-primary"
                disabled={isLoading}
              >
                {isLoading ? "Updating password..." : "Set New Password"}
              </Button>
            </div>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <div className="text-sm text-muted-foreground">
            <Lock className="inline mr-1 h-4 w-4" />
            Your password is securely encrypted
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}

// Main page component with Suspense boundary
export default function ChangePasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    }>
      <ChangePasswordForm />
    </Suspense>
  )
} 