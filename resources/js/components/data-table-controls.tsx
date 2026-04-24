import { Button } from '@/components/ui/button';
import { ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from 'lucide-react';
import { useId } from 'react';

interface DataTableToolbarProps {
    pageSize: number;
    onPageSizeChange: (pageSize: number) => void;
    searchValue: string;
    onSearchChange: (value: string) => void;
    searchPlaceholder?: string;
}

interface DataTablePaginationProps {
    showingFrom: number;
    showingTo: number;
    totalRows: number;
    itemLabel: string;
    onFirst: () => void;
    onPrev: () => void;
    onNext: () => void;
    onLast: () => void;
    canPrevious: boolean;
    canNext: boolean;
}

export function DataTableToolbar({
    pageSize,
    onPageSizeChange,
    searchValue,
    onSearchChange,
    searchPlaceholder = 'Search...',
}: DataTableToolbarProps) {
    const entriesSelectId = useId();

    return (
        <div className="mb-2 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300" htmlFor={entriesSelectId}>
                <span>Show</span>
                <select
                    id={entriesSelectId}
                    className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    value={pageSize}
                    onChange={(e) => onPageSizeChange(Number(e.target.value))}
                    title="Show entries"
                >
                    {[10, 25, 50, 100].map((size) => (
                        <option key={size} value={size}>{size}</option>
                    ))}
                </select>
                <span>entries</span>
            </label>

            <input
                className="search-input w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm md:max-w-xs dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                placeholder={searchPlaceholder}
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
            />
        </div>
    );
}

export function DataTablePagination({
    showingFrom,
    showingTo,
    totalRows,
    itemLabel,
    onFirst,
    onPrev,
    onNext,
    onLast,
    canPrevious,
    canNext,
}: DataTablePaginationProps) {
    return (
        <div className="mt-2 flex flex-col gap-3 text-sm text-gray-600 dark:text-gray-300 md:flex-row md:items-center md:justify-between">
            <div className="text-center md:text-left">
                Showing {showingFrom}–{showingTo} of {totalRows} {itemLabel}
            </div>
            <div className="flex flex-wrap justify-center gap-2 md:justify-end">
                <Button size="sm" variant="outline" onClick={onFirst} disabled={!canPrevious} aria-label="First page">
                    <ChevronsLeft className="h-4 w-4" />
                    <span className="sr-only sm:not-sr-only sm:ml-1">First</span>
                </Button>
                <Button size="sm" variant="outline" onClick={onPrev} disabled={!canPrevious} aria-label="Previous page">
                    <ChevronLeft className="h-4 w-4" />
                    <span className="sr-only sm:not-sr-only sm:ml-1">Prev</span>
                </Button>
                <Button size="sm" variant="outline" onClick={onNext} disabled={!canNext} aria-label="Next page">
                    <span className="sr-only sm:not-sr-only sm:mr-1">Next</span>
                    <ChevronRight className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="outline" onClick={onLast} disabled={!canNext} aria-label="Last page">
                    <span className="sr-only sm:not-sr-only sm:mr-1">Last</span>
                    <ChevronsRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}