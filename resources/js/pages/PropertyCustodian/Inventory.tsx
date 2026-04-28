import React, { useMemo, useState } from 'react';
import {
    useReactTable,
    getCoreRowModel,
    getSortedRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    ColumnDef,
} from '@tanstack/react-table';
import AppLayout from '@/layouts/app-layout';
import dashboard from '@/routes/dashboard';
import { type BreadcrumbItem } from '@/types';
import { Button } from '@/components/ui/button';
import { DataTablePagination, DataTableToolbar } from '@/components/data-table-controls';
import { DataTableShell } from '@/components/data-table-shell';
import { useDataTable } from '@/hooks/use-data-table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { usePage } from '@inertiajs/react';
import { Head } from '@inertiajs/react';
import { type SharedData } from '@/types';
import { exportRowsToCsv, exportRowsToExcel, exportRowsToPdf, printHtmlDocument } from '../../lib/document-export';

interface Item {
    id: number;
    name: string;
    unit: string;
    quantity: number;
    unit_price: string;
    stock_card_entries: StockCardEntry[];
}

interface StockCardEntry {
    id: number;
    transaction_date: string;
    movement_type: 'stock_in' | 'stock_out';
    reference: string | null;
    party: string | null;
    quantity: number;
    unit_cost: string;
    amount: string;
    stock_on_hand: number;
    notes: string | null;
}

interface PageProps {
    items: Item[];
}

interface ItemResponse {
    success: boolean;
    item: Item;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: dashboard.propertyCustodian().url },
    { title: 'Inventory', href: '/property-custodian/items' },
];


