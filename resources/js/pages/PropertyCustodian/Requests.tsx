import React, { useState, useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
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

import {
    useReactTable,
    getCoreRowModel,
    getFilteredRowModel,
    getSortedRowModel,
    getPaginationRowModel,
} from '@tanstack/react-table';

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
interface Request {
    id: number;
    date: string;
    department: Department;
    purpose: string;
    requested_by: string;
    status: string;
    items: RequestItem[];
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

export default function Requests() {
    const { requests, items } = usePage<PageProps>().props;
    const [openReceipt, setOpenReceipt] = useState<number | null>(null);
    const [receiptForm, setReceiptForm] = useState({
        delivery_date: new Date().toISOString().slice(0, 10),
        prepared_by: '',
        checked_by: '',
        received_by: '',
        total: '',
    });
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
    const handleEndorse = (id: number) => {
        router.post(`/property-custodian/requests/${id}/endorse`);
    };
    const itemsList: Item[] = items || [];
    const getUnitPrice = (itemId: number) => {
        const found = itemsList.find(i => i.id === itemId);
        return found ? found.unit_price : 0;
    };
    const handleOpenReceipt = (id: number) => {
        const req = requests.find(r => r.id === id);
        setReceiptForm({
            delivery_date: new Date().toISOString().slice(0, 10),
            prepared_by: '',
            checked_by: '',
            received_by: req?.requested_by || '',
            total: req ? req.items.reduce((sum, item) => sum + (item.quantity * getUnitPrice(item.item_id)), 0).toString() : '',
        });
        setOpenReceipt(id);
    };
    const handleReceiptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setReceiptForm((prev) => ({ ...prev, [name]: value }));
    };
    const handleSubmitReceipt = async (id: number) => {
        setError(null);
        try {
            await router.post(`/property-custodian/requests/${id}/delivery-receipt`, receiptForm, {
                onError: (errors: any) => {
                    setError(errors?.error || 'Failed to generate receipt.');
                },
                onSuccess: () => {
                    setOpenReceipt(null);
                    setError(null);
                },
            });
        } catch (e: any) {
            setError(e?.message || 'Failed to generate receipt.');
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
                    <Button size="sm" variant="default" onClick={() => handleEndorse(req.id)} disabled={req.status !== 'Pending Endorsement'}>
                        Endorse
                    </Button>
                    {req.status === 'Approved' && (
                        <Button size="sm" variant="secondary" onClick={() => handleOpenReceipt(req.id)}>
                            Generate Delivery Receipt
                        </Button>
                    )}
                </div>
            )),
        ], [handleEndorse, handleOpenReceipt]);

        const table = useReactTable({
            data: requests,
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
                    const req = requests.find(r => r.id === openReceipt);
                    return (
                        <Dialog open={!!openReceipt} onOpenChange={() => setOpenReceipt(null)}>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Generate Delivery Receipt</DialogTitle>
                                </DialogHeader>
                                {error && <div className="text-red-500 mb-2">{error}</div>}
                                <form className="grid gap-4" onSubmit={e => { e.preventDefault(); handleSubmitReceipt(openReceipt); }}>
                                    <label htmlFor="delivery_date" className="font-semibold">Delivery Date</label>
                                    <input type="date" id="delivery_date" name="delivery_date" value={receiptForm.delivery_date} disabled className="border rounded p-2" title="Delivery Date" placeholder="Delivery Date" />
                                    <input type="text" name="prepared_by" value={receiptForm.prepared_by} onChange={handleReceiptChange} required placeholder="Prepared by" className="border rounded p-2" />
                                    <input type="text" name="checked_by" value={receiptForm.checked_by} onChange={handleReceiptChange} required placeholder="Checked & Delivered by" className="border rounded p-2" />
                                    <label htmlFor="received_by" className="font-semibold">Received by</label>
                                    <input type="text" id="received_by" name="received_by" value={receiptForm.received_by} disabled className="border rounded p-2" title="Received by" placeholder="Received by" />
                                    <div className="border rounded p-2 bg-gray-50">
                                        <div className="font-semibold mb-2">Items</div>
                                        <table className="min-w-full text-sm">
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
                                                {req?.items.map(item => (
                                                    <tr key={item.id}>
                                                        <td className="px-2 py-1">{item.particular}</td>
                                                        <td className="px-2 py-1">{item.quantity}</td>
                                                        <td className="px-2 py-1">{item.unit}</td>
                                                        <td className="px-2 py-1">{getUnitPrice(item.item_id)}</td>
                                                        <td className="px-2 py-1">{item.quantity * getUnitPrice(item.item_id)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    <label htmlFor="total" className="font-semibold">Total</label>
                                    <input type="number" id="total" name="total" value={receiptForm.total} disabled placeholder="Total" className="border rounded p-2" title="Total" />
                                    <div className="flex justify-end gap-2">
                                        <Button type="submit" variant="default">Submit</Button>
                                        <Button type="button" variant="outline" onClick={() => setOpenReceipt(null)}>Cancel</Button>
                                    </div>
                                </form>
                            </DialogContent>
                        </Dialog>
                    );
                })()}
            </div>
        </AppLayout>
    );
}