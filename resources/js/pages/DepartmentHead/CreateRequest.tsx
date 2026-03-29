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
    unit_price: string;
}
    interface Department {
        id: number;
        name: string;
    }
    interface Item {
        id: number;
        name: string;
        unit_price: string;
    }
    interface PageProps {
        departments: Department[];
        items: Item[];
        [key: string]: unknown;
    }
    departments: Department[];
    items: Item[];
        [key: string]: unknown;
    [key: string]: unknown;
}

export default function CreateRequest() {
    interface AuthUser {
        department_id?: string | number;
        department?: { name: string };
        name?: string;
        [key: string]: unknown;
    }
    interface AuthProps {
        user?: AuthUser;
        [key: string]: unknown;
    }
    const { departments, items, auth } = usePage<PageProps & { auth?: AuthProps }>().props;
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
                    const selectedItem = itemsList.find((i: Item) => i.id === Number(value));
                                        const selectedItem = itemsList.find((i: Item) => i.id === Number(value));
                    items[idx] = {
                        ...items[idx],
                        item_id: value,
                        particular: selectedItem ? selectedItem.name : '',
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
            <div className="max-w-3xl mx-auto p-6">
                <h1 className="text-2xl font-bold mb-6">Create Item Request</h1>
                {error && <div className="text-red-500 mb-2">{error}</div>}
                <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6">
                    <div className="grid grid-cols-2 gap-4">
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
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="font-semibold" htmlFor="requested_by">Requested by</label>
                            <input type="text" id="requested_by" name="requested_by" value={requestedBy} className="border rounded p-2 w-full" disabled title="Requested by" placeholder="Requested by" />
                        </div>
                        <div>
                            <label className="font-semibold" htmlFor="reviewed_by">Reviewed by (Property Custodian)</label>
                            <input type="text" id="reviewed_by" name="reviewed_by" value={form.reviewed_by} className="border rounded p-2 w-full" disabled title="Reviewed by" placeholder="To be filled by Property Custodian" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
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
                                <div key={idx} className="grid grid-cols-5 gap-2 items-center">
                                    <select name="item_id" value={item.item_id} onChange={(e) => handleFormChange(e, idx)} className="border rounded p-2 w-full" required title="Select Item">
                                        <option value="">Select Item</option>
                                        {itemsList.map((i: Item) => <option key={i.id} value={i.id}>{i.name}</option>)}
                                                                            {itemsList.map((i: Item) => <option key={i.id} value={i.id}>{i.name}</option>)}
                                    </select>
                                    <input type="number" name="quantity" placeholder="Quantity" value={item.quantity} onChange={(e) => handleFormChange(e, idx)} className="border rounded p-2 w-full" min={1} required title="Quantity" />
                                    <input type="text" name="particular" placeholder="Particular" value={item.particular} className="border rounded p-2 w-full" disabled title="Particular" />
                                    <input type="text" name="unit" placeholder="Unit" value={item.unit} onChange={(e) => handleFormChange(e, idx)} className="border rounded p-2 w-full" required title="Unit" />
                                    <Button type="button" variant="destructive" onClick={() => removeItem(idx)} className="w-full">Remove</Button>
                                </div>
                            ))}
                        </div>
                        <Button type="button" variant="outline" onClick={addItem} className="mt-2">Add Item</Button>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button type="submit" variant="default" disabled={loading}>Submit Request</Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
