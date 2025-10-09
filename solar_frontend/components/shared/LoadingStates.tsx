import React from 'react';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  readonly size?: 'sm' | 'md' | 'lg';
  readonly text?: string;
  readonly className?: string;
}

export function LoadingSpinner({ size = 'md', text, className }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  return (
    <div className={cn('flex items-center justify-center gap-2', className)}>
      <Loader2 className={cn('animate-spin', sizeClasses[size])} />
      {text && <span className="text-sm text-muted-foreground">{text}</span>}
    </div>
  );
}

interface LoadingCardProps {
  readonly title?: string;
  readonly description?: string;
  readonly className?: string;
}

export function LoadingCard({ title = 'Loading...', description, className }: LoadingCardProps) {
  return (
    <Card className={className}>
      <CardContent className="p-6">
        <div className="flex flex-col items-center justify-center space-y-4">
          <LoadingSpinner size="lg" />
          <div className="text-center">
            <h3 className="text-lg font-semibold">{title}</h3>
            {description && (
              <p className="text-sm text-muted-foreground mt-1">{description}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface ErrorStateProps {
  readonly title?: string;
  readonly description?: string;
  readonly onRetry?: () => void;
  readonly retryText?: string;
  readonly className?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  description = 'There was an error loading the data. Please try again.',
  onRetry,
  retryText = 'Try Again',
  className
}: ErrorStateProps) {
  return (
    <Alert variant="destructive" className={className}>
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="mt-2">
        {description}
        {onRetry && (
          <div className="mt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="h-8"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              {retryText}
            </Button>
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
}

interface ErrorCardProps extends ErrorStateProps {
  readonly className?: string;
}

export function ErrorCard(props: ErrorCardProps) {
  return (
    <Card className={props.className}>
      <CardContent className="p-6">
        <ErrorState {...props} />
      </CardContent>
    </Card>
  );
}

interface EmptyStateProps {
  readonly title: string;
  readonly description?: string;
  readonly action?: {
    readonly label: string;
    readonly onClick: () => void;
  };
  readonly className?: string;
}

export function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center p-8 text-center', className)}>
      <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
        <AlertCircle className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground mb-4 max-w-md">{description}</p>
      )}
      {action && (
        <Button onClick={action.onClick} variant="outline">
          {action.label}
        </Button>
      )}
    </div>
  );
}

interface PageHeaderProps {
  readonly title: string;
  readonly description?: string;
  readonly actions?: React.ReactNode;
  readonly breadcrumbs?: React.ReactNode;
  readonly className?: string;
}

export function PageHeader({ 
  title, 
  description, 
  actions, 
  breadcrumbs, 
  className 
}: PageHeaderProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {breadcrumbs}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          {description && (
            <p className="text-muted-foreground">{description}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

interface DataTableWrapperProps {
  readonly children: React.ReactNode;
  readonly loading?: boolean;
  readonly error?: Error | null;
  readonly onRetry?: () => void;
  readonly emptyState?: {
    readonly title: string;
    readonly description?: string;
  };
  readonly className?: string;
}

export function DataTableWrapper({
  children,
  loading,
  error,
  onRetry,
  emptyState,
  className
}: DataTableWrapperProps) {
  if (loading) {
    return <LoadingCard title="Loading data..." className={className} />;
  }

  if (error) {
    return (
      <ErrorCard
        title="Failed to load data"
        description={error.message}
        onRetry={onRetry}
        className={className}
      />
    );
  }

  return (
    <Card className={className}>
      <CardContent className="p-0">
        {children}
      </CardContent>
    </Card>
  );
}
