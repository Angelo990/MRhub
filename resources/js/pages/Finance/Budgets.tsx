import React, { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SpeedDial, type SpeedDialItem } from '@/components/SpeedDial';
import { FilePlus, CalendarPlus } from 'lucide-react';

interface Department {
    id: number;
    name: string;
}

interface Semester {
    id: number;
    label: string;
    year: number;
    semester: 1 | 2;
    starts_at: string | null;
    ends_at: string | null;
    is_active: boolean;
}

interface BudgetRow {
    id: number;
    department: string;
    department_id: number;
    allocated_amount: number;
    reserved_amount: number;
    spent_amount: number;
    available_amount: number;
    low_budget_threshold: number | null;
    near_threshold: boolean;
}

interface PageProps {
    activeSemester: { id: number; label: string; starts_at: string | null; ends_at: string | null } | null;
    budgets: BudgetRow[];
    semesters: Semester[];
    departments: Department[];
    [key: string]: unknown;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Finance Dashboard', href: '/dashboard/finance' },
    { title: 'Budget Management', href: '/finance/budgets' },
];

const fmt = (n: number) =>
    `₱${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function FinanceBudgets() {
    const { activeSemester, budgets, semesters, departments } = usePage<PageProps>().props;

    /* --- Budget edit modal --- */
    const [editBudget, setEditBudget] = useState<BudgetRow | null>(null);
    const [editForm, setEditForm] = useState({ allocated_amount: '', low_budget_threshold: '' });
    const [editLoading, setEditLoading] = useState(false);
    const [editError, setEditError] = useState<string | null>(null);

    /* --- New budget modal --- */
    const [newBudget, setNewBudget] = useState(false);
    const [newForm, setNewForm] = useState({ department_id: '', allocated_amount: '', low_budget_threshold: '' });
    const [newLoading, setNewLoading] = useState(false);
    const [newError, setNewError] = useState<string | null>(null);

    /* --- Semester modal --- */
    const [semesterModal, setSemesterModal] = useState(false);
    const [semForm, setSemForm] = useState({ label: '', year: String(new Date().getFullYear()), semester: '1', starts_at: '', ends_at: '' });
    const [semLoading, setSemLoading] = useState(false);
    const [semError, setSemError] = useState<string | null>(null);

    const openEdit = (b: BudgetRow) => {
        setEditBudget(b);
        setEditForm({
            allocated_amount: String(b.allocated_amount),
            low_budget_threshold: b.low_budget_threshold != null ? String(b.low_budget_threshold) : '',
        });
        setEditError(null);
    };

    const saveEdit = () => {
        if (!editBudget) return;
        setEditLoading(true);
        setEditError(null);
        router.put(
            `/finance/budgets/${editBudget.id}`,
            { allocated_amount: editForm.allocated_amount, low_budget_threshold: editForm.low_budget_threshold || null },
            {
                onSuccess: () => { setEditBudget(null); setEditLoading(false); },
                onError: (errs) => { setEditError(Object.values(errs)[0] as string); setEditLoading(false); },
            },
        );
    };

    const saveNew = () => {
        if (!activeSemester) return;
        setNewLoading(true);
        setNewError(null);
        router.post(
            '/finance/budgets',
            { ...newForm, semester_id: activeSemester.id, low_budget_threshold: newForm.low_budget_threshold || null },
            {
                onSuccess: () => {
                    setNewBudget(false);
                    setNewForm({ department_id: '', allocated_amount: '', low_budget_threshold: '' });
                    setNewLoading(false);
                },
                onError: (errs) => { setNewError(Object.values(errs)[0] as string); setNewLoading(false); },
            },
        );
    };

    const createSemester = () => {
        setSemLoading(true);
        setSemError(null);
        router.post('/finance/semesters', semForm, {
            onSuccess: () => { setSemesterModal(false); setSemLoading(false); },
            onError: (errs) => { setSemError(Object.values(errs)[0] as string); setSemLoading(false); },
        });
    };

    const activateSemester = (id: number) => {
        router.post(`/finance/semesters/${id}/activate`, {}, {
            onError: (errs) => alert(Object.values(errs)[0]),
        });
    };

    const speedDialItems: SpeedDialItem[] = [
        ...(activeSemester ? [{ icon: <FilePlus size={18} />, label: 'Allocate Budget', onClick: () => setNewBudget(true) }] : []),
        { icon: <CalendarPlus size={18} />, label: 'New Semester', onClick: () => setSemesterModal(true) },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Budget Management" />
            <div className="flex h-full min-w-0 flex-1 flex-col gap-6 overflow-x-hidden rounded-xl p-3 sm:p-4">

                {/* Header */}
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="space-y-1">
                        <h1 className="text-2xl font-bold">Budget Management</h1>
                        <p className="text-sm text-muted-foreground">
                            {activeSemester
                                ? `Active: ${activeSemester.label} (${activeSemester.starts_at ?? '—'} – ${activeSemester.ends_at ?? '—'})`
                                : 'No active semester. Activate one below.'}
                        </p>
                    </div>
                    <div className="hidden items-center gap-2 md:flex">
                        <Button variant="outline" onClick={() => setSemesterModal(true)}>+ New Semester</Button>
                        {activeSemester && (
                            <Button onClick={() => setNewBudget(true)}>+ Allocate Budget</Button>
                        )}
                    </div>
                </div>

                {/* Budget table */}
                <Card className="border-border/70 bg-card/80 backdrop-blur">
                    <CardHeader>
                        <CardTitle>Department Budgets</CardTitle>
                        <CardDescription>
                            {activeSemester ? `Allocations for ${activeSemester.label}` : 'No active semester selected.'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        {budgets.length === 0 ? (
                            <p className="px-6 py-4 text-sm text-muted-foreground">
                                No budgets allocated for the active semester yet.
                            </p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b bg-muted/40 text-left">
                                            <th className="px-4 py-3">Department</th>
                                            <th className="px-4 py-3 text-right">Allocated</th>
                                            <th className="px-4 py-3 text-right">Reserved</th>
                                            <th className="px-4 py-3 text-right">Spent</th>
                                            <th className="px-4 py-3 text-right">Available</th>
                                            <th className="px-4 py-3" />
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {budgets.map((b) => (
                                            <tr
                                                key={b.id}
                                                className={`border-b last:border-0 ${b.near_threshold ? 'bg-amber-50 dark:bg-amber-950/20' : ''}`}
                                            >
                                                <td className="px-4 py-3 font-medium">
                                                    {b.department}
                                                    {b.near_threshold && (
                                                        <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                                                            Low Budget
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-right">{fmt(b.allocated_amount)}</td>
                                                <td className="px-4 py-3 text-right text-sky-700">{fmt(b.reserved_amount)}</td>
                                                <td className="px-4 py-3 text-right text-red-600">{fmt(b.spent_amount)}</td>
                                                <td className={`px-4 py-3 text-right font-semibold ${b.near_threshold ? 'text-amber-600' : 'text-green-700'}`}>
                                                    {fmt(b.available_amount)}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <Button size="sm" variant="outline" onClick={() => openEdit(b)}>Edit</Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Semester management */}
                <Card className="border-border/70 bg-card/80 backdrop-blur">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                        <div>
                            <CardTitle>Semesters</CardTitle>
                            <CardDescription className="mt-1">Manage and activate academic semesters.</CardDescription>
                        </div>
                        <Button size="sm" variant="outline" className="hidden md:inline-flex" onClick={() => setSemesterModal(true)}>
                            + New Semester
                        </Button>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b bg-muted/40 text-left">
                                        <th className="px-4 py-3">Label</th>
                                        <th className="px-4 py-3">Period</th>
                                        <th className="px-4 py-3">Status</th>
                                        <th className="px-4 py-3" />
                                    </tr>
                                </thead>
                                <tbody>
                                    {semesters.map((s) => (
                                        <tr key={s.id} className="border-b last:border-0">
                                            <td className="px-4 py-3 font-medium">{s.label}</td>
                                            <td className="px-4 py-3 text-muted-foreground">
                                                {s.starts_at ?? '—'} – {s.ends_at ?? '—'}
                                            </td>
                                            <td className="px-4 py-3">
                                                {s.is_active ? (
                                                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800 dark:bg-green-900/40 dark:text-green-300">
                                                        Active
                                                    </span>
                                                ) : (
                                                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                                                        Inactive
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                {!s.is_active && (
                                                    <Button size="sm" variant="outline" onClick={() => activateSemester(s.id)}>
                                                        Activate
                                                    </Button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {semesters.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="px-4 py-4 text-muted-foreground">
                                                No semesters yet.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

                <SpeedDial items={speedDialItems} />

                {/* Edit Budget Modal */}
                {editBudget && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                        <div className="w-full max-w-md rounded-xl bg-background p-6 shadow-xl">
                            <h3 className="mb-4 text-lg font-semibold">Edit Budget — {editBudget.department}</h3>
                            {editError && <p className="mb-3 text-sm text-red-600">{editError}</p>}
                            <div className="space-y-3">
                                <label className="block text-sm font-medium">
                                    Allocated Amount (₱)
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={editForm.allocated_amount}
                                        onChange={(e) => setEditForm((p) => ({ ...p, allocated_amount: e.target.value }))}
                                        className="mt-1 w-full rounded border border-input bg-background px-3 py-2"
                                    />
                                </label>
                                <label className="block text-sm font-medium">
                                    Low Budget Threshold (₱, optional)
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={editForm.low_budget_threshold}
                                        onChange={(e) => setEditForm((p) => ({ ...p, low_budget_threshold: e.target.value }))}
                                        placeholder="e.g. 5000"
                                        className="mt-1 w-full rounded border border-input bg-background px-3 py-2"
                                    />
                                </label>
                            </div>
                            <div className="mt-5 flex justify-end gap-2">
                                <Button variant="outline" onClick={() => setEditBudget(null)} disabled={editLoading}>Cancel</Button>
                                <Button onClick={saveEdit} disabled={editLoading}>{editLoading ? 'Saving…' : 'Save'}</Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* New Budget Modal */}
                {newBudget && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                        <div className="w-full max-w-md rounded-xl bg-background p-6 shadow-xl">
                            <h3 className="mb-4 text-lg font-semibold">Allocate Budget — {activeSemester?.label}</h3>
                            {newError && <p className="mb-3 text-sm text-red-600">{newError}</p>}
                            <div className="space-y-3">
                                <label className="block text-sm font-medium">
                                    Department
                                    <select
                                        value={newForm.department_id}
                                        onChange={(e) => setNewForm((p) => ({ ...p, department_id: e.target.value }))}
                                        className="mt-1 w-full rounded border border-input bg-background px-3 py-2"
                                    >
                                        <option value="">— Select —</option>
                                        {departments.map((d) => (
                                            <option key={d.id} value={d.id}>{d.name}</option>
                                        ))}
                                    </select>
                                </label>
                                <label className="block text-sm font-medium">
                                    Allocated Amount (₱)
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={newForm.allocated_amount}
                                        onChange={(e) => setNewForm((p) => ({ ...p, allocated_amount: e.target.value }))}
                                        className="mt-1 w-full rounded border border-input bg-background px-3 py-2"
                                    />
                                </label>
                                <label className="block text-sm font-medium">
                                    Low Budget Threshold (₱, optional)
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={newForm.low_budget_threshold}
                                        onChange={(e) => setNewForm((p) => ({ ...p, low_budget_threshold: e.target.value }))}
                                        placeholder="e.g. 5000"
                                        className="mt-1 w-full rounded border border-input bg-background px-3 py-2"
                                    />
                                </label>
                            </div>
                            <div className="mt-5 flex justify-end gap-2">
                                <Button variant="outline" onClick={() => setNewBudget(false)} disabled={newLoading}>Cancel</Button>
                                <Button
                                    onClick={saveNew}
                                    disabled={newLoading || !newForm.department_id || !newForm.allocated_amount}
                                >
                                    {newLoading ? 'Saving…' : 'Allocate'}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* New Semester Modal */}
                {semesterModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                        <div className="w-full max-w-md rounded-xl bg-background p-6 shadow-xl">
                            <h3 className="mb-4 text-lg font-semibold">Create New Semester</h3>
                            {semError && <p className="mb-3 text-sm text-red-600">{semError}</p>}
                            <div className="space-y-3">
                                <label className="block text-sm font-medium">
                                    Label
                                    <input
                                        type="text"
                                        value={semForm.label}
                                        onChange={(e) => setSemForm((p) => ({ ...p, label: e.target.value }))}
                                        placeholder="e.g. 1st Semester 2025-2026"
                                        className="mt-1 w-full rounded border border-input bg-background px-3 py-2"
                                    />
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <label className="block text-sm font-medium">
                                        Year
                                        <input
                                            type="number"
                                            value={semForm.year}
                                            onChange={(e) => setSemForm((p) => ({ ...p, year: e.target.value }))}
                                            className="mt-1 w-full rounded border border-input bg-background px-3 py-2"
                                        />
                                    </label>
                                    <label className="block text-sm font-medium">
                                        Semester
                                        <select
                                            value={semForm.semester}
                                            onChange={(e) => setSemForm((p) => ({ ...p, semester: e.target.value }))}
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
                                            value={semForm.starts_at}
                                            onChange={(e) => setSemForm((p) => ({ ...p, starts_at: e.target.value }))}
                                            className="mt-1 w-full rounded border border-input bg-background px-3 py-2"
                                        />
                                    </label>
                                    <label className="block text-sm font-medium">
                                        End Date
                                        <input
                                            type="date"
                                            value={semForm.ends_at}
                                            onChange={(e) => setSemForm((p) => ({ ...p, ends_at: e.target.value }))}
                                            className="mt-1 w-full rounded border border-input bg-background px-3 py-2"
                                        />
                                    </label>
                                </div>
                            </div>
                            <div className="mt-5 flex justify-end gap-2">
                                <Button variant="outline" onClick={() => setSemesterModal(false)} disabled={semLoading}>Cancel</Button>
                                <Button
                                    onClick={createSemester}
                                    disabled={semLoading || !semForm.label || !semForm.starts_at || !semForm.ends_at}
                                >
                                    {semLoading ? 'Creating…' : 'Create'}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
