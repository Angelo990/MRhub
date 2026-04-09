<?php

namespace App\Http\Controllers\PropertyCustodian;

use App\Models\Item;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redirect;
use Inertia\Inertia;

class ItemController extends Controller
{
    public function index()
    {
        $items = Item::all();
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

        if ($request->expectsJson() || $request->ajax()) {
            return response()->json(['success' => true, 'item' => $item], 201);
        }

        return Redirect::route('property-custodian.items.index');
    }

    public function update(Request $request, Item $item)
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'unit' => 'required|string|max:20',
            'quantity' => 'required|integer|min:0',
            'unit_price' => 'required|numeric|min:0',
        ]);
        $item->update($data);

        if ($request->expectsJson() || $request->ajax()) {
            return response()->json(['success' => true, 'item' => $item->fresh()]);
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
}
