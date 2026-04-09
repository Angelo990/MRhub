import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Head, usePage } from '@inertiajs/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: dashboard().url,
    },
];

export default function Dashboard() {
    const { stats, departmentRequestCost, itemRequestCost, costByStatus } = usePage<SharedData & {
        stats: {
            totalRequestValue: number;
            pendingApprovalValue: number;
            approvedValue: number;
            releasedValue: number;
            averageRequestValue: number;
            pendingApprovals: number;
        };
        departmentRequestCost: Array<{ name: string; total: number }>;
        itemRequestCost: Array<{ name: string; total: number }>;
        costByStatus: Array<{ name: string; total: number }>;
    }>().props;

    const palette = ['#14532d', '#0f766e', '#1d4ed8', '#7c3aed', '#c2410c', '#be123c'];
    const formatCurrency = (value: number) => `PHP ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const metricCards = [
        {
            label: 'Total Request Value',
            value: formatCurrency(stats.totalRequestValue),
            description: 'Estimated value of all requested items across the system.',
        },
        {
            label: 'Pending Approval Value',
            value: formatCurrency(stats.pendingApprovalValue),
            description: 'Request value currently waiting on VP Finance action.',
        },
        {
            label: 'Approved Value',
            value: formatCurrency(stats.approvedValue),
            description: 'Value already approved for release or already fulfilled.',
        },
        {
            label: 'Released Spending',
            value: formatCurrency(stats.releasedValue),
            description: 'Actual released amount based on generated delivery receipts.',
        },
        {
            label: 'Average Request Value',
            value: formatCurrency(stats.averageRequestValue),
            description: 'Average estimated cost per request record.',
        },
        {
            label: 'Pending Approvals',
            value: stats.pendingApprovals.toString(),
            description: 'Requests still waiting for finance approval or rejection.',
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />
            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-4">
                <div className="space-y-1">
                    <h1 className="text-2xl font-bold">VP Finance Dashboard</h1>
                    <p className="text-muted-foreground text-sm">
                        Financial view of departmental demand, approval exposure, and released cost.
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
                            <CardTitle>Department Request Cost</CardTitle>
                            <CardDescription>
                                Estimated request value by department based on requested quantities and unit prices.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[340px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={departmentRequestCost} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                                        <XAxis dataKey="name" tickLine={false} axisLine={false} />
                                        <YAxis tickFormatter={(value) => value.toLocaleString()} tickLine={false} axisLine={false} />
                                        <Tooltip formatter={(value) => formatCurrency(Number(value))} cursor={{ fill: 'rgba(15, 23, 42, 0.06)' }} />
                                        <Bar dataKey="total" radius={[8, 8, 0, 0]}>
                                            {departmentRequestCost.map((entry, index) => (
                                                <Cell key={entry.name} fill={palette[index % palette.length]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-border/70 bg-card/80 backdrop-blur">
                        <CardHeader>
                            <CardTitle>Cost by Request Status</CardTitle>
                            <CardDescription>
                                How the request value is distributed across approval and release stages.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[340px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={costByStatus}
                                            dataKey="total"
                                            nameKey="name"
                                            cx="50%"
                                            cy="50%"
                                            outerRadius={118}
                                            innerRadius={56}
                                            paddingAngle={4}
                                        >
                                            {costByStatus.map((entry, index) => (
                                                <Cell key={entry.name} fill={palette[index % palette.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Card className="border-border/70 bg-card/80 backdrop-blur">
                    <CardHeader>
                        <CardTitle>Most Costly Requested Items</CardTitle>
                        <CardDescription>
                            Items with the highest total requested value across all departments.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[380px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={itemRequestCost} layout="vertical" margin={{ top: 8, right: 16, left: 16, bottom: 8 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.2} />
                                    <XAxis type="number" tickFormatter={(value) => value.toLocaleString()} tickLine={false} axisLine={false} />
                                    <YAxis dataKey="name" type="category" width={180} tickLine={false} axisLine={false} />
                                    <Tooltip formatter={(value) => formatCurrency(Number(value))} cursor={{ fill: 'rgba(15, 23, 42, 0.06)' }} />
                                    <Bar dataKey="total" radius={[0, 8, 8, 0]} fill="#1d4ed8" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
