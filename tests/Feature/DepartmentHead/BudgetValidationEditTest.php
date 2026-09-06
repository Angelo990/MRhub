<?php

namespace Tests\Feature\DepartmentHead;

use App\Models\Department;
use App\Models\DepartmentBudget;
use App\Models\Request;
use App\Models\RequestItem;
use App\Models\Semester;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class BudgetValidationEditTest extends TestCase
{
    use RefreshDatabase;

    public function test_unlocked_pending_request_edit_does_not_restore_unreserved_cost(): void
    {
        Role::findOrCreate('department-head', 'web');

        $department = Department::create(['name' => 'Engineering']);
        $semester = Semester::create([
            'label' => '1st Semester AY 2026-2027',
            'year' => 2026,
            'semester' => 1,
            'starts_at' => now()->startOfMonth()->toDateString(),
            'ends_at' => now()->addMonths(5)->endOfMonth()->toDateString(),
            'is_active' => true,
        ]);

        DepartmentBudget::create([
            'department_id' => $department->id,
            'semester_id' => $semester->id,
            'allocated_amount' => 100,
            'reserved_amount' => 0,
            'spent_amount' => 0,
            'low_budget_threshold' => 10,
        ]);

        $departmentHead = User::factory()->create(['department_id' => $department->id]);
        $departmentHead->assignRole('department-head');

        $request = Request::create([
            'date' => now()->toDateString(),
            'department_id' => $department->id,
            'purpose' => 'Initial request',
            'requested_by' => 'Department Head',
            'status' => 'Pending Endorsement',
        ]);

        RequestItem::create([
            'request_id' => $request->id,
            'item_id' => null,
            'quantity' => 1,
            'particular' => 'Existing custom item',
            'unit' => 'pcs',
            'is_custom' => true,
            'unit_price_at_request' => 50,
        ]);

        $this->actingAs($departmentHead)
            ->from(route('department-head.requests.edit', $request))
            ->put(route('department-head.requests.update', $request), [
                'purpose' => 'Edited request',
                'is_urgent' => false,
                'items' => [
                    [
                        'is_custom' => true,
                        'item_id' => null,
                        'quantity' => 1,
                        'particular' => 'Edited custom item',
                        'unit' => 'pcs',
                        'unit_price_at_request' => 120,
                    ],
                ],
            ])
            ->assertRedirect(route('department-head.requests.edit', $request))
            ->assertSessionHasErrors(['budget']);

        $this->assertDatabaseHas('requests', [
            'id' => $request->id,
            'purpose' => 'Initial request',
            'status' => 'Pending Endorsement',
        ]);
    }
}