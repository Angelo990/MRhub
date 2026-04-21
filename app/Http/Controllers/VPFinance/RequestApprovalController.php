<?php

namespace App\Http\Controllers\VPFinance;

use App\Http\Controllers\Controller;
use App\Models\Request;
use App\Models\RequestItem;
use App\Support\WorkflowNotifier;
use Illuminate\Http\Request as HttpRequest;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redirect;

class RequestApprovalController extends Controller
{
    // List all requests pending approval
    public function index()
    {
        $requests = Request::with(['items', 'department'])
            ->where('status', 'Pending Approval')
            ->get();
        return inertia('VPFinance/Requests', compact('requests'));
    }

    // Approve request (optionally rejecting individual items inline)
    public function approve(HttpRequest $httpRequest, Request $request)
    {
        $data = $httpRequest->validate([
            'rejected_items'          => 'nullable|array',
            'rejected_items.*.id'     => 'required|integer|exists:request_items,id',
            'rejected_items.*.reason' => 'required|string|max:500',
        ]);

        $actor = $httpRequest->user();

        DB::transaction(function () use ($request, $data, $actor) {
            // Apply per-item rejections
            foreach ($data['rejected_items'] ?? [] as $rejection) {
                RequestItem::where('id', $rejection['id'])
                    ->where('request_id', $request->id)
                    ->update([
                        'rejection_reason' => $rejection['reason'],
                        'rejected_by'      => $actor->name,
                    ]);
            }

            $request->status      = 'Approved';
            $request->approved_by = $actor->name;
            $request->save();
        });

        $request->load(['items', 'department']);

        WorkflowNotifier::requestApproved($request, $actor);

        if (! empty($data['rejected_items'])) {
            $rejectedItems = $request->items
                ->whereIn('id', collect($data['rejected_items'])->pluck('id'))
                ->values()
                ->toArray();
            WorkflowNotifier::requestItemsRejected($request, $rejectedItems, $actor);
        }

        if ($httpRequest->expectsJson() || $httpRequest->ajax()) {
            return response()->json([
                'success' => true,
                'request' => $request,
            ]);
        }

        return Redirect::route('vp-finance.requests.index');
    }

    // Reject entire request
    public function reject(HttpRequest $httpRequest, Request $request)
    {
        $request->status = 'Rejected';
        $request->approved_by = auth()->user()->name;
        $request->save();

        WorkflowNotifier::requestRejected($request->loadMissing('department'), $httpRequest->user());

        if ($httpRequest->expectsJson() || $httpRequest->ajax()) {
            return response()->json([
                'success' => true,
                'request' => $request->load(['items', 'department']),
            ]);
        }

        return Redirect::route('vp-finance.requests.index');
    }
}
