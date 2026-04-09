import React, { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { usePage, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';

interface Department {
    id: number;
    name: string;
}
interface Item {
    id: number;
    name: string;
    unit: string;
    unit_price: string;
}
interface PageProps {
    departments: Department[];
    items: Item[];
}

interface AuthUser {
    name?: string;
    department_id?: number | string;
    department?: {
        name?: string;
    };
}

interface CreateRequestPageProps extends PageProps {
    auth?: {
        user?: AuthUser;
    };
    [key: string]: unknown;
}

export default function CreateRequest() {
    const { departments, items, auth } = usePage<CreateRequestPageProps>().props;
    const today = new Date().toISOString().slice(0, 10);
    const departmentId = auth?.user?.department_id || (departments[0]?.id ?? '');
    const departmentName = auth?.user?.department?.name || (departments[0]?.name ?? '');
    const requestedBy = auth?.user?.name || '';
    const [form, setForm] = useState({
        date: today,
        department_id: departmentId,
        purpose: '',
        requested_by: requestedBy,
        reviewed_by: '',
        approved_by: '',
        noted_by: 'President MDC',
        items: [{ item_id: '', quantity: '', particular: '', unit: '' }],
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>, idx?: number) => {
        const { name, value } = e.target;
        if (typeof idx === 'number') {
            setForm((prev) => {
                const items = [...prev.items];
                if (name === 'item_id') {
                    const selectedItem = itemsList.find((i) => i.id === Number(value));
                    items[idx] = {
                        ...items[idx],
                        item_id: value,
                        particular: selectedItem ? selectedItem.name : '',
                        unit: selectedItem ? selectedItem.unit : '',
                    };
                } else {
                    items[idx] = { ...items[idx], [name]: value };
                }
                return { ...prev, items };
            });
        } else {
            setForm((prev) => ({ ...prev, [name]: value }));
        }
    };

    const itemsList = items || [];
    const addItem = () => {
        setForm((prev) => ({ ...prev, items: [...prev.items, { item_id: '', quantity: '', particular: '', unit: '' }] }));
    };
    const removeItem = (idx: number) => {
        setForm((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        router.post('/department-head/requests', form, {
            onError: (errors) => setError(errors.message || 'Failed to submit request.'),
            onSuccess: () => router.visit('/department-head/requests'),
            onFinish: () => setLoading(false),
        });
    };

    return (
        <AppLayout>
            <div className="mx-auto w-full max-w-3xl p-4 sm:p-6">
                <h1 className="mb-6 text-2xl font-bold">Create Item Request</h1>
                {error && <div className="mb-2 text-red-500">{error}</div>}
                <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label className="font-semibold" htmlFor="date">Date</label>
                            <input type="date" id="date" name="date" value={form.date} className="border rounded p-2 w-full" disabled title="Request Date" placeholder="Request Date" />
                        </div>
                        <div>
                            <label className="font-semibold" htmlFor="department">Department</label>
                            <input type="text" id="department" name="department" value={departmentName} className="border rounded p-2 w-full" disabled title="Department" placeholder="Department" />
                        </div>
                    </div>
                    <div>
                        <label className="font-semibold" htmlFor="purpose">Purpose</label>
                        <input type="text" id="purpose" name="purpose" placeholder="Purpose" value={form.purpose} onChange={handleFormChange} className="border rounded p-2 w-full" required />
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label className="font-semibold" htmlFor="requested_by">Requested by</label>
                            <input type="text" id="requested_by" name="requested_by" value={requestedBy} className="border rounded p-2 w-full" disabled title="Requested by" placeholder="Requested by" />
                        </div>
                        <div>
                            <label className="font-semibold" htmlFor="reviewed_by">Reviewed by (Property Custodian)</label>
                            <input type="text" id="reviewed_by" name="reviewed_by" value={form.reviewed_by} className="border rounded p-2 w-full" disabled title="Reviewed by" placeholder="To be filled by Property Custodian" />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label className="font-semibold" htmlFor="approved_by">Approved by (VP Finance)</label>
                            <input type="text" id="approved_by" name="approved_by" value={form.approved_by} className="border rounded p-2 w-full" disabled title="Approved by" placeholder="To be filled by VP Finance" />
                        </div>
                        <div>
                            <label className="font-semibold" htmlFor="noted_by">Noted by</label>
                            <input type="text" id="noted_by" name="noted_by" value={form.noted_by} className="border rounded p-2 w-full" disabled title="Noted by" placeholder="Noted by" />
                        </div>
                    </div>
                    <div>
                        <label className="font-semibold mb-2">Request Items</label>
                        <div className="grid gap-2">
                            {form.items.map((item, idx) => (
                                <div key={idx} className="grid gap-3 rounded-lg border p-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,1fr)_auto] xl:items-center">
                                    <div className="space-y-1 xl:space-y-0">
                                        <label className="text-sm font-medium xl:sr-only">Item</label>
                                        <select name="item_id" value={item.item_id} onChange={(e) => handleFormChange(e, idx)} className="border rounded p-2 w-full" required title="Select Item">
                                            <option value="">Select Item</option>
                                            {itemsList.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-1 xl:space-y-0">
                                        <label className="text-sm font-medium xl:sr-only">Quantity</label>
                                        <input type="number" name="quantity" placeholder="Quantity" value={item.quantity} onChange={(e) => handleFormChange(e, idx)} className="border rounded p-2 w-full" min={1} required title="Quantity" />
                                    </div>
                                    <div className="space-y-1 xl:space-y-0">
                                        <label className="text-sm font-medium xl:sr-only">Particular</label>
                                        <input type="text" name="particular" placeholder="Particular" value={item.particular} className="border rounded p-2 w-full" disabled title="Particular" />
                                    </div>
                                    <div className="space-y-1 xl:space-y-0">
                                        <label className="text-sm font-medium xl:sr-only">Unit</label>
                                        <input type="text" name="unit" placeholder="Unit" value={item.unit} className="border rounded p-2 w-full" disabled title="Unit" />
                                    </div>
                                    <Button type="button" variant="destructive" onClick={() => removeItem(idx)} className="w-full xl:w-auto">Remove</Button>
                                </div>
                            ))}
                        </div>
                        <Button type="button" variant="outline" onClick={addItem} className="mt-2">Add Item</Button>
                    </div>
                    <div className="flex flex-col justify-end gap-2 sm:flex-row">
                        <Button type="submit" variant="default" disabled={loading} className="w-full sm:w-auto">Submit Request</Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}