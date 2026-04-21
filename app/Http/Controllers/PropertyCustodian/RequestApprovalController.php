<?php

namespace App\Http\Controllers\PropertyCustodian;

use App\Http\Controllers\Controller;
use App\Models\Request;
use App\Support\WorkflowNotifier;
use Illuminate\Http\Request as HttpRequest;
use Illuminate\Support\Facades\Redirect;

class RequestApprovalController extends Controller
{
    // List all requests pending endorsement
    public function index()
    {
        $requests = Request::with(['items', 'department', 'deliveryReceipt.items', 'deliveryReceipts.items'])
            ->whereIn('status', ['Pending Endorsement', 'Pending Approval', 'Approved', 'Partially Released', 'Ready for Pickup', 'Released'])
            ->get();
        $items = \App\Models\Item::all();
        return inertia('PropertyCustodian/Requests', compact('requests', 'items'));
    }

    // Endorse request to VP Finance
    public function endorse(HttpRequest $httpRequest, Request $request)
    {
        $request->status = 'Pending Approval';
        $request->locked_at = now();
        $request->save();

        WorkflowNotifier::requestEndorsed($request->loadMissing('department'), $httpRequest->user());

        if ($httpRequest->expectsJson() || $httpRequest->ajax()) {
            return response()->json([
                'success' => true,
                'request' => $request->load(['items', 'department', 'deliveryReceipt.items']),
            ]);
        }

        return Redirect::route('property-custodian.requests.index');
    }
}
