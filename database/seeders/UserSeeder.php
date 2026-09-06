<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Models\Department;
use App\Models\User;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        if (app()->isProduction()) {
            $this->command?->warn('Skipping demo user accounts in production.');

            return;
        }

        $defaultPassword = env('SEEDER_DEFAULT_PASSWORD');

        if (! is_string($defaultPassword) || $defaultPassword === '') {
            throw new \RuntimeException('SEEDER_DEFAULT_PASSWORD must be set for demo user seeding.');
        }

        $csitDepartmentId = Department::where('name', 'CSIT')->value('id');

        $users = [
            [
                'name' => 'Admin User',
                'email' => 'admin@gmail.com',
                'role' => 'admin',
                'department_id' => null,
            ],
            [
                'name' => 'Property Custodian User',
                'email' => 'custodian@gmail.com',
                'role' => 'property-custodian',
                'department_id' => null,
            ],
            [
                'name' => 'VP Finance User',
                'email' => 'vpfinance@gmail.com',
                'role' => 'vp-finance',
                'department_id' => null,
            ],
            [
                'name' => 'Department Head User',
                'email' => 'depthead@gmail.com',
                'role' => 'department-head',
                'department_id' => $csitDepartmentId,
            ],
            [
                'name' => 'Finance User',
                'email' => 'finance@gmail.com',
                'role' => 'finance',
                'department_id' => null,
            ],
        ];

        foreach ($users as $seededUser) {
            $user = User::updateOrCreate(
                ['email' => $seededUser['email']],
                [
                    'name' => $seededUser['name'],
                    'password' => Hash::make($defaultPassword),
                    'department_id' => $seededUser['department_id'],
                    'email_verified_at' => now(),
                ],
            );

            $user->syncRoles([$seededUser['role']]);
        }
    }
}
