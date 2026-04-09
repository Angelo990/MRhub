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
    item_id: number;
    quantity: number;
    particular: string;
    unit: string;
}
interface Request {
    id: number;
    date: string;
    department: Department;
    purpose: string;
    requested_by: string;
    status: string;
    items: RequestItem[];
}
interface PageProps {
    requests: Request[];
}

interface RequestResponse {
    success: boolean;
    request: Request;
}

export default function Requests() {
    // Main component logic starts here
    const { requests, csrf_token } = usePage<SharedData & PageProps>().props;
    const [tableData, setTableData] = useState(requests);
    const [processingId, setProcessingId] = useState<number | null>(null);
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
            if (processingId !== null) {
                return;
            }

            router.reload({
                only: ['requests'],
            });
        }, 5000);

        return () => window.clearInterval(intervalId);
    }, [processingId]);

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

    const handleApprove = async (id: number) => {
        setProcessingId(id);

        try {
            const response = await fetch(`/vp-finance/requests/${id}/approve`, {
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
                throw new Error(payload.error || payload.message || 'Failed to approve request.');
            }

            const payload = (await response.json()) as RequestResponse;
            setTableData((current) => current.filter((request) => request.id !== payload.request.id));
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
        // --- DataTable columns ---
        const columns: ColumnDef<Request>[] = useMemo(() => [
            createDateColumn<Request>(),
            createDepartmentColumn<Request>(),
            createPurposeColumn<Request>(),
            createRequestedByColumn<Request>(),
            createStatusColumn<Request>(),
            createItemsColumn<Request>(),
            createActionsColumn<Request>((req) => (
                <div className="flex gap-2">
                    <Button size="sm" variant="default" onClick={() => handleApprove(req.id)} disabled={processingId === req.id}>Approve</Button>
                    <Button size="sm" variant="destructive" onClick={() => handleReject(req.id)} disabled={processingId === req.id}>Reject</Button>
                </div>
            )),
        ], [handleApprove, handleReject, processingId]);

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
                    <div className="flex items-center justify-between mb-2">
                        <h1 className="text-2xl font-bold">Requests for Approval</h1>
                        <div className="flex gap-2">
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
                </div>
            </AppLayout>
        );
}