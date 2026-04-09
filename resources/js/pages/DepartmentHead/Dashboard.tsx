import { useEffect, useMemo, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { normalizeOrder, reorderIds } from '../../lib/dashboard-layout';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: dashboard().url,
    },
];

export default function Dashboard() {
    const { departmentName, stats, requestsByStatus, mostRequestedItems, monthlyRequests, recentRequests } = usePage<SharedData & {
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
        recentRequests: Array<{
            id: number;
            date: string;
            purpose: string;
            status: string;
            itemCount: number;
            totalQuantity: number;
            estimatedValue: number;
            canMarkReceived: boolean;
        }>;
    }>().props;

    const chartColors = ['#14532d', '#1d4ed8', '#0f766e', '#7c3aed', '#be123c', '#c2410c'];
    const chartIds = ['requests-by-status', 'monthly-request-activity', 'most-requested-items', 'recent-requests'];
    const storageKey = 'dashboard:department-head:layout';
    const [editMode, setEditMode] = useState(false);
    const [draggedCardId, setDraggedCardId] = useState<string | null>(null);
    const [chartOrder, setChartOrder] = useState(chartIds);
    const [visibleCharts, setVisibleCharts] = useState<Record<string, boolean>>({
        'requests-by-status': true,
        'monthly-request-activity': true,
        'most-requested-items': true,
        'recent-requests': true,
    });

    const formatCurrency = (value: number) => `PHP ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const getDisplayStatus = (status: string) => {
        if (status === 'Ready for Pickup') {
            return 'Released';
        }

        if (status === 'Completed') {
            return 'Completed / Received';
        }

        return status;
    };

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

    useEffect(() => {
        const raw = window.localStorage.getItem(storageKey);

        if (!raw) {
            return;
        }

        try {
            const parsed = JSON.parse(raw) as {
                order?: string[];
                visible?: Record<string, boolean>;
            };

            if (parsed.order) {
                setChartOrder(normalizeOrder(parsed.order, chartIds));
            }

            if (parsed.visible) {
                setVisibleCharts((current) => ({ ...current, ...parsed.visible }));
            }
        } catch {
            window.localStorage.removeItem(storageKey);
        }
    }, []);

    useEffect(() => {
        window.localStorage.setItem(storageKey, JSON.stringify({
            order: chartOrder,
            visible: visibleCharts,
        }));
    }, [chartOrder, visibleCharts]);

    const chartCards = useMemo(() => [
        {
            id: 'requests-by-status',
            title: 'Requests by Status',
            description: 'Current distribution of this department’s requests across the workflow.',
            className: '',
            content: (
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
            ),
        },
        {
            id: 'monthly-request-activity',
            title: 'Monthly Request Activity',
            description: 'Request submission volume for the most recent months in this department.',
            className: '',
            content: (
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
            ),
        },
        {
            id: 'most-requested-items',
            title: 'Most Requested Items',
            description: 'Items most frequently requested by this department.',
            className: 'xl:col-span-2',
            content: (
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
            ),
        },
        {
            id: 'recent-requests',
            title: 'Recent Requests',
            description: 'Latest department requests that may need monitoring or follow-up.',
            className: 'xl:col-span-2',
            content: (
                <div className="space-y-3">
                    {recentRequests.length > 0 ? recentRequests.map((request) => (
                        <div key={request.id} className="flex flex-col gap-3 rounded-lg border border-border/70 bg-background/60 px-4 py-4 md:flex-row md:items-center md:justify-between">
                            <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-2 text-sm">
                                    <span className="font-semibold">Request #{request.id}</span>
                                    <span className="text-muted-foreground">{request.date}</span>
                                    <span className="rounded-full border border-border/70 px-2 py-0.5 text-xs">
                                        {getDisplayStatus(request.status)}
                                    </span>
                                </div>
                                <div className="text-sm font-medium">{request.purpose}</div>
                                <div className="text-muted-foreground flex flex-wrap gap-3 text-xs">
                                    <span>{request.itemCount} item lines</span>
                                    <span>{request.totalQuantity} total quantity</span>
                                    <span>{formatCurrency(request.estimatedValue)}</span>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Button type="button" variant="outline" asChild>
                                    <Link href="/department-head/requests">View Requests</Link>
                                </Button>
                                {request.canMarkReceived && (
                                    <Button type="button" variant="secondary" asChild>
                                        <Link href="/department-head/requests">Open Receipt Queue</Link>
                                    </Button>
                                )}
                            </div>
                        </div>
                    )) : (
                        <div className="rounded-lg border border-border/70 bg-background/60 p-4 text-sm text-muted-foreground">
                            No recent requests found for this department yet.
                        </div>
                    )}
                </div>
            ),
        },
    ], [monthlyRequests, mostRequestedItems, recentRequests, requestsByStatus]);

    const orderedVisibleCards = chartOrder
        .map((id) => chartCards.find((card) => card.id === id))
        .filter((card): card is NonNullable<typeof card> => Boolean(card && visibleCharts[card.id]));

    const toggleChartVisibility = (id: string) => {
        setVisibleCharts((current) => ({ ...current, [id]: !current[id] }));
    };

    const resetLayout = () => {
        setChartOrder(chartIds);
        setVisibleCharts({
            'requests-by-status': true,
            'monthly-request-activity': true,
            'most-requested-items': true,
            'recent-requests': true,
        });
    };

    const handleDrop = (targetId: string) => {
        if (!draggedCardId) {
            return;
        }

        setChartOrder((current) => reorderIds(current, draggedCardId, targetId));
        setDraggedCardId(null);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${departmentName} Dashboard`} />
            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-1">
                        <h1 className="text-2xl font-bold">{departmentName} Dashboard</h1>
                        <p className="text-muted-foreground text-sm">
                            Department-level view of request progress, demand, and overall request value.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button type="button" variant={editMode ? 'default' : 'outline'} onClick={() => setEditMode((current) => !current)}>
                            {editMode ? 'Done Editing' : 'Edit Dashboard'}
                        </Button>
                        <Button type="button" variant="outline" asChild>
                            <Link href="/department-head/requests/create">Create Request</Link>
                        </Button>
                        {editMode && (
                            <Button type="button" variant="secondary" onClick={resetLayout}>
                                Reset Layout
                            </Button>
                        )}
                    </div>
                </div>

                {editMode && (
                    <Card className="border-border/70 bg-card/80 backdrop-blur">
                        <CardHeader>
                            <CardTitle>Dashboard Controls</CardTitle>
                            <CardDescription>
                                Drag dashboard cards to reorder them and toggle any chart or activity card on or off.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                            {chartCards.map((card) => (
                                <label key={card.id} className="flex items-center gap-3 rounded-lg border border-border/70 bg-background/60 px-3 py-3 text-sm">
                                    <input
                                        type="checkbox"
                                        checked={visibleCharts[card.id]}
                                        onChange={() => toggleChartVisibility(card.id)}
                                    />
                                    <span>{card.title}</span>
                                </label>
                            ))}
                        </CardContent>
                    </Card>
                )}

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
                    {orderedVisibleCards.map((card) => (
                        <div
                            key={card.id}
                            className={card.className}
                            draggable={editMode}
                            onDragStart={() => setDraggedCardId(card.id)}
                            onDragOver={(event) => {
                                if (editMode) {
                                    event.preventDefault();
                                }
                            }}
                            onDrop={() => handleDrop(card.id)}
                            onDragEnd={() => setDraggedCardId(null)}
                        >
                            <Card className={`border-border/70 bg-card/80 backdrop-blur ${editMode ? 'cursor-move' : ''} ${draggedCardId === card.id ? 'opacity-70' : ''}`}>
                                <CardHeader>
                                    <CardTitle>{card.title}</CardTitle>
                                    <CardDescription>{card.description}</CardDescription>
                                </CardHeader>
                                <CardContent>{card.content}</CardContent>
                            </Card>
                        </div>
                    ))}
                </div>
            </div>
        </AppLayout>
    );
}
