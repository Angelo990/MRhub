import { useEffect, useMemo, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Head, usePage } from '@inertiajs/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { normalizeOrder, reorderIds } from '../../lib/dashboard-layout';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: dashboard().url,
    },
];

export default function Dashboard() {
    const { stats, requestStatuses, stockLevels, stockMovements, lowStockItems, requestsByDepartment, requestedItemsByDepartment, mostRequestedItems } = usePage<SharedData & {
        stats: {
            totalItems: number;
            totalUnitsOnHand: number;
            lowStockItems: number;
            pendingEndorsement: number;
            approvedForRelease: number;
            releasedRequests: number;
        };
        requestStatuses: Array<{ name: string; count: number }>;
        stockLevels: Array<{ name: string; quantity: number; unit: string }>;
        stockMovements: Array<{ name: string; quantity: number }>;
        lowStockItems: Array<{ id: number; name: string; quantity: number; unit: string }>;
        requestsByDepartment: Array<{ name: string; count: number }>;
        requestedItemsByDepartment: Array<{ name: string; count: number }>;
        mostRequestedItems: Array<{ name: string; count: number }>;
    }>().props;

    const requestColors = ['#b45309', '#1d4ed8', '#15803d', '#0f766e', '#475569', '#be123c'];
    const movementColors = ['#15803d', '#be123c'];
    const departmentColors = ['#14532d', '#0f766e', '#1d4ed8', '#7c3aed', '#c2410c', '#be123c'];
    const chartIds = [
        'request-pipeline',
        'stock-movement',
        'top-stock-levels',
        'low-stock-alerts',
        'most-requested-departments',
        'items-by-department',
        'most-requested-items',
    ];
    const storageKey = 'dashboard:property-custodian:layout';
    const [editMode, setEditMode] = useState(false);
    const [draggedCardId, setDraggedCardId] = useState<string | null>(null);
    const [chartOrder, setChartOrder] = useState(chartIds);
    const [visibleCharts, setVisibleCharts] = useState<Record<string, boolean>>({
        'request-pipeline': true,
        'stock-movement': true,
        'top-stock-levels': true,
        'low-stock-alerts': true,
        'most-requested-departments': true,
        'items-by-department': true,
        'most-requested-items': true,
    });

    const metricCards = [
        {
            label: 'Total Items',
            value: stats.totalItems,
            description: 'Distinct inventory articles maintained by Property Custodian.',
        },
        {
            label: 'Units On Hand',
            value: stats.totalUnitsOnHand,
            description: 'Combined quantity currently available across all inventory items.',
        },
        {
            label: 'Low Stock Items',
            value: stats.lowStockItems,
            description: 'Items at or below 5 units that may need replenishment soon.',
        },
        {
            label: 'Pending Endorsement',
            value: stats.pendingEndorsement,
            description: 'Requests still waiting for Property Custodian endorsement.',
        },
        {
            label: 'Approved For Release',
            value: stats.approvedForRelease,
            description: 'Approved requests that can already be released to claimants.',
        },
        {
            label: 'Released Requests',
            value: stats.releasedRequests,
            description: 'Requests already released and awaiting final department confirmation.',
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
            id: 'request-pipeline',
            title: 'Request Pipeline',
            description: 'Current request counts across the Property Custodian workflow.',
            className: '',
            content: (
                <div className="h-[340px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={requestStatuses} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                            <XAxis dataKey="name" tickLine={false} axisLine={false} />
                            <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                            <Tooltip cursor={{ fill: 'rgba(15, 23, 42, 0.06)' }} />
                            <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                                {requestStatuses.map((entry, index) => (
                                    <Cell key={entry.name} fill={requestColors[index % requestColors.length]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            ),
        },
        {
            id: 'stock-movement',
            title: 'Stock Movement',
            description: 'Aggregate stock-in versus stock-out activity from the stock card ledger.',
            className: '',
            content: (
                <div className="h-[340px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={stockMovements}
                                dataKey="quantity"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                outerRadius={118}
                                innerRadius={56}
                                paddingAngle={4}
                            >
                                {stockMovements.map((entry, index) => (
                                    <Cell key={entry.name} fill={movementColors[index % movementColors.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            ),
        },
        {
            id: 'top-stock-levels',
            title: 'Top Stock Levels',
            description: 'Items with the highest current quantity on hand.',
            className: '',
            content: (
                <div className="h-[360px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stockLevels} layout="vertical" margin={{ top: 8, right: 16, left: 16, bottom: 8 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.2} />
                            <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
                            <YAxis dataKey="name" type="category" width={120} tickLine={false} axisLine={false} />
                            <Tooltip cursor={{ fill: 'rgba(15, 23, 42, 0.06)' }} />
                            <Bar dataKey="quantity" radius={[0, 8, 8, 0]} fill="#0f766e" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            ),
        },
        {
            id: 'low-stock-alerts',
            title: 'Low Stock Alerts',
            description: 'Items that should be reviewed for replenishment first.',
            className: '',
            content: (
                <div className="space-y-3 text-sm">
                    {lowStockItems.length > 0 ? lowStockItems.map((item) => (
                        <div key={item.id} className="flex items-center justify-between rounded-lg border border-border/70 bg-background/60 px-3 py-3">
                            <div>
                                <div className="font-medium">{item.name}</div>
                                <div className="text-muted-foreground text-xs">Unit: {item.unit}</div>
                            </div>
                            <div className="text-right">
                                <div className="text-lg font-semibold">{item.quantity}</div>
                                <div className="text-muted-foreground text-xs">on hand</div>
                            </div>
                        </div>
                    )) : (
                        <div className="rounded-lg border border-border/70 bg-background/60 p-3 text-muted-foreground">
                            No low-stock items at the moment.
                        </div>
                    )}
                </div>
            ),
        },
        {
            id: 'most-requested-departments',
            title: 'Most Requested Departments',
            description: 'Departments with the highest number of submitted requests.',
            className: '',
            content: (
                <div className="h-[340px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={requestsByDepartment} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                            <XAxis dataKey="name" tickLine={false} axisLine={false} />
                            <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                            <Tooltip cursor={{ fill: 'rgba(15, 23, 42, 0.06)' }} />
                            <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                                {requestsByDepartment.map((entry, index) => (
                                    <Cell key={entry.name} fill={departmentColors[index % departmentColors.length]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            ),
        },
        {
            id: 'items-by-department',
            title: 'Departments with Most Items Requested',
            description: 'Total requested item quantities grouped by department.',
            className: '',
            content: (
                <div className="h-[340px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={requestedItemsByDepartment} layout="vertical" margin={{ top: 8, right: 16, left: 16, bottom: 8 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.2} />
                            <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
                            <YAxis dataKey="name" type="category" width={130} tickLine={false} axisLine={false} />
                            <Tooltip cursor={{ fill: 'rgba(15, 23, 42, 0.06)' }} />
                            <Bar dataKey="count" radius={[0, 8, 8, 0]} fill="#1d4ed8" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            ),
        },
        {
            id: 'most-requested-items',
            title: 'Most Requested Items',
            description: 'Inventory items with the highest total requested quantities.',
            className: 'xl:col-span-2',
            content: (
                <div className="h-[360px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={mostRequestedItems} layout="vertical" margin={{ top: 8, right: 16, left: 16, bottom: 8 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.2} />
                            <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
                            <YAxis dataKey="name" type="category" width={180} tickLine={false} axisLine={false} />
                            <Tooltip cursor={{ fill: 'rgba(15, 23, 42, 0.06)' }} />
                            <Bar dataKey="count" radius={[0, 8, 8, 0]} fill="#7c3aed" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            ),
        },
    ], [lowStockItems, mostRequestedItems, requestStatuses, requestedItemsByDepartment, requestsByDepartment, stockLevels, stockMovements]);

    const orderedVisibleCards = chartOrder
        .map((id) => chartCards.find((card) => card.id === id))
        .filter((card): card is NonNullable<typeof card> => Boolean(card && visibleCharts[card.id]));

    const toggleChartVisibility = (id: string) => {
        setVisibleCharts((current) => ({ ...current, [id]: !current[id] }));
    };

    const resetLayout = () => {
        setChartOrder(chartIds);
        setVisibleCharts({
            'request-pipeline': true,
            'stock-movement': true,
            'top-stock-levels': true,
            'low-stock-alerts': true,
            'most-requested-departments': true,
            'items-by-department': true,
            'most-requested-items': true,
        });
    };

    const handleDrop = (targetId: string) => {
        if (!draggedCardId) {
            return;
        }

        setChartOrder((current) => reorderIds(current, draggedCardId, targetId));
        setDraggedCardId(null);
    };

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

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />
            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-1">
                        <h1 className="text-2xl font-bold">Property Custodian Dashboard</h1>
                        <p className="text-muted-foreground text-sm">
                            Operational view of inventory pressure, request handling, and stock movement.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button type="button" variant={editMode ? 'default' : 'outline'} onClick={() => setEditMode((current) => !current)}>
                            {editMode ? 'Done Editing' : 'Edit Dashboard'}
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
                                Drag dashboard cards to reorder them and toggle any chart or alert card on or off.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
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
