import React, { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import { type BreadcrumbItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { usePage } from '@inertiajs/react';
import { Head } from '@inertiajs/react';

interface Item {
    id: number;
    name: string;
    quantity: number;
    unit_price: string;
}

interface PageProps {
    items: Item[];
    [key: string]: any;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: dashboard().url },
    { title: 'Inventory', href: '/property-custodian/items' },
];

const Inventory: React.FC = () => {
    const { items } = usePage<PageProps>().props;
    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [form, setForm] = useState({ id: null as number | null, name: '', quantity: '', unit_price: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

    const openModal = (item?: Item) => {
        setError(null);
        if (item) {
            setEditMode(true);
            setForm({
                id: item.id,
                name: item.name,
                quantity: String(item.quantity),
                unit_price: item.unit_price,
            });
        } else {
            setEditMode(false);
            setForm({ id: null, name: '', quantity: '', unit_price: '' });
        }
        setShowModal(true);
    };

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        const url = editMode && form.id ? `/property-custodian/items/${form.id}` : '/property-custodian/items';
        const method = editMode ? 'PUT' : 'POST';
        const res = await fetch(url, {
            method,
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-CSRF-TOKEN': token,
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({
                name: form.name,
                quantity: Number(form.quantity),
                unit_price: form.unit_price,
            }),
        });
        setLoading(false);
        if (res.ok) {
            setShowModal(false);
            window.location.reload();
        } else {
            const err = await res.json().catch(() => ({}));
            setError(err.message || 'Failed to save item.');
        }
    };

    const handleDelete = async (id: number) => {
        if (window.confirm('Are you sure you want to delete this item?')) {
            setLoading(true);
            setError(null);
            const res = await fetch(`/property-custodian/items/${id}`, {
                method: 'DELETE',
                credentials: 'same-origin',
                headers: {
                    'X-CSRF-TOKEN': token,
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });
            setLoading(false);
            if (res.ok) {
                window.location.reload();
            } else {
                setError('Failed to delete item.');
            }
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Inventory" />
            <div className="flex flex-col gap-4 p-4 dark:bg-gray-900 dark:text-white">
                <div className="flex items-center justify-between mb-2">
                    <h1 className="text-2xl font-bold">Inventory Management</h1>
                    <Button variant="default" onClick={() => openModal()}>Add Item</Button>
                </div>
                <div className="overflow-x-auto rounded-xl shadow dark:bg-gray-800">
                    <table className="min-w-full bg-white dark:bg-gray-900">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-800">
                                <th className="py-2 px-4 text-left">Name</th>
                                <th className="py-2 px-4 text-left">Quantity</th>
                                <th className="py-2 px-4 text-left">Unit Price</th>
                                <th className="py-2 px-4 text-left">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items && items.length > 0 ? items.map((item: Item) => (
                                <tr key={item.id} className="border-b dark:border-gray-700">
                                    <td className="py-2 px-4">{item.name}</td>
                                    <td className="py-2 px-4">{item.quantity}</td>
                                    <td className="py-2 px-4">₱ {item.unit_price}</td>
                                    <td className="py-2 px-4">
                                        <Button size="sm" variant="outline" className="mr-2" onClick={() => openModal(item)}>Edit</Button>
                                        <Button size="sm" variant="destructive" onClick={() => handleDelete(item.id)}>Delete</Button>
                                    </td>
                                </tr>
                            )) : (
                                <tr><td colSpan={4} className="text-center py-4 text-gray-400">No items found.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {/* Modal for create/edit item */}
                <Dialog open={showModal} onOpenChange={setShowModal}>
                    <DialogContent className="max-w-md w-full dark:bg-gray-900 dark:text-white">
                        <DialogHeader>
                            <DialogTitle>{editMode ? 'Edit Item' : 'Add Item'}</DialogTitle>
                        </DialogHeader>
                        {error && <div className="text-red-500 mb-2">{error}</div>}
                        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                            <input
                                type="text"
                                name="name"
                                placeholder="Name"
                                value={form.name}
                                onChange={handleFormChange}
                                className="border rounded p-2 dark:bg-gray-800 dark:text-white"
                                required
                            />
                            <input
                                type="number"
                                name="quantity"
                                placeholder="Quantity"
                                value={form.quantity}
                                onChange={handleFormChange}
                                className="border rounded p-2 dark:bg-gray-800 dark:text-white"
                                min={0}
                                required
                            />
                            <input
                                type="number"
                                name="unit_price"
                                placeholder="Unit Price"
                                value={form.unit_price}
                                onChange={handleFormChange}
                                className="border rounded p-2 dark:bg-gray-800 dark:text-white"
                                min={0}
                                step="0.01"
                                required
                            />
                            <div className="flex justify-end gap-2">
                                <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
                                <Button type="submit" variant="default" disabled={loading}>{editMode ? 'Update' : 'Create'}</Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
};

export default Inventory;
