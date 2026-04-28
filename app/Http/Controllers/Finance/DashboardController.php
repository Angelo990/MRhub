<?php

namespace App\Http\Controllers\Finance;

use App\Http\Controllers\Controller;
use App\Models\BudgetTransaction;
use App\Models\Department;
use App\Models\DepartmentBudget;
use App\Models\Semester;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function __invoke()
    {
        $activeSemester = Semester::current();

        // ── Summary totals ────────────────────────────────────────────────
        $budgetQuery = DepartmentBudget::query()
            ->when($activeSemester, fn ($q) => $q->where('semester_id', $activeSemester->id));

        $budgets = $activeSemester
            ? DepartmentBudget::with('department')
                ->where('semester_id', $activeSemester->id)
                ->get()
            : collect();

        $totalAllocated  = $budgets->sum(fn ($b) => (float) $b->allocated_amount);
        $totalSpent      = $budgets->sum(fn ($b) => (float) $b->spent_amount);
        $totalReserved   = $budgets->sum(fn ($b) => (float) $b->reserved_amount);
        $totalAvailable  = $budgets->sum(fn ($b) => $b->available_amount);
        $lowBudgetCount  = $budgets->filter(fn ($b) => $b->isNearThreshold())->count();

        $summary = [
            'totalAllocated' => $totalAllocated,
            'totalSpent'     => $totalSpent,
            'totalReserved'  => $totalReserved,
            'totalAvailable' => $totalAvailable,
            'lowBudgetCount' => $lowBudgetCount,
        ];

        // ── Spending by department (bar chart) ────────────────────────────
        $spendingByDept = $budgets->map(fn ($b) => [
            'name'      => $b->department?->name ?? 'Unknown',
            'allocated' => (float) $b->allocated_amount,
            'spent'     => (float) $b->spent_amount,
            'available' => $b->available_amount,
        ])->sortByDesc('allocated')->values();

        // ── Transaction type distribution (pie chart) ─────────────────────
        $transactionsByType = BudgetTransaction::query()
            ->when($activeSemester, fn ($q) => $q->whereHas('departmentBudget', fn ($bq) =>
                $bq->where('semester_id', $activeSemester->id)
            ))
            ->select('type', DB::raw('COUNT(*) as count'), DB::raw('SUM(amount) as total'))
            ->groupBy('type')
            ->get()
            ->map(fn ($r) => [
                'name'  => $r->type,
                'count' => (int) $r->count,
                'total' => (float) $r->total,
            ])
            ->values();

        // ── Monthly spending trend (line chart, last 6 months) ────────────
        $monthlyTrend = BudgetTransaction::query()
            ->when($activeSemester, fn ($q) => $q->whereHas('departmentBudget', fn ($bq) =>
                $bq->where('semester_id', $activeSemester->id)
            ))
            ->where('type', 'spending')
            ->selectRaw("strftime('%Y-%m', created_at) as month_key")
            ->selectRaw('SUM(amount) as total')
            ->groupBy('month_key')
            ->orderBy('month_key')
            ->limit(6)
            ->get()
            ->map(fn ($r) => [
                'name'  => $r->month_key,
                'total' => (float) $r->total,
            ])
            ->values();

        // ── Recent transactions ───────────────────────────────────────────
        $recentTransactions = BudgetTransaction::with(['departmentBudget.department', 'request', 'performer'])
            ->when($activeSemester, fn ($q) => $q->whereHas('departmentBudget', fn ($bq) =>
                $bq->where('semester_id', $activeSemester->id)
            ))
            ->latest()
            ->limit(10)
            ->get()
            ->map(fn ($t) => [
                'id'           => $t->id,
                'department'   => $t->departmentBudget?->department?->name,
                'request_id'   => $t->request_id,
                'type'         => $t->type,
                'amount'       => (float) $t->amount,
                'balance_after'=> (float) $t->balance_after,
                'performed_by' => $t->performer?->name,
                'notes'        => $t->notes,
                'created_at'   => $t->created_at?->toISOString(),
            ])
            ->values();

        return Inertia::render('Finance/Dashboard', [
            'activeSemester'     => $activeSemester ? [
                'id'        => $activeSemester->id,
                'label'     => $activeSemester->label,
                'starts_at' => $activeSemester->starts_at ? (string) $activeSemester->starts_at : null,
                'ends_at'   => $activeSemester->ends_at ? (string) $activeSemester->ends_at : null,
            ] : null,
            'summary'            => $summary,
            'spendingByDept'     => $spendingByDept,
            'transactionsByType' => $transactionsByType,
            'monthlyTrend'       => $monthlyTrend,
            'recentTransactions' => $recentTransactions,
        ]);
    }
}
