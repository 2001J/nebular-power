/**
 * TopProducersTable Component
 * Displays a table of top energy-producing installations
 */

"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Zap, Sun } from 'lucide-react';
import type { TopProducer } from '@/src/types/energyTypes';

export interface TopProducersTableProps {
  topProducers: TopProducer[];
  loading?: boolean;
}

/**
 * TopProducersTable Component
 */
export function TopProducersTable({ topProducers, loading = false }: TopProducersTableProps) {
  const router = useRouter();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Producing Installations</CardTitle>
        <CardDescription>Highest energy producing installations in the system</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Installation</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="hidden md:table-cell">Location</TableHead>
                <TableHead className="hidden md:table-cell text-center">Type</TableHead>
                <TableHead className="text-center">Production</TableHead>
                <TableHead className="text-right">Efficiency</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : topProducers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="flex flex-col items-center">
                      <Zap className="h-8 w-8 text-muted-foreground mb-2" />
                      <p className="font-medium">No Installation Data Available</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        There are no installations available to display.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                topProducers.map((installation, index) => (
                  <TableRow
                    key={installation.id || index}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/admin/installations/${installation.id}?referrer=energy`)}
                  >
                    <TableCell className="font-medium whitespace-nowrap">
                      {installation.name || `Installation #${installation.id}`}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {installation.customerName || installation.username || 'N/A'}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {installation.location || 'N/A'}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-center">
                      <Badge variant="outline">
                        {installation.type || 'Unknown'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {installation.todayGenerationKWh !== undefined
                        ? `${installation.todayGenerationKWh.toFixed(2)} kWh today`
                        : 'No data'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span>
                          {installation.averageEfficiencyPercentage !== undefined
                            ? `${installation.averageEfficiencyPercentage.toFixed(1)}%`
                            : 'N/A'}
                        </span>
                        {installation.averageEfficiencyPercentage > 0 && (
                          <Sun className="h-4 w-4 text-amber-500" />
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
