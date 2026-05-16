import { flexRender, type RowData, type Table } from '@tanstack/react-table';

// Extend ColumnMeta so columns can carry responsive class hints
declare module '@tanstack/react-table' {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    interface ColumnMeta<TData extends RowData, TValue> {
        className?: string;
    }
}

interface DataTableShellProps<TData extends RowData> {
    table: Table<TData>;
    emptyColSpan: number;
    emptyMessage: string;
}

export function DataTableShell<TData extends RowData>({
    table,
    emptyColSpan,
    emptyMessage,
}: DataTableShellProps<TData>) {
    const rows = table.getRowModel().rows;

    return (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="overflow-x-auto">
                <table className="min-w-full w-max">
                    <thead>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <tr key={headerGroup.id} className="bg-gray-50 dark:bg-gray-800/80">
                                {headerGroup.headers.map((header) => (
                                    <th
                                        key={header.id}
                                        className={`relative px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-200${header.column.columnDef.meta?.className ? ` ${header.column.columnDef.meta.className}` : ''}`}
                                        colSpan={header.colSpan}
                                    >
                                        {header.isPlaceholder ? null : (
                                            <div
                                                className={header.column.getCanSort() ? 'flex items-center cursor-pointer select-none' : ''}
                                                onClick={header.column.getCanSort() ? header.column.getToggleSortingHandler() : undefined}
                                            >
                                                {flexRender(header.column.columnDef.header, header.getContext())}
                                                {header.column.getCanSort() && (
                                                    <span className="sort-arrows ml-1">
                                                        <span className={`arrow arrow-up${header.column.getIsSorted() === 'asc' ? ' sorted' : ''}`}></span>
                                                        <span className={`arrow arrow-down${header.column.getIsSorted() === 'desc' ? ' sorted' : ''}`}></span>
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
                        {rows.length > 0 ? rows.map((row) => (
                            <tr key={row.id} className="border-b border-gray-100 transition-colors hover:bg-gray-50/80 dark:border-gray-800 dark:hover:bg-gray-800/60">
                                {row.getVisibleCells().map((cell) => (
                                    <td key={cell.id} className={`px-4 py-3 align-top text-sm text-gray-600 dark:text-gray-300${cell.column.columnDef.meta?.className ? ` ${cell.column.columnDef.meta.className}` : ''}`}>
                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                    </td>
                                ))}
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={emptyColSpan} className="px-4 py-12 text-center">
                                    <div className="flex flex-col items-center gap-2">
                                        <svg className="h-8 w-8 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                                        </svg>
                                        <p className="text-sm text-gray-400 dark:text-gray-500">{emptyMessage}</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}