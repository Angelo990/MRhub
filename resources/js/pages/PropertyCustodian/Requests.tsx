import React, { useState, useMemo } from 'react';
import type { ColumnDef, CellContext } from '@tanstack/react-table';
import AppLayout from '@/layouts/app-layout';
import { usePage, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

import {
    useReactTable,
    getCoreRowModel,
    getFilteredRowModel,
    getSortedRowModel,
    getPaginationRowModel,
    flexRender,
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
    [key: string]: any;
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


        const columns: ColumnDef<Request, any>[] = useMemo(() => [
            {
                accessorKey: 'date',
                header: () => 'Date',
                cell: (info: CellContext<Request, any>) => info.getValue(),
            },
            {
                accessorKey: 'department',
                header: () => 'Department',
                cell: (info: CellContext<Request, any>) => info.row.original.department?.name,
            },
            {
                accessorKey: 'purpose',
                header: () => 'Purpose',
                cell: (info: CellContext<Request, any>) => info.getValue(),
            },
            {
                accessorKey: 'requested_by',
                header: () => 'Requested By',
                cell: (info: CellContext<Request, any>) => info.getValue(),
            },
            {
                accessorKey: 'status',
                header: () => 'Status',
                cell: (info: CellContext<Request, any>) => info.getValue(),
            },
            {
                accessorKey: 'items',
                header: () => 'Items',
                cell: (info: CellContext<Request, any>) => (
                    <>
                        {info.row.original.items.map((item: RequestItem) => (
                            <div key={item.id}>
                                {item.particular} ({item.quantity} {item.unit})
                            </div>
                        ))}
                    </>
                ),
            },
            {
                id: 'actions',
                header: () => 'Actions',
                cell: (info: CellContext<Request, any>) => {
                    const req = info.row.original;
                    return (
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
                    );
                },
            },
        ], [handleEndorse, handleOpenReceipt]);

        // --- DataTable state ---
        const [globalFilter, setGlobalFilter] = useState('');
        const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
        const table = useReactTable({
            data: requests,
            columns,
            state: { globalFilter, pagination },
            getCoreRowModel: getCoreRowModel(),
            getFilteredRowModel: getFilteredRowModel(),
            getSortedRowModel: getSortedRowModel(),
            getPaginationRowModel: getPaginationRowModel(),
            onGlobalFilterChange: setGlobalFilter,
            onPaginationChange: setPagination,
            globalFilterFn: (row, columnId, filterValue) => {
                // Simple string search across all columns
                return String(row.getValue(columnId)).toLowerCase().includes(filterValue.toLowerCase());
            },
        });

        return (
            <AppLayout>
                <div className="flex flex-col gap-4 p-4 dark:bg-gray-900 dark:text-white">
                    <div className="flex items-center justify-between mb-2">
                        <h1 className="text-2xl font-bold">Pending Requests</h1>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 mb-2">
                        <label className="flex items-center gap-2">
                            Show
                            <select
                                    className="border rounded p-1"
                                    value={pagination.pageSize}
                                    onChange={e => setPagination(p => ({ ...p, pageSize: Number(e.target.value) }))}
                                >
                                    {[10, 25, 50, 100].map(size => (
                                        <option key={size} value={size}>{size}</option>
                                    ))}
                                </select>
                            entries
                        </label>
                        <input
                            className="border rounded p-2 ml-auto max-w-xs search-input"
                            placeholder="Search..."
                            value={globalFilter ?? ''}
                            onChange={e => setGlobalFilter(e.target.value)}
                        />
                    </div>
                    <div className="overflow-x-auto rounded-xl shadow dark:bg-gray-800">
                        <table className="min-w-full bg-white dark:bg-gray-900">
                            <thead>
                                {table.getHeaderGroups().map(headerGroup => (
                                    <tr key={headerGroup.id} className="bg-gray-50 dark:bg-gray-800">
                                        {headerGroup.headers.map(header => (
                                            <th
                                                key={header.id}
                                                className="py-2 px-4 text-left cursor-pointer select-none group th-sortable"
                                                onClick={header.column.getCanSort() ? header.column.getToggleSortingHandler() : undefined}
                                            >
                                                <span className="flex items-center gap-1">
                                                    {flexRender(header.column.columnDef.header, header.getContext())}
                                                    {header.column.getCanSort() && (
                                                        <span className="sort-arrows">
                                                            <span className={`arrow arrow-up${header.column.getIsSorted() === 'asc' ? ' sorted' : ''}`}></span>
                                                            <span className={`arrow arrow-down${header.column.getIsSorted() === 'desc' ? ' sorted' : ''}`}></span>
                                                        </span>
                                                    )}
                                                </span>
                                            </th>
                                        ))}
                                    </tr>
                                ))}
                            </thead>
                            <tbody>
                                {table.getRowModel().rows.map(row => (
                                    <tr key={row.id} className="border-b dark:border-gray-700">
                                        {row.getVisibleCells().map(cell => (
                                            <td key={cell.id} className="py-2 px-4">
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                        <div>
                            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
                        </div>
                        <div className="flex gap-2">
                            <Button onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} size="sm">Previous</Button>
                            <Button onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} size="sm">Next</Button>
                        </div>
                    </div>
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