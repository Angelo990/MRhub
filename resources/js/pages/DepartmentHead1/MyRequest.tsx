import React from 'react';
import AppLayout from '@/layouts/app-layout';
import { usePage, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';

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
interface Request {
    id: number;
    date: string;
    department: Department;
    purpose: string;
    requested_by: string;
    reviewed_by: string;
    approved_by: string;
    noted_by: string;
    status: string;
    items: RequestItem[];
}
interface PageProps {
    requests: Request[];
}

export default function MyRequest() {
    const { requests } = usePage<{ [key: string]: any } & PageProps>().props;
    return (
        <AppLayout>
            <div className="max-w-4xl mx-auto p-4">
                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-2xl font-bold">My Requests</h1>
                    <Button variant="default" onClick={() => window.location.href = '/department-head/requests/create'}>
                        Create Request
                    </Button>
                </div>
                <table className="min-w-full bg-white dark:bg-gray-900 rounded shadow">
                    <thead>
                        <tr className="bg-gray-50 dark:bg-gray-800">
                            <th className="py-2 px-4">Date</th>
                            <th className="py-2 px-4">Department</th>
                            <th className="py-2 px-4">Purpose</th>
                            <th className="py-2 px-4">Status</th>
                            <th className="py-2 px-4">Items</th>
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
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </AppLayout>
    );
}
