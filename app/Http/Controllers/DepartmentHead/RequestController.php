<?php

namespace App\Http\Controllers\DepartmentHead;

use App\Http\Controllers\Controller;
use App\Models\Request;
use App\Models\RequestItem;
use App\Models\Department;
use App\Models\Item;
use App\Support\WorkflowNotifier;
use Illuminate\Http\Request as HttpRequest;
use Illuminate\Support\Facades\Redirect;
use Inertia\Inertia;

class RequestController extends Controller
    {
    // Mark request as received
    public function markReceived(HttpRequest $httpRequest, \App\Models\Request $request)
    {
        $request->status = 'Completed';
        $request->save();

        WorkflowNotifier::requestCompleted($request->loadMissing('department'), $httpRequest->user());

        if ($httpRequest->expectsJson() || $httpRequest->ajax()) {
            return response()->json([
                'success' => true,
                'request' => $request->load(['items', 'department', 'deliveryReceipt.items']),
            ]);
        }

        return Redirect::route('department-head.requests.index');
    }

    // List all requests for department head
    public function index()
    {
        $user = auth()->user();

        $requests = Request::with(['items', 'department', 'deliveryReceipt.items'])
            ->where('department_id', $user->department_id)
            ->latest()
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
        $user = auth()->user();

        $data = $request->validate([
            'date' => 'required|date',
            'purpose' => 'required|string',
            'requested_by' => 'required|string',
            'reviewed_by' => 'nullable|string',
            'approved_by' => 'nullable|string',
            'noted_by' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.item_id' => 'required|exists:items,id',
            'items.*.quantity' => 'required|integer|min:1',
        ]);

        $inventoryItems = Item::whereIn('id', collect($data['items'])->pluck('item_id'))
            ->get()
            ->keyBy('id');

        $requestModel = Request::create([
            'date' => $data['date'],
            'department_id' => $user->department_id,
            'purpose' => $data['purpose'],
            'requested_by' => $data['requested_by'],
            'reviewed_by' => $data['reviewed_by'] ?? null,
            'approved_by' => $data['approved_by'] ?? null,
            'noted_by' => $data['noted_by'] ?? null,
            'status' => 'Pending Endorsement',
        ]);

        foreach ($data['items'] as $item) {
            $inventoryItem = $inventoryItems->get((int) $item['item_id']);

            if (! $inventoryItem) {
                abort(422, 'Selected inventory item is invalid.');
            }

            RequestItem::create([
                'request_id' => $requestModel->id,
                'item_id' => $item['item_id'],
                'quantity' => $item['quantity'],
                'particular' => $inventoryItem->name,
                'unit' => $inventoryItem->unit,
            ]);
        }

        WorkflowNotifier::requestSubmitted($requestModel->loadMissing('department'), $user);

        return Redirect::route('department-head.requests.index');
    }
}
