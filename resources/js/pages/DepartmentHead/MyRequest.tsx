import React, { useState, useMemo } from 'react';
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
import type { ColumnDef, CellContext } from '@tanstack/react-table';

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

export default function MyRequest() {
    const { requests, csrf_token } = (usePage().props as unknown as PageProps & { csrf_token: string });
    const [openReceipt, setOpenReceipt] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const handleMarkReceived = async (id: number) => {
        setLoading(true);
        setError(null);
        try {
            await fetch(`/department-head/requests/${id}/received`, {
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
            window.location.reload();
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
                            {req.status === 'Ready for Pickup' && (
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
                    );
                },
            },
        ], [handleMarkReceived, loading]);

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
                return String(row.getValue(columnId)).toLowerCase().includes(filterValue.toLowerCase());
            },
        });

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
                    const receipt = req?.delivery_receipt;
                    return (
                        <Dialog open={!!openReceipt} onOpenChange={() => setOpenReceipt(null)}>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Delivery Receipt</DialogTitle>
                                </DialogHeader>
                                {receipt ? (
                                    <div className="space-y-2">
                                        <div><strong>Delivery Date:</strong> {receipt.delivery_date}</div>
                                        <div><strong>Prepared by:</strong> {receipt.prepared_by}</div>
                                        <div><strong>Checked & Delivered by:</strong> {receipt.checked_by}</div>
                                        <div><strong>Received by:</strong> {receipt.received_by}</div>
                                        <div><strong>Status:</strong> {req.status === 'Ready for Pickup' ? 'Ready for Pickup' : 'Completed / Received'}</div>
                                        <div><strong>Total:</strong> ₱ {receipt.total}</div>
                                        <div className="font-semibold mt-2">Items</div>
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
