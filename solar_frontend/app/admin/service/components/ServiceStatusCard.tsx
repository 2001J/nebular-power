import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { CheckCircle, Clock, AlertTriangle, XCircle, PlayCircle, StopCircle, RefreshCw } from "lucide-react"
import { format, formatDistanceToNow } from "date-fns"
import { cn } from "@/lib/utils"

interface ServiceStatusCardProps {
  name: string
  status: string
  reason: string
  lastUpdated: string
  installationId: string
  onStartService: (installationId: string) => Promise<void>
  onStopService: (installationId: string) => Promise<void>
  onRestartService: (installationId: string) => Promise<void>
  loading?: boolean
}

export function ServiceStatusCard({
  name,
  status,
  reason,
  lastUpdated,
  installationId,
  onStartService,
  onStopService,
  onRestartService,
  loading = false,
}: ServiceStatusCardProps) {
  const getStatusDetails = (status: string) => {
    switch (status?.toUpperCase()) {
      case "RUNNING":
        return {
          color: "text-green-500",
          bgColor: "bg-green-50",
          icon: <CheckCircle className="h-5 w-5 text-green-500" />,
          text: "Running"
        }
      case "STOPPED":
        return {
          color: "text-red-500",
          bgColor: "bg-red-50",
          icon: <XCircle className="h-5 w-5 text-red-500" />,
          text: "Stopped"
        }
      case "RESTARTING":
        return {
          color: "text-amber-500",
          bgColor: "bg-amber-50",
          icon: <RefreshCw className="h-5 w-5 text-amber-500" />,
          text: "Restarting"
        }
      case "PENDING":
        return {
          color: "text-blue-500",
          bgColor: "bg-blue-50",
          icon: <Clock className="h-5 w-5 text-blue-500" />,
          text: "Pending"
        }
      default:
        return {
          color: "text-gray-500",
          bgColor: "bg-gray-50",
          icon: <AlertTriangle className="h-5 w-5 text-gray-500" />,
          text: "Unknown"
        }
    }
  }

  const handleAction = (action: "start" | "stop" | "restart") => {
    if (!installationId) {
      console.error("Cannot perform action - Installation ID is undefined")
      return
    }

    if (action === "start") {
      onStartService(installationId)
    } else if (action === "stop") {
      onStopService(installationId)
    } else if (action === "restart") {
      onRestartService(installationId)
    }
  }

  const statusDetails = getStatusDetails(status)
  const isRunning = status?.toUpperCase() === "RUNNING"
  const isStopped = status?.toUpperCase() === "STOPPED"
  const isRestarting = status?.toUpperCase() === "RESTARTING"
  const isPending = status?.toUpperCase() === "PENDING"

  const formattedDate = lastUpdated 
    ? formatDistanceToNow(new Date(lastUpdated), { addSuffix: true })
    : "Unknown"

  if (loading) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-3/4 mb-1" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent className="pb-3">
          <div className="flex items-center space-x-3 mb-3">
            <Skeleton className="h-6 w-6 rounded-full" />
            <Skeleton className="h-4 w-1/3" />
          </div>
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-2/3" />
        </CardContent>
        <CardFooter className="flex justify-between pt-2 border-t">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-20" />
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">{name || `Installation #${installationId}`}</CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          ID: {installationId || "Unknown"}
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-3">
        <div className="flex items-center space-x-2 mb-3">
          {statusDetails.icon}
          <span className={cn("font-medium", statusDetails.color)}>
            {statusDetails.text}
          </span>
          <span className="text-xs text-muted-foreground">• Updated {formattedDate}</span>
        </div>
        {reason && (
          <p className="text-sm text-muted-foreground">
            <span className="font-medium">Reason:</span> {reason}
          </p>
        )}
      </CardContent>
      <CardFooter className="flex justify-between pt-2 border-t">
        <Button 
          variant="outline" 
          size="sm"
          disabled={isRunning || isRestarting || isPending || !installationId}
          onClick={() => handleAction("start")}
        >
          <PlayCircle className="h-4 w-4 mr-1" />
          Start
        </Button>
        <Button 
          variant="outline" 
          size="sm"
          disabled={isStopped || isRestarting || isPending || !installationId}
          onClick={() => handleAction("stop")}
        >
          <StopCircle className="h-4 w-4 mr-1" />
          Stop
        </Button>
        <Button 
          variant="outline" 
          size="sm"
          disabled={isRestarting || isPending || !installationId}
          onClick={() => handleAction("restart")}
        >
          <RefreshCw className="h-4 w-4 mr-1" />
          Restart
        </Button>
      </CardFooter>
    </Card>
  )
} 