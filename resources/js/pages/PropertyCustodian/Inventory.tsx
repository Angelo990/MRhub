import React, { useState, useMemo } from 'react';
import {
    useReactTable,
    getCoreRowModel,
    getSortedRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    ColumnDef,
} from '@tanstack/react-table';
import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import { type BreadcrumbItem } from '@/types';
import { Button } from '@/components/ui/button';
import { DataTablePagination, DataTableToolbar } from '@/components/data-table-controls';
import { DataTableShell } from '@/components/data-table-shell';
import { useDataTable } from '@/hooks/use-data-table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { usePage } from '@inertiajs/react';
import { Head } from '@inertiajs/react';
import { type SharedData } from '@/types';

interface Item {
    id: number;
    name: string;
    unit: string;
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
    const { items, csrf_token } = (usePage().props as SharedData & PageProps);
    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [form, setForm] = useState({ id: null as number | null, name: '', unit: 'PCS', quantity: '', unit_price: '' });
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
    } = useDataTable<Item>();

    const openModal = (item?: Item) => {
        setError(null);
        if (item) {
            setEditMode(true);
            setForm({
                id: item.id,
                name: item.name,
                unit: item.unit,
                quantity: String(item.quantity),
                unit_price: item.unit_price,
            });
        } else {
            setEditMode(false);
            setForm({ id: null, name: '', unit: 'PCS', quantity: '', unit_price: '' });
        }
        setShowModal(true);
    };

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
                'X-CSRF-TOKEN': csrf_token,
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({
                name: form.name,
                unit: form.unit,
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
                    'X-CSRF-TOKEN': csrf_token,
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
            accessorKey: 'unit',
            header: () => (
                <span>Unit</span>
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
            pagination,
        },
        onSortingChange: setSorting,
        onGlobalFilterChange: handleSearchChange,
        onPaginationChange: setPagination,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        globalFilterFn,
    });

    const { totalRows, totalPages, showingFrom, showingTo } = getPaginationSummary(table);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Inventory" />
            <div className="flex flex-col gap-4 p-4 dark:bg-gray-900 dark:text-white">
                <div className="flex items-center justify-between mb-2">
                    <h1 className="text-2xl font-bold">Inventory Management</h1>
                    <Button variant="default" onClick={() => openModal()}>Add Item</Button>
                </div>
                <DataTableToolbar
                    pageSize={pagination.pageSize}
                    onPageSizeChange={handlePageSizeChange}
                    searchValue={globalFilter}
                    onSearchChange={handleSearchChange}
                />
                <DataTableShell table={table} emptyColSpan={columns.length} emptyMessage="No items found." />
                <DataTablePagination
                    showingFrom={showingFrom}
                    showingTo={showingTo}
                    totalRows={totalRows}
                    itemLabel="items"
                    onFirst={() => table.setPageIndex(0)}
                    onPrev={() => table.previousPage()}
                    onNext={() => table.nextPage()}
                    onLast={() => table.setPageIndex(totalPages - 1)}
                    canPrevious={table.getCanPreviousPage()}
                    canNext={table.getCanNextPage()}
                />
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
                            <select
                                name="unit"
                                value={form.unit}
                                onChange={handleFormChange}
                                className="border rounded p-2 dark:bg-gray-800 dark:text-white"
                                title="Unit"
                                required
                            >
                                <option value="PCS">PCS (Pieces)</option>
                                <option value="BOT">BOT (Bottle)</option>
                                <option value="REAM">REAM</option>
                            </select>
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
