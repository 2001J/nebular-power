"use client"

import Link from "next/link"
import { ShieldAlert, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function RegisterPageAccessDenied() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md space-y-8 rounded-lg border bg-white p-6 shadow-sm">
        <div className="flex flex-col items-center justify-center space-y-2 text-center">
          <div className="rounded-full bg-red-100 p-3">
            <ShieldAlert className="h-6 w-6 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Account Creation Restricted</h1>
          <p className="text-gray-500">
            Customer accounts can only be created by administrators after the solar system has been installed at your premises.
          </p>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg bg-amber-50 p-4 text-sm text-amber-800">
            <p>
              <strong>Important:</strong> The SolarMonitor system requires professional installation and setup. Once your
              solar system is installed, your installer will create an account for you with access to your specific installation.
            </p>
          </div>

          <div className="rounded-lg bg-gray-50 p-4">
            <h3 className="mb-2 font-medium">How to get access:</h3>
            <ol className="ml-4 list-decimal space-y-1 text-sm text-gray-600">
              <li>Contact our sales team to schedule a solar system installation</li>
              <li>Complete the installation process with our certified technicians</li>
              <li>Receive your login credentials from the installation team</li>
              <li>Access your solar monitoring dashboard with the provided credentials</li>
            </ol>
          </div>
        </div>

        <div className="flex justify-center pt-4">
          <Button asChild variant="outline" className="gap-2">
            <Link href="/login">
              <ArrowLeft className="h-4 w-4" />
              Return to login page
            </Link>
          </Button>
        </div>

        <p className="text-center text-xs text-gray-500">
          If you believe you should have access to the system, please contact our support team for assistance.
        </p>
      </div>
    </div>
  )
}

