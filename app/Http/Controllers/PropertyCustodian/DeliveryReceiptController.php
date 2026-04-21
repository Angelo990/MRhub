<?php

namespace App\Http\Controllers\PropertyCustodian;

use App\Http\Controllers\Controller;
use App\Models\Request;
use App\Models\RequestItem;
use App\Models\DeliveryReceipt;
use App\Models\DeliveryReceiptItem;
use App\Models\Item;
use App\Models\StockCardEntry;
use App\Support\WorkflowNotifier;
use Illuminate\Http\Request as HttpRequest;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redirect;

class DeliveryReceiptController extends Controller
{
    /**
     * Release items for an approved (or partially released) request.
     * Accepts a per-item quantity_to_release so PC can partially fulfill.
     * Each call creates one DeliveryReceipt batch.
     */
    public function store(HttpRequest $httpRequest, Request $request)
    {
        $actor = $httpRequest->user();

        $data = $httpRequest->validate([
            'delivery_date'                => 'required|date',
            'prepared_by'                  => 'required|string|max:255',
            'checked_by'                   => 'required|string|max:255',
            'received_by'                  => 'required|string|max:255',
            'items'                        => 'required|array|min:1',
            'items.*.request_item_id'      => 'required|integer|exists:request_items,id',
            'items.*.quantity_to_release'  => 'required|integer|min:1',
        ]);

        // Load request items fresh with pivot
        $request->load('items');

        // Index request items by id for easy lookup
        $reqItemsById = $request->items->keyBy('id');

        // Validate each line: not rejected, not over-releasing
        foreach ($data['items'] as $line) {
            $reqItem = $reqItemsById->get($line['request_item_id']);
            if (! $reqItem) {
                return response()->json(['error' => "Invalid request item #{$line['request_item_id']}."], 422);
            }
            if ($reqItem->isRejected()) {
                return response()->json(['error' => "Item \"{$reqItem->particular}\" was rejected and cannot be released."], 422);
            }
            $remaining = $reqItem->remainingQuantity();
            if ($line['quantity_to_release'] > $remaining) {
                return response()->json(['error' => "Cannot release {$line['quantity_to_release']} of \"{$reqItem->particular}\" — only {$remaining} remaining."], 422);
            }
        }

        // Pre-check inventory availability for non-custom items
        foreach ($data['items'] as $line) {
            $reqItem = $reqItemsById->get($line['request_item_id']);
            if ($reqItem->is_custom) {
                continue;
            }
            $inventoryItem = Item::find($reqItem->item_id);
            if (! $inventoryItem || $inventoryItem->quantity < $line['quantity_to_release']) {
                $available = $inventoryItem ? $inventoryItem->quantity : 0;
                return response()->json(['error' => "Insufficient stock for \"{$reqItem->particular}\" — requested {$line['quantity_to_release']}, available {$available}."], 422);
            }
        }

        DB::beginTransaction();
        try {
            $batchTotal = 0.0;

            // Calculate total for this batch
            foreach ($data['items'] as $line) {
                $reqItem  = $reqItemsById->get($line['request_item_id']);
                $unitCost = (float) ($reqItem->unit_price_at_request ?? 0);
                $batchTotal += $unitCost * $line['quantity_to_release'];
            }

            $receipt = DeliveryReceipt::create([
                'request_id'    => $request->id,
                'delivery_date' => $data['delivery_date'],
                'prepared_by'   => $data['prepared_by'],
                'checked_by'    => $data['checked_by'],
                'received_by'   => $data['received_by'],
                'total'         => $batchTotal,
                'status'        => 'Released',
            ]);

            foreach ($data['items'] as $line) {
                $reqItem  = $reqItemsById->get($line['request_item_id']);
                $qty      = $line['quantity_to_release'];
                $unitCost = (float) ($reqItem->unit_price_at_request ?? 0);

                DeliveryReceiptItem::create([
                    'delivery_receipt_id'  => $receipt->id,
                    'item_id'              => $reqItem->item_id,
                    'quantity_requested'   => $reqItem->quantity,
                    'quantity_delivered'   => $qty,
                    'quantity_undelivered' => max(0, $reqItem->remainingQuantity() - $qty),
                    'unit_cost'            => $unitCost,
                    'total'                => $unitCost * $qty,
                    'particular'           => $reqItem->particular,
                    'unit'                 => $reqItem->unit,
                ]);

                // Decrement inventory only for inventory items (not custom)
                if (! $reqItem->is_custom && $reqItem->item_id) {
                    $invItem = Item::findOrFail($reqItem->item_id);
                    $invItem->quantity -= $qty;
                    $invItem->save();

                    StockCardEntry::create([
                        'item_id'          => $invItem->id,
                        'created_by'       => $actor?->id,
                        'transaction_date' => $receipt->delivery_date,
                        'movement_type'    => 'stock_out',
                        'reference'        => 'Released item',
                        'party'            => $receipt->received_by,
                        'quantity'         => $qty,
                        'unit_cost'        => $unitCost,
                        'amount'           => $unitCost * $qty,
                        'stock_on_hand'    => (int) $invItem->quantity,
                        'notes'            => "Released via delivery receipt #{$receipt->id}",
                    ]);
                }

                // Increment quantity_fulfilled on the request item
                $reqItem->increment('quantity_fulfilled', $qty);
            }

            // Determine new request status
            $request->load('items'); // refresh fulfilled counts
            if ($request->isFullyFulfilled()) {
                $request->status = 'Released';
            } else {
                $request->status = 'Partially Released';
            }
            $request->save();

            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();

            if ($httpRequest->expectsJson() || $httpRequest->ajax()) {
                return response()->json(['error' => $e->getMessage()], 422);
            }

            return Redirect::back()->withErrors(['error' => $e->getMessage()]);
        }

        $request->load(['items', 'department', 'deliveryReceipts.items']);

        if ($request->status === 'Released') {
            WorkflowNotifier::requestReleased($request, $actor);
        } else {
            WorkflowNotifier::requestPartiallyReleased($request, $actor);
        }

        if ($httpRequest->expectsJson() || $httpRequest->ajax()) {
            return response()->json([
                'success' => true,
                'request' => $request,
            ]);
        }

        return Redirect::route('property-custodian.requests.index');
    }
}


