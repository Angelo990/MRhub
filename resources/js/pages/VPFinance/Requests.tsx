import React, { useMemo, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { usePage, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';

import {
    useReactTable,
    getCoreRowModel,
    getFilteredRowModel,
    getSortedRowModel,
    getPaginationRowModel,
    flexRender,
} from '@tanstack/react-table';
import type { ColumnDef, CellContext } from '@tanstack/react-table';

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
export default function Requests() {
    // Main component logic starts here
    const { requests } = (usePage().props as unknown as PageProps);
    const handleApprove = (id: number) => {
        router.post(`/vp-finance/requests/${id}/approve`);
    };
    const handleReject = (id: number) => {
        router.post(`/vp-finance/requests/${id}/reject`);
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
                            <Button size="sm" variant="default" onClick={() => handleApprove(req.id)}>Approve</Button>
                            <Button size="sm" variant="destructive" onClick={() => handleReject(req.id)}>Reject</Button>
                        </div>
                    );
                },
            },
        ], [handleApprove, handleReject]);

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
                        <h1 className="text-2xl font-bold">Requests for Approval</h1>
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
                </div>
            </AppLayout>
        );
}