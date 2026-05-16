<?php

namespace App\Http\Controllers\PropertyCustodian;

use App\Http\Controllers\Controller;
use App\Models\Request;
use App\Services\BudgetService;
use App\Support\WorkflowNotifier;
use Illuminate\Http\Request as HttpRequest;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redirect;

class RequestApprovalController extends Controller
{
    // List all requests pending endorsement
    public function index()
    {
        $requests = Request::with(['items', 'department', 'deliveryReceipt.items', 'deliveryReceipts.items'])
            ->whereIn('status', ['Pending Endorsement', 'Pending Approval', 'Approved', 'Partially Released', 'Ready for Pickup', 'Released'])
            ->orderByDesc('is_urgent')
            ->latest()
            ->get();
        $items = \App\Models\Item::all();
        return inertia('PropertyCustodian/Requests', compact('requests', 'items'));
    }

    // Endorse request to VP Finance
    public function endorse(HttpRequest $httpRequest, Request $request)
    {
        if ($request->status !== 'Pending Endorsement') {
            if ($httpRequest->expectsJson() || $httpRequest->ajax()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Only requests pending endorsement can be endorsed.',
                    'request' => $request->load(['items', 'department', 'deliveryReceipt.items']),
                ], 409);
            }

            return Redirect::route('property-custodian.requests.index')
                ->with('error', 'Only requests pending endorsement can be endorsed.');
        }

        $user = $httpRequest->user();

        try {
            DB::transaction(function () use ($request, $user) {
                $request->status    = 'Pending Approval';
                $request->locked_at = now();
                $request->save();

                BudgetService::reserve($request->loadMissing('items'), $user);
            });
        } catch (\RuntimeException $e) {
            if ($httpRequest->expectsJson() || $httpRequest->ajax()) {
                return response()->json([
                    'success' => false,
                    'message' => $e->getMessage(),
                    'request' => $request->refresh()->load(['items', 'department', 'deliveryReceipt.items']),
                ], 422);
            }

            return Redirect::route('property-custodian.requests.index')
                ->with('error', $e->getMessage());
        }

        WorkflowNotifier::requestEndorsed($request->loadMissing('department'), $user);

        if ($httpRequest->expectsJson() || $httpRequest->ajax()) {
            return response()->json([
                'success' => true,
                'request' => $request->load(['items', 'department', 'deliveryReceipt.items']),
            ]);
        }

        return Redirect::route('property-custodian.requests.index');
    }
}
