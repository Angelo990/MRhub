<?php

namespace App\Services;

use App\Models\DepartmentBudget;
use App\Models\Request as SupplyRequest;
use App\Models\Semester;
use App\Models\User;
use App\Support\WorkflowNotifier;
use Illuminate\Support\Facades\DB;

class BudgetService
{
    /**
     * Compute total cost for a request (sum of unit_price * quantity for all items).
     */
    public static function totalCost(SupplyRequest $request): float
    {
        return (float) $request->items()
            ->selectRaw('SUM(unit_price_at_request * quantity) as total')
            ->value('total') ?? 0.0;
    }

    /**
     * Retrieve the active-semester budget record for a department.
     * Returns null when no active semester or no budget has been allocated.
     */
    public static function activeBudgetForDepartment(int $departmentId): ?DepartmentBudget
    {
        $semester = Semester::current();
        if (! $semester) {
            return null;
        }

        return DepartmentBudget::where('department_id', $departmentId)
            ->where('semester_id', $semester->id)
            ->first();
    }

    /**
     * Validate that a request cost fits within the available budget.
     * Returns an error message string, or null if valid.
     */
    public static function validateCost(int $departmentId, float $cost, ?int $excludeRequestId = null): ?string
    {
        $semester = Semester::current();
        if (! $semester) {
            return 'No active semester has been set up. Contact Finance to activate a semester before submitting requests.';
        }

        $budget = DepartmentBudget::where('department_id', $departmentId)
            ->where('semester_id', $semester->id)
            ->first();

        if (! $budget) {
            return 'Your department has no budget allocated for the current semester. Contact Finance to allocate a budget.';
        }

        // When re-validating an edit, free up the existing reservation to avoid double-counting
        $available = $budget->available_amount;
        if ($excludeRequestId !== null) {
            $existing = SupplyRequest::find($excludeRequestId);
            if ($existing) {
                $available += self::totalCost($existing);
            }
        }

        if ($cost > $available) {
            return sprintf(
                'This request (₱%s) exceeds your remaining budget for this semester (₱%s available). Please reduce quantities or contact Finance.',
                number_format($cost, 2),
                number_format($available, 2)
            );
        }

        return null;
    }

    /**
     * Reserve budget when a request is endorsed by the Property Custodian.
     */
    public static function reserve(SupplyRequest $request, User $actor): void
    {
        $budget = self::activeBudgetForDepartment($request->department_id);
        if (! $budget) {
            return; // No budget setup — skip silently (already validated at submission)
        }

        $cost = self::totalCost($request);
        if ($cost <= 0) {
            return;
        }

        DB::transaction(function () use ($budget, $request, $actor, $cost) {
            $budget->increment('reserved_amount', $cost);
            $budget->refresh();

            $budget->transactions()->create([
                'request_id'    => $request->id,
                'type'          => 'reservation',
                'amount'        => $cost,
                'balance_after' => $budget->available_amount,
                'performed_by'  => $actor->id,
            ]);

            // Trigger low-budget notification if threshold crossed
            if ($budget->isNearThreshold()) {
                WorkflowNotifier::budgetLow($request->department ?? $budget->department, $budget);
            }
        });
    }

    /**
     * Convert reservation to actual spending when VP Finance approves.
     * Pass the list of approved item IDs to calculate cost of only approved items.
     */
    public static function spend(SupplyRequest $request, User $actor, array $rejectedItemIds = []): void
    {
        $budget = self::activeBudgetForDepartment($request->department_id);
        if (! $budget) {
            return;
        }

        $totalCost = self::totalCost($request);

        // Cost of rejected items that should be released, not spent
        $rejectedCost = 0.0;
        if (! empty($rejectedItemIds)) {
            $rejectedCost = (float) $request->items()
                ->whereIn('id', $rejectedItemIds)
                ->selectRaw('SUM(unit_price_at_request * quantity) as total')
                ->value('total') ?? 0.0;
        }

        $spendCost   = $totalCost - $rejectedCost;
        $releaseCost = $rejectedCost;

        DB::transaction(function () use ($budget, $request, $actor, $spendCost, $releaseCost, $totalCost) {
            // Decrement reservation by full original cost; add spent for approved portion
            $budget->decrement('reserved_amount', $totalCost);
            if ($spendCost > 0) {
                $budget->increment('spent_amount', $spendCost);
            }
            $budget->refresh();

            $budget->transactions()->create([
                'request_id'    => $request->id,
                'type'          => 'spending',
                'amount'        => $spendCost,
                'balance_after' => $budget->available_amount,
                'performed_by'  => $actor->id,
                'notes'         => $releaseCost > 0
                    ? sprintf('₱%s released for rejected items.', number_format($releaseCost, 2))
                    : null,
            ]);

            if ($releaseCost > 0) {
                $budget->transactions()->create([
                    'request_id'    => $request->id,
                    'type'          => 'release',
                    'amount'        => $releaseCost,
                    'balance_after' => $budget->available_amount,
                    'performed_by'  => $actor->id,
                    'notes'         => 'Released from VP Finance item rejections.',
                ]);
            }
        });
    }

    /**
     * Release reserved budget when a request is rejected or cancelled.
     */
    public static function release(SupplyRequest $request, User $actor): void
    {
        $budget = self::activeBudgetForDepartment($request->department_id);
        if (! $budget) {
            return;
        }

        $cost = self::totalCost($request);
        if ($cost <= 0) {
            return;
        }

        DB::transaction(function () use ($budget, $request, $actor, $cost) {
            $current = (float) $budget->reserved_amount;
            $toRelease = min($cost, $current); // never go below zero
            if ($toRelease <= 0) {
                return;
            }

            $budget->decrement('reserved_amount', $toRelease);
            $budget->refresh();

            $budget->transactions()->create([
                'request_id'    => $request->id,
                'type'          => 'release',
                'amount'        => $toRelease,
                'balance_after' => $budget->available_amount,
                'performed_by'  => $actor->id,
            ]);
        });
    }
}
