import React, { useEffect, useMemo, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { DataTablePagination, DataTableToolbar } from '@/components/data-table-controls';
import {
    createActionsColumn,
    createDateColumn,
    createDepartmentColumn,
    createItemsColumn,
    createPurposeColumn,
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

interface RequestItem {
    id: number;
    item_id: number;
    quantity: number;
    particular: string;
    unit: string;
}
interface Department {
    id: number;
    name: string;
}
interface ReceiptItem {
    id: number;
    particular: string;
    quantity_delivered: number;
    unit: string;
    unit_cost: number;
    total: number;
}
interface DeliveryReceipt {
    id: number;
    delivery_date: string;
    prepared_by: string;
    checked_by: string;
    received_by: string;
    status: string;
    total: number;
    items?: ReceiptItem[];
}
interface Request {
    id: number;
    date: string;
    department: Department;
    purpose: string;
    requested_by: string;
    status: string;
    items: RequestItem[];
    delivery_receipt?: DeliveryReceipt;
}
interface PageProps {
    requests: Request[];
}

interface RequestResponse {
    success: boolean;
    request: Request;
}

export default function MyRequest() {
    const { requests, csrf_token } = usePage<SharedData & PageProps>().props;
    const [tableData, setTableData] = useState(requests);
    const [openReceipt, setOpenReceipt] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
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

    const getDisplayStatus = (status: string) => {
        if (status === 'Ready for Pickup') {
            return 'Released';
        }

        if (status === 'Completed') {
            return 'Completed / Received';
        }

        return status;
    };

    const formatCurrency = (value: number) => `₱ ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const handleExportReceipt = (request: Request) => {
        if (!request.delivery_receipt) {
            return;
        }

        exportRowsToExcel(
            buildReceiptRows(request),
            'Delivery Receipt',
            `delivery_receipt_${request.id}.xlsx`,
        );
    };

    const handleExportReceiptCsv = (request: Request) => {
        exportRowsToCsv(buildReceiptRows(request), `delivery_receipt_${request.id}.csv`);
    };

    const handleExportReceiptPdf = (request: Request) => {
        if (!request.delivery_receipt) {
            return;
        }

        const receipt = request.delivery_receipt;
        const rows = (receipt.items ?? []).map((item) => [
            item.particular,
            item.quantity_delivered,
            item.unit,
            formatCurrency(item.unit_cost),
            formatCurrency(item.total),
        ]);

        exportRowsToPdf(
            `Delivery Receipt #${receipt.id}`,
            [
                { label: 'Request ID', value: request.id },
                { label: 'Delivery Date', value: receipt.delivery_date },
                { label: 'Prepared by', value: receipt.prepared_by },
                { label: 'Checked & Delivered by', value: receipt.checked_by },
                { label: 'Received by', value: receipt.received_by },
                { label: 'Status', value: getDisplayStatus(request.status) },
                { label: 'Total', value: formatCurrency(receipt.total) },
            ],
            ['Item', 'Qty', 'Unit', 'Unit Price', 'Total'],
            rows,
            `delivery_receipt_${request.id}.pdf`,
        );
    };

    const handlePrintReceipt = (request: Request) => {
        if (!request.delivery_receipt) {
            return;
        }

        const receipt = request.delivery_receipt;
        const rows = (receipt.items ?? []).map((item) => `
            <tr>
                <td>${item.particular}</td>
                <td>${item.quantity_delivered}</td>
                <td>${item.unit}</td>
                <td>${formatCurrency(item.unit_cost)}</td>
                <td>${formatCurrency(item.total)}</td>
            </tr>
        `).join('');

        printHtmlDocument(
            `Delivery Receipt #${receipt.id}`,
            `
                <h1>Delivery Receipt</h1>
                <div class="meta">
                    <p><strong>Request ID:</strong> ${request.id}</p>
                    <p><strong>Delivery Date:</strong> ${receipt.delivery_date}</p>
                    <p><strong>Prepared by:</strong> ${receipt.prepared_by}</p>
                    <p><strong>Checked & Delivered by:</strong> ${receipt.checked_by}</p>
                    <p><strong>Received by:</strong> ${receipt.received_by}</p>
                    <p><strong>Status:</strong> ${getDisplayStatus(request.status)}</p>
                    <p><strong>Total:</strong> ${formatCurrency(receipt.total)}</p>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Item</th>
                            <th>Qty</th>
                            <th>Unit</th>
                            <th>Unit Price</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>${rows || '<tr><td colspan="5">No receipt items found.</td></tr>'}</tbody>
                </table>
            `,
        );
    };

    const buildReceiptRows = (request: Request) => (request.delivery_receipt?.items ?? []).map((item) => ({
        Item: item.particular,
        Qty: item.quantity_delivered,
        Unit: item.unit,
        'Unit Price': item.unit_cost,
        Total: item.total,
    }));

    const handleMarkReceived = async (id: number) => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`/department-head/requests/${id}/received`, {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': csrf_token,
                },
                body: JSON.stringify({}),
            });

            if (!response.ok) {
                const payload = await response.json().catch(() => ({}));
                throw new Error(payload.error || payload.message || 'Failed to mark as received.');
            }

            const payload = (await response.json()) as RequestResponse;
            setTableData((current) => current.map((request) => request.id === payload.request.id ? payload.request : request));
        } catch (e: unknown) {
            if (e instanceof Error) {
                setError(e.message);
            } else {
                setError('Failed to mark as received.');
            }
        }
        setLoading(false);
    };
        // --- DataTable columns ---
        const columns: ColumnDef<Request>[] = useMemo(() => [
            createDateColumn<Request>(),
            createDepartmentColumn<Request>(),
            createPurposeColumn<Request>(),
            createStatusColumn<Request>(),
            createItemsColumn<Request>(),
            createActionsColumn<Request>((req) => (
                <div className="flex gap-2">
                    {(req.status === 'Ready for Pickup' || req.status === 'Released') && (
                        <>
                            <Button size="sm" variant="default" onClick={() => handleMarkReceived(req.id)} disabled={loading}>
                                Mark as Received
                            </Button>
                            <Button size="sm" variant="secondary" onClick={() => setOpenReceipt(req.id)}>
                                View Receipt
                            </Button>
                        </>
                    )}
                    {req.status === 'Completed' && (
                        <Button size="sm" variant="secondary" onClick={() => setOpenReceipt(req.id)}>
                            View Receipt
                        </Button>
                    )}
                </div>
            )),
        ], [handleMarkReceived, loading]);

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
                        <h1 className="text-2xl font-bold">My Requests</h1>
                        <Button variant="default" onClick={() => router.visit('/department-head/requests/create')}>
                            Create Request
                        </Button>
                    </div>
                    {error && <div className="text-red-500 mb-2">{error}</div>}
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
                    {/* ...existing code for Dialog, etc... */}
                {openReceipt && (() => {
                    const req = tableData.find(r => r.id === openReceipt);
                    const receipt = req?.delivery_receipt;
                    return (
                        <Dialog open={!!openReceipt} onOpenChange={() => setOpenReceipt(null)}>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Delivery Receipt</DialogTitle>
                                </DialogHeader>
                                {receipt ? (
                                    <div className="space-y-2">
                                        <div className="flex flex-wrap justify-end gap-2 max-sm:[&>button]:flex-1">
                                            <Button type="button" variant="outline" onClick={() => handlePrintReceipt(req)}>
                                                Print
                                            </Button>
                                            <Button type="button" variant="secondary" onClick={() => handleExportReceipt(req)}>
                                                Export Excel
                                            </Button>
                                            <Button type="button" variant="secondary" onClick={() => handleExportReceiptCsv(req)}>
                                                Export CSV
                                            </Button>
                                            <Button type="button" variant="secondary" onClick={() => handleExportReceiptPdf(req)}>
                                                Export PDF
                                            </Button>
                                        </div>
                                        <div><strong>Delivery Date:</strong> {receipt.delivery_date}</div>
                                        <div><strong>Prepared by:</strong> {receipt.prepared_by}</div>
                                        <div><strong>Checked & Delivered by:</strong> {receipt.checked_by}</div>
                                        <div><strong>Received by:</strong> {receipt.received_by}</div>
                                        <div><strong>Status:</strong> {getDisplayStatus(req.status)}</div>
                                        <div><strong>Total:</strong> {formatCurrency(receipt.total)}</div>
                                        <div className="font-semibold mt-2">Items</div>
                                        <div className="overflow-x-auto rounded border">
                                            <table className="min-w-[640px] text-sm">
                                                <thead>
                                                    <tr>
                                                        <th className="px-2 py-1">Item</th>
                                                        <th className="px-2 py-1">Qty</th>
                                                        <th className="px-2 py-1">Unit</th>
                                                        <th className="px-2 py-1">Unit Price</th>
                                                        <th className="px-2 py-1">Total</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {receipt.items?.map((item: ReceiptItem) => (
                                                        <tr key={item.id}>
                                                            <td className="px-2 py-1">{item.particular}</td>
                                                            <td className="px-2 py-1">{item.quantity_delivered}</td>
                                                            <td className="px-2 py-1">{item.unit}</td>
                                                            <td className="px-2 py-1">{item.unit_cost}</td>
                                                            <td className="px-2 py-1">{item.total}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                ) : (
                                    <div>No receipt found.</div>
                                )}
                            </DialogContent>
                        </Dialog>
                    );
                })()}
            </div>
        </AppLayout>
    );
}
