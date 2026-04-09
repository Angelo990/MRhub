import { useEffect, useMemo, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import dashboard from '@/routes/dashboard';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DASHBOARD_DATE_PRESETS, buildDashboardDateRange, detectDashboardDatePreset, type DashboardDatePresetId } from '../../lib/dashboard-date-filters';
import { normalizeOrder, reorderIds } from '../../lib/dashboard-layout';
import { exportRowsToCsv, exportRowsToExcel, exportRowsToPdf, printHtmlDocument } from '../../lib/document-export';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: dashboard.vpFinance().url,
    },
];

export default function Dashboard() {
    const { stats, departmentRequestCost, itemRequestCost, costByStatus, recentPendingApprovals, filters } = usePage<SharedData & {
        stats: {
            totalRequestValue: number;
            pendingApprovalValue: number;
            approvedValue: number;
            releasedValue: number;
            averageRequestValue: number;
            pendingApprovals: number;
            highestPendingRequestValue: number;
            highestPendingRequestDepartment: string;
        };
        departmentRequestCost: Array<{ name: string; total: number }>;
        itemRequestCost: Array<{ name: string; total: number }>;
        costByStatus: Array<{ name: string; total: number }>;
        recentPendingApprovals: Array<{
            id: number;
            date: string;
            department: string;
            requestedBy: string;
            purpose: string;
            itemCount: number;
            estimatedValue: number;
        }>;
        filters: {
            from: string | null;
            to: string | null;
        };
    }>().props;

    const palette = ['#14532d', '#0f766e', '#1d4ed8', '#7c3aed', '#c2410c', '#be123c'];
    const chartIds = ['department-request-cost', 'cost-by-status', 'most-costly-requested-items', 'recent-pending-approvals'];
    const storageKey = 'dashboard:vp-finance:layout';
    const filterStorageKey = 'dashboard:vp-finance:filters';
    const [editMode, setEditMode] = useState(false);
    const [draggedCardId, setDraggedCardId] = useState<string | null>(null);
    const [chartOrder, setChartOrder] = useState(chartIds);
    const [filterFrom, setFilterFrom] = useState(filters.from ?? '');
    const [filterTo, setFilterTo] = useState(filters.to ?? '');
    const [activePreset, setActivePreset] = useState<DashboardDatePresetId>(detectDashboardDatePreset(filters.from ?? '', filters.to ?? ''));
    const [visibleCharts, setVisibleCharts] = useState<Record<string, boolean>>({
        'department-request-cost': true,
        'cost-by-status': true,
        'most-costly-requested-items': true,
        'recent-pending-approvals': true,
    });
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
        {
            label: 'Highest Pending Request',
            value: formatCurrency(stats.highestPendingRequestValue),
            description: `${stats.highestPendingRequestDepartment} currently has the largest pending approval exposure.`,
        },
    ];

    const buildDashboardRows = () => [
        ...metricCards.map((card) => ({
            Section: 'Summary',
            Label: card.label,
            Value: card.value,
            Detail: card.description,
        })),
        ...departmentRequestCost.map((entry) => ({
            Section: 'Department Request Cost',
            Label: entry.name,
            Value: formatCurrency(entry.total),
            Detail: 'Estimated request value by department',
        })),
        ...costByStatus.map((entry) => ({
            Section: 'Cost by Request Status',
            Label: entry.name,
            Value: formatCurrency(entry.total),
            Detail: 'Estimated request value by workflow status',
        })),
        ...itemRequestCost.map((entry) => ({
            Section: 'Most Costly Requested Items',
            Label: entry.name,
            Value: formatCurrency(entry.total),
            Detail: 'Estimated requested item value',
        })),
        ...recentPendingApprovals.map((entry) => ({
            Section: 'Recent Pending Approvals',
            Label: `Request #${entry.id} - ${entry.department}`,
            Value: formatCurrency(entry.estimatedValue),
            Detail: `${entry.requestedBy} | ${entry.itemCount} item lines | ${entry.purpose}`,
        })),
    ];

    const handleExportExcel = () => {
        exportRowsToExcel(buildDashboardRows(), 'VP Finance Dashboard', 'vp_finance_dashboard_report.xlsx');
    };

    const handleExportCsv = () => {
        exportRowsToCsv(buildDashboardRows(), 'vp_finance_dashboard_report.csv');
    };

    const handleExportPdf = () => {
        exportRowsToPdf(
            'VP Finance Dashboard Report',
            metricCards.map((card) => ({ label: card.label, value: card.value })),
            ['Section', 'Label', 'Value', 'Detail'],
            buildDashboardRows().map((row) => [row.Section, row.Label, row.Value, row.Detail]),
            'vp_finance_dashboard_report.pdf',
        );
    };

    const handlePrintDashboard = () => {
        const summaryRows = metricCards.map((card) => `
            <tr>
                <td>${card.label}</td>
                <td>${card.value}</td>
                <td>${card.description}</td>
            </tr>
        `).join('');

        const departmentRows = departmentRequestCost.map((entry) => `
            <tr>
                <td>${entry.name}</td>
                <td>${formatCurrency(entry.total)}</td>
            </tr>
        `).join('');

        const statusRows = costByStatus.map((entry) => `
            <tr>
                <td>${entry.name}</td>
                <td>${formatCurrency(entry.total)}</td>
            </tr>
        `).join('');

        const itemRows = itemRequestCost.map((entry) => `
            <tr>
                <td>${entry.name}</td>
                <td>${formatCurrency(entry.total)}</td>
            </tr>
        `).join('');

        const approvalRows = recentPendingApprovals.map((entry) => `
            <tr>
                <td>${entry.id}</td>
                <td>${entry.date}</td>
                <td>${entry.department}</td>
                <td>${entry.requestedBy}</td>
                <td>${entry.itemCount}</td>
                <td>${formatCurrency(entry.estimatedValue)}</td>
            </tr>
        `).join('');

        printHtmlDocument(
            'VP Finance Dashboard Report',
            `
                <h1>VP Finance Dashboard Report</h1>
                <div class="meta">
                    <p><strong>Total Request Value:</strong> ${formatCurrency(stats.totalRequestValue)}</p>
                    <p><strong>Pending Approval Value:</strong> ${formatCurrency(stats.pendingApprovalValue)}</p>
                    <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
                </div>
                <h2>Summary Cards</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Metric</th>
                            <th>Value</th>
                            <th>Description</th>
                        </tr>
                    </thead>
                    <tbody>${summaryRows}</tbody>
                </table>
                <h2>Department Request Cost</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Department</th>
                            <th>Estimated Value</th>
                        </tr>
                    </thead>
                    <tbody>${departmentRows || '<tr><td colspan="2">No data available.</td></tr>'}</tbody>
                </table>
                <h2>Cost by Request Status</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Status</th>
                            <th>Estimated Value</th>
                        </tr>
                    </thead>
                    <tbody>${statusRows || '<tr><td colspan="2">No data available.</td></tr>'}</tbody>
                </table>
                <h2>Most Costly Requested Items</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Item</th>
                            <th>Estimated Value</th>
                        </tr>
                    </thead>
                    <tbody>${itemRows || '<tr><td colspan="2">No data available.</td></tr>'}</tbody>
                </table>
                <h2>Recent Pending Approvals</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Request ID</th>
                            <th>Date</th>
                            <th>Department</th>
                            <th>Requested By</th>
                            <th>Item Lines</th>
                            <th>Estimated Value</th>
                        </tr>
                    </thead>
                    <tbody>${approvalRows || '<tr><td colspan="6">No pending approvals.</td></tr>'}</tbody>
                </table>
            `,
        );
    };

    useEffect(() => {
        setFilterFrom(filters.from ?? '');
        setFilterTo(filters.to ?? '');
        setActivePreset(detectDashboardDatePreset(filters.from ?? '', filters.to ?? ''));
    }, [filters.from, filters.to]);

    useEffect(() => {
        const raw = window.localStorage.getItem(filterStorageKey);

        if (!raw || filters.from || filters.to) {
            return;
        }

        try {
            const parsed = JSON.parse(raw) as { from?: string | null; to?: string | null };
            const storedFrom = parsed.from ?? '';
            const storedTo = parsed.to ?? '';

            if (!storedFrom && !storedTo) {
                return;
            }

            setFilterFrom(storedFrom);
            setFilterTo(storedTo);
            setActivePreset(detectDashboardDatePreset(storedFrom, storedTo));
            router.get(dashboard.vpFinance().url, {
                ...(storedFrom ? { from: storedFrom } : {}),
                ...(storedTo ? { to: storedTo } : {}),
            }, {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            });
        } catch {
            window.localStorage.removeItem(filterStorageKey);
        }
    }, []);

    useEffect(() => {
        window.localStorage.setItem(filterStorageKey, JSON.stringify({
            from: filterFrom || null,
            to: filterTo || null,
        }));
    }, [filterFrom, filterTo]);

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
            id: 'department-request-cost',
            title: 'Department Request Cost',
            description: 'Estimated request value by department based on requested quantities and unit prices.',
            className: '',
            content: (
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
            ),
        },
        {
            id: 'cost-by-status',
            title: 'Cost by Request Status',
            description: 'How the request value is distributed across approval and release stages.',
            className: '',
            content: (
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
            ),
        },
        {
            id: 'most-costly-requested-items',
            title: 'Most Costly Requested Items',
            description: 'Items with the highest total requested value across all departments.',
            className: 'xl:col-span-2',
            content: (
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
            ),
        },
        {
            id: 'recent-pending-approvals',
            title: 'Recent Pending Approvals',
            description: 'Requests currently waiting for finance action, ordered by recency.',
            className: 'xl:col-span-2',
            content: (
                <div className="space-y-3">
                    {recentPendingApprovals.length > 0 ? recentPendingApprovals.map((request) => (
                        <div key={request.id} className="flex flex-col gap-3 rounded-lg border border-border/70 bg-background/60 px-4 py-4 md:flex-row md:items-center md:justify-between">
                            <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-2 text-sm">
                                    <span className="font-semibold">Request #{request.id}</span>
                                    <span className="text-muted-foreground">{request.date}</span>
                                    <span className="rounded-full border border-border/70 px-2 py-0.5 text-xs">{request.department}</span>
                                </div>
                                <div className="text-sm font-medium">{request.purpose}</div>
                                <div className="text-muted-foreground flex flex-wrap gap-3 text-xs">
                                    <span>Requested by {request.requestedBy}</span>
                                    <span>{request.itemCount} item lines</span>
                                    <span>{formatCurrency(request.estimatedValue)}</span>
                                </div>
                            </div>
                            <Button type="button" variant="outline" asChild>
                                <Link href="/vp-finance/requests">Open Approval Queue</Link>
                            </Button>
                        </div>
                    )) : (
                        <div className="rounded-lg border border-border/70 bg-background/60 p-4 text-sm text-muted-foreground">
                            No pending approvals at the moment.
                        </div>
                    )}
                </div>
            ),
        },
    ], [costByStatus, departmentRequestCost, itemRequestCost, recentPendingApprovals]);

    const orderedVisibleCards = chartOrder
        .map((id) => chartCards.find((card) => card.id === id))
        .filter((card): card is NonNullable<typeof card> => Boolean(card && visibleCharts[card.id]));

    const toggleChartVisibility = (id: string) => {
        setVisibleCharts((current) => ({ ...current, [id]: !current[id] }));
    };

    const resetLayout = () => {
        setChartOrder(chartIds);
        setVisibleCharts({
            'department-request-cost': true,
            'cost-by-status': true,
            'most-costly-requested-items': true,
            'recent-pending-approvals': true,
        });
    };

    const handleDrop = (targetId: string) => {
        if (!draggedCardId) {
            return;
        }

        setChartOrder((current) => reorderIds(current, draggedCardId, targetId));
        setDraggedCardId(null);
    };

    const handleApplyFilters = () => {
        setActivePreset(detectDashboardDatePreset(filterFrom, filterTo));
        router.get(dashboard.vpFinance().url, {
            ...(filterFrom ? { from: filterFrom } : {}),
            ...(filterTo ? { to: filterTo } : {}),
        }, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const handleResetFilters = () => {
        setFilterFrom('');
        setFilterTo('');
        setActivePreset('custom');
        router.get(dashboard.vpFinance().url, {}, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const handlePresetSelect = (presetId: Exclude<DashboardDatePresetId, 'custom'>) => {
        const range = buildDashboardDateRange(presetId);

        setFilterFrom(range.from);
        setFilterTo(range.to);
        setActivePreset(presetId);
        router.get(dashboard.vpFinance().url, range, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />
            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-1">
                        <h1 className="text-2xl font-bold">VP Finance Dashboard</h1>
                        <p className="text-muted-foreground text-sm">
                            Financial view of departmental demand, approval exposure, and released cost.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="outline" onClick={handlePrintDashboard}>
                            Print
                        </Button>
                        <Button type="button" variant="outline" onClick={handleExportExcel}>
                            Export Excel
                        </Button>
                        <Button type="button" variant="outline" onClick={handleExportCsv}>
                            Export CSV
                        </Button>
                        <Button type="button" variant="outline" onClick={handleExportPdf}>
                            Export PDF
                        </Button>
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

                <Card className="border-border/70 bg-card/80 backdrop-blur">
                    <CardHeader>
                        <CardTitle>Date Range</CardTitle>
                        <CardDescription>
                            Filter approval exposure, released cost, and finance workload to a selected period.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-3 md:flex-row md:items-end">
                        <div className="flex flex-wrap gap-2 md:w-full">
                            {DASHBOARD_DATE_PRESETS.map((preset) => (
                                <Button key={preset.id} type="button" variant={activePreset === preset.id ? 'default' : 'outline'} onClick={() => handlePresetSelect(preset.id)}>
                                    {preset.label}
                                </Button>
                            ))}
                        </div>
                        <label className="flex flex-1 flex-col gap-2 text-sm">
                            <span>From</span>
                            <input type="date" value={filterFrom} onChange={(event) => setFilterFrom(event.target.value)} className="rounded-md border border-input bg-background px-3 py-2" />
                        </label>
                        <label className="flex flex-1 flex-col gap-2 text-sm">
                            <span>To</span>
                            <input type="date" value={filterTo} onChange={(event) => setFilterTo(event.target.value)} className="rounded-md border border-input bg-background px-3 py-2" />
                        </label>
                        <div className="flex gap-2">
                            <Button type="button" onClick={handleApplyFilters}>Apply</Button>
                            <Button type="button" variant="outline" onClick={handleResetFilters}>Reset</Button>
                        </div>
                    </CardContent>
                </Card>

                {editMode && (
                    <Card className="border-border/70 bg-card/80 backdrop-blur">
                        <CardHeader>
                            <CardTitle>Dashboard Controls</CardTitle>
                            <CardDescription>
                                Drag chart cards to reorder them and toggle any finance chart on or off.
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
