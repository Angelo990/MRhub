import React, { useState, useMemo } from 'react';
import {
    useReactTable,
    getCoreRowModel,
    getSortedRowModel,
    getFilteredRowModel,
    flexRender,
    SortingState,
    ColumnDef,
} from '@tanstack/react-table';
import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import { type BreadcrumbItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { usePage } from '@inertiajs/react';
import { Head } from '@inertiajs/react';

interface Item {
    id: number;
    name: string;
    quantity: number;
    unit_price: string;
}

interface PageProps {
    items: Item[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: dashboard().url },
    { title: 'Inventory', href: '/property-custodian/items' },
];


const Inventory: React.FC = () => {
    const { items } = (usePage().props as unknown as PageProps);
    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [form, setForm] = useState({ id: null as number | null, name: '', quantity: '', unit_price: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [globalFilter, setGlobalFilter] = useState('');
    const [sorting, setSorting] = useState<SortingState>([]);
    const [pageSize, setPageSize] = useState(10);
    const [pageIndex, setPageIndex] = useState(0);

    const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

    const openModal = (item?: Item) => {
        setError(null);
        if (item) {
            setEditMode(true);
            setForm({
                id: item.id,
                name: item.name,
                quantity: String(item.quantity),
                unit_price: item.unit_price,
            });
        } else {
            setEditMode(false);
            setForm({ id: null, name: '', quantity: '', unit_price: '' });
        }
        setShowModal(true);
    };

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        const url = editMode && form.id ? `/property-custodian/items/${form.id}` : '/property-custodian/items';
        const method = editMode ? 'PUT' : 'POST';
        const res = await fetch(url, {
            method,
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-CSRF-TOKEN': token,
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({
                name: form.name,
                quantity: Number(form.quantity),
                unit_price: form.unit_price,
            }),
        });
        setLoading(false);
        if (res.ok) {
            setShowModal(false);
            window.location.reload();
        } else {
            const err = await res.json().catch(() => ({}));
            setError(err.message || 'Failed to save item.');
        }
    };

    const handleDelete = async (id: number) => {
        if (window.confirm('Are you sure you want to delete this item?')) {
            setLoading(true);
            setError(null);
            const res = await fetch(`/property-custodian/items/${id}`, {
                method: 'DELETE',
                credentials: 'same-origin',
                headers: {
                    'X-CSRF-TOKEN': token,
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });
            setLoading(false);
            if (res.ok) {
                window.location.reload();
            } else {
                setError('Failed to delete item.');
            }
        }
    };

    // DataTable columns
    const columns = useMemo<ColumnDef<Item, any>[]>(() => [
        {
            accessorKey: 'name',
            header: () => (
                <span>Name</span>
            ),
            cell: info => info.getValue(),
        },
        {
            accessorKey: 'quantity',
            header: () => (
                <span>Quantity</span>
            ),
            cell: info => info.getValue(),
        },
        {
            accessorKey: 'unit_price',
            header: () => (
                <span>Unit Price</span>
            ),
            cell: info => `₱ ${info.getValue()}`,
        },
        {
            id: 'actions',
            header: () => <span>Actions</span>,
            cell: ({ row }) => (
                <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => openModal(row.original)}>Edit</Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(row.original.id)}>Delete</Button>
                </div>
            ),
            enableSorting: false,
        },
    ], []);

    const table = useReactTable({
        data: items,
        columns,
        state: {
            sorting,
            globalFilter,
        },
        onSortingChange: setSorting,
        onGlobalFilterChange: setGlobalFilter,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
    });

    // Pagination helpers
    const pageRows = useMemo(() => {
        const start = pageIndex * pageSize;
        return table.getRowModel().rows.slice(start, start + pageSize);
    }, [table, pageIndex, pageSize]);

    const pageCount = Math.ceil(table.getRowModel().rows.length / pageSize);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Inventory" />
            <div className="flex flex-col gap-4 p-4 dark:bg-gray-900 dark:text-white">
                <div className="flex items-center justify-between mb-2">
                    <h1 className="text-2xl font-bold">Inventory Management</h1>
                    <Button variant="default" onClick={() => openModal()}>Add Item</Button>
                </div>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-2">
                    <div>
                        Show
                        <label className="mr-2" htmlFor="entries-select">Show</label>
                        <select
                            id="entries-select"
                            className="mx-2 border rounded px-2 py-1 dark:bg-gray-800 dark:text-white"
                            value={pageSize}
                            onChange={e => {
                                setPageSize(Number(e.target.value));
                                setPageIndex(0);
                            }}
                            title="Show entries"
                        >
                            {[10, 25, 50, 100].map(size => (
                                <option key={size} value={size}>{size}</option>
                            ))}
                        </select>
                        entries
                    </div>
                    <input
                        className="search-input border rounded px-2 py-1 dark:bg-gray-800 dark:text-white max-w-xs"
                        placeholder="Search..."
                        value={globalFilter ?? ''}
                        onChange={e => {
                            setGlobalFilter(e.target.value);
                            setPageIndex(0);
                        }}
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
                                            className="py-2 px-4 text-left relative"
                                            colSpan={header.colSpan}
                                        >
                                            {header.isPlaceholder ? null : (
                                                <div
                                                    {...{
                                                        className: header.column.getCanSort()
                                                            ? 'cursor-pointer select-none flex items-center'
                                                            : '',
                                                        onClick: header.column.getToggleSortingHandler(),
                                                    }}
                                                >
                                                    {flexRender(header.column.columnDef.header, header.getContext())}
                                                    {header.column.getCanSort() && (
                                                        <span className={`sort-arrows ml-1 ${header.column.getIsSorted() ? 'active' : ''}`}>
                                                            <span className={`arrow-up${header.column.getIsSorted() === 'asc' ? ' active' : ''}`}></span>
                                                            <span className={`arrow-down${header.column.getIsSorted() === 'desc' ? ' active' : ''}`}></span>
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </th>
                                    ))}
                                </tr>
                            ))}
                        </thead>
                        <tbody>
                            {pageRows.length > 0 ? pageRows.map(row => (
                                <tr key={row.id} className="border-b dark:border-gray-700">
                                    {row.getVisibleCells().map(cell => (
                                        <td key={cell.id} className="py-2 px-4">
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </td>
                                    ))}
                                </tr>
                            )) : (
                                <tr><td colSpan={columns.length} className="text-center py-4 text-gray-400">No items found.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {/* Pagination */}
                <div className="flex justify-between items-center mt-2">
                    <div>
                        Page {pageIndex + 1} of {pageCount}
                    </div>
                    <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => setPageIndex(0)} disabled={pageIndex === 0}>First</Button>
                        <Button size="sm" variant="outline" onClick={() => setPageIndex(pageIndex - 1)} disabled={pageIndex === 0}>Prev</Button>
                        <Button size="sm" variant="outline" onClick={() => setPageIndex(pageIndex + 1)} disabled={pageIndex >= pageCount - 1}>Next</Button>
                        <Button size="sm" variant="outline" onClick={() => setPageIndex(pageCount - 1)} disabled={pageIndex >= pageCount - 1}>Last</Button>
                    </div>
                </div>
                {/* Modal for create/edit item */}
                <Dialog open={showModal} onOpenChange={setShowModal}>
                    <DialogContent className="max-w-md w-full dark:bg-gray-900 dark:text-white">
                        <DialogHeader>
                            <DialogTitle>{editMode ? 'Edit Item' : 'Add Item'}</DialogTitle>
                        </DialogHeader>
                        {error && <div className="text-red-500 mb-2">{error}</div>}
                        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                            <input
                                type="text"
                                name="name"
                                placeholder="Name"
                                value={form.name}
                                onChange={handleFormChange}
                                className="border rounded p-2 dark:bg-gray-800 dark:text-white"
                                required
                            />
                            <input
                                type="number"
                                name="quantity"
                                placeholder="Quantity"
                                value={form.quantity}
                                onChange={handleFormChange}
                                className="border rounded p-2 dark:bg-gray-800 dark:text-white"
                                min={0}
                                required
                            />
                            <input
                                type="number"
                                name="unit_price"
                                placeholder="Unit Price"
                                value={form.unit_price}
                                onChange={handleFormChange}
                                className="border rounded p-2 dark:bg-gray-800 dark:text-white"
                                min={0}
                                step="0.01"
                                required
                            />
                            <div className="flex justify-end gap-2">
                                <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
                                <Button type="submit" variant="default" disabled={loading}>{editMode ? 'Update' : 'Create'}</Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
};

export default Inventory;
