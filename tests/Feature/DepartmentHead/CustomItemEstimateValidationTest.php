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

class CustomItemEstimateValidationTest extends TestCase
{
    use RefreshDatabase;

    public function test_store_rejects_custom_items_without_positive_estimate(): void
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
            'allocated_amount' => 100000,
            'reserved_amount' => 0,
            'spent_amount' => 0,
            'low_budget_threshold' => 10000,
        ]);

        $departmentHead = User::factory()->create(['department_id' => $department->id]);
        $departmentHead->assignRole('department-head');

        $this->actingAs($departmentHead)
            ->post(route('department-head.requests.store'), [
                'date' => now()->toDateString(),
                'purpose' => 'Custom request without estimate',
                'is_urgent' => false,
                'requested_by' => 'Department Head',
                'reviewed_by' => null,
                'approved_by' => null,
                'noted_by' => null,
                'items' => [[
                    'is_custom' => true,
                    'item_id' => null,
                    'quantity' => 1,
                    'particular' => 'Custom equipment',
                    'unit' => 'pcs',
                    'unit_price_at_request' => null,
                ]],
            ])
            ->assertSessionHasErrors(['items.0.unit_price_at_request']);

        $this->assertDatabaseCount('requests', 0);
    }

    public function test_update_rejects_custom_items_without_positive_estimate(): void
    {
        Role::findOrCreate('department-head', 'web');

        $department = Department::create(['name' => 'Science']);
        $semester = Semester::create([
            'label' => '2nd Semester AY 2026-2027',
            'year' => 2026,
            'semester' => 2,
            'starts_at' => now()->startOfMonth()->toDateString(),
            'ends_at' => now()->addMonths(5)->endOfMonth()->toDateString(),
            'is_active' => true,
        ]);

        DepartmentBudget::create([
            'department_id' => $department->id,
            'semester_id' => $semester->id,
            'allocated_amount' => 100000,
            'reserved_amount' => 0,
            'spent_amount' => 0,
            'low_budget_threshold' => 10000,
        ]);

        $departmentHead = User::factory()->create(['department_id' => $department->id]);
        $departmentHead->assignRole('department-head');

        $request = Request::create([
            'date' => now()->toDateString(),
            'department_id' => $department->id,
            'purpose' => 'Editable request',
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
            'unit_price_at_request' => 25,
        ]);

        $this->actingAs($departmentHead)
            ->put(route('department-head.requests.update', $request), [
                'purpose' => 'Edited request',
                'is_urgent' => false,
                'items' => [[
                    'is_custom' => true,
                    'item_id' => null,
                    'quantity' => 1,
                    'particular' => 'Edited custom item',
                    'unit' => 'pcs',
                    'unit_price_at_request' => '',
                ]],
            ])
            ->assertSessionHasErrors(['items.0.unit_price_at_request']);

        $this->assertDatabaseHas('request_items', [
            'request_id' => $request->id,
            'particular' => 'Existing custom item',
            'unit_price_at_request' => 25,
        ]);
    }
}