const Inventory: React.FC = () => {
    const { items, csrf_token } = usePage<SharedData & PageProps>().props;
    const [tableData, setTableData] = useState(items);
    const [showModal, setShowModal] = useState(false);
    const [historyItemId, setHistoryItemId] = useState<number | null>(null);
    const [adjustStockItemId, setAdjustStockItemId] = useState<number | null>(null);
    const [editMode, setEditMode] = useState(false);
    const [form, setForm] = useState({
        id: null as number | null,
        name: '',
        unit: 'PCS',
        quantity: '',
        quantity_adjustment: '',
        adjustment_note: '',
        current_quantity: 0,
        unit_price: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [adjustStockForm, setAdjustStockForm] = useState({
        quantity_adjustment: '',
        adjustment_note: '',
    });
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

    React.useEffect(() => {
        setTableData(items);
    }, [items]);

    const selectedHistoryItem = historyItemId === null
        ? null
        : tableData.find((item) => item.id === historyItemId) ?? null;

    const selectedAdjustStockItem = adjustStockItemId === null
        ? null
        : tableData.find((item) => item.id === adjustStockItemId) ?? null;

    const formatCurrency = (value: string | number) => {
        const numericValue = Number(value);

        return `₱ ${numericValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const formatDate = (value: string) => new Date(value).toLocaleDateString();

    const handleExportStockCard = (item: Item) => {
        exportRowsToExcel(buildStockCardRows(item),
            'Stock Card',
            `${item.name.replace(/\s+/g, '_')}_stock_card.xlsx`,
        );
    };

    const handleExportStockCardCsv = (item: Item) => {
        exportRowsToCsv(buildStockCardRows(item), `${item.name.replace(/\s+/g, '_')}_stock_card.csv`);
    };

    const handleExportStockCardPdf = (item: Item) => {
        const rows = item.stock_card_entries.map((entry) => {
            const isStockIn = entry.movement_type === 'stock_in';

            return [
                isStockIn ? formatDate(entry.transaction_date) : '-',
                isStockIn ? entry.quantity : '-',
                isStockIn ? formatCurrency(entry.unit_cost) : '-',
                isStockIn ? '-' : formatDate(entry.transaction_date),
                isStockIn ? (entry.reference ?? 'Stock In') : (entry.party ?? entry.reference ?? '-'),
                isStockIn ? '-' : entry.quantity,
                isStockIn ? '-' : formatCurrency(entry.unit_cost),
                formatCurrency(entry.amount),
                entry.stock_on_hand,
            ];
        });

        exportRowsToPdf(
            `Stock Card - ${item.name}`,
            [
                { label: 'Article', value: item.name },
                { label: 'Unit', value: item.unit },
                { label: 'Stock On Hand', value: item.quantity },
            ],
            ['Purchase Date', 'Article Qty', 'Cost', 'Sale Date', 'Supplier / Customer', 'Qty', 'Price', 'Amount', 'Stock On Hand'],
            rows,
            `${item.name.replace(/\s+/g, '_')}_stock_card.pdf`,
        );
    };

    const handlePrintStockCard = (item: Item) => {
        const rows = item.stock_card_entries.map((entry) => {
            const isStockIn = entry.movement_type === 'stock_in';

            return `
                <tr>
                    <td>${isStockIn ? formatDate(entry.transaction_date) : '-'}</td>
                    <td>${isStockIn ? entry.quantity : '-'}</td>
                    <td>${isStockIn ? formatCurrency(entry.unit_cost) : '-'}</td>
                    <td>${isStockIn ? '-' : formatDate(entry.transaction_date)}</td>
                    <td>${isStockIn ? (entry.reference ?? 'Stock In') : (entry.party ?? entry.reference ?? '-')}</td>
                    <td>${isStockIn ? '-' : entry.quantity}</td>
                    <td>${isStockIn ? '-' : formatCurrency(entry.unit_cost)}</td>
                    <td>${formatCurrency(entry.amount)}</td>
                    <td>${entry.stock_on_hand}</td>
                </tr>
            `;
        }).join('');

        printHtmlDocument(
            `Stock Card - ${item.name}`,
            `
                <h1>Stock Card</h1>
                <div class="meta">
                    <p><strong>Article:</strong> ${item.name}</p>
                    <p><strong>Unit:</strong> ${item.unit}</p>
                    <p><strong>Stock On Hand:</strong> ${item.quantity}</p>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Purchase Date</th>
                            <th>Article Qty</th>
                            <th>Cost</th>
                            <th>Sale Date</th>
                            <th>Supplier / Customer</th>
                            <th>Qty</th>
                            <th>Price</th>
                            <th>Amount</th>
                            <th>Stock On Hand</th>
                        </tr>
                    </thead>
                    <tbody>${rows || '<tr><td colspan="9">No stock card history yet.</td></tr>'}</tbody>
                </table>
            `,
        );
    };

    const buildStockCardRows = (item: Item) => item.stock_card_entries.map((entry) => {
        const isStockIn = entry.movement_type === 'stock_in';

        return {
            'Purchase Date': isStockIn ? formatDate(entry.transaction_date) : '',
            'Article Qty': isStockIn ? entry.quantity : '',
            Cost: isStockIn ? Number(entry.unit_cost) : '',
            'Sale Date': isStockIn ? '' : formatDate(entry.transaction_date),
            'Supplier / Customer': isStockIn ? (entry.reference ?? 'Stock In') : (entry.party ?? entry.reference ?? ''),
            Qty: isStockIn ? '' : entry.quantity,
            Price: isStockIn ? '' : Number(entry.unit_cost),
            Amount: Number(entry.amount),
            'Stock On Hand': entry.stock_on_hand,
        };
    });

    const resetForm = () => {
        setForm({ id: null, name: '', unit: 'PCS', quantity: '', quantity_adjustment: '', adjustment_note: '', current_quantity: 0, unit_price: '' });
        setEditMode(false);
        setError(null);
    };

    const openModal = (item?: Item) => {
        setError(null);
        if (item) {
            setEditMode(true);
            setForm({
                id: item.id,
                name: item.name,
                unit: item.unit,
                quantity: '',
                quantity_adjustment: '',
                adjustment_note: '',
                current_quantity: item.quantity,
                unit_price: item.unit_price,
            });
        } else {
            resetForm();
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
                ...(editMode
                    ? {
                        quantity_adjustment: Number(form.quantity_adjustment || 0),
                        adjustment_note: form.adjustment_note.trim() || null,
                    }
                    : { quantity: Number(form.quantity) }),
                unit_price: form.unit_price,
            }),
        });
        setLoading(false);
        if (res.ok) {
            const data = (await res.json()) as ItemResponse;
            setTableData((prev) => {
                if (editMode) {
                    return prev.map((item) => item.id === data.item.id ? data.item : item);
                }

                return [data.item, ...prev];
            });
            setShowModal(false);
            resetForm();
        } else {
            const err = await res.json().catch(() => ({}));
            setError(err.message || 'Failed to save item.');
        }
    };

    const adjustmentValue = Number(form.quantity_adjustment || 0);
    const projectedQuantity = form.current_quantity + adjustmentValue;

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
				setTableData((prev) => prev.filter((item) => item.id !== id));
            } else {
				const err = await res.json().catch(() => ({}));
				setError(err.message || 'Failed to delete item.');
            }
        }
    };

    const openAdjustStockModal = (item: Item) => {
        setError(null);
        setAdjustStockItemId(item.id);
        setAdjustStockForm({ quantity_adjustment: '', adjustment_note: '' });
    };

    const handleAdjustStockSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedAdjustStockItem) {
            return;
        }

        setLoading(true);
        setError(null);

        const res = await fetch(`/property-custodian/items/${selectedAdjustStockItem.id}`, {
            method: 'PUT',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-CSRF-TOKEN': csrf_token,
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({
                name: selectedAdjustStockItem.name,
                unit: selectedAdjustStockItem.unit,
                unit_price: selectedAdjustStockItem.unit_price,
                quantity_adjustment: Number(adjustStockForm.quantity_adjustment || 0),
                adjustment_note: adjustStockForm.adjustment_note.trim() || null,
            }),
        });

        setLoading(false);

        if (res.ok) {
            const data = (await res.json()) as ItemResponse;
            setTableData((prev) => prev.map((item) => item.id === data.item.id ? data.item : item));
            setAdjustStockItemId(null);
            setAdjustStockForm({ quantity_adjustment: '', adjustment_note: '' });
        } else {
            const err = await res.json().catch(() => ({}));
            setError(err.message || 'Failed to adjust stock.');
        }
    };

    // DataTable columns
    const columns = useMemo<ColumnDef<Item>[]>(() => [
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
            meta: { className: 'hidden sm:table-cell' },
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
            cell: info => formatCurrency(String(info.getValue())),
            meta: { className: 'hidden sm:table-cell' },
        },
        {
            id: 'stock_card_entries',
            header: () => <span>Stock Card</span>,
            cell: ({ row }) => (
                <Button size="sm" variant="secondary" onClick={() => setHistoryItemId(row.original.id)}>
                    History
                </Button>
            ),
            enableSorting: false,
        },
        {
            id: 'actions',
            header: () => <span>Actions</span>,
            cell: ({ row }) => (
                <div className="flex gap-2">
                    <Button size="sm" variant="secondary" onClick={() => openAdjustStockModal(row.original)}>Adjust Stock</Button>
                    <Button size="sm" variant="outline" onClick={() => openModal(row.original)}>Edit</Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(row.original.id)}>Delete</Button>
                </div>
            ),
            enableSorting: false,
        },
    ], []);

    const table = useReactTable({
        data: tableData,
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
                            {editMode ? (
                                <>
                                    <div className="rounded border bg-gray-50 p-3 text-sm dark:bg-gray-800">
                                        <div className="font-medium">Current stock on hand: {form.current_quantity}</div>
                                    </div>
                                    <input
                                        type="number"
                                        name="quantity_adjustment"
                                        placeholder="Change Quantity (+ add, - remove)"
                                        value={form.quantity_adjustment}
                                        onChange={handleFormChange}
                                        className="border rounded p-2 dark:bg-gray-800 dark:text-white"
                                    />
                                    <div className="text-xs text-muted-foreground">
                                        Use positive values to add stock and negative values to remove mistaken stock entries.
                                    </div>
                                    <div className={`rounded border p-2 text-sm ${projectedQuantity < 0 ? 'border-red-500 text-red-600' : 'bg-gray-50 dark:bg-gray-800'}`}>
                                        Projected stock on hand: {projectedQuantity}
                                    </div>
                                    <input
                                        type="text"
                                        name="adjustment_note"
                                        placeholder="Correction note (optional)"
                                        value={form.adjustment_note}
                                        onChange={handleFormChange}
                                        className="border rounded p-2 dark:bg-gray-800 dark:text-white"
                                        maxLength={255}
                                    />
                                </>
                            ) : (
                                <input
                                    type="number"
                                    name="quantity"
                                    placeholder="Initial Quantity"
                                    value={form.quantity}
                                    onChange={handleFormChange}
                                    className="border rounded p-2 dark:bg-gray-800 dark:text-white"
                                    min={0}
                                    required
                                />
                            )}
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
                <Dialog open={historyItemId !== null} onOpenChange={(open) => !open && setHistoryItemId(null)}>
                    <DialogContent className="w-[95vw] max-w-6xl overflow-hidden p-4 sm:p-6 dark:bg-gray-900 dark:text-white">
                        <DialogHeader>
                            <DialogTitle>
                                Stock Card{selectedHistoryItem ? `: ${selectedHistoryItem.name}` : ''}
                            </DialogTitle>
                        </DialogHeader>
                        {selectedHistoryItem && (
                            <div className="max-h-[80vh] space-y-4 overflow-y-auto pr-1">
                                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                                    <div className="rounded border bg-gray-50 p-3 dark:bg-gray-800">
                                        <div className="text-sm text-gray-500 dark:text-gray-300">Article</div>
                                        <div className="font-semibold">{selectedHistoryItem.name}</div>
                                    </div>
                                    <div className="rounded border bg-gray-50 p-3 dark:bg-gray-800">
                                        <div className="text-sm text-gray-500 dark:text-gray-300">Unit</div>
                                        <div className="font-semibold">{selectedHistoryItem.unit}</div>
                                    </div>
                                    <div className="rounded border bg-gray-50 p-3 dark:bg-gray-800">
                                        <div className="text-sm text-gray-500 dark:text-gray-300">Stock On Hand</div>
                                        <div className="font-semibold">{selectedHistoryItem.quantity}</div>
                                    </div>
                                </div>
                                <div className="flex flex-wrap justify-end gap-2 max-sm:[&>button]:flex-1">
                                    <Button type="button" variant="outline" onClick={() => handlePrintStockCard(selectedHistoryItem)}>
                                        Print
                                    </Button>
                                    <Button type="button" variant="secondary" onClick={() => handleExportStockCard(selectedHistoryItem)}>
                                        Export Excel
                                    </Button>
                                    <Button type="button" variant="secondary" onClick={() => handleExportStockCardCsv(selectedHistoryItem)}>
                                        Export CSV
                                    </Button>
                                    <Button type="button" variant="secondary" onClick={() => handleExportStockCardPdf(selectedHistoryItem)}>
                                        Export PDF
                                    </Button>
                                </div>
                                <div className="overflow-x-auto rounded border">
                                    <table className="min-w-[980px] text-sm">
                                        <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800">
                                            <tr>
                                                <th className="sticky left-0 z-10 bg-gray-50 px-3 py-2 text-left dark:bg-gray-800">Purchase Date</th>
                                                <th className="px-3 py-2 text-left">Article Qty</th>
                                                <th className="px-3 py-2 text-left">Cost</th>
                                                <th className="px-3 py-2 text-left">Sale Date</th>
                                                <th className="px-3 py-2 text-left">Supplier / Customer</th>
                                                <th className="px-3 py-2 text-left">Qty</th>
                                                <th className="px-3 py-2 text-left">Price</th>
                                                <th className="px-3 py-2 text-left">Amount</th>
                                                <th className="px-3 py-2 text-left">Stock On Hand</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {selectedHistoryItem.stock_card_entries.length > 0 ? selectedHistoryItem.stock_card_entries.map((entry) => {
                                                const isStockIn = entry.movement_type === 'stock_in';

                                                return (
                                                    <tr key={entry.id} className="border-t">
                                                        <td className="sticky left-0 bg-white px-3 py-2 dark:bg-gray-900">{isStockIn ? formatDate(entry.transaction_date) : '-'}</td>
                                                        <td className="px-3 py-2">{isStockIn ? entry.quantity : '-'}</td>
                                                        <td className="px-3 py-2">{isStockIn ? formatCurrency(entry.unit_cost) : '-'}</td>
                                                        <td className="px-3 py-2">{isStockIn ? '-' : formatDate(entry.transaction_date)}</td>
                                                        <td className="px-3 py-2">{isStockIn ? (entry.reference ?? 'Stock In') : (entry.party ?? entry.reference ?? '-')}</td>
                                                        <td className="px-3 py-2">{isStockIn ? '-' : entry.quantity}</td>
                                                        <td className="px-3 py-2">{isStockIn ? '-' : formatCurrency(entry.unit_cost)}</td>
                                                        <td className="px-3 py-2">{formatCurrency(entry.amount)}</td>
                                                        <td className="px-3 py-2 font-semibold">{entry.stock_on_hand}</td>
                                                    </tr>
                                                );
                                            }) : (
                                                <tr>
                                                    <td colSpan={9} className="px-3 py-6 text-center text-gray-500">
                                                        No stock card history yet.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>

                <Dialog open={adjustStockItemId !== null} onOpenChange={(open) => !open && setAdjustStockItemId(null)}>
                    <DialogContent className="max-w-md w-full dark:bg-gray-900 dark:text-white">
                        <DialogHeader>
                            <DialogTitle>
                                Adjust Stock{selectedAdjustStockItem ? `: ${selectedAdjustStockItem.name}` : ''}
                            </DialogTitle>
                        </DialogHeader>

                        {selectedAdjustStockItem && (
                            <form onSubmit={handleAdjustStockSubmit} className="flex flex-col gap-3">
                                <div className="rounded border bg-gray-50 p-3 text-sm dark:bg-gray-800">
                                    <div><span className="font-medium">Current stock:</span> {selectedAdjustStockItem.quantity}</div>
                                    <div><span className="font-medium">Unit:</span> {selectedAdjustStockItem.unit}</div>
                                    <div><span className="font-medium">Unit price:</span> {formatCurrency(selectedAdjustStockItem.unit_price)}</div>
                                </div>

                                <input
                                    type="number"
                                    name="quantity_adjustment"
                                    placeholder="Change Quantity (+ add, - remove)"
                                    value={adjustStockForm.quantity_adjustment}
                                    onChange={(e) => setAdjustStockForm((prev) => ({ ...prev, quantity_adjustment: e.target.value }))}
                                    className="border rounded p-2 dark:bg-gray-800 dark:text-white"
                                    required
                                />

                                <div className="text-xs text-muted-foreground">
                                    Use positive values to add stock and negative values to remove mistakenly added stock.
                                </div>

                                <div className="rounded border bg-gray-50 p-2 text-sm dark:bg-gray-800">
                                    Projected stock on hand: {(selectedAdjustStockItem.quantity + Number(adjustStockForm.quantity_adjustment || 0))}
                                </div>

                                <input
                                    type="text"
                                    name="adjustment_note"
                                    placeholder="Correction note (optional)"
                                    value={adjustStockForm.adjustment_note}
                                    onChange={(e) => setAdjustStockForm((prev) => ({ ...prev, adjustment_note: e.target.value }))}
                                    className="border rounded p-2 dark:bg-gray-800 dark:text-white"
                                    maxLength={255}
                                />

                                <div className="flex justify-end gap-2 pt-1">
                                    <Button type="button" variant="outline" onClick={() => setAdjustStockItemId(null)} disabled={loading}>
                                        Cancel
                                    </Button>
                                    <Button type="submit" variant="default" disabled={loading}>
                                        {loading ? 'Saving...' : 'Apply Adjustment'}
                                    </Button>
                                </div>
                            </form>
                        )}
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
};

export default Inventory;
