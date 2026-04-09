<?php

namespace App\Http\Controllers\PropertyCustodian;

use App\Http\Controllers\Controller;
use App\Models\Request;
use App\Models\DeliveryReceipt;
use App\Models\DeliveryReceiptItem;
use App\Models\Item;
use Illuminate\Http\Request as HttpRequest;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Support\Facades\DB;

class DeliveryReceiptController extends Controller
{
    // Generate delivery receipt for approved request
    public function store(HttpRequest $httpRequest, Request $request)
    {
        // Check inventory for each item
        DB::beginTransaction();
        try {
            foreach ($request->items as $reqItem) {
                $item = Item::find($reqItem->item_id);
                if ($item->quantity < $reqItem->quantity) {
                    throw new \Exception("Not enough stock for item: {$item->name}");
                }
                $item->quantity -= $reqItem->quantity;
                $item->save();
            }
            // Create delivery receipt
            $receipt = DeliveryReceipt::create([
                'request_id' => $request->id,
                'delivery_date' => $httpRequest->input('delivery_date'),
                'prepared_by' => $httpRequest->input('prepared_by'),
                'checked_by' => $httpRequest->input('checked_by'),
                'received_by' => $httpRequest->input('received_by'),
                'total' => $httpRequest->input('total'),
                'status' => 'Released',
            ]);
            // Create delivery receipt items
            foreach ($request->items as $reqItem) {
                DeliveryReceiptItem::create([
                    'delivery_receipt_id' => $receipt->id,
                    'item_id' => $reqItem->item_id,
                    'quantity_requested' => $reqItem->quantity,
                    'quantity_delivered' => $reqItem->quantity, // assuming all delivered
                    'quantity_undelivered' => 0,
                    'unit_cost' => Item::find($reqItem->item_id)->unit_price,
                    'total' => Item::find($reqItem->item_id)->unit_price * $reqItem->quantity,
                    'particular' => $reqItem->particular,
                    'unit' => $reqItem->unit,
                ]);
            }
            $request->status = 'Released';
            $request->save();
            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();

            if ($httpRequest->expectsJson() || $httpRequest->ajax()) {
                return response()->json(['error' => $e->getMessage()], 422);
            }

            return Redirect::back()->withErrors(['error' => $e->getMessage()]);
        }

        if ($httpRequest->expectsJson() || $httpRequest->ajax()) {
            return response()->json([
                'success' => true,
                'request' => $request->fresh()->load(['items', 'department', 'deliveryReceipt.items']),
            ]);
        }

        return Redirect::route('property-custodian.requests.index');
    }
}
