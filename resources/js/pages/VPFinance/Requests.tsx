import React, { useEffect, useMemo, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { DataTablePagination, DataTableToolbar } from '@/components/data-table-controls';
import {
    createActionsColumn,
    createDateColumn,
    createDepartmentColumn,
    createItemsColumn,
    createPurposeColumn,
    createRequestedByColumn,
    createStatusColumn,
} from '@/components/request-table-columns';
import { DataTableShell } from '@/components/data-table-shell';
import { useDataTable } from '@/hooks/use-data-table';
import { usePage, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { SharedData } from '@/types';
import { exportRowsToCsv, exportRowsToExcel, exportRowsToPdf, printHtmlDocument } from '../../lib/document-export';

import {
    useReactTable,
    getCoreRowModel,
    getFilteredRowModel,
    getSortedRowModel,
    getPaginationRowModel,
} from '@tanstack/react-table';
import type { ColumnDef } from '@tanstack/react-table';

// Type definitions
interface Department {
    id: number;
    name: string;
}
interface RequestItem {
    id: number;
    item_id: number | null;
    quantity: number;
    particular: string;
    unit: string;
    is_custom: boolean;
    unit_price_at_request: number | null;
    rejection_reason: string | null;
    rejected_by: string | null;
    quantity_fulfilled: number;
}
interface Request {
    id: number;
    date: string;
    department: Department;
    purpose: string;
    requested_by: string;
    status: string;
    is_urgent: boolean;
    items: RequestItem[];
}
interface PageProps {
    requests: Request[];
}

interface RequestResponse {
    success: boolean;
    request: Request;
}

interface RejectionRow {
    id: number;
    particular: string;
    rejected: boolean;
    reason: string;
}

const formatCurrency = (v: number) =>
    `₱ ${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function Requests() {
    const { requests, csrf_token } = usePage<SharedData & PageProps>().props;
    const [tableData, setTableData] = useState(requests);
    const [processingId, setProcessingId] = useState<number | null>(null);
    const [reviewRequest, setReviewRequest] = useState<Request | null>(null);
    const [rejectionRows, setRejectionRows] = useState<RejectionRow[]>([]);
    const [reviewError, setReviewError] = useState<string | null>(null);

    const {
        globalFilter,
        sorting,
        pagination,
        setPagination,
        setSorting,
        handleSearchChange,
        handlePageSizeChange,
        getPaginationSummary,
        globalFilterFn,
    } = useDataTable<Request>();

    useEffect(() => {
        setTableData(requests);
    }, [requests]);

    useEffect(() => {
        const intervalId = window.setInterval(() => {
            if (processingId !== null || reviewRequest !== null) return;
            router.reload({ only: ['requests'] });
        }, 5000);
        return () => window.clearInterval(intervalId);
    }, [processingId, reviewRequest]);

    const openReview = (req: Request) => {
        setReviewRequest(req);
        setRejectionRows(req.items.map((item) => ({
            id: item.id,
            particular: item.particular,
            rejected: false,
            reason: '',
        })));
        setReviewError(null);
    };

    const closeReview = () => {
        setReviewRequest(null);
        setRejectionRows([]);
        setReviewError(null);
    };

    const toggleRejection = (idx: number) => {
        setRejectionRows((prev) => {
            const updated = [...prev];
            updated[idx] = { ...updated[idx], rejected: !updated[idx].rejected, reason: '' };
            return updated;
        });
    };

    const setReason = (idx: number, reason: string) => {
        setRejectionRows((prev) => {
            const updated = [...prev];
            updated[idx] = { ...updated[idx], reason };
            return updated;
        });
    };

    const handleApproveWithReview = async () => {
        if (!reviewRequest) return;

        // Validate: rejected rows must have a reason
        const invalidRow = rejectionRows.find((r) => r.rejected && !r.reason.trim());
        if (invalidRow) {
            setReviewError(`Please provide a rejection reason for "${invalidRow.particular}".`);
            return;
        }

        // All items rejected = full rejection, warn user
        const allRejected = rejectionRows.length > 0 && rejectionRows.every((r) => r.rejected);
        if (allRejected) {
            setReviewError('All items are marked for rejection. Use "Reject" to reject the entire request instead.');
            return;
        }

        const rejectedItems = rejectionRows
            .filter((r) => r.rejected)
            .map((r) => ({ id: r.id, reason: r.reason.trim() }));

        setProcessingId(reviewRequest.id);
        setReviewError(null);

        try {
            const response = await fetch(`/vp-finance/requests/${reviewRequest.id}/approve`, {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': csrf_token,
                },
                body: JSON.stringify({ rejected_items: rejectedItems }),
            });

            if (!response.ok) {
                const payload = await response.json().catch(() => ({}));
                throw new Error(payload.error || payload.message || 'Failed to approve request.');
            }

            const payload = (await response.json()) as RequestResponse;
            setTableData((current) => current.filter((r) => r.id !== payload.request.id));
            closeReview();
        } catch (err: unknown) {
            setReviewError(err instanceof Error ? err.message : 'An error occurred.');
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (id: number) => {
        setProcessingId(id);
        try {
            const response = await fetch(`/vp-finance/requests/${id}/reject`, {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': csrf_token,
                },
            });

            if (!response.ok) {
                const payload = await response.json().catch(() => ({}));
                throw new Error(payload.error || payload.message || 'Failed to reject request.');
            }

            const payload = (await response.json()) as RequestResponse;
            setTableData((current) => current.filter((request) => request.id !== payload.request.id));
        } finally {
            setProcessingId(null);
        }
    };

    const buildReportRows = () => tableData.map((request) => ({
        Date: request.date,
        Department: request.department.name,
        Purpose: request.purpose,
        'Requested By': request.requested_by,
        Status: request.status,
        Items: request.items.map((item) => `${item.particular} (${item.quantity} ${item.unit})`).join('; '),
    }));

    const handlePrintReport = () => {
        const rows = tableData.map((request) => `
            <tr>
                <td>${request.date}</td>
                <td>${request.department.name}</td>
                <td>${request.purpose}</td>
                <td>${request.requested_by}</td>
                <td>${request.status}</td>
                <td>${request.items.map((item) => `${item.particular} (${item.quantity} ${item.unit})`).join(', ')}</td>
            </tr>
        `).join('');

        printHtmlDocument(
            'VP Finance Requests Report',
            `
                <h1>VP Finance Requests Report</h1>
                <div class="meta">
                    <p><strong>Total Requests:</strong> ${tableData.length}</p>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Department</th>
                            <th>Purpose</th>
                            <th>Requested By</th>
                            <th>Status</th>
                            <th>Items</th>
                        </tr>
                    </thead>
                    <tbody>${rows || '<tr><td colspan="6">No requests found.</td></tr>'}</tbody>
                </table>
            `,
        );
    };

    const handleExportExcel = () => {
        exportRowsToExcel(buildReportRows(), 'VP Finance Requests', 'vp_finance_requests.xlsx');
    };

    const handleExportCsv = () => {
        exportRowsToCsv(buildReportRows(), 'vp_finance_requests.csv');
    };

    const handleExportPdf = () => {
        exportRowsToPdf(
            'VP Finance Requests Report',
            [{ label: 'Total Requests', value: tableData.length }],
            ['Date', 'Department', 'Purpose', 'Requested By', 'Status', 'Items'],
            tableData.map((request) => [
                request.date,
                request.department.name,
                request.purpose,
                request.requested_by,
                request.status,
                request.items.map((item) => `${item.particular} (${item.quantity} ${item.unit})`).join(', '),
            ]),
            'vp_finance_requests.pdf',
        );
    };

    const columns: ColumnDef<Request>[] = useMemo(() => [
        createDateColumn<Request>(),
        createDepartmentColumn<Request>(),
        createPurposeColumn<Request>(),
        createRequestedByColumn<Request>(),
        createStatusColumn<Request>(),
        createItemsColumn<Request>(),
        createActionsColumn<Request>((req) => (
            <div className="flex flex-wrap gap-2 min-[391px]:min-w-[180px]">
                <Button size="sm" variant="default" onClick={() => openReview(req)} disabled={processingId === req.id}>
                    Review & Approve
                </Button>
                <Button size="sm" variant="destructive" onClick={() => handleReject(req.id)} disabled={processingId === req.id}>
                    Reject
                </Button>
            </div>
        )),
    ], [handleReject, processingId]);

    const table = useReactTable({
        data: tableData,
        columns,
        state: { globalFilter, sorting, pagination },
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        onGlobalFilterChange: handleSearchChange,
        onSortingChange: setSorting,
        onPaginationChange: setPagination,
        globalFilterFn,
    });

    const { totalRows, totalPages, showingFrom, showingTo } = getPaginationSummary(table);

    return (
        <AppLayout>
            <div className="flex flex-col gap-4 p-4 dark:bg-gray-900 dark:text-white">
                <div className="mb-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <h1 className="text-2xl font-bold">Requests for Approval</h1>
                    <div className="flex flex-wrap gap-2 max-sm:[&>button]:flex-1">
                        <Button type="button" variant="outline" onClick={handlePrintReport}>Print</Button>
                        <Button type="button" variant="secondary" onClick={handleExportExcel}>Excel</Button>
                        <Button type="button" variant="secondary" onClick={handleExportCsv}>CSV</Button>
                        <Button type="button" variant="secondary" onClick={handleExportPdf}>PDF</Button>
                    </div>
                </div>
                <DataTableToolbar
                    pageSize={pagination.pageSize}
                    onPageSizeChange={handlePageSizeChange}
                    searchValue={globalFilter}
                    onSearchChange={handleSearchChange}
                />
                <DataTableShell table={table} emptyColSpan={columns.length} emptyMessage="No requests found." />
                <DataTablePagination
                    showingFrom={showingFrom}
                    showingTo={showingTo}
                    totalRows={totalRows}
                    itemLabel="requests"
                    onFirst={() => table.setPageIndex(0)}
                    onPrev={() => table.previousPage()}
                    onNext={() => table.nextPage()}
                    onLast={() => table.setPageIndex(totalPages - 1)}
                    canPrevious={table.getCanPreviousPage()}
                    canNext={table.getCanNextPage()}
                />

                {/* Item Review & Approve Dialog */}
                {reviewRequest && (
                    <Dialog open={!!reviewRequest} onOpenChange={closeReview}>
                        <DialogContent className="flex w-[calc(100vw-1.5rem)] max-h-[90vh] max-w-3xl flex-col overflow-hidden p-0">
                            <DialogHeader className="sticky top-0 z-10 shrink-0 border-b border-border/70 bg-background px-4 py-3 pr-12 sm:px-6">
                                <DialogTitle>Review Items — Request #{reviewRequest.id}</DialogTitle>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Optionally mark items for rejection with a reason. Non-rejected items will proceed.
                                </p>
                            </DialogHeader>

                            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
                                {reviewError && (
                                    <div className="mb-3 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{reviewError}</div>
                                )}

                                <div className="mb-3 grid grid-cols-2 gap-2 rounded-lg border border-border/60 bg-muted/30 px-4 py-3 text-sm sm:grid-cols-4">
                                    <div><span className="text-muted-foreground">Date</span><br /><strong>{reviewRequest.date}</strong></div>
                                    <div><span className="text-muted-foreground">Department</span><br /><strong>{reviewRequest.department.name}</strong></div>
                                    <div><span className="text-muted-foreground">Requested by</span><br /><strong>{reviewRequest.requested_by}</strong></div>
                                    <div><span className="text-muted-foreground">Purpose</span><br /><strong>{reviewRequest.purpose}</strong></div>
                                </div>

                                <div className="space-y-2">
                                    {rejectionRows.map((row, idx) => {
                                        const item = reviewRequest.items.find((i) => i.id === row.id)!;
                                        const unitPrice = item.unit_price_at_request;
                                        return (
                                            <div
                                                key={row.id}
                                                className={`rounded-lg border p-3 transition-colors ${row.rejected ? 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/20' : 'border-border bg-card'}`}
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0 flex-1">
                                                        <p className={`font-medium ${row.rejected ? 'text-red-700 line-through dark:text-red-400' : ''}`}>
                                                            {item.particular}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {item.quantity} {item.unit}
                                                            {unitPrice != null && ` · ${formatCurrency(unitPrice)} each`}
                                                            {item.is_custom && <span className="ml-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700">Custom</span>}
                                                        </p>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleRejection(idx)}
                                                        className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${row.rejected ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-muted text-muted-foreground hover:bg-red-100 hover:text-red-700'}`}
                                                    >
                                                        {row.rejected ? 'Undo Reject' : 'Reject'}
                                                    </button>
                                                </div>
                                                {row.rejected && (
                                                    <div className="mt-2">
                                                        <input
                                                            type="text"
                                                            placeholder="Reason for rejection (required)..."
                                                            value={row.reason}
                                                            onChange={(e) => setReason(idx, e.target.value)}
                                                            className="w-full rounded border border-red-300 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-red-400 dark:bg-gray-900"
                                                            autoFocus
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                {rejectionRows.some((r) => r.rejected) && (
                                    <p className="mt-3 text-xs text-amber-600">
                                        {rejectionRows.filter((r) => r.rejected).length} item(s) will be rejected.
                                        The remaining {rejectionRows.filter((r) => !r.rejected).length} item(s) will be approved.
                                    </p>
                                )}
                            </div>

                            <div className="shrink-0 border-t border-border/70 bg-background px-4 py-3 sm:px-6">
                                <div className="flex justify-end gap-2">
                                    <Button variant="outline" onClick={closeReview} disabled={processingId === reviewRequest.id}>
                                        Cancel
                                    </Button>
                                    <Button
                                        variant="default"
                                        onClick={handleApproveWithReview}
                                        disabled={processingId === reviewRequest.id}
                                    >
                                        {processingId === reviewRequest.id ? 'Processing…' : 'Approve Request'}
                                    </Button>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                )}
            </div>
        </AppLayout>
    );
}