import type { ColumnDef } from '@tanstack/react-table';
import type { ReactNode } from 'react';
import React from 'react';

interface DepartmentLike {
    name: string;
}

interface RequestItemLike {
    id: number;
    particular: string;
    quantity: number;
    unit: string;
}

export interface BaseRequestTableRow {
    date: string;
    department: DepartmentLike;
    purpose: string;
    requested_by?: string;
    status: string;
    is_urgent?: boolean;
    items: RequestItemLike[];
}

export function createDateColumn<TData extends BaseRequestTableRow>(): ColumnDef<TData> {
    return {
        accessorKey: 'date',
        header: () => 'Date',
        cell: ({ row }) => (
            <span className="inline-flex items-center gap-1.5">
                {row.original.is_urgent && (
                    <span
                        className="inline-flex h-5 w-5 animate-bounce items-center justify-center rounded-full bg-red-600 text-[10px] font-extrabold text-white shadow"
                        title="Urgent request"
                    >
                        !
                    </span>
                )}
                {row.original.date}
            </span>
        ),
    };
}

export function createDepartmentColumn<TData extends BaseRequestTableRow>(): ColumnDef<TData> {
    return {
        accessorKey: 'department',
        header: () => 'Department',
        cell: ({ row }) => row.original.department?.name,
    };
}

export function createPurposeColumn<TData extends BaseRequestTableRow>(): ColumnDef<TData> {
    return {
        accessorKey: 'purpose',
        header: () => 'Purpose',
        cell: ({ row }) => row.original.purpose,
    };
}

export function createRequestedByColumn<TData extends BaseRequestTableRow>(): ColumnDef<TData> {
    return {
        accessorKey: 'requested_by',
        header: () => 'Requested By',
        cell: ({ row }) => row.original.requested_by ?? '-',
    };
}

export function createStatusColumn<TData extends BaseRequestTableRow>(): ColumnDef<TData> {
    const statusClasses: Record<string, string> = {
        'Pending Endorsement': 'border border-amber-200 bg-amber-50 text-amber-700',
        'Pending Approval': 'border border-sky-200 bg-sky-50 text-sky-700',
        Approved: 'border border-emerald-200 bg-emerald-50 text-emerald-700',
        'Ready for Pickup': 'border border-violet-200 bg-violet-50 text-violet-700',
        Released: 'border border-cyan-200 bg-cyan-50 text-cyan-700',
        'Partially Released': 'border border-orange-200 bg-orange-50 text-orange-700',
        Completed: 'border border-slate-200 bg-slate-100 text-slate-700',
        Rejected: 'border border-rose-200 bg-rose-50 text-rose-700',
    };

    const statusLabels: Record<string, string> = {
        'Ready for Pickup': 'Released',
    };

    return {
        accessorKey: 'status',
        header: () => 'Status',
        cell: ({ row }) => {
            const status = row.original.status;

            return (
                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClasses[status] ?? 'border border-zinc-200 bg-zinc-50 text-zinc-700'}`}>
                    {statusLabels[status] ?? status}
                </span>
            );
        },
    };
}

export function createItemsColumn<TData extends BaseRequestTableRow>(): ColumnDef<TData> {
    return {
        accessorKey: 'items',
        header: () => 'Items',
        enableSorting: false,
        cell: ({ row }) => (
            <>
                {row.original.items.map((item) => (
                    <div key={item.id}>
                        {item.particular} ({item.quantity} {item.unit})
                    </div>
                ))}
            </>
        ),
    };
}

export function createActionsColumn<TData>(renderActions: (row: TData) => ReactNode): ColumnDef<TData> {
    return {
        id: 'actions',
        header: () => 'Actions',
        enableSorting: false,
        cell: ({ row }) => renderActions(row.original),
    };
}