import { useEffect, useMemo, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import dashboard from '@/routes/dashboard';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DASHBOARD_DATE_PRESETS, buildDashboardDateRange, detectDashboardDatePreset, type DashboardDatePresetId } from '../../lib/dashboard-date-filters';
import { normalizeOrder, reorderIds } from '../../lib/dashboard-layout';
import { exportRowsToCsv, exportRowsToExcel, exportRowsToPdf, printHtmlDocument } from '../../lib/document-export';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Calendar, FileDown, FileSpreadsheet, FileText, Pencil, Printer, RotateCcw, Settings2, Download, ChevronUp, ChevronDown } from 'lucide-react';
import { SpeedDial, type SpeedDialItem } from '@/components/SpeedDial';

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
    const [chartsReady, setChartsReady] = useState(false);
    const [chartOrder, setChartOrder] = useState(chartIds);
    const [filterFrom, setFilterFrom] = useState(filters.from ?? '');
    const [filterTo, setFilterTo] = useState(filters.to ?? '');
    const [isDateModalOpen, setIsDateModalOpen] = useState(false);
    const [isExportOpen, setIsExportOpen] = useState(false);
    const activePreset = useMemo(() => detectDashboardDatePreset(filterFrom, filterTo), [filterFrom, filterTo]);

    const dateRangeLabel = useMemo(() => {
        const preset = DASHBOARD_DATE_PRESETS.find(p => p.id === activePreset);
        if (preset) return preset.label;
        if (filterFrom || filterTo) {
            const fmt = (d: string) => d ? new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '…';
            return `${fmt(filterFrom)} – ${fmt(filterTo)}`;
        }
        return 'Date Range';
    }, [activePreset, filterFrom, filterTo]);
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
            description: 'Total estimated spend.',
        },
        {
            label: 'Pending Approval Value',
            value: formatCurrency(stats.pendingApprovalValue),
            description: 'Value awaiting approval.',
        },
        {
            label: 'Approved Value',
            value: formatCurrency(stats.approvedValue),
            description: 'Approved or fulfilled value.',
        },
        {
            label: 'Released Spending',
            value: formatCurrency(stats.releasedValue),
            description: 'Actual released amount.',
        },
        {
            label: 'Average Request Value',
            value: formatCurrency(stats.averageRequestValue),
            description: 'Avg value per request.',
        },
        {
            label: 'Pending Approvals',
            value: stats.pendingApprovals.toString(),
            description: 'Awaiting finance action.',
        },
        {
            label: 'Highest Pending Request',
            value: formatCurrency(stats.highestPendingRequestValue),
            description: `${stats.highestPendingRequestDepartment} max pending exposure.`,
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
    }, [filters.from, filters.to]);

    useEffect(() => {
        const timer = window.setTimeout(() => setChartsReady(true), 120);
        return () => window.clearTimeout(timer);
    }, []);

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
                    <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
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
                    <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
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
                    <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                        <BarChart data={itemRequestCost} layout="vertical" margin={{ top: 8, right: 16, left: 16, bottom: 8 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.2} />
                            <XAxis type="number" tickFormatter={(value) => value.toLocaleString()} tickLine={false} axisLine={false} />
                            <YAxis dataKey="name" type="category" width={120} tickLine={false} axisLine={false} />
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

    const cardExportData: Record<string, () => Record<string, string | number>[]> = {
        'department-request-cost': () => departmentRequestCost.map((r) => ({ Department: r.name, 'Est. Value': r.total })),
        'cost-by-status': () => costByStatus.map((r) => ({ Status: r.name, 'Est. Value': r.total })),
        'most-costly-requested-items': () => itemRequestCost.map((r) => ({ Item: r.name, 'Est. Value': r.total })),
        'recent-pending-approvals': () => recentPendingApprovals.map((r) => ({ ID: r.id, Date: r.date, Department: r.department, 'Requested By': r.requestedBy, Purpose: r.purpose, Items: r.itemCount, 'Est. Value': r.estimatedValue })),
    };

    const printCard = (title: string, rows: Record<string, string | number>[]) => {
        if (!rows.length) return;
        const headers = Object.keys(rows[0]);
        const headerHtml = headers.map((h) => `<th>${h}</th>`).join('');
        const bodyHtml = rows.map((r) => `<tr>${headers.map((h) => `<td>${r[h] ?? ''}</td>`).join('')}</tr>`).join('');
        printHtmlDocument(title, `<h1>${title}</h1><table><thead><tr>${headerHtml}</tr></thead><tbody>${bodyHtml}</tbody></table>`);
    };

    const handleCardPrint = (card: { id: string; title: string }) => printCard(card.title, cardExportData[card.id]?.() ?? []);
    const handleCardExportCsv = (card: { id: string; title: string }) => exportRowsToCsv(cardExportData[card.id]?.() ?? [], card.title.toLowerCase().replace(/\s+/g, '_') + '.csv');
    const handleCardExportExcel = (card: { id: string; title: string }) => exportRowsToExcel(cardExportData[card.id]?.() ?? [], card.title, card.title.toLowerCase().replace(/\s+/g, '_') + '.xlsx');
    const handleCardExportPdf = (card: { id: string; title: string }) => {
        const rows = cardExportData[card.id]?.() ?? [];
        if (!rows.length) return;
        exportRowsToPdf(card.title, [], Object.keys(rows[0]), rows.map((r) => Object.values(r) as (string | number)[]), card.title.toLowerCase().replace(/\s+/g, '_') + '.pdf');
    };

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
        router.get(dashboard.vpFinance().url, range, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const moveCard = (id: string, dir: -1 | 1) => {
        setChartOrder(prev => {
            const idx = prev.indexOf(id);
            if (idx === -1) return prev;
            const next = [...prev];
            const swapIdx = idx + dir;
            if (swapIdx < 0 || swapIdx >= next.length) return prev;
            [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
            return next;
        });
    };

    const speedDialItems: SpeedDialItem[] = [
        { icon: <Printer size={18} />, label: 'Print Analytics', onClick: handlePrintDashboard },
        { icon: <Download size={18} />, label: 'Export Data', onClick: () => setIsExportOpen(true) },
        { icon: <Pencil size={18} />, label: editMode ? 'Done Editing' : 'Edit Dashboard', onClick: () => setEditMode((v) => !v) },
        ...(editMode ? [{ icon: <RotateCcw size={18} />, label: 'Reset Layout', onClick: resetLayout }] : []),
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="VP Finance Analytics Dashboard" />
            <div className="flex h-full min-w-0 flex-1 flex-col gap-6 overflow-x-hidden rounded-xl p-3 sm:p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-1">
                        <h1 className="text-2xl font-bold">VP Finance Analytics Dashboard</h1>
                        <div className="flex items-center gap-1 text-muted-foreground text-sm">
                            <span>Analytics</span>
                            <Button size="icon" variant="ghost" type="button" className="h-7 w-7" onClick={() => setIsDateModalOpen(true)} title="Open date range picker">
                                <Calendar size={20} />
                            </Button>
                            <span className="font-medium">{dateRangeLabel}</span>
                        </div>
                    </div>
                    <div className="hidden flex-wrap items-center gap-2 md:flex">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button type="button" variant="outline">Dashboard Actions</Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Dashboard</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={handlePrintDashboard}>Print Dashboard</DropdownMenuItem>
                                <DropdownMenuItem onClick={handleExportExcel}>Export Excel</DropdownMenuItem>
                                <DropdownMenuItem onClick={handleExportCsv}>Export CSV</DropdownMenuItem>
                                <DropdownMenuItem onClick={handleExportPdf}>Export PDF</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setEditMode((current) => !current)}>
                                    {editMode ? 'Done Editing' : 'Edit Dashboard'}
                                </DropdownMenuItem>
                                {editMode && (
                                    <DropdownMenuItem onClick={resetLayout}>Reset Layout</DropdownMenuItem>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                <Dialog open={isDateModalOpen} onOpenChange={setIsDateModalOpen}>
                    <DialogContent className="w-[calc(100vw-1.5rem)] max-w-lg p-0">
                        <DialogHeader className="border-b border-border/70 px-4 py-3 pr-12">
                            <DialogTitle>Date Range</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 px-4 py-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Preset date range</label>
                                <Select value={activePreset ?? ''} onValueChange={(value) => handlePresetSelect(value as Exclude<DashboardDatePresetId, 'custom'>)}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Choose a preset range" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {DASHBOARD_DATE_PRESETS.map((preset) => (
                                            <SelectItem key={preset.id} value={preset.id}>{preset.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">Pick a preset above or set custom From/To dates below.</p>
                            </div>
                            <label className="flex w-full flex-col gap-2 text-sm">
                                <span>From</span>
                                <input type="date" value={filterFrom} onChange={(event) => setFilterFrom(event.target.value)} className="rounded-md border border-input bg-background px-3 py-2" />
                            </label>
                            <label className="flex w-full flex-col gap-2 text-sm">
                                <span>To</span>
                                <input type="date" value={filterTo} onChange={(event) => setFilterTo(event.target.value)} className="rounded-md border border-input bg-background px-3 py-2" />
                            </label>
                            <div className="flex flex-col gap-2 sm:flex-row">
                                <Button type="button" onClick={() => { handleApplyFilters(); setIsDateModalOpen(false); }}>
                                    Apply
                                </Button>
                                <Button type="button" variant="outline" onClick={() => { handleResetFilters(); setIsDateModalOpen(false); }}>
                                    Reset
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>

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

                <div className="grid grid-cols-2 gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {metricCards.map((card) => (
                        <Card key={card.label} className="border-border/70 bg-card/80 backdrop-blur">
                            <CardHeader className="gap-2">
                                <CardDescription>{card.label}</CardDescription>
                                <CardTitle className="break-words text-xl sm:text-2xl lg:text-3xl">{card.value}</CardTitle>
                            </CardHeader>
                            <CardContent className="hidden pt-0 text-sm text-muted-foreground sm:block">
                                {card.description}
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <div className="grid gap-6 xl:grid-cols-2">
                    {orderedVisibleCards.map((card) => (
                        <div
                            key={card.id}
                            className={`min-w-0 ${card.className}`}
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
                                <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-3">
                                    <div className="min-w-0 flex-1">
                                        <CardTitle>{card.title}</CardTitle>
                                        <CardDescription className="mt-1">{card.description}</CardDescription>
                                    </div>
                                    {editMode && (
                                        <div className="flex flex-col gap-0.5 md:hidden">
                                            <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveCard(card.id, -1)} aria-label="Move card up">
                                                <ChevronUp size={14} />
                                            </Button>
                                            <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveCard(card.id, 1)} aria-label="Move card down">
                                                <ChevronDown size={14} />
                                            </Button>
                                        </div>
                                    )}
                                    {cardExportData[card.id] && (
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button type="button" variant="ghost" size="icon" className="h-11 w-11 shrink-0 text-muted-foreground hover:text-foreground md:h-8 md:w-8">
                                                    <Settings2 className="h-5 w-5 md:h-4 md:w-4" />
                                                    <span className="sr-only">Card options</span>
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>{card.title}</DropdownMenuLabel>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem onClick={() => handleCardPrint(card)}>Print</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleCardExportExcel(card)}>Export Excel</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleCardExportCsv(card)}>Export CSV</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleCardExportPdf(card)}>Export PDF</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    )}
                                </CardHeader>
                                <CardContent className="min-w-0">{chartsReady ? card.content : <div className="h-40 w-full" />}</CardContent>
                            </Card>
                        </div>
                    ))}
                </div>

                <SpeedDial items={speedDialItems} />

                {/* Export Data picker dialog (mobile FAB) */}
                <Dialog open={isExportOpen} onOpenChange={setIsExportOpen}>
                    <DialogContent className="w-[calc(100vw-1.5rem)] max-w-xs p-0">
                        <DialogHeader className="border-b border-border/70 px-4 py-3">
                            <DialogTitle>Export Data</DialogTitle>
                        </DialogHeader>
                        <div className="flex flex-col gap-2 px-4 py-4">
                            <Button type="button" variant="outline" className="justify-start gap-3" onClick={() => { handleExportExcel(); setIsExportOpen(false); }}>
                                <FileSpreadsheet size={16} /> Export Excel
                            </Button>
                            <Button type="button" variant="outline" className="justify-start gap-3" onClick={() => { handleExportCsv(); setIsExportOpen(false); }}>
                                <FileText size={16} /> Export CSV
                            </Button>
                            <Button type="button" variant="outline" className="justify-start gap-3" onClick={() => { handleExportPdf(); setIsExportOpen(false); }}>
                                <FileDown size={16} /> Export PDF
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}

