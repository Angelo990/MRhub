import { useEffect, useMemo, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import dashboard from '@/routes/dashboard';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DASHBOARD_DATE_PRESETS, buildDashboardDateRange, detectDashboardDatePreset, type DashboardDatePresetId } from '../../lib/dashboard-date-filters';
import { normalizeOrder, reorderIds } from '../../lib/dashboard-layout';
import { escapeHtml, exportRowsToCsv, exportRowsToExcel, exportRowsToPdf, printHtmlDocument } from '../../lib/document-export';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Calendar, FileDown, FileSpreadsheet, FileText, Pencil, Printer, RotateCcw, Settings2, Download, ChevronUp, ChevronDown } from 'lucide-react';
import { SpeedDial, type SpeedDialItem } from '@/components/SpeedDial';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: dashboard.propertyCustodian().url,
    },
];

export default function Dashboard() {
    const { stats, requestStatuses, stockLevels, stockMovements, lowStockItems, requestsByDepartment, requestedItemsByDepartment, mostRequestedItems, filters } = usePage<SharedData & {
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
        filters: {
            from: string | null;
            to: string | null;
        };
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
    const filterStorageKey = 'dashboard:property-custodian:filters';
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
            description: 'Catalog item count.',
        },
        {
            label: 'Units On Hand',
            value: stats.totalUnitsOnHand,
            description: 'Total units on hand.',
        },
        {
            label: 'Low Stock Items',
            value: stats.lowStockItems,
            description: 'Low stock (<5 units).',
        },
        {
            label: 'Pending Endorsement',
            value: stats.pendingEndorsement,
            description: 'Awaiting endorsement.',
        },
        {
            label: 'Approved For Release',
            value: stats.approvedForRelease,
            description: 'Ready for release.',
        },
        {
            label: 'Released Requests',
            value: stats.releasedRequests,
            description: 'Released, awaiting receipt.',
        },
    ];

    const buildDashboardRows = () => [
        ...metricCards.map((card) => ({
            Section: 'Summary',
            Label: card.label,
            Value: String(card.value),
            Detail: card.description,
        })),
        ...requestStatuses.map((entry) => ({
            Section: 'Request Pipeline',
            Label: entry.name,
            Value: entry.count,
            Detail: 'Current request count by workflow stage',
        })),
        ...stockMovements.map((entry) => ({
            Section: 'Stock Movement',
            Label: entry.name,
            Value: entry.quantity,
            Detail: 'Ledger quantity moved in the selected period',
        })),
        ...stockLevels.map((entry) => ({
            Section: 'Top Stock Levels',
            Label: entry.name,
            Value: entry.quantity,
            Detail: `Current quantity on hand (${entry.unit})`,
        })),
        ...lowStockItems.map((entry) => ({
            Section: 'Low Stock Alerts',
            Label: entry.name,
            Value: entry.quantity,
            Detail: `Current quantity on hand (${entry.unit})`,
        })),
        ...requestsByDepartment.map((entry) => ({
            Section: 'Most Requested Departments',
            Label: entry.name,
            Value: entry.count,
            Detail: 'Submitted request count',
        })),
        ...requestedItemsByDepartment.map((entry) => ({
            Section: 'Departments with Most Items Requested',
            Label: entry.name,
            Value: entry.count,
            Detail: 'Total requested item quantity',
        })),
        ...mostRequestedItems.map((entry) => ({
            Section: 'Most Requested Items',
            Label: entry.name,
            Value: entry.count,
            Detail: 'Total requested item quantity',
        })),
    ];

    const handleExportExcel = () => {
        exportRowsToExcel(buildDashboardRows(), 'Property Custodian Dashboard', 'property_custodian_dashboard_report.xlsx');
    };

    const handleExportCsv = () => {
        exportRowsToCsv(buildDashboardRows(), 'property_custodian_dashboard_report.csv');
    };

    const handleExportPdf = () => {
        exportRowsToPdf(
            'Property Custodian Dashboard Report',
            metricCards.map((card) => ({ label: card.label, value: String(card.value) })),
            ['Section', 'Label', 'Value', 'Detail'],
            buildDashboardRows().map((row) => [row.Section, row.Label, row.Value, row.Detail]),
            'property_custodian_dashboard_report.pdf',
        );
    };

    const handlePrintDashboard = () => {
        const rows = buildDashboardRows().map((row) => `
            <tr>
                <td>${escapeHtml(row.Section)}</td>
                <td>${escapeHtml(row.Label)}</td>
                <td>${escapeHtml(row.Value)}</td>
                <td>${escapeHtml(row.Detail)}</td>
            </tr>
        `).join('');

        printHtmlDocument(
            'Property Custodian Dashboard Report',
            `
                <h1>Property Custodian Dashboard Report</h1>
                <div class="meta">
                    <p><strong>Generated:</strong> ${escapeHtml(new Date().toLocaleString())}</p>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Section</th>
                            <th>Label</th>
                            <th>Value</th>
                            <th>Detail</th>
                        </tr>
                    </thead>
                    <tbody>${rows || '<tr><td colspan="4">No dashboard data available.</td></tr>'}</tbody>
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
            router.get(dashboard.propertyCustodian().url, {
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
            id: 'request-pipeline',
            title: 'Request Pipeline',
            description: 'Current request counts across the Property Custodian workflow.',
            className: '',
            content: (
                <div className="h-[340px] w-full">
                    <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
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
                    <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
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
                    <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
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
                    <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
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
                    <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
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
                    <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                        <BarChart data={mostRequestedItems} layout="vertical" margin={{ top: 8, right: 16, left: 16, bottom: 8 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.2} />
                            <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
                            <YAxis dataKey="name" type="category" width={120} tickLine={false} axisLine={false} />
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

    const cardExportData: Record<string, () => Record<string, string | number>[]> = {
        'request-pipeline': () => requestStatuses.map((r) => ({ Status: r.name, Count: r.count })),
        'stock-movement': () => stockMovements.map((r) => ({ Movement: r.name, Quantity: r.quantity })),
        'top-stock-levels': () => stockLevels.map((r) => ({ Item: r.name, Quantity: r.quantity, Unit: r.unit })),
        'low-stock-alerts': () => lowStockItems.map((r) => ({ Item: r.name, Quantity: r.quantity, Unit: r.unit })),
        'most-requested-departments': () => requestsByDepartment.map((r) => ({ Department: r.name, Requests: r.count })),
        'items-by-department': () => requestedItemsByDepartment.map((r) => ({ Department: r.name, Items: r.count })),
        'most-requested-items': () => mostRequestedItems.map((r) => ({ Item: r.name, Count: r.count })),
    };

    const printCard = (title: string, rows: Record<string, string | number>[]) => {
        if (!rows.length) return;
        const headers = Object.keys(rows[0]);
        const headerHtml = headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('');
        const bodyHtml = rows.map((r) => `<tr>${headers.map((h) => `<td>${escapeHtml(r[h])}</td>`).join('')}</tr>`).join('');
        printHtmlDocument(title, `<h1>${escapeHtml(title)}</h1><table><thead><tr>${headerHtml}</tr></thead><tbody>${bodyHtml}</tbody></table>`);
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

    const handleApplyFilters = () => {
        router.get(dashboard.propertyCustodian().url, {
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
        router.get(dashboard.propertyCustodian().url, {}, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const handlePresetSelect = (presetId: Exclude<DashboardDatePresetId, 'custom'>) => {
        const range = buildDashboardDateRange(presetId);

        setFilterFrom(range.from);
        setFilterTo(range.to);
        router.get(dashboard.propertyCustodian().url, range, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
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
            <Head title="Property Custodian Analytics Dashboard" />
            <div className="flex h-full min-w-0 flex-1 flex-col gap-6 overflow-x-hidden rounded-xl p-3 sm:p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-1">
                        <h1 className="text-2xl font-bold">Property Custodian Analytics Dashboard</h1>
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

