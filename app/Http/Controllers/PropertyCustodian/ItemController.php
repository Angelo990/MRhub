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
            'quantity' => 'required|integer|min:0',
            'unit_price' => 'required|numeric|min:0',
        ]);
        Item::create($data);
        return Redirect::route('property-custodian.items.index');
    }

    public function update(Request $request, Item $item)
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'quantity' => 'required|integer|min:0',
            'unit_price' => 'required|numeric|min:0',
        ]);
        $item->update($data);
        return Redirect::route('property-custodian.items.index');
    }

    public function destroy(Item $item)
    {
        $item->delete();
        return Redirect::route('property-custodian.items.index');
    }
}
