<?php

namespace Tests\Feature\Finance;

use App\Models\Department;
use App\Models\DepartmentBudget;
use App\Models\Semester;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class BudgetUpdateAllocationGuardTest extends TestCase
{
    use RefreshDatabase;

    public function test_finance_cannot_reduce_allocation_below_reserved_plus_spent(): void
    {
        Role::findOrCreate('finance', 'web');
        Role::findOrCreate('department-head', 'web');

        $financeUser = User::factory()->create();
        $financeUser->assignRole('finance');

        $department = Department::create(['name' => 'Engineering']);
        $semester = Semester::create([
            'label' => '1st Semester AY 2026-2027',
            'year' => 2026,
            'semester' => 1,
            'starts_at' => now()->startOfMonth()->toDateString(),
            'ends_at' => now()->addMonths(5)->endOfMonth()->toDateString(),
            'is_active' => true,
        ]);

        $budget = DepartmentBudget::create([
            'department_id' => $department->id,
            'semester_id' => $semester->id,
            'allocated_amount' => 100000,
            'reserved_amount' => 35000,
            'spent_amount' => 25000,
            'low_budget_threshold' => 10000,
        ]);

        $this->actingAs($financeUser)
            ->from(route('finance.budgets.index'))
            ->put(route('finance.budgets.update', $budget), [
                'allocated_amount' => 50000, // below committed total of 60000
                'low_budget_threshold' => 10000,
            ])
            ->assertRedirect(route('finance.budgets.index'))
            ->assertSessionHasErrors(['allocated_amount']);

        $this->assertDatabaseHas('department_budgets', [
            'id' => $budget->id,
            'allocated_amount' => 100000.00,
        ]);
    }

    public function test_finance_can_set_allocation_equal_to_reserved_plus_spent(): void
    {
        Role::findOrCreate('finance', 'web');
        Role::findOrCreate('department-head', 'web');

        $financeUser = User::factory()->create();
        $financeUser->assignRole('finance');

        $department = Department::create(['name' => 'Science']);
        $semester = Semester::create([
            'label' => '2nd Semester AY 2026-2027',
            'year' => 2026,
            'semester' => 2,
            'starts_at' => now()->startOfMonth()->toDateString(),
            'ends_at' => now()->addMonths(5)->endOfMonth()->toDateString(),
            'is_active' => true,
        ]);

        $budget = DepartmentBudget::create([
            'department_id' => $department->id,
            'semester_id' => $semester->id,
            'allocated_amount' => 90000,
            'reserved_amount' => 20000,
            'spent_amount' => 15000,
            'low_budget_threshold' => 5000,
        ]);

        $this->actingAs($financeUser)
            ->from(route('finance.budgets.index'))
            ->put(route('finance.budgets.update', $budget), [
                'allocated_amount' => 35000, // exactly reserved + spent
                'low_budget_threshold' => 5000,
            ])
            ->assertRedirect(route('finance.budgets.index'))
            ->assertSessionHasNoErrors();

        $this->assertDatabaseHas('department_budgets', [
            'id' => $budget->id,
            'allocated_amount' => 35000.00,
        ]);
    }
}
