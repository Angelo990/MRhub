import { flexRender, type RowData, type Table } from '@tanstack/react-table';

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
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <table className="min-w-full">
                <thead>
                    {table.getHeaderGroups().map((headerGroup) => (
                        <tr key={headerGroup.id} className="bg-gray-50 dark:bg-gray-800/80">
                            {headerGroup.headers.map((header) => (
                                <th
                                    key={header.id}
                                    className="relative px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-200"
                                    colSpan={header.colSpan}
                                >
                                    {header.isPlaceholder ? null : (
                                        <div
                                            className={header.column.getCanSort() ? 'cursor-pointer select-none flex items-center' : ''}
                                            onClick={header.column.getCanSort() ? header.column.getToggleSortingHandler() : undefined}
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
                    {rows.length > 0 ? rows.map((row) => (
                        <tr key={row.id} className="border-b border-gray-100 transition-colors hover:bg-gray-50/80 dark:border-gray-800 dark:hover:bg-gray-800/60">
                            {row.getVisibleCells().map((cell) => (
                                <td key={cell.id} className="px-4 py-3 align-top text-sm text-gray-600 dark:text-gray-300">
                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                </td>
                            ))}
                        </tr>
                    )) : (
                        <tr>
                            <td colSpan={emptyColSpan} className="px-4 py-10 text-center text-sm text-gray-400">
                                {emptyMessage}
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}