class DeliveryReceiptController extends Controller
{
    // Generate delivery receipt for approved request
    public function store(HttpRequest $httpRequest, Request $request)
    {
        $actor = $httpRequest->user();

        // Check inventory for each item
        DB::beginTransaction();
        try {
            foreach ($request->items as $reqItem) {
                $item = Item::find($reqItem->item_id);
                if ($item->quantity < $reqItem->quantity) {
                    throw new \Exception("Not enough stock for item: {$item->name}");
                }
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
                $item = Item::findOrFail($reqItem->item_id);
                $unitCost = (float) $item->unit_price;

                $item->quantity -= $reqItem->quantity;
                $item->save();

                DeliveryReceiptItem::create([
                    'delivery_receipt_id' => $receipt->id,
                    'item_id' => $reqItem->item_id,
                    'quantity_requested' => $reqItem->quantity,
                    'quantity_delivered' => $reqItem->quantity, // assuming all delivered
                    'quantity_undelivered' => 0,
                    'unit_cost' => $unitCost,
                    'total' => $unitCost * $reqItem->quantity,
                    'particular' => $reqItem->particular,
                    'unit' => $reqItem->unit,
                ]);

                StockCardEntry::create([
                    'item_id' => $item->id,
                    'created_by' => $httpRequest->user()?->id,
                    'transaction_date' => $receipt->delivery_date,
                    'movement_type' => 'stock_out',
                    'reference' => 'Released item',
                    'party' => $receipt->received_by,
                    'quantity' => $reqItem->quantity,
                    'unit_cost' => $unitCost,
                    'amount' => $unitCost * $reqItem->quantity,
                    'stock_on_hand' => (int) $item->quantity,
                    'notes' => "Released via delivery receipt #{$receipt->id}",
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

        WorkflowNotifier::requestReleased($request->fresh()->loadMissing('department'), $actor);

        if ($httpRequest->expectsJson() || $httpRequest->ajax()) {
            return response()->json([
                'success' => true,
                'request' => $request->fresh()->load(['items', 'department', 'deliveryReceipt.items']),
            ]);
        }

        return Redirect::route('property-custodian.requests.index');
    }
}
