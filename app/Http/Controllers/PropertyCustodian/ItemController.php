<?php

namespace App\Http\Controllers\PropertyCustodian;

use App\Models\Item;
use App\Models\StockCardEntry;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redirect;
use Inertia\Inertia;

class ItemController extends Controller
{
    public function index()
    {
        $items = Item::with('stockCardEntries')->get();
        return Inertia::render('PropertyCustodian/Inventory', compact('items'));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'unit' => 'required|string|max:20',
            'quantity' => 'required|integer|min:0',
            'unit_price' => 'required|numeric|min:0',
        ]);
        $item = Item::create($data);

        if ((int) $item->quantity > 0) {
            $this->recordStockCardEntry(
                item: $item,
                createdBy: $request->user()?->id,
                transactionDate: now()->toDateString(),
                movementType: 'stock_in',
                reference: 'Initial stock',
                party: null,
                quantity: (int) $item->quantity,
                unitCost: (float) $item->unit_price,
                stockOnHand: (int) $item->quantity,
                notes: 'Initial inventory entry'
            );
        }

        if ($request->expectsJson() || $request->ajax()) {
            return response()->json(['success' => true, 'item' => $item->load('stockCardEntries')], 201);
        }

        return Redirect::route('property-custodian.items.index');
    }

    public function update(Request $request, Item $item)
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'unit' => 'required|string|max:20',
            'unit_price' => 'required|numeric|min:0',
            'quantity_adjustment' => 'nullable|integer',
            'adjustment_note' => 'nullable|string|max:255',
        ]);

        $quantityAdjustment = (int) ($data['quantity_adjustment'] ?? 0);
        $newQuantity = (int) $item->quantity + $quantityAdjustment;

        if ($newQuantity < 0) {
            $message = 'Adjustment exceeds available stock. Stock cannot go below zero.';

            if ($request->expectsJson() || $request->ajax()) {
                return response()->json(['message' => $message], 422);
            }

            return Redirect::back()->withErrors(['quantity_adjustment' => $message]);
        }

        $item->name = $data['name'];
        $item->unit = $data['unit'];
        $item->unit_price = $data['unit_price'];
        $item->quantity = $newQuantity;
        $item->save();

        if ($quantityAdjustment !== 0) {
            $movementType = $quantityAdjustment > 0 ? 'stock_in' : 'stock_out';
            $adjustmentQuantity = abs($quantityAdjustment);

            $this->recordStockCardEntry(
                item: $item,
                createdBy: $request->user()?->id,
                transactionDate: now()->toDateString(),
                movementType: $movementType,
                reference: 'Manual stock correction',
                party: null,
                quantity: $adjustmentQuantity,
                unitCost: (float) $item->unit_price,
                stockOnHand: (int) $item->quantity,
                notes: $data['adjustment_note'] ?: 'Quantity corrected through inventory update'
            );
        }

        if ($request->expectsJson() || $request->ajax()) {
            return response()->json(['success' => true, 'item' => $item->fresh()->load('stockCardEntries')]);
        }

        return Redirect::route('property-custodian.items.index');
    }

    public function destroy(Request $request, Item $item)
    {
        $item->delete();

        if ($request->expectsJson() || $request->ajax()) {
            return response()->json(['success' => true]);
        }

        return Redirect::route('property-custodian.items.index');
    }

    protected function recordStockCardEntry(
        Item $item,
        ?int $createdBy,
        string $transactionDate,
        string $movementType,
        ?string $reference,
        ?string $party,
        int $quantity,
        float $unitCost,
        int $stockOnHand,
        ?string $notes,
    ): void {
        StockCardEntry::create([
            'item_id' => $item->id,
            'created_by' => $createdBy,
            'transaction_date' => $transactionDate,
            'movement_type' => $movementType,
            'reference' => $reference,
            'party' => $party,
            'quantity' => $quantity,
            'unit_cost' => $unitCost,
            'amount' => $quantity * $unitCost,
            'stock_on_hand' => $stockOnHand,
            'notes' => $notes,
        ]);
    }
}
