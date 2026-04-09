<?php

namespace App\Http\Controllers\VPFinance;

use App\Http\Controllers\Controller;
use App\Models\Request;
use Illuminate\Http\Request as HttpRequest;
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

    // Approve request
    public function approve(HttpRequest $httpRequest, Request $request)
    {
        $request->status = 'Approved';
        $request->approved_by = auth()->user()->name;
        $request->save();

        if ($httpRequest->expectsJson() || $httpRequest->ajax()) {
            return response()->json([
                'success' => true,
                'request' => $request->load(['items', 'department']),
            ]);
        }

        return Redirect::route('vp-finance.requests.index');
    }

    // Reject request
    public function reject(HttpRequest $httpRequest, Request $request)
    {
        $request->status = 'Rejected';
        $request->approved_by = auth()->user()->name;
        $request->save();

        if ($httpRequest->expectsJson() || $httpRequest->ajax()) {
            return response()->json([
                'success' => true,
                'request' => $request->load(['items', 'department']),
            ]);
        }

        return Redirect::route('vp-finance.requests.index');
    }
}
