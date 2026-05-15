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

        $allowedStatuses = ['Approved', 'Partially Released'];
        if (! in_array($request->status, $allowedStatuses, true)) {
            $message = "Cannot release items for a request with status \"{$request->status}\". Only Approved or Partially Released requests may be fulfilled.";
            if ($httpRequest->expectsJson() || $httpRequest->ajax()) {
                return response()->json(['error' => $message], 422);
            }
            return Redirect::back()->withErrors(['error' => $message]);
        }

        $data = $httpRequest->validate([
            'delivery_date'                => 'required|date',
            'prepared_by'                  => 'required|string|max:255',
            'checked_by'                   => 'required|string|max:255',
            'received_by'                  => 'required|string|max:255',
            'items'                        => 'required|array|min:1',
            'items.*.request_item_id'      => 'required|integer|exists:request_items,id',
            'items.*.quantity_to_release'  => 'required|integer|min:1',
            'items.*.unit_price'           => 'nullable|numeric|min:0',
        ]);

        $request->load('items');
        $reqItemsById = $request->items->keyBy('id');

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
            if ($reqItem->is_custom && (! isset($line['unit_price']) || $line['unit_price'] === null || $line['unit_price'] === '')) {
                return response()->json(['error' => "A unit price is required for custom item \"{$reqItem->particular}\"."], 422);
            }
        }

        foreach ($data['items'] as $line) {
            $reqItem = $reqItemsById->get($line['request_item_id']);
            if ($reqItem->is_custom) {
                continue;
            }
            $inventoryItem = Item::find($reqItem->item_id);
            if (! $inventoryItem || $inventoryItem->quantity < $line['quantity_to_release']) {
                $available = $inventoryItem ? $inventoryItem->quantity : 0;
                return response()->json(['error' => "Insufficient stock for \"{$reqItem->particular}\" - requested {$line['quantity_to_release']}, available {$available}."], 422);
            }
        }

        DB::beginTransaction();
        try {
            // For custom items, persist the PC-supplied price before computing totals
            foreach ($data['items'] as $line) {
                $reqItem = $reqItemsById->get($line['request_item_id']);
                if ($reqItem->is_custom && isset($line['unit_price']) && $line['unit_price'] !== null) {
                    $reqItem->unit_price_at_request = (float) $line['unit_price'];
                    $reqItem->save();
                }
            }

            $batchTotal = 0.0;
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

                if (! $reqItem->is_custom && $reqItem->item_id) {
                    $invItem = Item::whereKey($reqItem->item_id)->lockForUpdate()->firstOrFail();

                    if ((int) $invItem->quantity < $qty) {
                        throw new \RuntimeException("Insufficient stock available for item ID {$reqItem->item_id}.");
                    }

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

                $reqItem->increment('quantity_fulfilled', $qty);
            }

            $request->load('items');
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
