import type { ColumnDef } from '@tanstack/react-table';
import type { ReactNode } from 'react';

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
    items: RequestItemLike[];
}

export function createDateColumn<TData extends BaseRequestTableRow>(): ColumnDef<TData> {
    return {
        accessorKey: 'date',
        header: () => 'Date',
        cell: ({ row }) => row.original.date,
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
    return {
        accessorKey: 'status',
        header: () => 'Status',
        cell: ({ row }) => row.original.status,
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