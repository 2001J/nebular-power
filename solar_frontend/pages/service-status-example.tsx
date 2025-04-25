import { useState, useEffect } from 'react';
import { ServiceStatusCard } from '@/components/ServiceStatusCard';
import { Container } from '@/components/ui/container';

export default function ServiceStatusExample() {
  const [services, setServices] = useState([
    {
      id: '123456',
      name: 'Solar Panel Monitoring',
      status: 'running',
      lastUpdated: new Date().toLocaleString(),
    },
    {
      id: '789012',
      name: 'Battery Management',
      status: 'stopped',
      lastUpdated: new Date().toLocaleString(),
    },
    {
      id: '345678',
      name: 'Energy Consumption Analytics',
      status: 'pending',
      lastUpdated: new Date().toLocaleString(),
    },
  ]);

  const handleStatusChange = (id: string) => {
    // In a real application, you would fetch the updated status from an API
    // This is just for demonstration purposes
    setServices(prevServices => 
      prevServices.map(service => 
        service.id === id 
          ? { ...service, lastUpdated: new Date().toLocaleString() } 
          : service
      )
    );
  };

  return (
    <Container className="py-10">
      <h1 className="text-2xl font-bold mb-6">Service Status Dashboard</h1>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {services.map((service) => (
          <ServiceStatusCard
            key={service.id}
            installationId={service.id}
            serviceName={service.name}
            status={service.status as 'running' | 'stopped' | 'pending' | 'error'}
            lastUpdated={service.lastUpdated}
            onStatusChange={() => handleStatusChange(service.id)}
          />
        ))}
      </div>
    </Container>
  );
} 