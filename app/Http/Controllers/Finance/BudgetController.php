<?php

namespace App\Http\Controllers\Finance;

use App\Http\Controllers\Controller;
use App\Models\Department;
use App\Models\DepartmentBudget;
use App\Models\Semester;
use App\Support\WorkflowNotifier;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;

class BudgetController extends Controller
{
    /**
     * Budget management page — full CRUD for budgets and semesters.
     */
    public function index()
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

        $semesters = Semester::orderByDesc('year')->orderByDesc('semester')->get()
            ->map(fn ($s) => [
                'id'        => $s->id,
                'label'     => $s->label,
                'year'      => $s->year,
                'semester'  => $s->semester,
                'is_active' => $s->is_active,
                'starts_at' => $s->starts_at ? (string) $s->starts_at : null,
                'ends_at'   => $s->ends_at ? (string) $s->ends_at : null,
            ]);

        $departments = Department::orderBy('name')->get(['id', 'name']);

        return Inertia::render('Finance/Budgets', [
            'activeSemester' => $activeSemester ? [
                'id'        => $activeSemester->id,
                'label'     => $activeSemester->label,
                'starts_at' => $activeSemester->starts_at ? (string) $activeSemester->starts_at : null,
                'ends_at'   => $activeSemester->ends_at ? (string) $activeSemester->ends_at : null,
            ] : null,
            'budgets'        => $budgets,
            'semesters'      => $semesters,
            'departments'    => $departments,
        ]);
    }

    /**
     * Store a new department budget allocation for a given semester.
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'department_id'        => 'required|exists:departments,id',
            'semester_id'          => 'required|exists:semesters,id',
            'allocated_amount'     => 'required|numeric|min:0',
            'low_budget_threshold' => 'nullable|numeric|min:0',
        ]);

        $budget = DepartmentBudget::updateOrCreate(
            [
                'department_id' => $data['department_id'],
                'semester_id'   => $data['semester_id'],
            ],
            [
                'allocated_amount'     => $data['allocated_amount'],
                'low_budget_threshold' => $data['low_budget_threshold'] ?? null,
            ]
        );

        // Log an allocation transaction
        $budget->transactions()->create([
            'type'          => 'allocation',
            'amount'        => $data['allocated_amount'],
            'balance_after' => $budget->available_amount,
            'performed_by'  => $request->user()->id,
        ]);

        // Notify the department head(s) of the allocation
        $department = Department::find($data['department_id']);
        if ($department) {
            WorkflowNotifier::budgetAllocated($department, $budget);
        }

        return back()->with('success', 'Budget allocated successfully.');
    }

    /**
     * Update an existing budget allocation.
     */
    public function update(Request $request, DepartmentBudget $budget)
    {
        Gate::authorize('update', $budget);

        $data = $request->validate([
            'allocated_amount'     => 'required|numeric|min:0',
            'low_budget_threshold' => 'nullable|numeric|min:0',
        ]);

        $oldAllocated = (float) $budget->allocated_amount;
        $budget->update([
            'allocated_amount'     => $data['allocated_amount'],
            'low_budget_threshold' => $data['low_budget_threshold'] ?? null,
        ]);

        // Log an adjustment transaction for the difference
        $diff = (float) $data['allocated_amount'] - $oldAllocated;
        $budget->transactions()->create([
            'type'          => 'adjustment',
            'amount'        => abs($diff),
            'balance_after' => $budget->fresh()->available_amount,
            'performed_by'  => $request->user()->id,
            'notes'         => sprintf(
                'Allocation %s from ₱%s to ₱%s.',
                $diff >= 0 ? 'increased' : 'decreased',
                number_format($oldAllocated, 2),
                number_format($data['allocated_amount'], 2)
            ),
        ]);

        // Notify department head(s)
        WorkflowNotifier::budgetAllocated($budget->department, $budget);

        return back()->with('success', 'Budget updated successfully.');
    }
}
