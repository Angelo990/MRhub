import React, { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { usePage, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface Department {
    id: number;
    name: string;
}

interface Item {
    id: number;
    name: string;
    unit: string;
    quantity: number;
    unit_price: number;
}

interface PageProps {
    departments: Department[];
    items: Item[];
    userDepartment: Department | null;
}

interface AuthUser {
    name?: string;
    department_id?: number | string;
    department?: { name?: string };
}

interface CreateRequestPageProps extends PageProps {
    auth?: { user?: AuthUser };
    userDepartment: Department | null;
    [key: string]: unknown;
}

interface FormItem {
    item_id: string;
    quantity: string;
    particular: string;
    unit: string;
    is_custom: boolean;
    unit_price_at_request: string;
    [key: string]: string | boolean;
}

const formatCurrency = (v: number) =>
    `₱ ${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function CreateRequest() {
    const { departments, items, auth, userDepartment } = usePage<CreateRequestPageProps>().props;
    const today = new Date().toISOString().slice(0, 10);
    const departmentId = userDepartment?.id ?? auth?.user?.department_id ?? (departments[0]?.id ?? '');
    const departmentName = userDepartment?.name ?? auth?.user?.department?.name ?? (departments[0]?.name ?? '');
    const requestedBy = auth?.user?.name || '';

    const [form, setForm] = useState({
        date: today,
        department_id: departmentId,
        purpose: '',
        is_urgent: false,
        requested_by: requestedBy,
        reviewed_by: '',
        approved_by: '',
        noted_by: 'President MDC',
        items: [{ item_id: '', quantity: '', particular: '', unit: '', is_custom: false, unit_price_at_request: '' }] as FormItem[],
    });
    const [itemSearches, setItemSearches] = useState<string[]>(['']);
    const [dropdownOpen, setDropdownOpen] = useState<number | null>(null);
    const [reviewOpen, setReviewOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const itemsList: Item[] = items || [];

    const getInventoryItem = (itemId: string) => itemsList.find((i) => i.id === Number(itemId));

    const lineValue = (fi: FormItem): number => {
        const qty = parseInt(fi.quantity) || 0;
        if (fi.is_custom) return (parseFloat(fi.unit_price_at_request) || 0) * qty;
        const inv = getInventoryItem(fi.item_id);
        return inv ? inv.unit_price * qty : 0;
    };

    const totalValue = form.items.reduce((sum, fi) => sum + lineValue(fi), 0);

    const handlePurposeChange = (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm((prev) => ({ ...prev, purpose: e.target.value }));

    const selectInventoryItem = (idx: number, item: Item) => {
        setForm((prev) => {
            const updated = [...prev.items];
            updated[idx] = { ...updated[idx], item_id: String(item.id), particular: item.name, unit: item.unit, unit_price_at_request: String(item.unit_price) };
            return { ...prev, items: updated };
        });
        setItemSearches((prev) => { const s = [...prev]; s[idx] = item.name; return s; });
        setDropdownOpen(null);
    };

    const handleSearchChange = (idx: number, value: string) => {
        setItemSearches((prev) => { const s = [...prev]; s[idx] = value; return s; });
        setForm((prev) => {
            const updated = [...prev.items];
            updated[idx] = { ...updated[idx], item_id: '', particular: '', unit: '', unit_price_at_request: '' };
            return { ...prev, items: updated };
        });
        setDropdownOpen(idx);
    };

    const handleQuantityChange = (idx: number, value: string) =>
        setForm((prev) => { const updated = [...prev.items]; updated[idx] = { ...updated[idx], quantity: value }; return { ...prev, items: updated }; });

    const handleCustomField = (idx: number, field: 'particular' | 'unit' | 'unit_price_at_request', value: string) =>
        setForm((prev) => { const updated = [...prev.items]; updated[idx] = { ...updated[idx], [field]: value }; return { ...prev, items: updated }; });

    const addInventoryItem = () => {
        setForm((prev) => ({ ...prev, items: [...prev.items, { item_id: '', quantity: '', particular: '', unit: '', is_custom: false, unit_price_at_request: '' }] }));
        setItemSearches((prev) => [...prev, '']);
    };
    const addCustomItem = () => {
        setForm((prev) => ({ ...prev, items: [...prev.items, { item_id: '', quantity: '', particular: '', unit: '', is_custom: true, unit_price_at_request: '' }] }));
        setItemSearches((prev) => [...prev, '']);
    };
    const removeItem = (idx: number) => {
        setForm((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }));
        setItemSearches((prev) => prev.filter((_, i) => i !== idx));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setReviewOpen(true);
    };

    const confirmSubmit = async () => {
        setLoading(true);
        setError(null);
        router.post('/department-head/requests', form, {
            onError: (errors) => setError(Object.values(errors).flat().join(' ') || 'Failed to submit request.'),
            onSuccess: () => {
                setReviewOpen(false);
                router.visit('/department-head/requests');
            },
            onFinish: () => setLoading(false),
        });
    };

    return (
        <AppLayout>
            <div className="mx-auto w-full max-w-3xl p-4 sm:p-6">
                <h1 className="mb-6 text-2xl font-bold">Create Item Request</h1>
                {error && <div className="mb-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

                <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label className="font-semibold" htmlFor="date">Date</label>
                            <input type="date" id="date" value={form.date} className="mt-1 w-full rounded border p-2" disabled title="Request Date" placeholder="Request Date" />
                        </div>
                        <div>
                            <label className="font-semibold" htmlFor="department">Department</label>
                            <input type="text" id="department" value={departmentName} className="mt-1 w-full rounded border p-2" disabled title="Department" placeholder="Department" />
                        </div>
                    </div>

                    {/* Urgent toggle */}
                    <div>
                        <button
                            type="button"
                            onClick={() => setForm((prev) => ({ ...prev, is_urgent: !prev.is_urgent }))}
                            className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition-colors ${
                                form.is_urgent
                                    ? 'border-red-400 bg-red-600 text-white shadow-sm hover:bg-red-700'
                                    : 'border-border bg-card text-muted-foreground hover:border-red-300 hover:text-red-600'
                            }`}
                        >
                            <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-extrabold ${
                                form.is_urgent ? 'animate-bounce bg-white text-red-600' : 'bg-muted text-muted-foreground'
                            }`}>!</span>
                            {form.is_urgent ? 'Marked as Urgent' : 'Mark as Urgent'}
                        </button>
                        {form.is_urgent && (
                            <p className="mt-1 text-xs text-red-600">This request will be flagged as urgent. Notifications will include an [URGENT] prefix.</p>
                        )}
                    </div>

                    {/* Items section */}
                    <div>
                        <div className="mb-3 flex items-center justify-between">
                            <span className="font-semibold">Request Items</span>
                            <span className="text-sm text-muted-foreground">
                                Total: <span className="font-semibold text-foreground">{formatCurrency(totalValue)}</span>
                            </span>
                        </div>

                        <div className="grid gap-3">
                            {form.items.map((fi, idx) => {
                                const inv = fi.is_custom ? null : getInventoryItem(fi.item_id);
                                const isOutOfStock = !fi.is_custom && fi.item_id !== '' && !!inv && inv.quantity <= 0;
                                const qty = parseInt(fi.quantity) || 0;
                                const estValue = lineValue(fi);
                                const filteredItems = itemsList.filter((i) =>
                                    i.name.toLowerCase().includes((itemSearches[idx] || '').toLowerCase()),
                                );

                                return (
                                    <div key={idx} className={`rounded-lg border p-3 ${isOutOfStock ? 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/20' : 'border-border bg-card'}`}>
                                        {/* Row header */}
                                        <div className="mb-2 flex items-center justify-between">
                                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${fi.is_custom ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' : 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300'}`}>
                                                {fi.is_custom ? 'Non-Inventory Item' : 'Inventory Item'}
                                            </span>
                                            {estValue > 0 && (
                                                <span className="text-xs text-muted-foreground">
                                                    Est. value: <strong>{formatCurrency(estValue)}</strong>
                                                </span>
                                            )}
                                        </div>

                                        <div className="grid gap-3 sm:grid-cols-2">
                                            {/* Item picker / name */}
                                            <div className="sm:col-span-2">
                                                {fi.is_custom ? (
                                                    <div>
                                                        <label className="mb-1 block text-sm font-medium">Item Name</label>
                                                        <input
                                                            type="text"
                                                            placeholder="Describe item (e.g. Custom Printer Ink)"
                                                            value={fi.particular}
                                                            onChange={(e) => handleCustomField(idx, 'particular', e.target.value)}
                                                            className="w-full rounded border p-2"
                                                            required
                                                        />
                                                    </div>
                                                ) : (
                                                    <div>
                                                        <label className="mb-1 block text-sm font-medium">Select Item</label>
                                                        <div className="relative">
                                                            <input
                                                                type="text"
                                                                placeholder="Search inventory item..."
                                                                value={itemSearches[idx] || ''}
                                                                onChange={(e) => handleSearchChange(idx, e.target.value)}
                                                                onFocus={() => setDropdownOpen(idx)}
                                                                onBlur={() => setTimeout(() => setDropdownOpen(null), 150)}
                                                                className="w-full rounded border p-2"
                                                                autoComplete="off"
                                                            />
                                                            {!fi.is_custom && <input type="hidden" value={fi.item_id} required />}
                                                            {dropdownOpen === idx && filteredItems.length > 0 && (
                                                                <ul className="absolute z-50 mt-1 max-h-52 w-full overflow-y-auto rounded border bg-background shadow-lg dark:bg-gray-800">
                                                                    {filteredItems.map((i) => (
                                                                        <li
                                                                            key={i.id}
                                                                            onMouseDown={() => selectInventoryItem(idx, i)}
                                                                            className="flex cursor-pointer items-center justify-between px-3 py-2 hover:bg-muted"
                                                                        >
                                                                            <span className="font-medium">{i.name}</span>
                                                                            <span className={`ml-2 shrink-0 text-xs ${i.quantity > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                                                                {i.quantity > 0 ? `Available: ${i.quantity} ${i.unit}` : 'Out of stock'}
                                                                            </span>
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            )}
                                                        </div>
                                                        {fi.item_id && inv && (
                                                            <div className={`mt-1 text-xs ${inv.quantity > 0 ? 'text-emerald-600' : 'font-semibold text-red-500'}`}>
                                                                {inv.quantity > 0
                                                                    ? `✓ Available: ${inv.quantity} ${inv.unit} · Unit price: ${formatCurrency(inv.unit_price)}`
                                                                    : '⚠ Out of stock — item unavailable'}
                                                            </div>
                                                        )}
                                                        {isOutOfStock && (
                                                            <div className="mt-1 text-xs font-semibold text-red-600">
                                                                Warning: This item is currently out of stock. The request will still be submitted but may be delayed.
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Quantity */}
                                            <div>
                                                <label className="mb-1 block text-sm font-medium">Quantity</label>
                                                <input type="number" placeholder="Quantity" value={fi.quantity} onChange={(e) => handleQuantityChange(idx, e.target.value)} className="w-full rounded border p-2" min={1} required />
                                            </div>

                                            {/* Unit */}
                                            <div>
                                                <label className="mb-1 block text-sm font-medium">Unit</label>
                                                {fi.is_custom ? (
                                                    <input type="text" placeholder="e.g. PCS, BOX" value={fi.unit} onChange={(e) => handleCustomField(idx, 'unit', e.target.value)} className="w-full rounded border p-2" required />
                                                ) : (
                                                    <input type="text" value={fi.unit} disabled className="w-full rounded border p-2 opacity-70" placeholder="Unit" />
                                                )}
                                            </div>

                                            {/* Unit price */}
                                            <div>
                                                <label className="mb-1 block text-sm font-medium">{fi.is_custom ? 'Estimated Unit Price' : 'Unit Price'}</label>
                                                {fi.is_custom ? (
                                                    <input type="number" placeholder="0.00" value={fi.unit_price_at_request} onChange={(e) => handleCustomField(idx, 'unit_price_at_request', e.target.value)} className="w-full rounded border p-2" min={0} step="0.01" />
                                                ) : (
                                                    <input type="text" value={inv ? formatCurrency(inv.unit_price) : '—'} disabled className="w-full rounded border p-2 opacity-70" placeholder="Unit price" />
                                                )}
                                            </div>

                                            {/* Estimated line value */}
                                            <div>
                                                <label className="mb-1 block text-sm font-medium">Est. Total</label>
                                                <div className="rounded border bg-muted/30 p-2 text-sm font-semibold">
                                                    {qty > 0 ? formatCurrency(estValue) : '—'}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-2 flex justify-end">
                                            <Button type="button" variant="destructive" size="sm" onClick={() => removeItem(idx)}>Remove</Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="mt-2 flex flex-wrap gap-2">
                            <Button type="button" variant="outline" onClick={addInventoryItem}>+ Add Inventory Item</Button>
                            <Button type="button" variant="secondary" onClick={addCustomItem}>+ Add Custom Item</Button>
                        </div>
                    </div>

                    {form.items.length > 0 && (
                        <div className="rounded-lg border border-border bg-muted/30 p-3 text-right">
                            <span className="text-sm text-muted-foreground">Total Estimated Value: </span>
                            <span className="text-lg font-bold">{formatCurrency(totalValue)}</span>
                        </div>
                    )}

                    <div>
                        <label className="font-semibold" htmlFor="purpose">Purpose</label>
                        <input type="text" id="purpose" placeholder="Purpose" value={form.purpose} onChange={handlePurposeChange} className="mt-1 w-full rounded border p-2" required />
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label className="font-semibold">Requested by</label>
                            <input type="text" value={requestedBy} className="mt-1 w-full rounded border p-2" disabled title="Requested by" placeholder="Requested by" />
                        </div>
                        <div>
                            <label className="font-semibold">Reviewed by (Property Custodian)</label>
                            <input type="text" value={form.reviewed_by} className="mt-1 w-full rounded border p-2" disabled title="Reviewed by" placeholder="To be filled by Property Custodian" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label className="font-semibold">Approved by (VP Finance)</label>
                            <input type="text" value={form.approved_by} className="mt-1 w-full rounded border p-2" disabled title="Approved by" placeholder="To be filled by VP Finance" />
                        </div>
                        <div>
                            <label className="font-semibold">Noted by</label>
                            <input type="text" value={form.noted_by} className="mt-1 w-full rounded border p-2" disabled title="Noted by" placeholder="Noted by" />
                        </div>
                    </div>

                    <div className="flex flex-col justify-end gap-2 sm:flex-row">
                        <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => router.visit('/department-head/requests')}>Cancel</Button>
                        <Button type="submit" variant="default" disabled={loading} className="w-full sm:w-auto">{loading ? 'Submitting…' : 'Submit Request'}</Button>
                    </div>
                </form>

                <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
                    <DialogContent className="flex w-[calc(100vw-1.5rem)] max-h-[85vh] max-w-5xl flex-col overflow-hidden p-0">
                        <DialogHeader className="sticky top-0 z-10 shrink-0 border-b border-border/70 bg-background px-4 py-3 pr-12 sm:px-6">
                            <DialogTitle>Quick Review Before Submit</DialogTitle>
                        </DialogHeader>

                        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-6">
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                                <div className="rounded border bg-muted/30 p-3">
                                    <div className="text-xs text-muted-foreground">Date</div>
                                    <div className="font-semibold">{form.date}</div>
                                </div>
                                <div className="rounded border bg-muted/30 p-3">
                                    <div className="text-xs text-muted-foreground">Department</div>
                                    <div className="font-semibold">{departmentName}</div>
                                </div>
                                <div className="rounded border bg-muted/30 p-3">
                                    <div className="text-xs text-muted-foreground">Urgency</div>
                                    <div className={`font-semibold ${form.is_urgent ? 'text-red-600' : ''}`}>
                                        {form.is_urgent ? 'URGENT' : 'Normal'}
                                    </div>
                                </div>
                            </div>

                            <div className="rounded border">
                                <div className="overflow-x-auto">
                                    <table className="min-w-[720px] text-sm">
                                        <thead className="bg-muted/40">
                                            <tr>
                                                <th className="px-3 py-2 text-left">#</th>
                                                <th className="px-3 py-2 text-left">Type</th>
                                                <th className="px-3 py-2 text-left">Item</th>
                                                <th className="px-3 py-2 text-left">Unit</th>
                                                <th className="px-3 py-2 text-right">Qty</th>
                                                <th className="px-3 py-2 text-right">Unit Price</th>
                                                <th className="px-3 py-2 text-right">Est. Total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {form.items.map((fi, idx) => {
                                                const inv = fi.is_custom ? null : getInventoryItem(fi.item_id);
                                                const unitPrice = fi.is_custom
                                                    ? parseFloat(fi.unit_price_at_request) || 0
                                                    : (inv?.unit_price ?? 0);

                                                return (
                                                    <tr key={`review-${idx}`} className="border-t">
                                                        <td className="px-3 py-2">{idx + 1}</td>
                                                        <td className="px-3 py-2">{fi.is_custom ? 'Custom' : 'Inventory'}</td>
                                                        <td className="px-3 py-2">{fi.particular || '-'}</td>
                                                        <td className="px-3 py-2">{fi.unit || '-'}</td>
                                                        <td className="px-3 py-2 text-right">{parseInt(fi.quantity) || 0}</td>
                                                        <td className="px-3 py-2 text-right">{formatCurrency(unitPrice)}</td>
                                                        <td className="px-3 py-2 text-right font-semibold">{formatCurrency(lineValue(fi))}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className="rounded border bg-muted/30 p-3">
                                <div className="text-xs text-muted-foreground">Purpose</div>
                                <div className="font-medium">{form.purpose}</div>
                            </div>

                            <div className="flex items-center justify-between rounded border border-border bg-muted/30 p-3">
                                <span className="text-sm text-muted-foreground">Total Estimated Value</span>
                                <span className="text-lg font-bold">{formatCurrency(totalValue)}</span>
                            </div>
                        </div>

                        <div className="sticky bottom-0 flex justify-end gap-2 border-t border-border/70 bg-background px-4 py-3 sm:px-6">
                            <Button type="button" variant="outline" onClick={() => setReviewOpen(false)} disabled={loading}>
                                Back to Edit
                            </Button>
                            <Button type="button" variant="default" onClick={confirmSubmit} disabled={loading}>
                                {loading ? 'Submitting…' : 'Confirm & Submit'}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}