import React, { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Head } from '@inertiajs/react';

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
}

const CreateRequest: React.FC = () => {
    const { departments, items } = (usePage().props as unknown as PageProps);
    const [form, setForm] = useState({
        date: '',
        department_id: '',
        purpose: '',
        requested_by: '',
        reviewed_by: '',
        approved_by: '',
        noted_by: '',
        items: [{ item_id: '', quantity: '', particular: '', unit: '' }],
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleItemChange = (idx: number, e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setForm((prev) => {
            const newItems = [...prev.items];
            newItems[idx] = { ...newItems[idx], [name]: value };
            return { ...prev, items: newItems };
        });
    };

    const addItemRow = () => {
        setForm((prev) => ({ ...prev, items: [...prev.items, { item_id: '', quantity: '', particular: '', unit: '' }] }));
    };
    const removeItemRow = (idx: number) => {
        setForm((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        const res = await fetch('/department-head/requests', {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-CSRF-TOKEN': token,
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify(form),
        });
        setLoading(false);
        if (res.ok) {
            window.location.href = '/department-head/requests';
        } else {
            const err = await res.json().catch(() => ({}));
            setError(err.message || 'Failed to submit request.');
        }
    };

    return (
        <AppLayout>
            <Head title="Create Request" />
            <div className="max-w-2xl mx-auto p-4">
                <h1 className="text-2xl font-bold mb-4">Create Item Request</h1>
                {error && <div className="text-red-500 mb-2">{error}</div>}
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <label htmlFor="date" className="font-semibold">Date</label>
                    <input type="date" id="date" name="date" value={form.date} onChange={handleFormChange} required className="border rounded p-2" title="Request Date" placeholder="Select date" />
                    <label htmlFor="department_id" className="font-semibold">Department</label>
                    <select id="department_id" name="department_id" value={form.department_id} onChange={handleFormChange} required className="border rounded p-2" title="Select Department">
                        <option value="">Select Department</option>
                        {departments.map((dept) => (
                            <option key={dept.id} value={dept.id}>{dept.name}</option>
                        ))}
                    </select>
                    <label htmlFor="purpose" className="font-semibold">Purpose</label>
                    <input type="text" id="purpose" name="purpose" placeholder="Purpose" value={form.purpose} onChange={handleFormChange} required className="border rounded p-2" title="Purpose" />
                    <label htmlFor="requested_by" className="font-semibold">Requested by</label>
                    <input type="text" id="requested_by" name="requested_by" placeholder="Requested by" value={form.requested_by} onChange={handleFormChange} required className="border rounded p-2" title="Requested by" />
                    <label htmlFor="reviewed_by" className="font-semibold">Reviewed by</label>
                    <input type="text" id="reviewed_by" name="reviewed_by" placeholder="Reviewed by" value={form.reviewed_by} onChange={handleFormChange} className="border rounded p-2" title="Reviewed by" />
                    <label htmlFor="approved_by" className="font-semibold">Approved by</label>
                    <input type="text" id="approved_by" name="approved_by" placeholder="Approved by" value={form.approved_by} onChange={handleFormChange} className="border rounded p-2" title="Approved by" />
                    <label htmlFor="noted_by" className="font-semibold">Noted by (President's name)</label>
                    <input type="text" id="noted_by" name="noted_by" placeholder="Noted by (President's name)" value={form.noted_by} onChange={handleFormChange} className="border rounded p-2" title="Noted by (President's name)" />
                    <div>
                        <label className="block mb-2 font-semibold">Items</label>
                        {form.items.map((item, idx) => (
                            <div key={idx} className="flex gap-2 mb-2">
                                <label htmlFor={`item_id_${idx}`} className="sr-only">Item</label>
                                <select id={`item_id_${idx}`} name="item_id" value={item.item_id} onChange={(e) => handleItemChange(idx, e)} required className="border rounded p-2" title="Select Item">
                                    <option value="">Select Item</option>
                                    {items.map((i) => (
                                        <option key={i.id} value={i.id}>{i.name}</option>
                                    ))}
                                </select>
                                <label htmlFor={`quantity_${idx}`} className="sr-only">Quantity</label>
                                <input type="number" id={`quantity_${idx}`} name="quantity" placeholder="Quantity" value={item.quantity} onChange={(e) => handleItemChange(idx, e)} min={1} required className="border rounded p-2 w-24" title="Quantity" />
                                <label htmlFor={`particular_${idx}`} className="sr-only">Particular</label>
                                <input type="text" id={`particular_${idx}`} name="particular" placeholder="Particular" value={item.particular} onChange={(e) => handleItemChange(idx, e)} required className="border rounded p-2" title="Particular" />
                                <label htmlFor={`unit_${idx}`} className="sr-only">Unit</label>
                                <input type="text" id={`unit_${idx}`} name="unit" placeholder="Unit" value={item.unit} onChange={(e) => handleItemChange(idx, e)} required className="border rounded p-2 w-20" title="Unit" />
                                <Button type="button" variant="outline" onClick={() => removeItemRow(idx)} disabled={form.items.length === 1}>Remove</Button>
                            </div>
                        ))}
                        <Button type="button" variant="default" onClick={addItemRow}>Add Item</Button>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button type="submit" variant="default" disabled={loading}>Submit Request</Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
};

export default CreateRequest;
