import React from 'react';
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
import { Clock, RefreshCw, AlertTriangle, CheckCircle } from "lucide-react";
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
  onRestartService: (installationId: string) => Promise<void>;
  onSuspendService: (installation: any) => void;
  onRestoreService: (installation: any) => void;
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
  onRestartService,
  onSuspendService,
  onRestoreService
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
    const pages: number[] = [];
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
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px] sm:w-[80px]">ID</TableHead>
              <TableHead className="min-w-[150px]">Installation</TableHead>
              <TableHead className="hidden md:table-cell min-w-[150px]">Customer</TableHead>
              <TableHead className="min-w-[120px]">Status</TableHead>
              <TableHead className="hidden lg:table-cell min-w-[150px]">Last Updated</TableHead>
              <TableHead className="hidden xl:table-cell min-w-[200px]">Reason</TableHead>
              <TableHead className="text-right min-w-[200px]">Actions</TableHead>
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
                    <TableCell className="font-medium text-xs sm:text-sm">{installationId || 'N/A'}</TableCell>
                    <TableCell className="text-sm">
                      <div className="font-medium">
                        {installation.name || `Installation #${installationId}` || 'Unknown'}
                      </div>
                      {/* Show customer on mobile */}
                      <div className="md:hidden text-xs text-muted-foreground mt-1">
                        {installation.username || installation.customerName || "N/A"}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm">
                      {installation.username || installation.customerName || "N/A"}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(statusData.status || 'UNKNOWN')}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="flex items-center space-x-2 text-sm">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="whitespace-nowrap">{formattedDate}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden xl:table-cell">
                      <span className="text-xs sm:text-sm line-clamp-1">{statusData.statusReason || "N/A"}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        {/* Only show restart if service is ACTIVE */}
                        {statusData.status === 'ACTIVE' && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title="Restart Service"
                              onClick={() => onRestartService(installationId)}
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                            <div className="h-6 w-px bg-border mx-1" />
                          </>
                        )}
                        
                        {/* Main action buttons */}
                        <div className="flex items-center gap-1">
                          {(!isSuspended) ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8"
                              onClick={() => onSuspendService({
                                ...installation,
                                id: installationId,
                                status: statusData.status,
                              })}
                            >
                              <AlertTriangle className="h-3.5 w-3.5 sm:mr-1" />
                              <span className="hidden sm:inline">Suspend</span>
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8"
                              onClick={() => onRestoreService({
                                ...installation,
                                id: installationId,
                                status: statusData.status,
                              })}
                            >
                              <CheckCircle className="h-3.5 w-3.5 sm:mr-1" />
                              <span className="hidden sm:inline">Restore</span>
                            </Button>
                          )}
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
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs sm:text-sm text-muted-foreground">
            Showing <span className="font-medium">{page * pageSize + 1}</span> to{' '}
            <span className="font-medium">{Math.min((page + 1) * pageSize, totalItems)}</span> of{' '}
            <span className="font-medium">{totalItems}</span> results
          </div>
          
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious 
                  onClick={() => onChangePage(Math.max(0, page - 1))} 
                  aria-disabled={page === 0}
                  className="h-8 px-2 sm:px-4"
                />
              </PaginationItem>
              
              {getPageNumbers().map((pageNum, idx) => (
                <PaginationItem key={pageNum >= 0 ? `page-${pageNum}` : `ellipsis-${idx}`}>
                  {pageNum === -1 || pageNum === -2 ? (
                    <PaginationEllipsis />
                  ) : (
                    <PaginationLink
                      onClick={() => onChangePage(pageNum)}
                      isActive={page === pageNum}
                      className="h-8 w-8 sm:h-9 sm:w-9"
                    >
                      {pageNum + 1}
                    </PaginationLink>
                  )}
                </PaginationItem>
              ))}
              
              <PaginationItem>
                <PaginationNext 
                  onClick={() => onChangePage(Math.min(totalPages - 1, page + 1))} 
                  aria-disabled={page >= totalPages - 1}
                  className="h-8 px-2 sm:px-4"
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
          
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">Rows per page:</span>
            <select
              className="h-8 rounded-md border border-input bg-background px-2 text-xs sm:text-sm min-w-[60px]"
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
