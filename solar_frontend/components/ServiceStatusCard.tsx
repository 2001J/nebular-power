import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { serviceApi } from '@/lib/api';
import { toast } from 'sonner';
import { Play, Square, RotateCcw, Clock } from 'lucide-react';

interface ServiceStatusCardProps {
  installationId: string;
  serviceName: string;
  status: 'running' | 'stopped' | 'pending' | 'error';
  lastUpdated: string;
  onStatusChange?: () => void;
}

export function ServiceStatusCard({ 
  installationId, 
  serviceName, 
  status, 
  lastUpdated,
  onStatusChange 
}: ServiceStatusCardProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  
  const handleServiceAction = async (action: 'start' | 'stop' | 'restart') => {
    setIsLoading(true);
    try {
      if (action === 'start') {
        await serviceApi.startService(installationId);
        toast.success(`${serviceName} started successfully`);
      } else if (action === 'stop') {
        await serviceApi.stopService(installationId);
        toast.success(`${serviceName} stopped successfully`);
      } else if (action === 'restart') {
        await serviceApi.restartService(installationId);
        toast.success(`${serviceName} restarted successfully`);
      }
      
      if (onStatusChange) {
        onStatusChange();
      }
    } catch (error) {
      toast.error(`Failed to ${action} ${serviceName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  const getStatusBadge = () => {
    switch (status) {
      case 'running':
        return <Badge className="bg-green-500">Running</Badge>;
      case 'stopped':
        return <Badge className="bg-red-500">Stopped</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500">Pending</Badge>;
      case 'error':
        return <Badge className="bg-orange-500">Error</Badge>;
      default:
        return <Badge className="bg-gray-500">Unknown</Badge>;
    }
  };
  
  return (
    <Card className="w-full shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium">{serviceName}</CardTitle>
        <CardDescription className="flex items-center justify-between">
          <span>Installation ID: {installationId}</span>
          {getStatusBadge()}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-gray-500 flex items-center">
          <Clock className="h-4 w-4 mr-1" />
          Last updated: {lastUpdated}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between pt-2">
        <Button 
          size="sm" 
          variant="outline" 
          onClick={() => handleServiceAction('start')} 
          disabled={isLoading || status === 'running'}
          className="flex items-center"
        >
          <Play className="h-4 w-4 mr-1" />
          Start
        </Button>
        <Button 
          size="sm" 
          variant="outline" 
          onClick={() => handleServiceAction('stop')} 
          disabled={isLoading || status === 'stopped'}
          className="flex items-center"
        >
          <Square className="h-4 w-4 mr-1" />
          Stop
        </Button>
        <Button 
          size="sm" 
          variant="outline" 
          onClick={() => handleServiceAction('restart')} 
          disabled={isLoading || status === 'stopped'}
          className="flex items-center"
        >
          <RotateCcw className="h-4 w-4 mr-1" />
          Restart
        </Button>
      </CardFooter>
    </Card>
  );
} 