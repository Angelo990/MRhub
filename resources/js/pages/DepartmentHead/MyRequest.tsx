import React, { useEffect, useMemo, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { DataTablePagination, DataTableToolbar } from '@/components/data-table-controls';
import {
    createActionsColumn,
    createDateColumn,
    createDepartmentColumn,
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
    item_id: number | null;
    quantity: number;
    particular: string;
    unit: string;
    is_custom?: boolean;
    unit_price_at_request?: number | null;
    rejection_reason?: string | null;
    rejected_by?: string | null;
    quantity_fulfilled?: number;
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
    is_urgent: boolean;
    locked_at: string | null;
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
    const [viewItemsRequest, setViewItemsRequest] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const formatCurrency = (value: number) => `₱ ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const requestTotalValue = (req: Request): number =>
        req.items.reduce((sum, item) => sum + (item.unit_price_at_request ?? 0) * item.quantity, 0);
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
            {
                id: 'items',
                header: () => 'Items',
                enableSorting: false,
                cell: ({ row }) => {
                    const req = row.original;
                    const total = requestTotalValue(req);
                    if (req.items.length === 0) return <span className="text-muted-foreground text-sm">—</span>;
                    if (req.items.length === 1) {
                        const item = req.items[0];
                        return (
                            <div className="text-sm">
                                <span className="font-medium">{item.particular}</span>
                                {item.is_custom && <span className="ml-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700">Custom</span>}
                                <div className="text-muted-foreground">{item.quantity} {item.unit}{total > 0 ? ` · ${formatCurrency(total)}` : ''}</div>
                            </div>
                        );
                    }
                    return (
                        <div className="flex flex-col gap-1">
                            <span className="text-sm">{req.items.length} items{total > 0 ? ` · ${formatCurrency(total)}` : ''}</span>
                            <Button size="sm" variant="outline" className="h-6 px-2 text-xs" onClick={() => setViewItemsRequest(req.id)}>View Items</Button>
                        </div>
                    );
                },
            },
            createActionsColumn<Request>((req) => (
                <div className="flex flex-wrap gap-2 min-[391px]:min-w-[220px]">
                    {req.status === 'Pending Endorsement' && !req.locked_at && (
                        <Button size="sm" variant="outline" onClick={() => router.visit(`/department-head/requests/${req.id}/edit`)}>
                            Edit
                        </Button>
                    )}
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
        ], [handleMarkReceived, loading, requestTotalValue]);

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
                        <h1 className="text-2xl font-bold">My Requests</h1>
                        <Button variant="default" onClick={() => router.visit('/department-head/requests/create')} className="w-full sm:w-auto">
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
                            <DialogContent className="flex w-[calc(100vw-1.5rem)] max-h-[85vh] max-w-4xl flex-col overflow-hidden p-0">
                                <DialogHeader className="sticky top-0 z-10 shrink-0 border-b border-border/70 bg-background px-4 py-3 pr-12 sm:px-6">
                                    <DialogTitle>Delivery Receipt</DialogTitle>
                                </DialogHeader>
                                <div data-modal-body className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
                                {receipt ? (
                                    <div className="space-y-3">
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
                                        <div data-receipt-table-wrapper className="max-h-[38vh] overflow-y-auto overflow-x-auto rounded border border-border/70 bg-background md:overflow-x-hidden">
                                            <table className="w-full min-w-[640px] text-sm md:min-w-0">
                                                <thead className="bg-muted/30">
                                                    <tr>
                                                        <th className="px-3 py-2 text-left">Item</th>
                                                        <th className="px-3 py-2 text-right">Qty</th>
                                                        <th className="px-3 py-2 text-left">Unit</th>
                                                        <th className="px-3 py-2 text-right">Unit Price</th>
                                                        <th className="px-3 py-2 text-right">Total</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {receipt.items?.map((item: ReceiptItem) => (
                                                        <tr key={item.id}>
                                                            <td className="px-3 py-2">{item.particular}</td>
                                                            <td className="px-3 py-2 text-right">{item.quantity_delivered}</td>
                                                            <td className="px-3 py-2">{item.unit}</td>
                                                            <td className="px-3 py-2 text-right">{formatCurrency(item.unit_cost)}</td>
                                                            <td className="px-3 py-2 text-right">{formatCurrency(item.total)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                ) : (
                                    <div>No receipt found.</div>
                                )}
                                </div>
                            </DialogContent>
                        </Dialog>
                    );
                })()}
                    {/* View Items dialog */}
                    {viewItemsRequest && (() => {
                        const req = tableData.find(r => r.id === viewItemsRequest);
                        if (!req) return null;
                        const total = requestTotalValue(req);
                        return (
                            <Dialog open={!!viewItemsRequest} onOpenChange={() => setViewItemsRequest(null)}>
                                <DialogContent className="flex w-[calc(100vw-1.5rem)] max-h-[85vh] max-w-3xl lg:max-w-5xl flex-col overflow-hidden p-0">
                                    <DialogHeader className="sticky top-0 z-10 shrink-0 border-b border-border/70 bg-background px-4 py-3 pr-12 sm:px-6">
                                        <DialogTitle>Items — Request #{req.id}</DialogTitle>
                                    </DialogHeader>
                                    <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-6">
                                        <div className="overflow-x-auto rounded border border-border/70 bg-background">
                                            <table className="w-full min-w-[520px] text-sm">
                                                <thead className="bg-muted/30">
                                                    <tr>
                                                        <th className="px-3 py-2 text-left">Item</th>
                                                        <th className="px-3 py-2 text-center">Type</th>
                                                        <th className="px-3 py-2 text-right">Progress</th>
                                                        <th className="px-3 py-2 text-left">Unit</th>
                                                        <th className="px-3 py-2 text-right">Unit Price</th>
                                                        <th className="px-3 py-2 text-right">Est. Total</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {req.items.map((item) => {
                                                        const fulfilled = item.quantity_fulfilled ?? 0;
                                                        const isRejected = !!item.rejection_reason;
                                                        return (
                                                        <tr key={item.id} className={`border-t border-border/40 ${isRejected ? 'bg-red-50/50 dark:bg-red-950/10' : ''}`}>
                                                            <td className="px-3 py-2">
                                                                <span className={isRejected ? 'line-through text-muted-foreground' : ''}>{item.particular}</span>
                                                                {isRejected && (
                                                                    <p className="mt-0.5 text-xs text-red-600">
                                                                        Rejected by {item.rejected_by}: {item.rejection_reason}
                                                                    </p>
                                                                )}
                                                            </td>
                                                            <td className="px-3 py-2 text-center">
                                                                {isRejected
                                                                    ? <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-xs text-red-700">Rejected</span>
                                                                    : item.is_custom
                                                                        ? <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700">Custom</span>
                                                                        : <span className="rounded-full bg-sky-100 px-1.5 py-0.5 text-xs text-sky-700">Inventory</span>}
                                                            </td>
                                                            <td className="px-3 py-2 text-right">
                                                                {isRejected
                                                                    ? <span className="text-muted-foreground">—</span>
                                                                    : <span className={fulfilled >= item.quantity ? 'font-semibold text-emerald-600' : fulfilled > 0 ? 'text-amber-600' : ''}>{fulfilled}/{item.quantity}</span>}
                                                            </td>
                                                            <td className="px-3 py-2">{item.unit}</td>
                                                            <td className="px-3 py-2 text-right">{item.unit_price_at_request != null ? formatCurrency(item.unit_price_at_request) : '—'}</td>
                                                            <td className="px-3 py-2 text-right font-medium">{item.unit_price_at_request != null ? formatCurrency(item.unit_price_at_request * item.quantity) : '—'}</td>
                                                        </tr>
                                                        );
                                                    })}
                                                </tbody>
                                                {total > 0 && (
                                                    <tfoot className="border-t-2 border-border">
                                                        <tr>
                                                            <td colSpan={5} className="px-3 py-2 text-right font-semibold">Total Estimated Value</td>
                                                            <td className="px-3 py-2 text-right font-bold">{formatCurrency(total)}</td>
                                                        </tr>
                                                    </tfoot>
                                                )}
                                            </table>
                                        </div>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        );
                    })()}
            </div>
        </AppLayout>
    );
}
