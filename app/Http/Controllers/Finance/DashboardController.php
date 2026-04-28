<?php

namespace App\Http\Controllers\Finance;

use App\Http\Controllers\Controller;
use App\Models\Department;
use App\Models\DepartmentBudget;
use App\Models\Semester;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function __invoke()
    {
        $activeSemester = Semester::current();

        $budgets = collect();
        if ($activeSemester) {
            $budgets = DepartmentBudget::with('department')
                ->where('semester_id', $activeSemester->id)
                ->get()
                ->map(fn (DepartmentBudget $b) => [
                    'id'                   => $b->id,
                    'department'           => $b->department?->name,
                    'department_id'        => $b->department_id,
                    'allocated_amount'     => (float) $b->allocated_amount,
                    'reserved_amount'      => (float) $b->reserved_amount,
                    'spent_amount'         => (float) $b->spent_amount,
                    'available_amount'     => $b->available_amount,
                    'low_budget_threshold' => $b->low_budget_threshold ? (float) $b->low_budget_threshold : null,
                    'near_threshold'       => $b->isNearThreshold(),
                ])
                ->values();
        }

        $recentTransactions = \App\Models\BudgetTransaction::with(['departmentBudget.department', 'request', 'performer'])
            ->when($activeSemester, fn ($q) => $q->whereHas('departmentBudget', fn ($bq) =>
                $bq->where('semester_id', $activeSemester->id)
            ))
            ->latest()
            ->limit(30)
            ->get()
            ->map(fn ($t) => [
                'id'          => $t->id,
                'department'  => $t->departmentBudget?->department?->name,
                'request_id'  => $t->request_id,
                'type'        => $t->type,
                'amount'      => (float) $t->amount,
                'balance_after'=> (float) $t->balance_after,
                'performed_by'=> $t->performer?->name,
                'notes'       => $t->notes,
                'created_at'  => $t->created_at?->toISOString(),
            ])
            ->values();

        $semesters = Semester::orderByDesc('year')->orderByDesc('semester')->get()
            ->map(fn ($s) => [
                'id'        => $s->id,
                'label'     => $s->label,
                'is_active' => $s->is_active,
                'starts_at' => $s->starts_at ? (string) $s->starts_at : null,
                'ends_at'   => $s->ends_at ? (string) $s->ends_at : null,
            ]);

        $departments = Department::orderBy('name')->get(['id', 'name']);

        return Inertia::render('Finance/Dashboard', [
            'activeSemester'     => $activeSemester ? [
                'id'    => $activeSemester->id,
                'label' => $activeSemester->label,
            ] : null,
            'budgets'            => $budgets,
            'recentTransactions' => $recentTransactions,
            'semesters'          => $semesters,
            'departments'        => $departments,
        ]);
    }
}
