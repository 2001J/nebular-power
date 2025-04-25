import React, { useState } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, PlayCircle, StopCircle, RefreshCw, Settings, AlertTriangle, CheckCircle, Clock4 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";

interface ServiceStatusTableProps {
  statuses: any[];
  installations: any[];
  loading: boolean;
  page: number;
  pageSize: number;
  totalItems: number;
  onChangePage: (page: number) => void;
  onChangePageSize: (size: number) => void;
  onStartService: (installationId: string) => Promise<void>;
  onStopService: (installationId: string) => Promise<void>;
  onRestartService: (installationId: string) => Promise<void>;
  onUpdateStatus: (installation: any) => void;
  onSuspendService: (installation: any) => void;
  onRestoreService: (installation: any) => void;
  onScheduleChange: (installation: any) => void;
}

export function ServiceStatusTable({ 
  statuses, 
  installations, 
  loading,
  page,
  pageSize,
  totalItems,
  onChangePage,
  onChangePageSize,
  onStartService,
  onStopService,
  onRestartService,
  onUpdateStatus,
  onSuspendService,
  onRestoreService,
  onScheduleChange
}: ServiceStatusTableProps) {
  
  const getStatusBadge = (status: string) => {
    if (!status) return <Badge variant="outline">Unknown</Badge>;

    switch (status.toUpperCase()) {
      case 'ACTIVE':
        return <Badge variant="success">Active</Badge>;
      case 'SUSPENDED_PAYMENT':
        return <Badge variant="destructive">Suspended (Payment)</Badge>;
      case 'SUSPENDED_SECURITY':
        return <Badge variant="destructive">Suspended (Security)</Badge>;
      case 'SUSPENDED_MAINTENANCE':
        return <Badge variant="warning">Maintenance</Badge>;
      case 'PENDING':
        return <Badge variant="outline">Pending</Badge>;
      case 'TRANSITIONING':
        return <Badge variant="secondary">Transitioning</Badge>;
      case 'SCHEDULED':
        return <Badge variant="secondary">Scheduled Change</Badge>;
      case 'UNKNOWN':
        return <Badge variant="outline">Unknown</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const totalPages = Math.ceil(totalItems / pageSize);
  
  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages = [];
    const maxPageButtons = 5;
    
    if (totalPages <= maxPageButtons) {
      // Show all pages if there are fewer than maxPageButtons
      for (let i = 0; i < totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Show first page
      pages.push(0);
      
      // Calculate pages around current
      const startPage = Math.max(1, page - 1);
      const endPage = Math.min(totalPages - 2, page + 1);
      
      // Add ellipsis if needed
      if (startPage > 1) {
        pages.push(-1); // use -1 to indicate ellipsis
      }
      
      // Add pages around current
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
      
      // Add ellipsis if needed
      if (endPage < totalPages - 2) {
        pages.push(-2); // use -2 to indicate ellipsis
      }
      
      // Show last page
      pages.push(totalPages - 1);
    }
    
    return pages;
  };

  return (
    <div className="w-full space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">ID</TableHead>
              <TableHead>Installation</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Updated</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              // Loading skeleton rows
              Array.from({ length: pageSize }).map((_, index) => (
                <TableRow key={`skeleton-${index}`}>
                  <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Skeleton className="h-9 w-24" />
                      <Skeleton className="h-9 w-24" />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : statuses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  No service statuses found
                </TableCell>
              </TableRow>
            ) : (
              statuses.map((statusData, index) => {
                if (!statusData) return null; // Skip null/undefined status data
                
                const installationId = statusData.installationId || '';
                const installation = installations.find(i => i && i.id === installationId) || {};
                const isSuspended = statusData.status && statusData.status.toString().startsWith('SUSPENDED');
                const formattedDate = statusData.lastUpdated || statusData.updatedAt 
                  ? formatDistanceToNow(new Date(statusData.lastUpdated || statusData.updatedAt), { addSuffix: true })
                  : "N/A";
                
                return (
                  <TableRow key={statusData.id || `status-${installationId}-${index}`}>
                    <TableCell className="font-medium">{installationId || 'N/A'}</TableCell>
                    <TableCell>
                      {installation.name || `Installation #${installationId}` || 'Unknown'}
                    </TableCell>
                    <TableCell>
                      {installation.username || installation.customerName || "N/A"}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(statusData.status || 'UNKNOWN')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>{formattedDate}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm line-clamp-1">{statusData.statusReason || "N/A"}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <div className="flex space-x-1">
                          <Button
                            variant="outline"
                            size="icon"
                            title="Start Service"
                            onClick={() => onStartService(installationId)}
                            disabled={statusData.status === 'ACTIVE'}
                          >
                            <PlayCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            title="Stop Service"
                            onClick={() => onStopService(installationId)}
                            disabled={statusData.status === 'SUSPENDED_PAYMENT' || statusData.status === 'SUSPENDED_SECURITY'}
                          >
                            <StopCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            title="Restart Service"
                            onClick={() => onRestartService(installationId)}
                            disabled={statusData.status !== 'ACTIVE'}
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        <div className="flex space-x-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onUpdateStatus({
                              ...installation,
                              id: installationId,
                              status: statusData.status,
                            })}
                          >
                            <Settings className="h-4 w-4 mr-1" />
                            Update
                          </Button>

                          {(!isSuspended) && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onSuspendService({
                                ...installation,
                                id: installationId,
                                status: statusData.status,
                              })}
                            >
                              <AlertTriangle className="h-4 w-4 mr-1" />
                              Suspend
                            </Button>
                          )}

                          {isSuspended && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onRestoreService({
                                ...installation,
                                id: installationId,
                                status: statusData.status,
                              })}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Restore
                            </Button>
                          )}

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onScheduleChange({
                              ...installation,
                              id: installationId,
                              status: statusData.status,
                            })}
                          >
                            <Clock4 className="h-4 w-4 mr-1" />
                            Schedule
                          </Button>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      {!loading && statuses.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {page * pageSize + 1} to {Math.min((page + 1) * pageSize, totalItems)} of {totalItems} results
          </div>
          
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious 
                  onClick={() => onChangePage(Math.max(0, page - 1))} 
                  disabled={page === 0}
                />
              </PaginationItem>
              
              {getPageNumbers().map((pageNum, idx) => (
                <PaginationItem key={`page-${idx}`}>
                  {pageNum === -1 || pageNum === -2 ? (
                    <PaginationEllipsis />
                  ) : (
                    <PaginationLink
                      onClick={() => onChangePage(pageNum)}
                      isActive={page === pageNum}
                    >
                      {pageNum + 1}
                    </PaginationLink>
                  )}
                </PaginationItem>
              ))}
              
              <PaginationItem>
                <PaginationNext 
                  onClick={() => onChangePage(Math.min(totalPages - 1, page + 1))} 
                  disabled={page >= totalPages - 1}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
          
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">Rows per page:</span>
            <select
              className="h-8 rounded-md border border-input bg-background px-2 text-sm"
              value={pageSize}
              onChange={(e) => onChangePageSize(Number(e.target.value))}
            >
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
} 