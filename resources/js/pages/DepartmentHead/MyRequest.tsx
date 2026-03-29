import React, { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { usePage, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface RequestItem {
    id: number;
    item_id: number;
    quantity: number;
    particular: string;
    unit: string;
}
interface Department {
    id: number;
    name: string;
}
interface ReceiptItem {
    id: number;
    particular: string;
    quantity_delivered: number;
    unit: string;
    unit_cost: number;
    total: number;
}
interface DeliveryReceipt {
    id: number;
    delivery_date: string;
    prepared_by: string;
    checked_by: string;
    received_by: string;
    status: string;
    total: number;
    items?: ReceiptItem[];
}
interface Request {
    id: number;
    date: string;
    department: Department;
    purpose: string;
    requested_by: string;
    status: string;
    items: RequestItem[];
    delivery_receipt?: DeliveryReceipt;
}
interface PageProps {
    requests: Request[];
}

export default function MyRequest() {
    const { requests, csrf_token } = (usePage().props as unknown as PageProps & { csrf_token: string });
    const [openReceipt, setOpenReceipt] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const handleMarkReceived = async (id: number) => {
        setLoading(true);
        setError(null);
        try {
            await fetch(`/department-head/requests/${id}/received`, {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': csrf_token,
                },
                body: JSON.stringify({}),
            });
            window.location.reload();
        } catch (e: unknown) {
            if (e instanceof Error) {
                setError(e.message);
            } else {
                setError('Failed to mark as received.');
            }
        }
        setLoading(false);
    };
    return (
        <AppLayout>
            <div className="flex flex-col gap-4 p-4 dark:bg-gray-900 dark:text-white">
                <div className="flex items-center justify-between mb-2">
                    <h1 className="text-2xl font-bold">My Requests</h1>
                    <Button variant="default" onClick={() => router.visit('/department-head/requests/create')}>
                        Create Request
                    </Button>
                </div>
                {error && <div className="text-red-500 mb-2">{error}</div>}
                <div className="overflow-x-auto rounded-xl shadow dark:bg-gray-800">
                    <table className="min-w-full bg-white dark:bg-gray-900">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-800">
                                <th className="py-2 px-4 text-left">Date</th>
                                <th className="py-2 px-4 text-left">Department</th>
                                <th className="py-2 px-4 text-left">Purpose</th>
                                <th className="py-2 px-4 text-left">Status</th>
                                <th className="py-2 px-4 text-left">Items</th>
                                <th className="py-2 px-4 text-left">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {requests.map((req) => (
                                <tr key={req.id} className="border-b dark:border-gray-700">
                                    <td className="py-2 px-4">{req.date}</td>
                                    <td className="py-2 px-4">{req.department?.name}</td>
                                    <td className="py-2 px-4">{req.purpose}</td>
                                    <td className="py-2 px-4">{req.status}</td>
                                    <td className="py-2 px-4">
                                        {req.items.map((item) => (
                                            <div key={item.id}>
                                                {item.particular} ({item.quantity} {item.unit})
                                            </div>
                                        ))}
                                    </td>
                                    <td className="py-2 px-4 flex gap-2">
                                        {req.status === 'Ready for Pickup' && (
                                            <>
                                                <Button size="sm" variant="default" onClick={() => handleMarkReceived(req.id)} disabled={loading}>
                                                    Mark as Received
                                                </Button>
                                                <Button size="sm" variant="secondary" onClick={() => setOpenReceipt(req.id)}>
                                                    View Receipt
                                                </Button>
                                            </>
                                        )}
                                        {req.status === 'Completed' && (
                                            <Button size="sm" variant="secondary" onClick={() => setOpenReceipt(req.id)}>
                                                View Receipt
                                            </Button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {openReceipt && (() => {
                    const req = requests.find(r => r.id === openReceipt);
                    const receipt = req?.delivery_receipt;
                    return (
                        <Dialog open={!!openReceipt} onOpenChange={() => setOpenReceipt(null)}>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Delivery Receipt</DialogTitle>
                                </DialogHeader>
                                {receipt ? (
                                    <div className="space-y-2">
                                        <div><strong>Delivery Date:</strong> {receipt.delivery_date}</div>
                                        <div><strong>Prepared by:</strong> {receipt.prepared_by}</div>
                                        <div><strong>Checked & Delivered by:</strong> {receipt.checked_by}</div>
                                        <div><strong>Received by:</strong> {receipt.received_by}</div>
                                        <div><strong>Status:</strong> {req.status === 'Ready for Pickup' ? 'Ready for Pickup' : 'Completed / Received'}</div>
                                        <div><strong>Total:</strong> ₱ {receipt.total}</div>
                                        <div className="font-semibold mt-2">Items</div>
                                        <table className="min-w-full text-sm">
                                            <thead>
                                                <tr>
                                                    <th className="px-2 py-1">Item</th>
                                                    <th className="px-2 py-1">Qty</th>
                                                    <th className="px-2 py-1">Unit</th>
                                                    <th className="px-2 py-1">Unit Price</th>
                                                    <th className="px-2 py-1">Total</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {receipt.items?.map((item: ReceiptItem) => (
                                                    <tr key={item.id}>
                                                        <td className="px-2 py-1">{item.particular}</td>
                                                        <td className="px-2 py-1">{item.quantity_delivered}</td>
                                                        <td className="px-2 py-1">{item.unit}</td>
                                                        <td className="px-2 py-1">{item.unit_cost}</td>
                                                        <td className="px-2 py-1">{item.total}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div>No receipt found.</div>
                                )}
                            </DialogContent>
                        </Dialog>
                    );
                })()}
            </div>
        </AppLayout>
    );
}
