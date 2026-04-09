<?php

namespace App\Http\Controllers\DepartmentHead;

use App\Http\Controllers\Controller;
use App\Models\Request as SupplyRequest;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function __invoke()
    {
        $user = auth()->user()->loadMissing('department');
        $departmentId = $user->department_id;
        $departmentName = $user->department?->name ?? 'Department';

        $requestsByStatus = collect([
            'Pending Endorsement',
            'Pending Approval',
            'Approved',
            'Released',
            'Completed',
            'Rejected',
        ])->map(fn (string $status) => [
            'name' => $status,
            'count' => SupplyRequest::where('department_id', $departmentId)->where('status', $status)->count(),
        ])->values();

        $mostRequestedItems = DB::table('request_items')
            ->join('requests', 'requests.id', '=', 'request_items.request_id')
            ->where('requests.department_id', $departmentId)
            ->select('request_items.particular')
            ->selectRaw('SUM(request_items.quantity) as total_quantity')
            ->groupBy('request_items.particular')
            ->orderByDesc('total_quantity')
            ->limit(8)
            ->get()
            ->map(fn ($row) => [
                'name' => $row->particular,
                'count' => (int) $row->total_quantity,
            ])
            ->values();

        $monthlyRequests = DB::table('requests')
            ->where('department_id', $departmentId)
            ->selectRaw("DATE_FORMAT(date, '%Y-%m') as month_key")
            ->selectRaw('COUNT(*) as total_requests')
            ->groupBy('month_key')
            ->orderBy('month_key')
            ->limit(6)
            ->get()
            ->map(fn ($row) => [
                'name' => $row->month_key,
                'count' => (int) $row->total_requests,
            ])
            ->values();

        $requestValue = (float) DB::table('request_items')
            ->join('requests', 'requests.id', '=', 'request_items.request_id')
            ->join('items', 'items.id', '=', 'request_items.item_id')
            ->where('requests.department_id', $departmentId)
            ->selectRaw('COALESCE(SUM(request_items.quantity * items.unit_price), 0) as total_cost')
            ->value('total_cost');

        $recentRequests = SupplyRequest::with(['items'])
            ->where('department_id', $departmentId)
            ->latest('date')
            ->latest('id')
            ->limit(6)
            ->get()
            ->map(function (SupplyRequest $request) {
                $estimatedValue = (float) DB::table('request_items')
                    ->join('items', 'items.id', '=', 'request_items.item_id')
                    ->where('request_items.request_id', $request->id)
                    ->selectRaw('COALESCE(SUM(request_items.quantity * items.unit_price), 0) as total_cost')
                    ->value('total_cost');

                return [
                    'id' => $request->id,
                    'date' => $request->date,
                    'purpose' => Str::limit($request->purpose, 72),
                    'status' => $request->status,
                    'itemCount' => $request->items->count(),
                    'totalQuantity' => (int) $request->items->sum('quantity'),
                    'estimatedValue' => $estimatedValue,
                    'canMarkReceived' => in_array($request->status, ['Ready for Pickup', 'Released'], true),
                ];
            })
            ->values();

        $stats = [
            'totalRequests' => SupplyRequest::where('department_id', $departmentId)->count(),
            'pendingRequests' => SupplyRequest::where('department_id', $departmentId)
                ->whereIn('status', ['Pending Endorsement', 'Pending Approval'])
                ->count(),
            'approvedRequests' => SupplyRequest::where('department_id', $departmentId)
                ->whereIn('status', ['Approved', 'Released'])
                ->count(),
            'completedRequests' => SupplyRequest::where('department_id', $departmentId)
                ->where('status', 'Completed')
                ->count(),
            'rejectedRequests' => SupplyRequest::where('department_id', $departmentId)
                ->where('status', 'Rejected')
                ->count(),
            'estimatedRequestValue' => $requestValue,
        ];

        return Inertia::render('DepartmentHead/Dashboard', [
            'departmentName' => $departmentName,
            'stats' => $stats,
            'requestsByStatus' => $requestsByStatus,
            'mostRequestedItems' => $mostRequestedItems,
            'monthlyRequests' => $monthlyRequests,
            'recentRequests' => $recentRequests,
        ]);
    }
}