import React from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export interface RequestItemView {
    id: number;
    particular: string;
    quantity: number;
    unit: string;
    is_custom?: boolean;
    unit_price_at_request?: number | null;
    rejection_reason?: string | null;
    rejected_by?: string | null;
    quantity_fulfilled?: number;
}

export interface RequestWithItemsView {
    id: number;
    items: RequestItemView[];
}

interface CompactItemsColumnOptions<TData extends RequestWithItemsView> {
    formatCurrency: (value: number) => string;
    getTotalValue: (request: TData) => number;
}

export function createCompactItemsColumn<TData extends RequestWithItemsView>(
    options: CompactItemsColumnOptions<TData>,
): ColumnDef<TData> {
    return {
        id: 'items',
        header: () => 'Items',
        enableSorting: false,
        cell: ({ row }) => {
            const req = row.original;
            const total = options.getTotalValue(req);

            if (req.items.length === 0) {
                return <span className="text-sm text-muted-foreground">-</span>;
            }

            if (req.items.length === 1) {
                const item = req.items[0];
                return (
                    <div className="text-sm">
                        <span className="font-medium">{item.particular}</span>
                        {item.is_custom && <span className="ml-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700">Custom</span>}
                        <div className="text-muted-foreground">
                            {item.quantity} {item.unit}
                            {total > 0 ? ` · ${options.formatCurrency(total)}` : ''}
                        </div>
                    </div>
                );
            }

            return (
                <span className="text-sm">
                    {req.items.length} items
                    {total > 0 ? ` · ${options.formatCurrency(total)}` : ''}
                </span>
            );
        },
    };
}

interface RequestItemsDialogProps<TData extends RequestWithItemsView> {
    request: TData | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    formatCurrency: (value: number) => string;
    getTotalValue: (request: TData) => number;
}

export function RequestItemsDialog<TData extends RequestWithItemsView>({
    request,
    open,
    onOpenChange,
    formatCurrency,
    getTotalValue,
}: RequestItemsDialogProps<TData>) {
    if (!request) {
        return null;
    }

    const total = getTotalValue(request);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="flex w-[calc(100vw-1.5rem)] max-h-[85vh] max-w-3xl lg:max-w-5xl flex-col overflow-hidden p-0">
                <DialogHeader className="sticky top-0 z-10 shrink-0 border-b border-border/70 bg-background px-4 py-3 pr-12 sm:px-6">
                    <DialogTitle>Items - Request #{request.id}</DialogTitle>
                </DialogHeader>
                <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-6">
                    <div className="overflow-x-auto rounded border border-border/70 bg-background">
                        <table className="w-full min-w-[520px] text-sm">
                            <thead className="bg-muted/30">
                                <tr>
                                    <th className="px-3 py-2 text-left">Item</th>
                                    <th className="px-3 py-2 text-center">Type</th>
                                    <th className="px-3 py-2 text-right">Progress</th>
                                    <th className="px-3 py-2 text-left">Unit</th>
                                    <th className="px-3 py-2 text-right">Unit Price</th>
                                    <th className="px-3 py-2 text-right">Est. Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {request.items.map((item) => {
                                    const fulfilled = item.quantity_fulfilled ?? 0;
                                    const isRejected = !!item.rejection_reason;
                                    const progressClass = fulfilled >= item.quantity
                                        ? 'font-semibold text-emerald-600'
                                        : fulfilled > 0
                                            ? 'text-amber-600'
                                            : '';

                                    return (
                                        <tr key={item.id} className={`border-t border-border/40 ${isRejected ? 'bg-red-50/50 dark:bg-red-950/10' : ''}`}>
                                            <td className="px-3 py-2">
                                                <span className={isRejected ? 'text-muted-foreground line-through' : ''}>{item.particular}</span>
                                                {isRejected && (
                                                    <p className="mt-0.5 text-xs text-red-600">
                                                        {item.rejected_by ? `Rejected by ${item.rejected_by}: ${item.rejection_reason}` : `Rejected: ${item.rejection_reason}`}
                                                    </p>
                                                )}
                                            </td>
                                            <td className="px-3 py-2 text-center">
                                                {isRejected
                                                    ? <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-xs text-red-700">Rejected</span>
                                                    : item.is_custom
                                                        ? <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700">Custom</span>
                                                        : <span className="rounded-full bg-sky-100 px-1.5 py-0.5 text-xs text-sky-700">Inventory</span>}
                                            </td>
                                            <td className="px-3 py-2 text-right">
                                                {isRejected
                                                    ? <span className="text-muted-foreground">-</span>
                                                    : <span className={progressClass}>{fulfilled}/{item.quantity}</span>}
                                            </td>
                                            <td className="px-3 py-2">{item.unit}</td>
                                            <td className="px-3 py-2 text-right">{item.unit_price_at_request != null ? formatCurrency(item.unit_price_at_request) : '-'}</td>
                                            <td className="px-3 py-2 text-right font-medium">{item.unit_price_at_request != null ? formatCurrency(item.unit_price_at_request * item.quantity) : '-'}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            {total > 0 && (
                                <tfoot className="border-t-2 border-border">
                                    <tr>
                                        <td colSpan={5} className="px-3 py-2 text-right font-semibold">Total Estimated Value</td>
                                        <td className="px-3 py-2 text-right font-bold">{formatCurrency(total)}</td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
