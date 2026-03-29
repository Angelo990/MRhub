import React from 'react';
import AppLayout from '@/layouts/app-layout';
import { usePage, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';

// Type definitions
interface Department {
    id: number;
    name: string;
}
interface RequestItem {
    id: number;
    item_id: number;
    quantity: number;
    particular: string;
    unit: string;
}
interface Request {
    id: number;
    date: string;
    department: Department;
    purpose: string;
    requested_by: string;
    status: string;
    items: RequestItem[];
}
interface PageProps {
    requests: Request[];
}
export default function Requests() {
    // Main component logic starts here
    const { requests } = (usePage().props as unknown as PageProps);
    const handleApprove = (id: number) => {
        router.post(`/vp-finance/requests/${id}/approve`);
    };
    const handleReject = (id: number) => {
        router.post(`/vp-finance/requests/${id}/reject`);
    };
    return (
        <AppLayout>
            <div className="flex flex-col gap-4 p-4 dark:bg-gray-900 dark:text-white">
                <div className="flex items-center justify-between mb-2">
                    <h1 className="text-2xl font-bold">Requests for Approval</h1>
                </div>
                <div className="overflow-x-auto rounded-xl shadow dark:bg-gray-800">
                    <table className="min-w-full bg-white dark:bg-gray-900">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-800">
                                <th className="py-2 px-4 text-left">Date</th>
                                <th className="py-2 px-4 text-left">Department</th>
                                <th className="py-2 px-4 text-left">Purpose</th>
                                <th className="py-2 px-4 text-left">Requested By</th>
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
                                    <td className="py-2 px-4">{req.requested_by}</td>
                                    <td className="py-2 px-4">{req.status}</td>
                                    <td className="py-2 px-4">
                                        {req.items.map((item) => (
                                            <div key={item.id}>
                                                {item.particular} ({item.quantity} {item.unit})
                                            </div>
                                        ))}
                                    </td>
                                    <td className="py-2 px-4 flex gap-2">
                                        <Button size="sm" variant="default" onClick={() => handleApprove(req.id)}>Approve</Button>
                                        <Button size="sm" variant="destructive" onClick={() => handleReject(req.id)}>Reject</Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </AppLayout>
    );
}

// Main component logic starts here
const { requests } = (usePage().props as unknown as PageProps);
const handleApprove = (id: number) => {
        router.post(`/vp-finance/requests/${id}/approve`);
    };
    const handleReject = (id: number) => {
        router.post(`/vp-finance/requests/${id}/reject`);
    };
    return (
        <AppLayout>
            <div className="flex flex-col gap-4 p-4 dark:bg-gray-900 dark:text-white">
                <div className="flex items-center justify-between mb-2">
                    <h1 className="text-2xl font-bold">Requests for Approval</h1>
                </div>
                <div className="overflow-x-auto rounded-xl shadow dark:bg-gray-800">
                    <table className="min-w-full bg-white dark:bg-gray-900">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-800">
                                <th className="py-2 px-4 text-left">Date</th>
                                <th className="py-2 px-4 text-left">Department</th>
                                <th className="py-2 px-4 text-left">Purpose</th>
                                <th className="py-2 px-4 text-left">Requested By</th>
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
                                    <td className="py-2 px-4">{req.requested_by}</td>
                                    <td className="py-2 px-4">{req.status}</td>
                                    <td className="py-2 px-4">
                                        {req.items.map((item) => (
                                            <div key={item.id}>
                                                {item.particular} ({item.quantity} {item.unit})
                                            </div>
                                        ))}
                                    </td>
                                    <td className="py-2 px-4 flex gap-2">
                                        <Button size="sm" variant="default" onClick={() => handleApprove(req.id)}>Approve</Button>
                                        <Button size="sm" variant="destructive" onClick={() => handleReject(req.id)}>Reject</Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </AppLayout>
    );
}
