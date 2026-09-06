<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Department;

class DepartmentSeeder extends Seeder
{
    public function run(): void
    {
        $departments = [
            'CSIT',
            'CAED',
            'CBA',
            'COE',
            'CAS',
            'CCJE',
        ];
        foreach ($departments as $name) {
            Department::firstOrCreate(['name' => $name]);
        }
    }
}
