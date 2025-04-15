"use client"

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import {
  AlertCircle,
  RefreshCw,
  Home
} from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onReset?: () => void
  onNavigateHome?: () => void
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({
      error,
      errorInfo
    })

    // Log error to monitoring service
    console.error("Error boundary caught error:", error, errorInfo)

    // Add detailed error reporting
    const errorDetails = {
      name: error.name,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent
    };

    // Log to console in a structured format for easier debugging
    console.error("Detailed error information:", JSON.stringify(errorDetails, null, 2));

    // Could send this to a monitoring service like Sentry
    // reportErrorToMonitoring(errorDetails);

    // Show error toast for better visibility
    try {
      const { toast } = require('@/components/ui/use-toast');
      toast({
        title: "Application Error",
        description: "Something went wrong. Our team has been notified.",
        variant: "destructive",
      });
    } catch (toastError) {
      // Silently fail if toast component is not available
      console.warn("Could not show error toast:", toastError);
    }
  }

  resetErrorBoundary = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    })

    if (this.props.onReset) {
      this.props.onReset()
    }
  }

  navigateHome = (): void => {
    this.resetErrorBoundary()

    if (this.props.onNavigateHome) {
      this.props.onNavigateHome()
    } else {
      window.location.href = '/'
    }
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // Check if a custom fallback is provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Check if this appears to be a network error
      const isNetworkError = this.state.error && (
        this.state.error.message.includes('network') ||
        this.state.error.message.includes('fetch') ||
        this.state.error.message.includes('connection') ||
        this.state.error.message.includes('offline') ||
        this.state.error.message.includes('ECONNREFUSED') ||
        this.state.error.message.includes('ECONNABORTED') ||
        this.state.error.message.includes('Failed to fetch')
      );

      // Default error UI
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center bg-muted/20 rounded-lg border border-muted">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <h2 className="text-2xl font-bold mb-2">
            {isNetworkError ? "Network Connection Error" : "Something went wrong"}
          </h2>
          <p className="text-muted-foreground mb-6 max-w-md">
            {isNetworkError
              ? "We're having trouble connecting to the server. Please check your internet connection and try again."
              : "We encountered an error while rendering this component. Please try again or return to the dashboard."}
          </p>

          <div className="flex flex-wrap gap-4 justify-center">
            <Button
              variant="outline"
              onClick={this.resetErrorBoundary}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>

            <Button
              onClick={this.navigateHome}
              className="flex items-center gap-2"
            >
              <Home className="h-4 w-4" />
              Go Home
            </Button>
          </div>

          {process.env.NODE_ENV === 'development' && this.state.error && (
            <div className="mt-8 p-4 bg-muted rounded-md text-left overflow-auto max-w-full">
              <details>
                <summary className="font-mono text-sm cursor-pointer mb-2">Error Details</summary>
                <pre className="text-xs overflow-auto p-2 bg-card rounded">
                  {this.state.error.toString()}
                  {this.state.errorInfo && this.state.errorInfo.componentStack}
                </pre>
              </details>
            </div>
          )}
        </div>
      )
    }

    return this.props.children
  }
}

export { ErrorBoundary } 