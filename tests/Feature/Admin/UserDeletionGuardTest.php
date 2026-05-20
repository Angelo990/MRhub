<?php

namespace Tests\Feature\Admin;

use App\Models\BudgetTransaction;
use App\Models\Department;
use App\Models\DepartmentBudget;
use App\Models\Semester;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class UserDeletionGuardTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_cannot_delete_user_with_budget_transactions(): void
    {
        Role::findOrCreate('admin', 'web');

        $admin = User::factory()->create();
        $admin->assignRole('admin');

        $targetUser = User::factory()->create();

        $department = Department::create(['name' => 'Accounting']);
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
            'reserved_amount' => 0,
            'spent_amount' => 0,
        ]);

        BudgetTransaction::create([
            'department_budget_id' => $budget->id,
            'request_id' => null,
            'type' => 'adjustment',
            'amount' => 1000,
            'balance_after' => 99000,
            'performed_by' => $targetUser->id,
            'notes' => 'Seeded transaction for guard test',
        ]);

        $this->actingAs($admin)
            ->deleteJson(route('admin.users.destroy', $targetUser))
            ->assertStatus(422)
            ->assertJsonPath('success', false)
            ->assertJsonValidationErrors(['user']);

        $this->assertDatabaseHas('users', [
            'id' => $targetUser->id,
        ]);
    }

    public function test_admin_can_delete_user_without_budget_transactions(): void
    {
        Role::findOrCreate('admin', 'web');

        $admin = User::factory()->create();
        $admin->assignRole('admin');

        $targetUser = User::factory()->create();

        $this->actingAs($admin)
            ->deleteJson(route('admin.users.destroy', $targetUser))
            ->assertOk()
            ->assertJsonPath('success', true);

        $this->assertDatabaseMissing('users', [
            'id' => $targetUser->id,
        ]);
    }
}
