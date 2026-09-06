<?php

namespace Tests\Feature\Admin;

use App\Models\Department;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class UserDepartmentValidationTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_cannot_remove_department_from_department_head(): void
    {
        $adminRole = Role::findOrCreate('admin', 'web');
        $departmentHeadRole = Role::findOrCreate('department-head', 'web');

        $admin = User::factory()->create();
        $admin->assignRole($adminRole);

        $department = Department::create(['name' => 'Accounting']);
        $departmentHead = User::factory()->create(['department_id' => $department->id]);
        $departmentHead->assignRole($departmentHeadRole);

        $this->actingAs($admin)
            ->putJson(route('admin.users.update', $departmentHead), [
                'name' => $departmentHead->name,
                'email' => $departmentHead->email,
                'roles' => [$departmentHeadRole->id],
                'department_id' => null,
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['department_id']);

        $this->assertDatabaseHas('users', [
            'id' => $departmentHead->id,
            'department_id' => $department->id,
        ]);
    }
}