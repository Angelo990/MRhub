<?php

namespace Tests\Feature\Finance;

use App\Models\Semester;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class SemesterValidationTest extends TestCase
{
    use RefreshDatabase;

    public function test_finance_cannot_create_a_duplicate_year_and_semester(): void
    {
        Role::findOrCreate('finance', 'web');
        $financeUser = User::factory()->create();
        $financeUser->assignRole('finance');

        Semester::create([
            'label' => '1st Semester AY 2026-2027',
            'year' => 2026,
            'semester' => 1,
            'starts_at' => '2026-06-01',
            'ends_at' => '2026-10-31',
        ]);

        $this->actingAs($financeUser)
            ->from(route('finance.budgets.index'))
            ->post(route('finance.semesters.store'), [
                'label' => 'Duplicate Semester',
                'year' => 2026,
                'semester' => 1,
                'starts_at' => '2026-06-01',
                'ends_at' => '2026-10-31',
            ])
            ->assertRedirect(route('finance.budgets.index'))
            ->assertSessionHasErrors(['semester']);

        $this->assertDatabaseCount('semesters', 1);
    }
}