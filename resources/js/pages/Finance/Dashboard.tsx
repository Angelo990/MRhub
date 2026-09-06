import React, { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { usePage, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';

import { useEffect, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SpeedDial, type SpeedDialItem } from '@/components/SpeedDial';
import {
    Bar, BarChart, CartesianGrid, Cell, Line, LineChart,
    Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { CalendarPlus, FilePlus, Wallet } from 'lucide-react';

interface Semester {
    id: number;
    label: string;
    starts_at: string | null;
    ends_at: string | null;
}

interface Summary {
    totalAllocated: number;
    totalSpent: number;
    totalReserved: number;
    totalAvailable: number;
    lowBudgetCount: number;
}

interface SpendingRow {
    name: string;
    allocated: number;
    spent: number;
    available: number;
}

interface TypeRow {
    name: string;
    count: number;
    total: number;
}

interface TrendRow {
    name: string;
    total: number;
}

interface Transaction {
    id: number;
    department: string;
    request_id: number | null;
    type: string;
    amount: number;
    balance_after: number;
    performed_by: string;
    notes: string | null;
    created_at: string;
}

interface PageProps {
    activeSemester: Semester | null;
    summary: Summary;
    spendingByDept: SpendingRow[];
    transactionsByType: TypeRow[];
    monthlyTrend: TrendRow[];
    recentTransactions: Transaction[];
    [key: string]: unknown;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard/finance' },
];

const TYPE_LABELS: Record<string, string> = {
    allocation: 'Allocation',
    reservation: 'Reservation',
    release: 'Release',
    spending: 'Spending',
    adjustment: 'Adjustment',
};

const TYPE_COLORS: Record<string, string> = {
    allocation: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
    reservation: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300',
    release: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
    spending: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
    adjustment: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
};

const CHART_COLORS = ['#14532d', '#1d4ed8', '#0f766e', '#7c3aed', '#be123c', '#c2410c'];
const TYPE_CHART_COLORS: Record<string, string> = {
    allocation: '#16a34a',
    reservation: '#0284c7',
    release: '#d97706',
    spending: '#dc2626',
    adjustment: '#7c3aed',
};

const TYPE_CHART_DOT_CLASSES: Record<string, string> = {
    allocation: 'bg-green-600',
    reservation: 'bg-sky-600',
    release: 'bg-amber-600',
    spending: 'bg-red-600',
    adjustment: 'bg-violet-600',
};

const FALLBACK_CHART_DOT_CLASSES = ['bg-emerald-900', 'bg-blue-700', 'bg-teal-700', 'bg-violet-600', 'bg-rose-700', 'bg-orange-700'];

const fmt = (n: number) =>
    `₱${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function NewSemesterModal({ onClose }: { onClose: () => void }) {
    const [form, setForm] = useState({
        label: '',
        year: String(new Date().getFullYear()),
        semester: '1',
        starts_at: '',
        ends_at: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const submit = () => {
        setLoading(true);
        setError(null);
        router.post('/finance/semesters', form, {
            onSuccess: () => { setLoading(false); onClose(); },
            onError: (errs) => { setError(Object.values(errs)[0] as string); setLoading(false); },
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-xl bg-background p-6 shadow-xl">
                <h3 className="mb-4 text-lg font-semibold">Create New Semester</h3>
                {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
                <div className="space-y-3">
                    <label className="block text-sm font-medium">
                        Label
                        <input
                            type="text"
                            value={form.label}
                            onChange={(e) => setForm((p) => ({ ...p, label: e.target.value }))}
                            placeholder="e.g. 1st Semester 2025-2026"
                            className="mt-1 w-full rounded border border-input bg-background px-3 py-2"
                        />
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                        <label className="block text-sm font-medium">
                            Year
                            <input
                                type="number"
                                value={form.year}
                                onChange={(e) => setForm((p) => ({ ...p, year: e.target.value }))}
                                className="mt-1 w-full rounded border border-input bg-background px-3 py-2"
                            />
                        </label>
                        <label className="block text-sm font-medium">
                            Semester
                            <select
                                value={form.semester}
                                onChange={(e) => setForm((p) => ({ ...p, semester: e.target.value }))}
                                className="mt-1 w-full rounded border border-input bg-background px-3 py-2"
                            >
                                <option value="1">1st</option>
                                <option value="2">2nd</option>
                            </select>
                        </label>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <label className="block text-sm font-medium">
                            Start Date
                            <input
                                type="date"
                                value={form.starts_at}
                                onChange={(e) => setForm((p) => ({ ...p, starts_at: e.target.value }))}
                                className="mt-1 w-full rounded border border-input bg-background px-3 py-2"
                            />
                        </label>
                        <label className="block text-sm font-medium">
                            End Date
                            <input
                                type="date"
                                value={form.ends_at}
                                onChange={(e) => setForm((p) => ({ ...p, ends_at: e.target.value }))}
                                className="mt-1 w-full rounded border border-input bg-background px-3 py-2"
                            />
                        </label>
                    </div>
                </div>
                <div className="mt-5 flex justify-end gap-2">
                    <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
                    <Button
                        onClick={submit}
                        disabled={loading || !form.label || !form.starts_at || !form.ends_at}
                    >
                        {loading ? 'Creating…' : 'Create'}
                    </Button>
                </div>
            </div>
        </div>
    );
}

export default function FinanceDashboard() {
    const { activeSemester, summary, spendingByDept, transactionsByType, monthlyTrend, recentTransactions } =
        usePage<PageProps>().props;

    const [chartsReady, setChartsReady] = useState(false);
    const [semesterModal, setSemesterModal] = useState(false);

    useEffect(() => {
        const t = window.setTimeout(() => setChartsReady(true), 120);
        return () => window.clearTimeout(t);
    }, []);

    const summaryCards = [
        {
            label: 'Total Allocated',
            value: fmt(summary.totalAllocated),
            description: 'Budget allocated this semester.',
            color: 'text-foreground',
        },
        {
            label: 'Total Spent',
            value: fmt(summary.totalSpent),
            description: 'Confirmed spending across all departments.',
            color: 'text-red-600',
        },
        {
            label: 'Total Available',
            value: fmt(summary.totalAvailable),
            description: 'Remaining available budget.',
            color: 'text-green-700',
        },
        {
            label: 'Low Budget Alerts',
            value: summary.lowBudgetCount,
            description: 'Departments near their threshold.',
            color: summary.lowBudgetCount > 0 ? 'text-amber-600' : 'text-foreground',
        },
    ];

    const speedDialItems: SpeedDialItem[] = [
        { icon: <Wallet size={18} />, label: 'Manage Budgets', onClick: () => router.visit('/finance/budgets') },
        { icon: <FilePlus size={18} />, label: 'Allocate Budget', onClick: () => router.visit('/finance/budgets') },
        { icon: <CalendarPlus size={18} />, label: 'New Semester', onClick: () => setSemesterModal(true) },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Finance Dashboard" />
            <div className="flex h-full min-w-0 flex-1 flex-col gap-6 overflow-x-hidden rounded-xl p-3 sm:p-4">

                {/* Header */}
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="space-y-1">
                        <h1 className="text-2xl font-bold">Finance Dashboard</h1>
                        <p className="text-sm text-muted-foreground">
                            {activeSemester
                                ? `Active semester: ${activeSemester.label}`
                                : 'No active semester. Go to Budget Management to activate one.'}
                        </p>
                    </div>
                    <div className="hidden items-center gap-2 md:flex">
                        <Button variant="outline" onClick={() => setSemesterModal(true)}>+ New Semester</Button>
                        <Button asChild>
                            <Link href="/finance/budgets">Manage Budgets</Link>
                        </Button>
                    </div>
                </div>

                {/* Summary cards */}
                <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                    {summaryCards.map((c) => (
                        <Card key={c.label} className="border-border/70 bg-card/80 backdrop-blur">
                            <CardHeader className="gap-1 pb-1">
                                <CardDescription>{c.label}</CardDescription>
                                <CardTitle className={`break-words text-xl sm:text-2xl ${c.color}`}>{c.value}</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-0 text-xs text-muted-foreground hidden sm:block">
                                {c.description}
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Charts */}
                <div className="grid gap-6 xl:grid-cols-2">

                    {/* Budget utilization by department */}
                    <Card className="border-border/70 bg-card/80 backdrop-blur">
                        <CardHeader>
                            <CardTitle>Budget Utilization by Department</CardTitle>
                            <CardDescription>Allocated vs. spent per department for the active semester.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[320px] w-full">
                                {chartsReady && (
                                    <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                                        <BarChart
                                            data={spendingByDept}
                                            layout="vertical"
                                            margin={{ top: 8, right: 16, left: 16, bottom: 8 }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.2} />
                                            <XAxis
                                                type="number"
                                                tickLine={false}
                                                axisLine={false}
                                                tickFormatter={(v) => `₱${Number(v).toLocaleString()}`}
                                            />
                                            <YAxis dataKey="name" type="category" width={100} tickLine={false} axisLine={false} />
                                            <Tooltip formatter={(v) => fmt(Number(v))} />
                                            <Bar dataKey="allocated" name="Allocated" fill="#1d4ed8" radius={[0, 4, 4, 0]} />
                                            <Bar dataKey="spent" name="Spent" fill="#dc2626" radius={[0, 4, 4, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Transaction type breakdown */}
                    <Card className="border-border/70 bg-card/80 backdrop-blur">
                        <CardHeader>
                            <CardTitle>Transaction Breakdown</CardTitle>
                            <CardDescription>Distribution of budget transactions by type.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[280px] w-full">
                                {chartsReady && (
                                    <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                                        <PieChart>
                                            <Pie
                                                data={transactionsByType.length > 0
                                                    ? transactionsByType
                                                    : [{ name: 'No data', count: 1, total: 0 }]}
                                                cx="50%"
                                                cy="50%"
                                                outerRadius={90}
                                                dataKey="count"
                                                nameKey="name"
                                                label={({ name, percent }) =>
                                                    transactionsByType.length > 0
                                                        ? `${TYPE_LABELS[name] ?? name} ${Math.round(percent * 100)}%`
                                                        : ''}
                                                labelLine={false}
                                            >
                                                {(transactionsByType.length > 0 ? transactionsByType : [{ name: 'No data', count: 1, total: 0 }]).map((entry, i) => (
                                                    <Cell
                                                        key={entry.name}
                                                        fill={TYPE_CHART_COLORS[entry.name] ?? CHART_COLORS[i % CHART_COLORS.length]}
                                                    />
                                                ))}
                                            </Pie>
                                            <Tooltip formatter={(v, name) => [v, TYPE_LABELS[name as string] ?? name]} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                            <div className="mt-2 flex flex-wrap gap-3 justify-center">
                                {transactionsByType.map((t, i) => (
                                    <div key={t.name} className="flex items-center gap-1.5 text-xs">
                                        <span
                                            className={`inline-block h-2.5 w-2.5 rounded-full ${TYPE_CHART_DOT_CLASSES[t.name] ?? FALLBACK_CHART_DOT_CLASSES[i % FALLBACK_CHART_DOT_CLASSES.length]}`}
                                        />
                                        <span>{TYPE_LABELS[t.name] ?? t.name}</span>
                                        <span className="text-muted-foreground">({t.count})</span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Monthly spending trend */}
                    <Card className="border-border/70 bg-card/80 backdrop-blur xl:col-span-2">
                        <CardHeader>
                            <CardTitle>Monthly Spending Trend</CardTitle>
                            <CardDescription>Confirmed spending transactions per month.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[240px] w-full">
                                {chartsReady && (
                                    <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                                        <LineChart data={monthlyTrend} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                                            <XAxis dataKey="name" tickLine={false} axisLine={false} />
                                            <YAxis
                                                tickLine={false}
                                                axisLine={false}
                                                tickFormatter={(v) => `₱${Number(v).toLocaleString()}`}
                                            />
                                            <Tooltip formatter={(v) => fmt(Number(v))} />
                                            <Line
                                                type="monotone"
                                                dataKey="total"
                                                name="Spending"
                                                stroke="#dc2626"
                                                strokeWidth={3}
                                                dot={{ r: 4 }}
                                                activeDot={{ r: 6 }}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Recent transactions */}
                <Card className="border-border/70 bg-card/80 backdrop-blur">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                        <div>
                            <CardTitle>Recent Transactions</CardTitle>
                            <CardDescription>Latest 10 budget transactions for the active semester.</CardDescription>
                        </div>
                        <Button variant="outline" size="sm" asChild>
                            <Link href="/finance/budgets">View Budgets</Link>
                        </Button>
                    </CardHeader>
                    <CardContent className="p-0">
                        {recentTransactions.length === 0 ? (
                            <p className="px-6 py-4 text-sm text-muted-foreground">No transactions yet for this semester.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b bg-muted/40 text-left">
                                            <th className="px-4 py-3">Department</th>
                                            <th className="px-4 py-3">Type</th>
                                            <th className="px-4 py-3 text-right">Amount</th>
                                            <th className="px-4 py-3 text-right">Balance After</th>
                                            <th className="px-4 py-3">By</th>
                                            <th className="px-4 py-3">Date</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {recentTransactions.map((t) => (
                                            <tr key={t.id} className="border-b last:border-0">
                                                <td className="px-4 py-3">{t.department}</td>
                                                <td className="px-4 py-3">
                                                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${TYPE_COLORS[t.type] ?? ''}`}>
                                                        {TYPE_LABELS[t.type] ?? t.type}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right">{fmt(t.amount)}</td>
                                                <td className="px-4 py-3 text-right">{fmt(t.balance_after)}</td>
                                                <td className="px-4 py-3 text-muted-foreground">{t.performed_by}</td>
                                                <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                                                    {new Date(t.created_at).toLocaleDateString()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <SpeedDial items={speedDialItems} />

                {semesterModal && <NewSemesterModal onClose={() => setSemesterModal(false)} />}
            </div>
        </AppLayout>
    );
}
