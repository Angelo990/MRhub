import React, { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { usePage, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';

interface Department {
    id: number;
    name: string;
}

interface Semester {
    id: number;
    label: string;
    year: number;
    semester: 1 | 2;
    starts_at: string;
    ends_at: string;
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
    budgets: BudgetRow[];
    recentTransactions: Transaction[];
    semesters: Semester[];
    departments: Department[];
    [key: string]: unknown;
}

const fmt = (n: number) =>
    `₱${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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

export default function FinanceDashboard() {
    const { activeSemester, budgets, recentTransactions, semesters, departments } =
        usePage<PageProps>().props;

    /* --- Budget edit modal state --- */
    const [editBudget, setEditBudget] = useState<BudgetRow | null>(null);
    const [editForm, setEditForm] = useState({ allocated_amount: '', low_budget_threshold: '' });
    const [editLoading, setEditLoading] = useState(false);
    const [editError, setEditError] = useState<string | null>(null);

    /* --- New budget modal state --- */
    const [newBudget, setNewBudget] = useState(false);
    const [newForm, setNewForm] = useState({ department_id: '', allocated_amount: '', low_budget_threshold: '' });
    const [newLoading, setNewLoading] = useState(false);
    const [newError, setNewError] = useState<string | null>(null);

    /* --- Semester modal state --- */
    const [semesterModal, setSemesterModal] = useState(false);
    const [semForm, setSemForm] = useState({ label: '', year: String(new Date().getFullYear()), semester: '1', starts_at: '', ends_at: '' });
    const [semLoading, setSemLoading] = useState(false);
    const [semError, setSemError] = useState<string | null>(null);

    const openEdit = (b: BudgetRow) => {
        setEditBudget(b);
        setEditForm({ allocated_amount: String(b.allocated_amount), low_budget_threshold: b.low_budget_threshold != null ? String(b.low_budget_threshold) : '' });
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
                onSuccess: () => { setNewBudget(false); setNewForm({ department_id: '', allocated_amount: '', low_budget_threshold: '' }); setNewLoading(false); },
                onError: (errs) => { setNewError(Object.values(errs)[0] as string); setNewLoading(false); },
            },
        );
    };

    const createSemester = () => {
        setSemLoading(true);
        setSemError(null);
        router.post(
            '/finance/semesters',
            semForm,
            {
                onSuccess: () => { setSemesterModal(false); setSemLoading(false); },
                onError: (errs) => { setSemError(Object.values(errs)[0] as string); setSemLoading(false); },
            },
        );
    };

    const activateSemester = (id: number) => {
        router.post(`/finance/semesters/${id}/activate`, {}, {
            onError: (errs) => alert(Object.values(errs)[0]),
        });
    };

    return (
        <AppLayout>
            <div className="mx-auto w-full max-w-6xl p-4 sm:p-6 space-y-8">
                <h1 className="text-2xl font-bold">Finance Dashboard</h1>

                {/* Active semester header */}
                <div className="rounded-lg border bg-card p-4">
                    <p className="text-sm text-muted-foreground mb-1">Active Semester</p>
                    {activeSemester ? (
                        <p className="text-lg font-semibold">
                            {activeSemester.label}
                            <span className="ml-3 text-sm font-normal text-muted-foreground">
                                {activeSemester.starts_at} – {activeSemester.ends_at}
                            </span>
                        </p>
                    ) : (
                        <p className="text-amber-600 font-medium">No active semester. Please activate one below.</p>
                    )}
                </div>

                {/* Budget table */}
                <div>
                    <div className="mb-3 flex items-center justify-between">
                        <h2 className="font-semibold text-lg">Department Budgets</h2>
                        {activeSemester && (
                            <Button size="sm" onClick={() => setNewBudget(true)}>+ Allocate Budget</Button>
                        )}
                    </div>
                    {budgets.length === 0 ? (
                        <p className="text-muted-foreground text-sm">No budgets allocated for the active semester.</p>
                    ) : (
                        <div className="overflow-x-auto rounded-lg border">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b bg-muted/40 text-left">
                                        <th className="px-4 py-2">Department</th>
                                        <th className="px-4 py-2 text-right">Allocated</th>
                                        <th className="px-4 py-2 text-right">Reserved</th>
                                        <th className="px-4 py-2 text-right">Spent</th>
                                        <th className="px-4 py-2 text-right">Available</th>
                                        <th className="px-4 py-2"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {budgets.map((b) => (
                                        <tr
                                            key={b.id}
                                            className={`border-b last:border-0 ${b.near_threshold ? 'bg-amber-50 dark:bg-amber-950/20' : ''}`}
                                        >
                                            <td className="px-4 py-2 font-medium">
                                                {b.department}
                                                {b.near_threshold && (
                                                    <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                                                        Low Budget
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-2 text-right">{fmt(b.allocated_amount)}</td>
                                            <td className="px-4 py-2 text-right text-sky-700">{fmt(b.reserved_amount)}</td>
                                            <td className="px-4 py-2 text-right text-red-600">{fmt(b.spent_amount)}</td>
                                            <td className={`px-4 py-2 text-right font-semibold ${b.near_threshold ? 'text-amber-600' : ''}`}>
                                                {fmt(b.available_amount)}
                                            </td>
                                            <td className="px-4 py-2 text-right">
                                                <Button size="sm" variant="outline" onClick={() => openEdit(b)}>Edit</Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Semester management */}
                <div>
                    <div className="mb-3 flex items-center justify-between">
                        <h2 className="font-semibold text-lg">Semesters</h2>
                        <Button size="sm" variant="outline" onClick={() => setSemesterModal(true)}>+ New Semester</Button>
                    </div>
                    <div className="overflow-x-auto rounded-lg border">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b bg-muted/40 text-left">
                                    <th className="px-4 py-2">Label</th>
                                    <th className="px-4 py-2">Period</th>
                                    <th className="px-4 py-2">Status</th>
                                    <th className="px-4 py-2"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {semesters.map((s) => (
                                    <tr key={s.id} className="border-b last:border-0">
                                        <td className="px-4 py-2 font-medium">{s.label}</td>
                                        <td className="px-4 py-2 text-muted-foreground">{s.starts_at} – {s.ends_at}</td>
                                        <td className="px-4 py-2">
                                            {s.is_active ? (
                                                <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800 dark:bg-green-900/40 dark:text-green-300">
                                                    Active
                                                </span>
                                            ) : (
                                                <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">Inactive</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-2 text-right">
                                            {!s.is_active && (
                                                <Button size="sm" variant="outline" onClick={() => activateSemester(s.id)}>Activate</Button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {semesters.length === 0 && (
                                    <tr><td colSpan={4} className="px-4 py-4 text-muted-foreground">No semesters yet.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Recent transactions */}
                <div>
                    <h2 className="mb-3 font-semibold text-lg">Recent Transactions</h2>
                    {recentTransactions.length === 0 ? (
                        <p className="text-muted-foreground text-sm">No transactions yet.</p>
                    ) : (
                        <div className="overflow-x-auto rounded-lg border">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b bg-muted/40 text-left">
                                        <th className="px-4 py-2">Department</th>
                                        <th className="px-4 py-2">Type</th>
                                        <th className="px-4 py-2 text-right">Amount</th>
                                        <th className="px-4 py-2 text-right">Balance After</th>
                                        <th className="px-4 py-2">By</th>
                                        <th className="px-4 py-2">Notes</th>
                                        <th className="px-4 py-2">Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recentTransactions.map((t) => (
                                        <tr key={t.id} className="border-b last:border-0">
                                            <td className="px-4 py-2">{t.department}</td>
                                            <td className="px-4 py-2">
                                                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${TYPE_COLORS[t.type] ?? ''}`}>
                                                    {TYPE_LABELS[t.type] ?? t.type}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2 text-right">{fmt(t.amount)}</td>
                                            <td className="px-4 py-2 text-right">{fmt(t.balance_after)}</td>
                                            <td className="px-4 py-2 text-muted-foreground">{t.performed_by}</td>
                                            <td className="px-4 py-2 text-xs text-muted-foreground max-w-[200px] truncate">{t.notes ?? '—'}</td>
                                            <td className="px-4 py-2 text-muted-foreground whitespace-nowrap">{new Date(t.created_at).toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Edit Budget Modal */}
                {editBudget && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                        <div className="w-full max-w-md rounded-xl bg-background p-6 shadow-xl">
                            <h3 className="mb-4 text-lg font-semibold">Edit Budget — {editBudget.department}</h3>
                            {editError && <p className="mb-3 text-sm text-red-600">{editError}</p>}
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Allocated Amount (₱)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={editForm.allocated_amount}
                                        onChange={(e) => setEditForm((p) => ({ ...p, allocated_amount: e.target.value }))}
                                        className="w-full rounded border p-2"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Low Budget Threshold (₱, optional)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={editForm.low_budget_threshold}
                                        onChange={(e) => setEditForm((p) => ({ ...p, low_budget_threshold: e.target.value }))}
                                        placeholder="e.g. 5000"
                                        className="w-full rounded border p-2"
                                    />
                                </div>
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
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                        <div className="w-full max-w-md rounded-xl bg-background p-6 shadow-xl">
                            <h3 className="mb-4 text-lg font-semibold">Allocate Budget for {activeSemester?.label}</h3>
                            {newError && <p className="mb-3 text-sm text-red-600">{newError}</p>}
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Department</label>
                                    <select
                                        value={newForm.department_id}
                                        onChange={(e) => setNewForm((p) => ({ ...p, department_id: e.target.value }))}
                                        className="w-full rounded border p-2"
                                    >
                                        <option value="">— Select —</option>
                                        {departments.map((d) => (
                                            <option key={d.id} value={d.id}>{d.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Allocated Amount (₱)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={newForm.allocated_amount}
                                        onChange={(e) => setNewForm((p) => ({ ...p, allocated_amount: e.target.value }))}
                                        className="w-full rounded border p-2"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Low Budget Threshold (₱, optional)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={newForm.low_budget_threshold}
                                        onChange={(e) => setNewForm((p) => ({ ...p, low_budget_threshold: e.target.value }))}
                                        placeholder="e.g. 5000"
                                        className="w-full rounded border p-2"
                                    />
                                </div>
                            </div>
                            <div className="mt-5 flex justify-end gap-2">
                                <Button variant="outline" onClick={() => setNewBudget(false)} disabled={newLoading}>Cancel</Button>
                                <Button onClick={saveNew} disabled={newLoading || !newForm.department_id || !newForm.allocated_amount}>{newLoading ? 'Saving…' : 'Allocate'}</Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* New Semester Modal */}
                {semesterModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                        <div className="w-full max-w-md rounded-xl bg-background p-6 shadow-xl">
                            <h3 className="mb-4 text-lg font-semibold">Create New Semester</h3>
                            {semError && <p className="mb-3 text-sm text-red-600">{semError}</p>}
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Label</label>
                                    <input
                                        type="text"
                                        value={semForm.label}
                                        onChange={(e) => setSemForm((p) => ({ ...p, label: e.target.value }))}
                                        placeholder="e.g. 1st Semester 2025-2026"
                                        className="w-full rounded border p-2"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Year</label>
                                        <input
                                            type="number"
                                            value={semForm.year}
                                            onChange={(e) => setSemForm((p) => ({ ...p, year: e.target.value }))}
                                            className="w-full rounded border p-2"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Semester</label>
                                        <select
                                            value={semForm.semester}
                                            onChange={(e) => setSemForm((p) => ({ ...p, semester: e.target.value }))}
                                            className="w-full rounded border p-2"
                                        >
                                            <option value="1">1st</option>
                                            <option value="2">2nd</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Start Date</label>
                                        <input
                                            type="date"
                                            value={semForm.starts_at}
                                            onChange={(e) => setSemForm((p) => ({ ...p, starts_at: e.target.value }))}
                                            className="w-full rounded border p-2"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">End Date</label>
                                        <input
                                            type="date"
                                            value={semForm.ends_at}
                                            onChange={(e) => setSemForm((p) => ({ ...p, ends_at: e.target.value }))}
                                            className="w-full rounded border p-2"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="mt-5 flex justify-end gap-2">
                                <Button variant="outline" onClick={() => setSemesterModal(false)} disabled={semLoading}>Cancel</Button>
                                <Button onClick={createSemester} disabled={semLoading || !semForm.label || !semForm.starts_at || !semForm.ends_at}>{semLoading ? 'Creating…' : 'Create'}</Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
