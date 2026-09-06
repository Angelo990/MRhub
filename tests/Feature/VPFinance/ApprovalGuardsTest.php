<?php

namespace Tests\Feature\VPFinance;

use App\Models\Department;
use App\Models\Item;
use App\Models\Request;
use App\Models\RequestItem;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class ApprovalGuardsTest extends TestCase
{
    use RefreshDatabase;

    public function test_vp_finance_cannot_submit_rejected_items_from_another_request(): void
    {
        $department = Department::create(['name' => 'Finance Test Department']);
        $item = Item::create([
            'name' => 'Bond Paper',
            'unit' => 'REAM',
            'quantity' => 100,
            'unit_price' => 150,
        ]);

        Role::findOrCreate('vp-finance', 'web');
        $vpFinance = User::factory()->create();
        $vpFinance->assignRole('vp-finance');

        $targetRequest = Request::create([
            'date' => now()->toDateString(),
            'department_id' => $department->id,
            'purpose' => 'Target request',
            'requested_by' => 'Department Head',
            'status' => 'Pending Approval',
        ]);

        $foreignRequest = Request::create([
            'date' => now()->toDateString(),
            'department_id' => $department->id,
            'purpose' => 'Foreign request',
            'requested_by' => 'Department Head',
            'status' => 'Pending Approval',
        ]);

        RequestItem::create([
            'request_id' => $targetRequest->id,
            'item_id' => $item->id,
            'quantity' => 2,
            'particular' => $item->name,
            'unit' => $item->unit,
            'is_custom' => false,
            'unit_price_at_request' => 150,
        ]);

        $foreignItem = RequestItem::create([
            'request_id' => $foreignRequest->id,
            'item_id' => $item->id,
            'quantity' => 1,
            'particular' => $item->name,
            'unit' => $item->unit,
            'is_custom' => false,
            'unit_price_at_request' => 150,
        ]);

        $payload = [
            'rejected_items' => [
                [
                    'id' => $foreignItem->id,
                    'reason' => 'Should not be allowed',
                ],
            ],
        ];

        $this->actingAs($vpFinance)
            ->postJson(route('vp-finance.requests.approve', $targetRequest), $payload)
            ->assertStatus(422)
            ->assertJsonValidationErrors(['rejected_items.0.id']);

        $this->assertDatabaseHas('request_items', [
            'id' => $foreignItem->id,
            'rejection_reason' => null,
        ]);

        $this->assertDatabaseHas('requests', [
            'id' => $targetRequest->id,
            'status' => 'Pending Approval',
        ]);
    }

    public function test_vp_finance_cannot_approve_request_not_in_pending_approval_status(): void
    {
        $department = Department::create(['name' => 'Status Guard Department']);

        Role::findOrCreate('vp-finance', 'web');
        $vpFinance = User::factory()->create();
        $vpFinance->assignRole('vp-finance');

        $request = Request::create([
            'date' => now()->toDateString(),
            'department_id' => $department->id,
            'purpose' => 'Already approved request',
            'requested_by' => 'Department Head',
            'status' => 'Approved',
        ]);

        $this->actingAs($vpFinance)
            ->postJson(route('vp-finance.requests.approve', $request), [
                'rejected_items' => [],
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['request']);

        $this->assertDatabaseHas('requests', [
            'id' => $request->id,
            'status' => 'Approved',
        ]);
    }
}
