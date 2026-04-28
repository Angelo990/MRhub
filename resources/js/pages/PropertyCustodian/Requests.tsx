import React, { useEffect, useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import AppLayout from '@/layouts/app-layout';
import { DataTablePagination, DataTableToolbar } from '@/components/data-table-controls';
import {
    createActionsColumn,
    createDateColumn,
    createDepartmentColumn,
    createPurposeColumn,
    createRequestedByColumn,
    createStatusColumn,
} from '@/components/request-table-columns';
import { createCompactItemsColumn, RequestItemsDialog } from '@/components/request-items-view';
import { DataTableShell } from '@/components/data-table-shell';
import { useDataTable } from '@/hooks/use-data-table';
import { router, usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { BreadcrumbItem, SharedData } from '@/types';
import { exportRowsToCsv, exportRowsToExcel, exportRowsToPdf, printHtmlDocument } from '../../lib/document-export';

import {
    useReactTable,
    getCoreRowModel,
    getFilteredRowModel,
    getSortedRowModel,
    getPaginationRowModel,
} from '@tanstack/react-table';

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
    items: RequestItem[];
    delivery_receipt?: DeliveryReceipt;
    delivery_receipts?: DeliveryReceipt[];
}
interface Item {
    id: number;
    name: string;
    quantity: number;
    unit_price: number;
}
interface PageProps {
    requests: Request[];
    items: Item[];
    [key: string]: unknown;
}

interface RequestResponse {
    success: boolean;
    request: Request;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard/property-custodian' },
    { title: 'Requests', href: '/property-custodian/requests' },
];

export default function Requests() {
    const { requests, csrf_token } = usePage<SharedData & PageProps>().props;
    const [tableData, setTableData] = useState(requests);
    const [openReceipt, setOpenReceipt] = useState<number | null>(null);
    const [viewItemsRequest, setViewItemsRequest] = useState<number | null>(null);
    // Per-item release quantities indexed by RequestItem id
    const [releaseQtys, setReleaseQtys] = useState<Record<number, number>>({});
    // Per-item unit prices for custom items (PC-entered at release time)
    const [releaseUnitPrices, setReleaseUnitPrices] = useState<Record<number, string>>({});
    const [receiptForm, setReceiptForm] = useState({
        delivery_date: new Date().toISOString().slice(0, 10),
        prepared_by: '',
        checked_by: '',
        received_by: '',
    });
    const [error, setError] = useState<string | null>(null);
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
            if (processingId !== null || openReceipt !== null) {
                return;
            }

            router.reload({
                only: ['requests'],
            });
        }, 5000);

        return () => window.clearInterval(intervalId);
    }, [openReceipt, processingId]);

    const handleEndorse = async (id: number) => {
        setProcessingId(id);
        setError(null);

        try {
            const response = await fetch(`/property-custodian/requests/${id}/endorse`, {
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
                throw new Error(payload.error || payload.message || 'Failed to endorse request.');
            }

            const payload = (await response.json()) as RequestResponse;
            setTableData((current) => current.map((request) => request.id === payload.request.id ? payload.request : request));
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Failed to endorse request.');
        } finally {
            setProcessingId(null);
        }
    };
    const requestTotalValue = (req: { items: RequestItem[] }): number =>
        req.items.reduce((sum, item) => sum + (item.unit_price_at_request ?? 0) * item.quantity, 0);
    const handleOpenReceipt = (id: number) => {
        const req = tableData.find(r => r.id === id);
        // Pre-fill release quantities with remaining quantity per item (skip rejected)
        const initial: Record<number, number> = {};
        req?.items.forEach((item) => {
            if (!item.rejection_reason) {
                const fulfilled = item.quantity_fulfilled ?? 0;
                const remaining = Math.max(0, item.quantity - fulfilled);
                if (remaining > 0) initial[item.id] = remaining;
            }
        });
        setReleaseQtys(initial);
        // Pre-populate prices for custom items from saved unit_price_at_request if available
        const initialPrices: Record<number, string> = {};
        req?.items.forEach((item) => {
            if (item.is_custom && !item.rejection_reason) {
                initialPrices[item.id] = item.unit_price_at_request != null ? String(item.unit_price_at_request) : '';
            }
        });
        setReleaseUnitPrices(initialPrices);
        setReceiptForm({
            delivery_date: new Date().toISOString().slice(0, 10),
            prepared_by: '',
            checked_by: '',
            received_by: req?.requested_by || '',
        });
        setOpenReceipt(id);
    };

    const formatCurrency = (value: number) => `₱ ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const buildReceiptRows = (request: Request) => (request.delivery_receipt?.items ?? []).map((item) => ({
        Item: item.particular,
        Qty: item.quantity_delivered,
        Unit: item.unit,
        'Unit Price': item.unit_cost,
        Total: item.total,
    }));

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
                    <p><strong>Status:</strong> ${request.status}</p>
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

    const handleExportReceiptExcel = (request: Request) => {
        exportRowsToExcel(buildReceiptRows(request), 'Delivery Receipt', `delivery_receipt_${request.id}.xlsx`);
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
                { label: 'Status', value: request.status },
                { label: 'Total', value: formatCurrency(receipt.total) },
            ],
            ['Item', 'Qty', 'Unit', 'Unit Price', 'Total'],
            rows,
            `delivery_receipt_${request.id}.pdf`,
        );
    };
    const handleReceiptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setReceiptForm((prev) => ({ ...prev, [name]: value }));
    };
    const handleSubmitReceipt = async (id: number) => {
        setProcessingId(id);
        setError(null);

        const req = tableData.find((r) => r.id === id);

        // Build items array from releaseQtys (only entries with qty > 0)
        const itemsToRelease = Object.entries(releaseQtys)
            .filter(([, qty]) => qty > 0)
            .map(([requestItemId, qty]) => {
                const rid = Number(requestItemId);
                const reqItem = req?.items.find((i) => i.id === rid);
                const entry: { request_item_id: number; quantity_to_release: number; unit_price?: number } = {
                    request_item_id: rid,
                    quantity_to_release: qty,
                };
                if (reqItem?.is_custom) {
                    entry.unit_price = parseFloat(releaseUnitPrices[rid] ?? '');
                }
                return entry;
            });

        if (itemsToRelease.length === 0) {
            setError('Please enter a quantity for at least one item.');
            setProcessingId(null);
            return;
        }

        // Validate custom item prices
        for (const entry of itemsToRelease) {
            const reqItem = req?.items.find((i) => i.id === entry.request_item_id);
            if (reqItem?.is_custom && (entry.unit_price === undefined || isNaN(entry.unit_price) || entry.unit_price < 0)) {
                setError(`Please enter a valid unit price for custom item "${reqItem.particular}".`);
                setProcessingId(null);
                return;
            }
        }

        try {
            const response = await fetch(`/property-custodian/requests/${id}/delivery-receipt`, {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': csrf_token,
                },
                body: JSON.stringify({ ...receiptForm, items: itemsToRelease }),
            });

            if (!response.ok) {
                const payload = await response.json().catch(() => ({}));
                throw new Error(payload.error || payload.message || 'Failed to release items.');
            }

            const payload = (await response.json()) as RequestResponse;
            setTableData((current) => current.map((request) => request.id === payload.request.id ? payload.request : request));
            setOpenReceipt(null);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Failed to release items.');
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
            createCompactItemsColumn<Request>({
                formatCurrency,
                getTotalValue: requestTotalValue,
            }),
            createActionsColumn<Request>((req) => (
                <div className="flex flex-wrap gap-2 min-[391px]:min-w-[200px]">
                    <Button size="sm" variant="outline" onClick={() => setViewItemsRequest(req.id)}>
                        View Items
                    </Button>
                    <Button size="sm" variant="default" onClick={() => handleEndorse(req.id)} disabled={req.status !== 'Pending Endorsement' || processingId === req.id}>
                        Endorse
                    </Button>
                    {req.status === 'Approved' && (
                        <Button size="sm" variant="secondary" onClick={() => handleOpenReceipt(req.id)} disabled={processingId === req.id}>
                            Release Items
                        </Button>
                    )}
                    {req.status === 'Partially Released' && (
                        <Button size="sm" variant="secondary" onClick={() => handleOpenReceipt(req.id)} disabled={processingId === req.id}>
                            Release More
                        </Button>
                    )}
                    {(req.status === 'Released' || req.status === 'Partially Released') && req.delivery_receipt && (
                        <Button size="sm" variant="outline" onClick={() => setOpenReceipt(req.id)} disabled={processingId === req.id}>
                            View Receipt
                        </Button>
                    )}
                </div>
            )),
        ], [handleEndorse, handleOpenReceipt, processingId, requestTotalValue]);

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
            <AppLayout breadcrumbs={breadcrumbs}>
                <div className="flex flex-col gap-4 p-4 dark:bg-gray-900 dark:text-white">
                    <div className="flex items-center justify-between mb-2">
                        <h1 className="text-2xl font-bold">Pending Requests</h1>
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
                {/* ...existing code for Dialog, etc... */}
                {openReceipt && (() => {
                    const req = tableData.find(r => r.id === openReceipt);
                    const isViewMode = (req?.status === 'Released' || req?.status === 'Completed') && !!(req?.delivery_receipt || req?.delivery_receipts?.length);
                    const batches = req?.delivery_receipts ?? (req?.delivery_receipt ? [req.delivery_receipt] : []);
                    return (
                        <Dialog open={!!openReceipt} onOpenChange={() => setOpenReceipt(null)}>
                            <DialogContent className="flex w-[calc(100vw-1.5rem)] max-h-[85vh] max-w-4xl flex-col overflow-hidden p-0">
                                <DialogHeader className="sticky top-0 z-10 shrink-0 border-b border-border/70 bg-background px-4 py-3 pr-12 sm:px-6">
                                    <DialogTitle>{isViewMode ? 'Delivery Receipts' : 'Release Items'}</DialogTitle>
                                </DialogHeader>
                                <div
                                    data-modal-body
                                    className={`min-h-0 flex-1 px-4 py-4 sm:px-6 ${isViewMode ? 'overflow-y-auto' : 'flex flex-col overflow-hidden'}`}
                                >
                                {isViewMode ? (
                                    <div className="space-y-6">
                                        {batches.map((receipt, batchIdx) => (
                                            <div key={receipt.id} className="rounded-lg border border-border/70">
                                                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 bg-muted/30 px-4 py-2">
                                                    <span className="font-semibold text-sm">Batch #{batchIdx + 1} — Receipt #{receipt.id}</span>
                                                    <div className="flex gap-2">
                                                        <Button type="button" size="sm" variant="outline" onClick={() => handlePrintReceipt({ ...req!, delivery_receipt: receipt })}>Print</Button>
                                                        <Button type="button" size="sm" variant="secondary" onClick={() => handleExportReceiptExcel({ ...req!, delivery_receipt: receipt })}>Excel</Button>
                                                        <Button type="button" size="sm" variant="secondary" onClick={() => handleExportReceiptCsv({ ...req!, delivery_receipt: receipt })}>CSV</Button>
                                                        <Button type="button" size="sm" variant="secondary" onClick={() => handleExportReceiptPdf({ ...req!, delivery_receipt: receipt })}>PDF</Button>
                                                    </div>
                                                </div>
                                                <div className="px-4 py-3 text-sm space-y-1">
                                                    <div><strong>Delivery Date:</strong> {receipt.delivery_date}</div>
                                                    <div><strong>Prepared by:</strong> {receipt.prepared_by}</div>
                                                    <div><strong>Checked & Delivered by:</strong> {receipt.checked_by}</div>
                                                    <div><strong>Received by:</strong> {receipt.received_by}</div>
                                                    <div><strong>Batch Total:</strong> {formatCurrency(receipt.total)}</div>
                                                </div>
                                                <div className="overflow-x-auto px-4 pb-4">
                                                    <table className="w-full min-w-[520px] text-sm">
                                                        <thead className="bg-muted/30">
                                                            <tr>
                                                                <th className="px-3 py-2 text-left">Item</th>
                                                                <th className="px-3 py-2 text-right">Delivered</th>
                                                                <th className="px-3 py-2 text-left">Unit</th>
                                                                <th className="px-3 py-2 text-right">Unit Price</th>
                                                                <th className="px-3 py-2 text-right">Total</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {receipt.items?.map((item) => (
                                                                <tr key={item.id} className="border-t border-border/40">
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
                                        ))}
                                    </div>
                                ) : (
                                    <>
                                        {error && <div className="mb-2 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
                                        <form className="flex min-h-0 flex-1 flex-col gap-4" onSubmit={e => { e.preventDefault(); handleSubmitReceipt(openReceipt); }}>
                                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                                <div>
                                                    <label htmlFor="delivery_date" className="mb-1 block text-sm font-semibold">Delivery Date</label>
                                                    <input type="date" id="delivery_date" name="delivery_date" value={receiptForm.delivery_date} disabled className="w-full rounded border p-2 text-sm" title="Delivery Date" placeholder="Delivery Date" />
                                                </div>
                                                <div>
                                                    <label className="mb-1 block text-sm font-semibold">Prepared by</label>
                                                    <input type="text" name="prepared_by" value={receiptForm.prepared_by} onChange={handleReceiptChange} required placeholder="Prepared by" className="w-full rounded border p-2 text-sm" />
                                                </div>
                                                <div>
                                                    <label className="mb-1 block text-sm font-semibold">Checked & Delivered by</label>
                                                    <input type="text" name="checked_by" value={receiptForm.checked_by} onChange={handleReceiptChange} required placeholder="Checked & Delivered by" className="w-full rounded border p-2 text-sm" />
                                                </div>
                                                <div>
                                                    <label htmlFor="received_by" className="mb-1 block text-sm font-semibold">Received by</label>
                                                    <input type="text" id="received_by" name="received_by" value={receiptForm.received_by} onChange={handleReceiptChange} required className="w-full rounded border p-2 text-sm" title="Received by" placeholder="Received by" />
                                                </div>
                                            </div>

                                            <div className="min-h-0 flex flex-1 flex-col rounded border border-border/70 bg-muted/30 p-2">
                                                <div className="font-semibold mb-2 text-sm">Items to Release</div>
                                                <div className="min-h-0 flex-1 overflow-y-auto overflow-x-auto rounded border border-border/70 bg-background">
                                                    <table className="w-full min-w-[540px] text-sm">
                                                        <thead className="bg-muted/30">
                                                            <tr>
                                                                <th className="px-3 py-2 text-left">Item</th>
                                                                <th className="px-3 py-2 text-center">Status</th>
                                                                <th className="px-3 py-2 text-right">Progress</th>
                                                                <th className="px-3 py-2 text-right">Qty to Release</th>
                                                                <th className="px-3 py-2 text-right">Unit Price</th>
                                                                <th className="px-3 py-2 text-left">Unit</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {req?.items.map(item => {
                                                                const fulfilled = item.quantity_fulfilled ?? 0;
                                                                const remaining = Math.max(0, item.quantity - fulfilled);
                                                                const isRejected = !!item.rejection_reason;
                                                                return (
                                                                    <tr key={item.id} className={`border-t border-border/40 ${isRejected ? 'bg-red-50/60 dark:bg-red-950/10' : ''}`}>
                                                                        <td className="px-3 py-2">
                                                                            <span className={isRejected ? 'line-through text-muted-foreground' : ''}>{item.particular}</span>
                                                                            {item.is_custom && !isRejected && (
                                                                                <span className="ml-1.5 rounded-full bg-violet-100 px-1.5 py-0.5 text-xs text-violet-700">Custom</span>
                                                                            )}
                                                                            {isRejected && (
                                                                                <p className="text-xs text-red-600 mt-0.5">Rejected: {item.rejection_reason}</p>
                                                                            )}
                                                                        </td>
                                                                        <td className="px-3 py-2 text-center">
                                                                            {isRejected
                                                                                ? <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-xs text-red-700">Rejected</span>
                                                                                : fulfilled > 0
                                                                                    ? <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700">Partial</span>
                                                                                    : <span className="rounded-full bg-sky-100 px-1.5 py-0.5 text-xs text-sky-700">Pending</span>}
                                                                        </td>
                                                                        <td className="px-3 py-2 text-right text-muted-foreground">
                                                                            {fulfilled}/{item.quantity}
                                                                        </td>
                                                                        <td className="px-3 py-2 text-right">
                                                                            {isRejected ? (
                                                                                <span className="text-muted-foreground">—</span>
                                                                            ) : (
                                                                                <input
                                                                                    type="number"
                                                                                    min={0}
                                                                                    max={remaining}
                                                                                    value={releaseQtys[item.id] ?? 0}
                                                                                    onChange={(e) => setReleaseQtys((prev) => ({ ...prev, [item.id]: Math.min(remaining, Math.max(0, Number(e.target.value))) }))}
                                                                                    className="w-20 rounded border px-2 py-1 text-right text-sm"
                                                                                    title={`Max: ${remaining}`}
                                                                                />
                                                                            )}
                                                                        </td>
                                                                        <td className="px-3 py-2 text-right">
                                                                            {isRejected ? (
                                                                                <span className="text-muted-foreground">—</span>
                                                                            ) : item.is_custom ? (
                                                                                <input
                                                                                    type="number"
                                                                                    min={0}
                                                                                    step="0.01"
                                                                                    value={releaseUnitPrices[item.id] ?? ''}
                                                                                    onChange={(e) => setReleaseUnitPrices((prev) => ({ ...prev, [item.id]: e.target.value }))}
                                                                                    className="w-28 rounded border px-2 py-1 text-right text-sm"
                                                                                    placeholder="₱ 0.00"
                                                                                    title="Enter unit price for this custom item"
                                                                                    required={(releaseQtys[item.id] ?? 0) > 0}
                                                                                />
                                                                            ) : (
                                                                                <span className="text-muted-foreground text-xs">
                                                                                    {item.unit_price_at_request != null ? formatCurrency(item.unit_price_at_request) : '—'}
                                                                                </span>
                                                                            )}
                                                                        </td>
                                                                        <td className="px-3 py-2">{item.unit}</td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>

                                            <div className="shrink-0 flex flex-col justify-end gap-2 border-t border-border/70 bg-background pt-3 sm:flex-row">
                                                <Button type="submit" variant="default" disabled={processingId === openReceipt} className="w-full sm:w-auto">Release</Button>
                                                <Button type="button" variant="outline" onClick={() => setOpenReceipt(null)} className="w-full sm:w-auto">Cancel</Button>
                                            </div>
                                        </form>
                                    </>
                                )}
                                </div>
                            </DialogContent>
                        </Dialog>
                    );
                })()}
                    {/* View Items dialog */}
                    {viewItemsRequest && (() => {
                        const req = tableData.find(r => r.id === viewItemsRequest) ?? null;
                        return (
                            <RequestItemsDialog
                                request={req}
                                open={!!viewItemsRequest}
                                onOpenChange={(open) => {
                                    if (!open) setViewItemsRequest(null);
                                }}
                                formatCurrency={formatCurrency}
                                getTotalValue={requestTotalValue}
                            />
                        );
                    })()}
            </div>
        </AppLayout>
    );
}