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
import { DataTableShell } from '@/components/data-table-shell';
import { useDataTable } from '@/hooks/use-data-table';
import { router, usePage } from '@inertiajs/react';
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

interface RequestItem {
    id: number;
    item_id: number | null;
    quantity: number;
    particular: string;
    unit: string;
    is_custom?: boolean;
    unit_price_at_request?: number | null;
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
    items: RequestItem[];
    delivery_receipt?: DeliveryReceipt;
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

export default function Requests() {
    const { requests, items, csrf_token } = usePage<SharedData & PageProps>().props;
    const [tableData, setTableData] = useState(requests);
    const [openReceipt, setOpenReceipt] = useState<number | null>(null);
    const [viewItemsRequest, setViewItemsRequest] = useState<number | null>(null);
    const [receiptForm, setReceiptForm] = useState({
        delivery_date: new Date().toISOString().slice(0, 10),
        prepared_by: '',
        checked_by: '',
        received_by: '',
        total: '',
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
    const itemsList: Item[] = items || [];
    const getUnitPrice = (itemId: number) => {
        const found = itemsList.find(i => i.id === itemId);
        return found ? found.unit_price : 0;
    };
    const requestTotalValue = (req: { items: RequestItem[] }): number =>
        req.items.reduce((sum, item) => sum + (item.unit_price_at_request ?? 0) * item.quantity, 0);
    const handleOpenReceipt = (id: number) => {
        const req = tableData.find(r => r.id === id);
        setReceiptForm({
            delivery_date: new Date().toISOString().slice(0, 10),
            prepared_by: '',
            checked_by: '',
            received_by: req?.delivery_receipt?.received_by || req?.requested_by || '',
            total: req ? req.items.reduce((sum, item) => sum + (item.quantity * getUnitPrice(item.item_id ?? 0)), 0).toString() : '',
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
                body: JSON.stringify(receiptForm),
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
                <div className="flex flex-wrap gap-2 min-[391px]:min-w-[200px]">
                    <Button size="sm" variant="default" onClick={() => handleEndorse(req.id)} disabled={req.status !== 'Pending Endorsement' || processingId === req.id}>
                        Endorse
                    </Button>
                    {req.status === 'Approved' && (
                        <Button size="sm" variant="secondary" onClick={() => handleOpenReceipt(req.id)} disabled={processingId === req.id}>
                            Release Items
                        </Button>
                    )}
                    {req.status === 'Released' && req.delivery_receipt && (
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
            <AppLayout>
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
                    const isReleasedReceipt = req?.status === 'Released' && req.delivery_receipt;
                    return (
                        <Dialog open={!!openReceipt} onOpenChange={() => setOpenReceipt(null)}>
                            <DialogContent className="flex w-[calc(100vw-1.5rem)] max-h-[85vh] max-w-4xl flex-col overflow-hidden p-0">
                                <DialogHeader className="sticky top-0 z-10 shrink-0 border-b border-border/70 bg-background px-4 py-3 pr-12 sm:px-6">
                                    <DialogTitle>{isReleasedReceipt ? 'Delivery Receipt' : 'Release Items'}</DialogTitle>
                                </DialogHeader>
                                <div
                                    data-modal-body
                                    className={`min-h-0 flex-1 px-4 py-4 sm:px-6 ${isReleasedReceipt ? 'overflow-y-auto' : 'flex flex-col overflow-hidden'}`}
                                >
                                {isReleasedReceipt && req.delivery_receipt ? (
                                    <div className="space-y-3">
                                        <div className="flex flex-wrap justify-end gap-2 max-sm:[&>button]:flex-1">
                                            <Button type="button" variant="outline" onClick={() => handlePrintReceipt(req)}>
                                                Print
                                            </Button>
                                            <Button type="button" variant="secondary" onClick={() => handleExportReceiptExcel(req)}>
                                                Export Excel
                                            </Button>
                                            <Button type="button" variant="secondary" onClick={() => handleExportReceiptCsv(req)}>
                                                Export CSV
                                            </Button>
                                            <Button type="button" variant="secondary" onClick={() => handleExportReceiptPdf(req)}>
                                                Export PDF
                                            </Button>
                                        </div>
                                        <div><strong>Delivery Date:</strong> {req.delivery_receipt.delivery_date}</div>
                                        <div><strong>Prepared by:</strong> {req.delivery_receipt.prepared_by}</div>
                                        <div><strong>Checked & Delivered by:</strong> {req.delivery_receipt.checked_by}</div>
                                        <div><strong>Received by:</strong> {req.delivery_receipt.received_by}</div>
                                        <div><strong>Status:</strong> {req.status}</div>
                                        <div><strong>Total:</strong> {formatCurrency(req.delivery_receipt.total)}</div>
                                        <div data-receipt-table-wrapper className="overflow-x-auto rounded border border-border/70 bg-background md:overflow-x-visible">
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
                                                    {req.delivery_receipt.items?.map((item) => (
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
                                    <>
                                        {error && <div className="text-red-500 mb-2">{error}</div>}
                                        <form className="flex min-h-0 flex-1 flex-col gap-4" onSubmit={e => { e.preventDefault(); handleSubmitReceipt(openReceipt); }}>
                                            <label htmlFor="delivery_date" className="font-semibold">Delivery Date</label>
                                            <input type="date" id="delivery_date" name="delivery_date" value={receiptForm.delivery_date} disabled className="border rounded p-2" title="Delivery Date" placeholder="Delivery Date" />
                                            <input type="text" name="prepared_by" value={receiptForm.prepared_by} onChange={handleReceiptChange} required placeholder="Prepared by" className="border rounded p-2" />
                                            <input type="text" name="checked_by" value={receiptForm.checked_by} onChange={handleReceiptChange} required placeholder="Checked & Delivered by" className="border rounded p-2" />
                                            <label htmlFor="received_by" className="font-semibold">Received by</label>
                                            <input type="text" id="received_by" name="received_by" value={receiptForm.received_by} onChange={handleReceiptChange} required className="border rounded p-2" title="Received by" placeholder="Received by" />
                                            <div className="min-h-0 flex flex-1 flex-col rounded border border-border/70 bg-muted/30 p-2">
                                                <div className="font-semibold mb-2">Items</div>
                                                <div data-receipt-table-wrapper className="min-h-0 flex-1 overflow-y-auto overflow-x-auto rounded border border-border/70 bg-background md:overflow-x-hidden">
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
                                                            {req?.items.map(item => (
                                                                <tr key={item.id}>
                                                                    <td className="px-3 py-2">{item.particular}</td>
                                                                    <td className="px-3 py-2 text-right">{item.quantity}</td>
                                                                    <td className="px-3 py-2">{item.unit}</td>
                                                                    <td className="px-3 py-2 text-right">{formatCurrency(getUnitPrice(item.item_id ?? 0))}</td>
                                                                    <td className="px-3 py-2 text-right">{formatCurrency(item.quantity * getUnitPrice(item.item_id ?? 0))}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                            <label htmlFor="total" className="font-semibold">Total</label>
                                            <input type="number" id="total" name="total" value={receiptForm.total} disabled placeholder="Total" className="border rounded p-2" title="Total" />
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
                                                        <th className="px-3 py-2 text-right">Qty</th>
                                                        <th className="px-3 py-2 text-left">Unit</th>
                                                        <th className="px-3 py-2 text-right">Unit Price</th>
                                                        <th className="px-3 py-2 text-right">Est. Total</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {req.items.map((item) => (
                                                        <tr key={item.id} className="border-t border-border/40">
                                                            <td className="px-3 py-2">{item.particular}</td>
                                                            <td className="px-3 py-2 text-center">
                                                                {item.is_custom
                                                                    ? <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700">Custom</span>
                                                                    : <span className="rounded-full bg-sky-100 px-1.5 py-0.5 text-xs text-sky-700">Inventory</span>}
                                                            </td>
                                                            <td className="px-3 py-2 text-right">{item.quantity}</td>
                                                            <td className="px-3 py-2">{item.unit}</td>
                                                            <td className="px-3 py-2 text-right">{item.unit_price_at_request != null ? formatCurrency(item.unit_price_at_request) : '—'}</td>
                                                            <td className="px-3 py-2 text-right font-medium">{item.unit_price_at_request != null ? formatCurrency(item.unit_price_at_request * item.quantity) : '—'}</td>
                                                        </tr>
                                                    ))}
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