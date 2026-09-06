<?php

namespace Tests\Feature\DepartmentHead;

use App\Models\Department;
use App\Models\Request;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class MarkReceivedGuardTest extends TestCase
{
    use RefreshDatabase;

    public function test_department_head_cannot_mark_received_for_request_from_another_department(): void
    {
        $departmentA = Department::create(['name' => 'Department A']);
        $departmentB = Department::create(['name' => 'Department B']);

        Role::findOrCreate('department-head', 'web');
        $departmentHead = User::factory()->create(['department_id' => $departmentA->id]);
        $departmentHead->assignRole('department-head');

        $request = Request::create([
            'date' => now()->toDateString(),
            'department_id' => $departmentB->id,
            'purpose' => 'External request',
            'requested_by' => 'Dept B Head',
            'status' => 'Released',
        ]);

        $this->actingAs($departmentHead)
            ->postJson(route('department-head.requests.received', $request))
            ->assertForbidden();

        $this->assertDatabaseHas('requests', [
            'id' => $request->id,
            'status' => 'Released',
        ]);
    }

    public function test_department_head_cannot_mark_received_when_request_is_not_released(): void
    {
        $department = Department::create(['name' => 'Department C']);

        Role::findOrCreate('department-head', 'web');
        $departmentHead = User::factory()->create(['department_id' => $department->id]);
        $departmentHead->assignRole('department-head');

        $request = Request::create([
            'date' => now()->toDateString(),
            'department_id' => $department->id,
            'purpose' => 'Pending request',
            'requested_by' => 'Dept C Head',
            'status' => 'Pending Endorsement',
        ]);

        $this->actingAs($departmentHead)
            ->postJson(route('department-head.requests.received', $request))
            ->assertStatus(422);

        $this->assertDatabaseHas('requests', [
            'id' => $request->id,
            'status' => 'Pending Endorsement',
        ]);
    }

    public function test_department_head_can_mark_released_request_as_completed(): void
    {
        $department = Department::create(['name' => 'Department D']);

        Role::findOrCreate('department-head', 'web');
        Role::findOrCreate('property-custodian', 'web');

        $departmentHead = User::factory()->create(['department_id' => $department->id]);
        $departmentHead->assignRole('department-head');

        $request = Request::create([
            'date' => now()->toDateString(),
            'department_id' => $department->id,
            'purpose' => 'Released request',
            'requested_by' => 'Dept D Head',
            'status' => 'Released',
        ]);

        $this->actingAs($departmentHead)
            ->postJson(route('department-head.requests.received', $request))
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('request.status', 'Completed');

        $this->assertDatabaseHas('requests', [
            'id' => $request->id,
            'status' => 'Completed',
        ]);
    }
}
