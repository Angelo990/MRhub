<?php

namespace Database\Seeders;

use Illuminate\Support\Facades\Hash;

use App\Models\User;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // User::factory(10)->create();

        $this->call([
            RolePermissionSeeder::class,
            DepartmentSeeder::class,
            UserSeeder::class,
        ]);

        // $user = User::factory()->create([
        //     'name' => 'Test User',
        //     'email' => 'test@example.com',
        //     'password' => Hash::make('12345678'),
        // ]);

        // Assign admin role to the test user
        // $user->assignRole('admin');
    }
}
