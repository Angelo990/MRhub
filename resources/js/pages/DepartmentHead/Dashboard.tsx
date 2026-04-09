import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Head, usePage } from '@inertiajs/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: dashboard().url,
    },
];

export default function Dashboard() {
    const { departmentName, stats, requestsByStatus, mostRequestedItems, monthlyRequests } = usePage<SharedData & {
        departmentName: string;
        stats: {
            totalRequests: number;
            pendingRequests: number;
            approvedRequests: number;
            completedRequests: number;
            rejectedRequests: number;
            estimatedRequestValue: number;
        };
        requestsByStatus: Array<{ name: string; count: number }>;
        mostRequestedItems: Array<{ name: string; count: number }>;
        monthlyRequests: Array<{ name: string; count: number }>;
    }>().props;

    const chartColors = ['#14532d', '#1d4ed8', '#0f766e', '#7c3aed', '#be123c', '#c2410c'];
    const formatCurrency = (value: number) => `PHP ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const metricCards = [
        {
            label: 'Total Requests',
            value: stats.totalRequests,
            description: 'All requests submitted by this department.',
        },
        {
            label: 'Pending Requests',
            value: stats.pendingRequests,
            description: 'Requests still waiting for endorsement or finance approval.',
        },
        {
            label: 'Approved / Released',
            value: stats.approvedRequests,
            description: 'Requests already approved or released for pickup.',
        },
        {
            label: 'Completed Requests',
            value: stats.completedRequests,
            description: 'Requests fully received and confirmed by the department.',
        },
        {
            label: 'Rejected Requests',
            value: stats.rejectedRequests,
            description: 'Requests rejected during the approval process.',
        },
        {
            label: 'Estimated Request Value',
            value: formatCurrency(stats.estimatedRequestValue),
            description: 'Estimated value of the department’s requested items.',
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${departmentName} Dashboard`} />
            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-4">
                <div className="space-y-1">
                    <h1 className="text-2xl font-bold">{departmentName} Dashboard</h1>
                    <p className="text-muted-foreground text-sm">
                        Department-level view of request progress, demand, and overall request value.
                    </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {metricCards.map((card) => (
                        <Card key={card.label} className="border-border/70 bg-card/80 backdrop-blur">
                            <CardHeader className="gap-2">
                                <CardDescription>{card.label}</CardDescription>
                                <CardTitle className="text-3xl">{card.value}</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-0 text-sm text-muted-foreground">
                                {card.description}
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <div className="grid gap-6 xl:grid-cols-2">
                    <Card className="border-border/70 bg-card/80 backdrop-blur">
                        <CardHeader>
                            <CardTitle>Requests by Status</CardTitle>
                            <CardDescription>
                                Current distribution of this department’s requests across the workflow.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[340px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={requestsByStatus} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                                        <XAxis dataKey="name" tickLine={false} axisLine={false} />
                                        <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                                        <Tooltip cursor={{ fill: 'rgba(15, 23, 42, 0.06)' }} />
                                        <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                                            {requestsByStatus.map((entry, index) => (
                                                <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-border/70 bg-card/80 backdrop-blur">
                        <CardHeader>
                            <CardTitle>Monthly Request Activity</CardTitle>
                            <CardDescription>
                                Request submission volume for the most recent months in this department.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[340px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={monthlyRequests} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                                        <XAxis dataKey="name" tickLine={false} axisLine={false} />
                                        <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                                        <Tooltip cursor={{ stroke: 'rgba(15, 23, 42, 0.16)', strokeWidth: 1 }} />
                                        <Line type="monotone" dataKey="count" stroke="#1d4ed8" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Card className="border-border/70 bg-card/80 backdrop-blur">
                    <CardHeader>
                        <CardTitle>Most Requested Items</CardTitle>
                        <CardDescription>
                            Items most frequently requested by this department.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[380px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={mostRequestedItems} layout="vertical" margin={{ top: 8, right: 16, left: 16, bottom: 8 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.2} />
                                    <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
                                    <YAxis dataKey="name" type="category" width={170} tickLine={false} axisLine={false} />
                                    <Tooltip cursor={{ fill: 'rgba(15, 23, 42, 0.06)' }} />
                                    <Bar dataKey="count" radius={[0, 8, 8, 0]} fill="#0f766e" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
