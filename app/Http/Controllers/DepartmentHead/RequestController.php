<?php

namespace App\Http\Controllers\DepartmentHead;

use App\Http\Controllers\Controller;
use App\Models\Request;
use App\Models\RequestItem;
use App\Models\Department;
use App\Models\Item;
use App\Services\BudgetService;
use App\Support\WorkflowNotifier;
use Illuminate\Http\Request as HttpRequest;
use Illuminate\Support\Facades\Redirect;
use Inertia\Inertia;

class RequestController extends Controller
    {
    // Mark request as received
    public function markReceived(HttpRequest $httpRequest, \App\Models\Request $request)
    {
        $user = $httpRequest->user();

        if ($request->department_id !== $user->department_id) {
            abort(403, 'Unauthorized.');
        }

        if (! in_array($request->status, ['Released', 'Ready for Pickup'], true)) {
            abort(422, 'Only released requests can be marked as completed.');
        }

        $request->status = 'Completed';
        $request->save();

        WorkflowNotifier::requestCompleted($request->loadMissing('department'), $user);

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
            ->orderByDesc('is_urgent')
            ->latest()
            ->get();

        $csrf_token = csrf_token();

        return Inertia::render('DepartmentHead/MyRequest', compact('requests', 'csrf_token'));
    }

    // Show form for creating a new request
    public function create()
    {
        $user = auth()->user()->load('department');
        $departments = Department::all();
        $items = Item::all();
        $userDepartment = $user->department;
        $budget = BudgetService::activeBudgetForDepartment($user->department_id);
        $budgetInfo = $budget ? [
            'available_amount' => $budget->available_amount,
            'allocated_amount' => (float) $budget->allocated_amount,
            'semester_label'   => $budget->semester?->label,
        ] : null;
        return Inertia::render('DepartmentHead/CreateRequest', compact('departments', 'items', 'userDepartment', 'budgetInfo'));
    }

    // Store a new request
    public function store(HttpRequest $request)
    {
        $user = auth()->user();

        $data = $request->validate([
            'date'                          => 'required|date',
            'purpose'                       => 'required|string',
            'is_urgent'                     => 'boolean',
            'requested_by'                  => 'required|string',
            'reviewed_by'                   => 'nullable|string',
            'approved_by'                   => 'nullable|string',
            'noted_by'                      => 'nullable|string',
            'items'                         => 'required|array|min:1',
            'items.*.is_custom'             => 'boolean',
            'items.*.item_id'               => 'nullable',
            'items.*.quantity'              => 'required|integer|min:1',
            'items.*.particular'            => 'required|string',
            'items.*.unit'                  => 'required|string',
            'items.*.unit_price_at_request' => 'nullable|numeric|min:0',
        ]);

        // Validate inventory item_id exists when not custom
        foreach ($data['items'] as $idx => $item) {
            $isCustom = ! empty($item['is_custom']);
            if (! $isCustom && empty($item['item_id'])) {
                abort(422, 'Inventory item must be selected for non-custom rows.');
            }
            if (! $isCustom && ! Item::where('id', $item['item_id'])->exists()) {
                abort(422, 'Selected inventory item is invalid.');
            }
        }

        $inventoryItemIds = collect($data['items'])
            ->filter(fn($i) => empty($i['is_custom']))
            ->pluck('item_id')
            ->filter()
            ->unique();

        $inventoryItems = Item::whereIn('id', $inventoryItemIds)->get()->keyBy('id');

        // Budget validation: compute total cost from submitted items before persisting
        $submittedCost = collect($data['items'])->reduce(function (float $carry, array $item) use ($inventoryItems) {
            $isCustom = ! empty($item['is_custom']);
            $price = $isCustom
                ? (float) ($item['unit_price_at_request'] ?? 0)
                : (float) ($inventoryItems->get((int) $item['item_id'])?->unit_price ?? 0);
            return $carry + ($price * (int) $item['quantity']);
        }, 0.0);

        $budgetError = BudgetService::validateCost($user->department_id, $submittedCost);
        if ($budgetError) {
            return back()->withErrors(['budget' => $budgetError])->withInput();
        }

        $requestModel = Request::create([
            'date'         => $data['date'],
            'department_id'=> $user->department_id,
            'purpose'      => $data['purpose'],
            'is_urgent'    => ! empty($data['is_urgent']),
            'requested_by' => $data['requested_by'],
            'reviewed_by'  => $data['reviewed_by'] ?? null,
            'approved_by'  => $data['approved_by'] ?? null,
            'noted_by'     => $data['noted_by'] ?? null,
            'status'       => 'Pending Endorsement',
        ]);

        foreach ($data['items'] as $item) {
            $isCustom = ! empty($item['is_custom']);

            if ($isCustom) {
                RequestItem::create([
                    'request_id'             => $requestModel->id,
                    'item_id'                => null,
                    'quantity'               => $item['quantity'],
                    'particular'             => $item['particular'],
                    'unit'                   => $item['unit'],
                    'is_custom'              => true,
                    'unit_price_at_request'  => $item['unit_price_at_request'] ?? null,
                ]);
            } else {
                $inventoryItem = $inventoryItems->get((int) $item['item_id']);

                RequestItem::create([
                    'request_id'             => $requestModel->id,
                    'item_id'                => $item['item_id'],
                    'quantity'               => $item['quantity'],
                    'particular'             => $inventoryItem->name,
                    'unit'                   => $inventoryItem->unit,
                    'is_custom'              => false,
                    'unit_price_at_request'  => $inventoryItem->unit_price,
                ]);
            }
        }

        WorkflowNotifier::requestSubmitted($requestModel->loadMissing('department'), $user);

        return Redirect::route('department-head.requests.index');
    }

    // Show form for editing an existing request
    public function edit(HttpRequest $httpRequest, Request $request)
    {
        $user = $httpRequest->user();

        // Only the owning department can edit, and only when unlocked
        if ($request->department_id !== $user->department_id) {
            abort(403, 'Unauthorized.');
        }

        if ($request->isLocked()) {
            return Redirect::route('department-head.requests.index')
                ->with('error', 'This request has been endorsed and can no longer be edited.');
        }

        $departments = Department::all();
        $items = Item::all();
        $request->load('items', 'department');
        $budget = BudgetService::activeBudgetForDepartment($user->department_id);
        $budgetInfo = $budget ? [
            'available_amount' => $budget->available_amount,
            'allocated_amount' => (float) $budget->allocated_amount,
            'semester_label'   => $budget->semester?->label,
        ] : null;

        return Inertia::render('DepartmentHead/EditRequest', compact('request', 'departments', 'items', 'budgetInfo'));
    }
    public function update(HttpRequest $httpRequest, Request $request)
    {
        $user = $httpRequest->user();

        if ($request->department_id !== $user->department_id) {
            abort(403, 'Unauthorized.');
        }

        if ($request->isLocked()) {
            abort(403, 'This request has been endorsed and can no longer be edited.');
        }

        $data = $httpRequest->validate([
            'purpose'                       => 'required|string',
            'is_urgent'                     => 'boolean',
            'items'                         => 'required|array|min:1',
            'items.*.is_custom'             => 'boolean',
            'items.*.item_id'               => 'nullable',
            'items.*.quantity'              => 'required|integer|min:1',
            'items.*.particular'            => 'required|string',
            'items.*.unit'                  => 'required|string',
            'items.*.unit_price_at_request' => 'nullable|numeric|min:0',
        ]);

        foreach ($data['items'] as $item) {
            $isCustom = ! empty($item['is_custom']);
            if (! $isCustom && empty($item['item_id'])) {
                abort(422, 'Inventory item must be selected for non-custom rows.');
            }
            if (! $isCustom && ! Item::where('id', $item['item_id'])->exists()) {
                abort(422, 'Selected inventory item is invalid.');
            }
        }

        $inventoryItemIds = collect($data['items'])
            ->filter(fn($i) => empty($i['is_custom']))
            ->pluck('item_id')
            ->filter()
            ->unique();

        $inventoryItems = Item::whereIn('id', $inventoryItemIds)->get()->keyBy('id');

        // Budget validation (edit): exclude current request's cost to avoid double-counting
        $submittedCost = collect($data['items'])->reduce(function (float $carry, array $item) use ($inventoryItems) {
            $isCustom = ! empty($item['is_custom']);
            $price = $isCustom
                ? (float) ($item['unit_price_at_request'] ?? 0)
                : (float) ($inventoryItems->get((int) $item['item_id'])?->unit_price ?? 0);
            return $carry + ($price * (int) $item['quantity']);
        }, 0.0);

        $budgetError = BudgetService::validateCost($user->department_id, $submittedCost, $request->id);
        if ($budgetError) {
            return back()->withErrors(['budget' => $budgetError])->withInput();
        }

        $request->update(['purpose' => $data['purpose'], 'is_urgent' => ! empty($data['is_urgent'])]);

        // Replace all items
        $request->items()->delete();

        foreach ($data['items'] as $item) {
            $isCustom = ! empty($item['is_custom']);

            if ($isCustom) {
                RequestItem::create([
                    'request_id'             => $request->id,
                    'item_id'                => null,
                    'quantity'               => $item['quantity'],
                    'particular'             => $item['particular'],
                    'unit'                   => $item['unit'],
                    'is_custom'              => true,
                    'unit_price_at_request'  => $item['unit_price_at_request'] ?? null,
                ]);
            } else {
                $inventoryItem = $inventoryItems->get((int) $item['item_id']);

                RequestItem::create([
                    'request_id'             => $request->id,
                    'item_id'                => $item['item_id'],
                    'quantity'               => $item['quantity'],
                    'particular'             => $inventoryItem->name,
                    'unit'                   => $inventoryItem->unit,
                    'is_custom'              => false,
                    'unit_price_at_request'  => $inventoryItem->unit_price,
                ]);
            }
        }

        return Redirect::route('department-head.requests.index');
    }
}
