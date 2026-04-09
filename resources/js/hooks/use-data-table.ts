import { useState } from 'react';
import type { PaginationState, RowData, SortingState, Table } from '@tanstack/react-table';

interface UseDataTableOptions {
    initialPageSize?: number;
}

export function useDataTable<TData extends RowData>({ initialPageSize = 10 }: UseDataTableOptions = {}) {
    const [globalFilter, setGlobalFilter] = useState('');
    const [sorting, setSorting] = useState<SortingState>([]);
    const [pagination, setPagination] = useState<PaginationState>({
        pageIndex: 0,
        pageSize: initialPageSize,
    });

    const handleSearchChange = (value: string) => {
        setGlobalFilter(value);
        setPagination((previous) => ({ ...previous, pageIndex: 0 }));
    };

    const handlePageSizeChange = (pageSize: number) => {
        setPagination((previous) => ({ ...previous, pageSize, pageIndex: 0 }));
    };

    const getPaginationSummary = (table: Table<TData>) => {
        const totalRows = table.getFilteredRowModel().rows.length;
        const { pageIndex, pageSize } = table.getState().pagination;
        const totalPages = Math.max(table.getPageCount(), 1);
        const showingFrom = totalRows === 0 ? 0 : pageIndex * pageSize + 1;
        const showingTo = totalRows === 0 ? 0 : Math.min((pageIndex + 1) * pageSize, totalRows);

        return {
            totalRows,
            totalPages,
            showingFrom,
            showingTo,
        };
    };

    const globalFilterFn = (row: { getValue: (columnId: string) => unknown }, columnId: string, filterValue: string) => {
        return String(row.getValue(columnId)).toLowerCase().includes(filterValue.toLowerCase());
    };

    return {
        globalFilter,
        sorting,
        pagination,
        setPagination,
        setSorting,
        handleSearchChange,
        handlePageSizeChange,
        getPaginationSummary,
        globalFilterFn,
    };
}