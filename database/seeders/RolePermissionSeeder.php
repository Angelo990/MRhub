<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

class RolePermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Define roles
        $roles = [
            'admin',
            'property-custodian',
            'vp-finance',
            'department-head',
            'finance',
        ];

        // Define permissions
        $permissions = [
            // General permissions
            'request items',
            'approve requests',
            'manage inventory',
            'view reports',
            
            // Dashboard permissions
            'view property-custodian dashboard',
            'view vp-finance dashboard',
            'view department-head dashboard',
            'view finance dashboard',

            // Budget permissions
            'manage budgets',
            'view budget reports',

            // admin permissions
            'view admin dashboard',
            'manage users',
            'manage roles',
        ];

        // Create permissions
        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission]);
        }

        // Create roles and assign permissions
        foreach ($roles as $role) {
            $roleModel = Role::firstOrCreate(['name' => $role]);
            // Assign permissions based on role
            if ($role === 'admin') {
                $roleModel->syncPermissions($permissions);
            }
            if ($role === 'property-custodian') {
                $roleModel->syncPermissions(['manage inventory', 'approve requests', 'view reports']);
            }
            if ($role === 'vp-finance') {
                $roleModel->syncPermissions(['manage inventory', 'approve requests', 'view reports']);
            }
            if ($role === 'department-head') {
                $roleModel->syncPermissions(['request items', 'manage inventory', 'view reports']);
            }
            if ($role === 'finance') {
                $roleModel->syncPermissions(['manage budgets', 'view budget reports', 'view finance dashboard', 'view reports']);
            }
        }
    }
}
