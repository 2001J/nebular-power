"use client"

import { useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Card } from "@/components/ui/card"

export default function InstallationRedirectPage() {
  const router = useRouter()
  const { id } = useParams()

  useEffect(() => {
    // Redirect to the correct installation detail page
    router.push(`/admin/installations/${id}`)
  }, [id, router])

  return (
    <div className="flex justify-center items-center h-screen">
      <Card className="p-6">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-10 h-10 rounded-full border-4 border-t-primary animate-spin"></div>
          <h2 className="text-xl font-semibold">Redirecting to installation details...</h2>
          <p className="text-muted-foreground">Please wait a moment.</p>
        </div>
      </Card>
    </div>
  )
}