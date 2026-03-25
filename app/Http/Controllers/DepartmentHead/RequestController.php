<?php

namespace App\Http\Controllers\DepartmentHead;

use App\Http\Controllers\Controller;
use App\Models\Request;
use App\Models\RequestItem;
use App\Models\Department;
use App\Models\Item;
use Illuminate\Http\Request as HttpRequest;
use Illuminate\Support\Facades\Redirect;
use Inertia\Inertia;

class RequestController extends Controller
    {
    // Mark request as received
    public function markReceived(\App\Models\Request $request)
    {
        $request->status = 'Completed';
        $request->save();
        return Redirect::route('department-head.requests.index');
    }

    // List all requests for department head
    public function index()
    {
        $requests = Request::with(['items', 'department', 'deliveryReceipt.items'])
                ->where('department_id', auth()->user()->department_id)
            ->whereIn('status', ['Ready for Pickup', 'Completed'])
            ->get();
            $csrf_token = csrf_token();
            return Inertia::render('DepartmentHead/MyRequest', compact('requests', 'csrf_token'));
    }

    // Show form for creating a new request
    public function create()
    {
        $departments = Department::all();
        $items = Item::all();
        return Inertia::render('DepartmentHead/CreateRequest', compact('departments', 'items'));
    }

    // Store a new request
    public function store(HttpRequest $request)
    {
        $data = $request->validate([
            'date' => 'required|date',
            'department_id' => 'required|exists:departments,id',
            'purpose' => 'required|string',
            'requested_by' => 'required|string',
            'reviewed_by' => 'nullable|string',
            'approved_by' => 'nullable|string',
            'noted_by' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.item_id' => 'required|exists:items,id',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.particular' => 'required|string',
            'items.*.unit' => 'required|string',
        ]);

        $requestModel = Request::create([
            'date' => $data['date'],
            'department_id' => $data['department_id'],
            'purpose' => $data['purpose'],
            'requested_by' => $data['requested_by'],
            'reviewed_by' => $data['reviewed_by'] ?? null,
            'approved_by' => $data['approved_by'] ?? null,
            'noted_by' => $data['noted_by'] ?? null,
            'status' => 'Pending Endorsement',
        ]);

        foreach ($data['items'] as $item) {
            RequestItem::create([
                'request_id' => $requestModel->id,
                'item_id' => $item['item_id'],
                'quantity' => $item['quantity'],
                'particular' => $item['particular'],
                'unit' => $item['unit'],
            ]);
        }

        return Redirect::route('department-head.requests.index');
    }
}
