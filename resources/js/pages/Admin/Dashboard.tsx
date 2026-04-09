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
    const { usersByRole, usersByDepartment, requestsByStatus, stats } = usePage<SharedData & {
        usersByRole: Array<{ name: string; count: number }>;
        usersByDepartment: Array<{ name: string; count: number }>;
        requestsByStatus: Array<{ name: string; count: number }>;
        stats: {
            totalUsers: number;
            departmentHeads: number;
            totalDepartments: number;
            pendingRequests: number;
            releasedRequests: number;
            lowStockItems: number;
        };
    }>().props;

    const chartColors = ['#14532d', '#0f766e', '#1d4ed8', '#b45309', '#be123c', '#4338ca'];
    const departmentColors = ['#0f766e', '#0284c7', '#7c3aed', '#c2410c', '#be123c', '#4f46e5', '#15803d'];

    const metricCards = [
        {
            label: 'Total Users',
            value: stats.totalUsers,
            description: 'All accounts currently registered in the system.',
        },
        {
            label: 'Department Heads',
            value: stats.departmentHeads,
            description: 'Users assigned to departmental request approval and receipt confirmation.',
        },
        {
            label: 'Departments',
            value: stats.totalDepartments,
            description: 'Departments currently represented in the system.',
        },
        {
            label: 'Pending Requests',
            value: stats.pendingRequests,
            description: 'Requests still waiting for endorsement or finance approval.',
        },
        {
            label: 'Released Requests',
            value: stats.releasedRequests,
            description: 'Requests already released by the Property Custodian.',
        },
        {
            label: 'Low Stock Items',
            value: stats.lowStockItems,
            description: 'Inventory items at or below 5 units on hand.',
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />
            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-4">
                <div className="space-y-1">
                    <h1 className="text-2xl font-bold">Admin Dashboard</h1>
                    <p className="text-muted-foreground text-sm">
                        High-level visibility into user distribution and operational load.
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
                            <CardTitle>Users by Role</CardTitle>
                            <CardDescription>
                                Current account distribution across system roles.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[340px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={usersByRole} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                                        <XAxis dataKey="name" tickLine={false} axisLine={false} />
                                        <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                                        <Tooltip cursor={{ fill: 'rgba(15, 23, 42, 0.06)' }} />
                                        <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                                            {usersByRole.map((entry, index) => (
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
                            <CardTitle>Requests by Status</CardTitle>
                            <CardDescription>
                                Current request distribution across the workflow.
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
                                        <Bar dataKey="count" radius={[8, 8, 0, 0]} fill="#0f766e" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Card className="border-border/70 bg-card/80 backdrop-blur">
                    <CardHeader>
                        <CardTitle>Users by Department</CardTitle>
                        <CardDescription>
                            Department-level distribution of user accounts.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[360px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={usersByDepartment}
                                        dataKey="count"
                                        nameKey="name"
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={120}
                                        innerRadius={58}
                                        paddingAngle={3}
                                    >
                                        {usersByDepartment.map((entry, index) => (
                                            <Cell key={entry.name} fill={departmentColors[index % departmentColors.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                            {usersByDepartment.map((department, index) => (
                                <div key={department.name} className="flex items-center justify-between rounded-lg border border-border/70 bg-background/60 px-3 py-2 text-sm">
                                    <div className="flex items-center gap-2">
                                        <span
                                            className="h-3 w-3 rounded-full"
                                            style={{ backgroundColor: departmentColors[index % departmentColors.length] }}
                                        />
                                        <span>{department.name}</span>
                                    </div>
                                    <span className="font-semibold">{department.count}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
