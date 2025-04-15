"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { authApi } from "@/lib/api"

export default function VerifyEmail({ params }: { params: { token: string } }) {
  const router = useRouter()
  const [verificationStatus, setVerificationStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [emailAddress, setEmailAddress] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const { token } = params

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        const response = await authApi.verifyEmail(token)
        setVerificationStatus('success')

        // Broadcast a custom event for immediate updates
        if (typeof window !== 'undefined') {
          const event = new CustomEvent('customerVerified', {
            detail: {
              email: response.email,
              userId: response.id || response.userId || null
            }
          });
          window.dispatchEvent(event);
          console.log("Broadcasted customerVerified event:", response.email);
        }

        // If a redirect is required (for password change)
        if (response.redirectRequired) {
          setEmailAddress(response.email)
          // Wait a moment before redirecting
          setTimeout(() => {
            router.push(`/change-password?email=${encodeURIComponent(response.email)}`)
          }, 3000)
        }
      } catch (error: any) {
        setVerificationStatus('error')
        setErrorMessage(error.response?.data?.message || 'Email verification failed. The link may be expired or invalid.')
      }
    }

    verifyEmail()
  }, [token, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Email Verification</CardTitle>
          <CardDescription>
            {verificationStatus === 'loading' && 'Verifying your email address...'}
            {verificationStatus === 'success' && 'Your email has been verified!'}
            {verificationStatus === 'error' && 'Verification failed'}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center space-y-4">
          {verificationStatus === 'loading' && (
            <div className="animate-spin h-10 w-10 border-2 border-primary border-t-transparent rounded-full"></div>
          )}

          {verificationStatus === 'success' && (
            <>
              <CheckCircle2 className="h-16 w-16 text-green-500" />
              <p className="text-center">
                Your email address has been successfully verified. You can now use all features of the application.
              </p>
              {emailAddress && (
                <p className="text-sm text-muted-foreground mt-2">
                  You'll be redirected to change your password momentarily...
                </p>
              )}
            </>
          )}

          {verificationStatus === 'error' && (
            <>
              <XCircle className="h-16 w-16 text-red-500" />
              <p className="text-center text-red-500">{errorMessage}</p>
            </>
          )}
        </CardContent>
        <CardFooter>
          <Button
            className="w-full"
            onClick={() => router.push('/login')}
            disabled={verificationStatus === 'loading'}
          >
            {verificationStatus === 'success' ? 'Continue to Login' : 'Back to Login'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
} 