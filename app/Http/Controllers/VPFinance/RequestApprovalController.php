<?php

namespace App\Http\Controllers\VPFinance;

use App\Http\Controllers\Controller;
use App\Models\Request;
use App\Models\RequestItem;
use App\Services\BudgetService;
use App\Support\WorkflowNotifier;
use Illuminate\Http\Request as HttpRequest;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Validation\Rule;

class RequestApprovalController extends Controller
{
    // List all requests pending approval
    public function index()
    {
        $requests = Request::with(['items', 'department'])
            ->where('status', 'Pending Approval')
            ->orderByDesc('is_urgent')
            ->latest()
            ->get();
        return inertia('VPFinance/Requests', compact('requests'));
    }

    // Approve request (optionally rejecting individual items inline)
    public function approve(HttpRequest $httpRequest, Request $request)
    {
        $data = $httpRequest->validate([
            'rejected_items'          => 'nullable|array',
            'rejected_items.*.id'     => [
                'required',
                'integer',
                Rule::exists('request_items', 'id')->where(fn ($query) => $query->where('request_id', $request->id)),
            ],
            'rejected_items.*.reason' => 'required|string|max:500',
        ]);

        $actor = $httpRequest->user();

        DB::transaction(function () use ($request, $data, $actor) {
            $lockedRequest = Request::whereKey($request->id)->lockForUpdate()->firstOrFail();

            if ($lockedRequest->status !== 'Pending Approval') {
                throw \Illuminate\Validation\ValidationException::withMessages([
                    'request' => ['Only requests in Pending Approval can be approved.'],
                ]);
            }

            // Apply per-item rejections
            foreach ($data['rejected_items'] ?? [] as $rejection) {
                RequestItem::where('id', $rejection['id'])
                    ->where('request_id', $lockedRequest->id)
                    ->update([
                        'rejection_reason' => $rejection['reason'],
                        'rejected_by'      => $actor->name,
                    ]);
            }

            $lockedRequest->status      = 'Approved';
            $lockedRequest->approved_by = $actor->name;
            $lockedRequest->save();

            $rejectedIds = collect($data['rejected_items'] ?? [])->pluck('id')->toArray();
            BudgetService::spend($lockedRequest->loadMissing('items'), $actor, $rejectedIds);
        });

        $request->refresh()->load(['items', 'department']);

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
        $actor = $httpRequest->user();

        $result = DB::transaction(function () use ($request, $actor, $httpRequest) {
            $request = Request::whereKey($request->id)->lockForUpdate()->firstOrFail();

            if ($request->status !== 'Pending Approval') {
                if ($httpRequest->expectsJson() || $httpRequest->ajax()) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Only requests pending approval can be rejected.',
                    ], 409);
                }

                return Redirect::back()->withErrors([
                    'request' => 'Only requests pending approval can be rejected.',
                ]);
            }

            $request->status = 'Rejected';
            $request->approved_by = $actor->name;
            $request->save();

            BudgetService::release($request->loadMissing('items'), $actor);

            return $request;
        });

        if ($result instanceof \Illuminate\Http\JsonResponse || $result instanceof \Illuminate\Http\RedirectResponse) {
            return $result;
        }

        $request = $result->loadMissing('department');
        WorkflowNotifier::requestRejected($request, $actor);

        if ($httpRequest->expectsJson() || $httpRequest->ajax()) {
            return response()->json([
                'success' => true,
                'request' => $request->load(['items', 'department']),
            ]);
        }

        return Redirect::route('vp-finance.requests.index');
    }
}
