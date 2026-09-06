<?php

namespace Tests\Feature\PropertyCustodian;

use App\Models\Department;
use App\Models\DeliveryReceipt;
use App\Models\Request;
use App\Models\RequestItem;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class CustomItemReleaseTest extends TestCase
{
    use RefreshDatabase;

    public function test_property_custodian_can_release_custom_item_with_null_item_id(): void
    {
        $department = Department::create(['name' => 'ICT']);

        $propertyCustodian = User::factory()->create([
            'department_id' => $department->id,
            'email_verified_at' => now(),
        ]);

        Role::findOrCreate('property-custodian', 'web');
        Role::findOrCreate('department-head', 'web');
        $propertyCustodian->assignRole('property-custodian');

        $request = Request::create([
            'date' => now()->toDateString(),
            'department_id' => $department->id,
            'purpose' => 'Custom furniture request',
            'requested_by' => 'Department Head',
            'status' => 'Approved',
        ]);

        $requestItem = RequestItem::create([
            'request_id' => $request->id,
            'item_id' => null,
            'quantity' => 1,
            'particular' => 'Steel Cabinet 4 drawers',
            'unit' => 'PC',
            'is_custom' => true,
            'unit_price_at_request' => null,
            'quantity_fulfilled' => 0,
        ]);

        $payload = [
            'delivery_date' => now()->toDateString(),
            'prepared_by' => 'PC User',
            'checked_by' => 'PC Checker',
            'received_by' => 'Department Head',
            'items' => [
                [
                    'request_item_id' => $requestItem->id,
                    'quantity_to_release' => 1,
                    'unit_price' => 100000,
                ],
            ],
        ];

        $response = $this->actingAs($propertyCustodian)
            ->postJson(route('property-custodian.requests.delivery_receipt', $request), $payload);

        $response->assertOk()
            ->assertJsonPath('success', true);

        $receipt = DeliveryReceipt::first();

        $this->assertNotNull($receipt);

        $this->assertDatabaseHas('delivery_receipt_items', [
            'delivery_receipt_id' => $receipt->id,
            'item_id' => null,
            'particular' => 'Steel Cabinet 4 drawers',
            'unit' => 'PC',
            'quantity_delivered' => 1,
        ]);

        $this->assertDatabaseHas('request_items', [
            'id' => $requestItem->id,
            'unit_price_at_request' => 100000.00,
            'quantity_fulfilled' => 1,
        ]);
    }
}
