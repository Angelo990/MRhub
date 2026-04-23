import { useEffect, useMemo, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import dashboard from '@/routes/dashboard';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DASHBOARD_DATE_PRESETS, buildDashboardDateRange, detectDashboardDatePreset, type DashboardDatePresetId } from '../../lib/dashboard-date-filters';
import { normalizeOrder, reorderIds } from '../../lib/dashboard-layout';
import { exportRowsToCsv, exportRowsToExcel, exportRowsToPdf, printHtmlDocument } from '../../lib/document-export';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { FileDown, FileSpreadsheet, FileText, Pencil, Printer, RotateCcw, Settings2 } from 'lucide-react';
import { SpeedDial, type SpeedDialItem } from '@/components/SpeedDial';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: dashboard.admin().url,
    },
];

export default function Dashboard() {
    const { usersByRole, usersByDepartment, requestsByStatus, stats, filters } = usePage<SharedData & {
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
        filters: {
            from: string | null;
            to: string | null;
        };
    }>().props;

    const chartColors = ['#14532d', '#0f766e', '#1d4ed8', '#b45309', '#be123c', '#4338ca'];
    const departmentColors = ['#0f766e', '#0284c7', '#7c3aed', '#c2410c', '#be123c', '#4f46e5', '#15803d'];
    const chartIds = ['users-by-role', 'requests-by-status', 'users-by-department'];
    const storageKey = 'dashboard:admin:layout';
    const filterStorageKey = 'dashboard:admin:filters';
    const [editMode, setEditMode] = useState(false);
    const [draggedCardId, setDraggedCardId] = useState<string | null>(null);
    const [chartsReady, setChartsReady] = useState(false);
    const [chartOrder, setChartOrder] = useState(chartIds);
    const [filterFrom, setFilterFrom] = useState(filters.from ?? '');
    const [filterTo, setFilterTo] = useState(filters.to ?? '');
    const [isDateModalOpen, setIsDateModalOpen] = useState(false);
    const [activePreset, setActivePreset] = useState<DashboardDatePresetId>(detectDashboardDatePreset(filters.from ?? '', filters.to ?? ''));
    const [visibleCharts, setVisibleCharts] = useState<Record<string, boolean>>({
        'users-by-role': true,
        'requests-by-status': true,
        'users-by-department': true,
    });

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

    const buildDashboardRows = () => [
        ...metricCards.map((card) => ({
            Section: 'Summary',
            Label: card.label,
            Value: String(card.value),
            Detail: card.description,
        })),
        ...usersByRole.map((entry) => ({
            Section: 'Users by Role',
            Label: entry.name,
            Value: entry.count,
            Detail: 'Current account distribution by role',
        })),
        ...requestsByStatus.map((entry) => ({
            Section: 'Requests by Status',
            Label: entry.name,
            Value: entry.count,
            Detail: 'Current request count by workflow status',
        })),
        ...usersByDepartment.map((entry) => ({
            Section: 'Users by Department',
            Label: entry.name,
            Value: entry.count,
            Detail: 'Current account distribution by department',
        })),
    ];

    const handleExportExcel = () => {
        exportRowsToExcel(buildDashboardRows(), 'Admin Dashboard', 'admin_dashboard_report.xlsx');
    };

    const handleExportCsv = () => {
        exportRowsToCsv(buildDashboardRows(), 'admin_dashboard_report.csv');
    };

    const handleExportPdf = () => {
        exportRowsToPdf(
            'Admin Dashboard Report',
            metricCards.map((card) => ({ label: card.label, value: String(card.value) })),
            ['Section', 'Label', 'Value', 'Detail'],
            buildDashboardRows().map((row) => [row.Section, row.Label, row.Value, row.Detail]),
            'admin_dashboard_report.pdf',
        );
    };

    const handlePrintDashboard = () => {
        const rows = buildDashboardRows().map((row) => `
            <tr>
                <td>${row.Section}</td>
                <td>${row.Label}</td>
                <td>${row.Value}</td>
                <td>${row.Detail}</td>
            </tr>
        `).join('');

        printHtmlDocument(
            'Admin Dashboard Report',
            `
                <h1>Admin Dashboard Report</h1>
                <div class="meta">
                    <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
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
        setActivePreset(detectDashboardDatePreset(filters.from ?? '', filters.to ?? ''));
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
            setActivePreset(detectDashboardDatePreset(storedFrom, storedTo));
            router.get(dashboard.admin().url, {
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
            id: 'users-by-role',
            title: 'Users by Role',
            description: 'Current account distribution across system roles.',
            className: '',
            content: (
                <div className="h-[340px] w-full">
                    <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
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
            ),
        },
        {
            id: 'requests-by-status',
            title: 'Requests by Status',
            description: 'Current request distribution across the workflow.',
            className: '',
            content: (
                <div className="h-[340px] w-full">
                    <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                        <BarChart data={requestsByStatus} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                            <XAxis dataKey="name" tickLine={false} axisLine={false} />
                            <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                            <Tooltip cursor={{ fill: 'rgba(15, 23, 42, 0.06)' }} />
                            <Bar dataKey="count" radius={[8, 8, 0, 0]} fill="#0f766e" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            ),
        },
        {
            id: 'users-by-department',
            title: 'Users by Department',
            description: 'Department-level distribution of user accounts.',
            className: 'xl:col-span-2',
            content: (
                <>
                    <div className="h-[360px] w-full">
                        <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
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
                                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: departmentColors[index % departmentColors.length] }} />
                                    <span>{department.name}</span>
                                </div>
                                <span className="font-semibold">{department.count}</span>
                            </div>
                        ))}
                    </div>
                </>
            ),
        },
    ], [requestsByStatus, usersByDepartment, usersByRole]);

    const orderedVisibleCards = chartOrder
        .map((id) => chartCards.find((card) => card.id === id))
        .filter((card): card is NonNullable<typeof card> => Boolean(card && visibleCharts[card.id]));

    const cardExportData: Record<string, () => Record<string, string | number>[]> = {
        'users-by-role': () => usersByRole.map((r) => ({ Role: r.name, Count: r.count })),
        'requests-by-status': () => requestsByStatus.map((r) => ({ Status: r.name, Count: r.count })),
        'users-by-department': () => usersByDepartment.map((r) => ({ Department: r.name, Count: r.count })),
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
            'users-by-role': true,
            'requests-by-status': true,
            'users-by-department': true,
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
        router.get(dashboard.admin().url, {
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
        router.get(dashboard.admin().url, {}, {
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
        router.get(dashboard.admin().url, range, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const speedDialItems: SpeedDialItem[] = [
        { icon: <Printer size={18} />, label: 'Print Analytics', onClick: handlePrintDashboard },
        { icon: <FileSpreadsheet size={18} />, label: 'Export Excel', onClick: handleExportExcel },
        { icon: <FileText size={18} />, label: 'Export CSV', onClick: handleExportCsv },
        { icon: <FileDown size={18} />, label: 'Export PDF', onClick: handleExportPdf },
        { icon: <Pencil size={18} />, label: editMode ? 'Done Editing' : 'Edit Dashboard', onClick: () => setEditMode((v) => !v) },
        ...(editMode ? [{ icon: <RotateCcw size={18} />, label: 'Reset Layout', onClick: resetLayout }] : []),
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Admin Analytics Dashboard" />
            <div className="flex h-full min-w-0 flex-1 flex-col gap-6 overflow-x-hidden rounded-xl p-3 sm:p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-1">
                        <h1 className="text-2xl font-bold">Admin Analytics Dashboard</h1>
                        <p className="text-muted-foreground text-sm">
                            High-level visibility into user distribution and operational load.
                        </p>
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

                <Card className="border-border/70 bg-card/80 backdrop-blur md:hidden">
                    <CardContent className="p-4">
                        <Button type="button" className="w-full" onClick={() => setIsDateModalOpen(true)}>
                            Date Range
                        </Button>
                    </CardContent>
                </Card>

                <Card className="hidden border-border/70 bg-card/80 backdrop-blur md:block">
                    <CardHeader>
                        <CardTitle>Date Range</CardTitle>
                        <CardDescription>
                            Filter request activity and user-growth metrics to a specific reporting window.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-3 md:flex-row md:items-end">
                        <div className="flex flex-wrap gap-2 md:w-full max-sm:[&>button]:flex-1">
                            {DASHBOARD_DATE_PRESETS.map((preset) => (
                                <Button key={preset.id} type="button" variant={activePreset === preset.id ? 'default' : 'outline'} onClick={() => handlePresetSelect(preset.id)}>
                                    {preset.label}
                                </Button>
                            ))}
                        </div>
                        <label className="flex w-full flex-col gap-2 text-sm md:flex-1">
                            <span>From</span>
                            <input type="date" value={filterFrom} onChange={(event) => setFilterFrom(event.target.value)} className="rounded-md border border-input bg-background px-3 py-2" />
                        </label>
                        <label className="flex w-full flex-col gap-2 text-sm md:flex-1">
                            <span>To</span>
                            <input type="date" value={filterTo} onChange={(event) => setFilterTo(event.target.value)} className="rounded-md border border-input bg-background px-3 py-2" />
                        </label>
                        <div className="flex flex-col gap-2 sm:flex-row">
                            <Button type="button" onClick={handleApplyFilters}>Apply</Button>
                            <Button type="button" variant="outline" onClick={handleResetFilters}>Reset</Button>
                        </div>
                    </CardContent>
                </Card>

                <Dialog open={isDateModalOpen} onOpenChange={setIsDateModalOpen}>
                    <DialogContent className="w-[calc(100vw-1.5rem)] max-w-lg p-0">
                        <DialogHeader className="border-b border-border/70 px-4 py-3 pr-12">
                            <DialogTitle>Date Range</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 px-4 py-4">
                            <div className="grid grid-cols-2 gap-2">
                                {DASHBOARD_DATE_PRESETS.map((preset) => (
                                    <Button key={preset.id} type="button" variant={activePreset === preset.id ? 'default' : 'outline'} onClick={() => handlePresetSelect(preset.id)}>
                                        {preset.label}
                                    </Button>
                                ))}
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
                                Drag chart cards to reorder them and toggle any chart on or off.
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
                                <CardTitle className="break-words text-2xl sm:text-3xl">{card.value}</CardTitle>
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
                                    {cardExportData[card.id] && (
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground">
                                                    <Settings2 className="h-4 w-4" />
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
            </div>
        </AppLayout>
    );
}

