<?php

namespace App\Http\Controllers\VPFinance;

use App\Http\Controllers\Controller;
use App\Models\DeliveryReceipt;
use App\Models\Request as SupplyRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function __invoke(Request $httpRequest)
    {
        $from = $httpRequest->string('from')->toString() ?: null;
        $to = $httpRequest->string('to')->toString() ?: null;

        $highestPendingRequest = DB::table('request_items')
            ->join('requests', 'requests.id', '=', 'request_items.request_id')
            ->join('departments', 'departments.id', '=', 'requests.department_id')
            ->join('items', 'items.id', '=', 'request_items.item_id')
            ->where('requests.status', 'Pending Approval')
            ->when($from, fn ($query) => $query->whereDate('requests.date', '>=', $from))
            ->when($to, fn ($query) => $query->whereDate('requests.date', '<=', $to))
            ->select('departments.name')
            ->selectRaw('SUM(request_items.quantity * items.unit_price) as total_cost')
            ->groupBy('requests.id', 'departments.name')
            ->orderByDesc('total_cost')
            ->first();

        $departmentRequestCost = DB::table('request_items')
            ->join('requests', 'requests.id', '=', 'request_items.request_id')
            ->join('departments', 'departments.id', '=', 'requests.department_id')
            ->join('items', 'items.id', '=', 'request_items.item_id')
            ->when($from, fn ($query) => $query->whereDate('requests.date', '>=', $from))
            ->when($to, fn ($query) => $query->whereDate('requests.date', '<=', $to))
            ->select('departments.name')
            ->selectRaw('SUM(request_items.quantity * items.unit_price) as total_cost')
            ->groupBy('departments.name')
            ->orderByDesc('total_cost')
            ->limit(6)
            ->get()
            ->map(fn ($row) => [
                'name' => $row->name,
                'total' => (float) $row->total_cost,
            ])
            ->values();

        $itemRequestCost = DB::table('request_items')
            ->join('requests', 'requests.id', '=', 'request_items.request_id')
            ->join('items', 'items.id', '=', 'request_items.item_id')
            ->when($from, fn ($query) => $query->whereDate('requests.date', '>=', $from))
            ->when($to, fn ($query) => $query->whereDate('requests.date', '<=', $to))
            ->select('request_items.particular')
            ->selectRaw('SUM(request_items.quantity * items.unit_price) as total_cost')
            ->groupBy('request_items.particular')
            ->orderByDesc('total_cost')
            ->limit(8)
            ->get()
            ->map(fn ($row) => [
                'name' => $row->particular,
                'total' => (float) $row->total_cost,
            ])
            ->values();

        $costByStatus = collect([
            'Pending Approval',
            'Approved',
            'Released',
            'Completed',
            'Rejected',
        ])->map(function (string $status) use ($from, $to) {
            $total = DB::table('request_items')
                ->join('requests', 'requests.id', '=', 'request_items.request_id')
                ->join('items', 'items.id', '=', 'request_items.item_id')
                ->where('requests.status', $status)
            ->when($from, fn ($query) => $query->whereDate('requests.date', '>=', $from))
            ->when($to, fn ($query) => $query->whereDate('requests.date', '<=', $to))
                ->selectRaw('COALESCE(SUM(request_items.quantity * items.unit_price), 0) as total_cost')
                ->value('total_cost');

            return [
                'name' => $status,
                'total' => (float) $total,
            ];
        })->values();

        $recentPendingApprovals = SupplyRequest::query()
            ->with(['department', 'items'])
            ->where('status', 'Pending Approval')
            ->when($from, fn ($query) => $query->whereDate('date', '>=', $from))
            ->when($to, fn ($query) => $query->whereDate('date', '<=', $to))
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
                    'department' => $request->department?->name ?? 'Unknown Department',
                    'requestedBy' => $request->requested_by,
                    'purpose' => Str::limit($request->purpose, 72),
                    'itemCount' => $request->items->count(),
                    'estimatedValue' => $estimatedValue,
                ];
            })
            ->values();

        $stats = [
            'totalRequestValue' => (float) DB::table('request_items')
                ->join('requests', 'requests.id', '=', 'request_items.request_id')
                ->join('items', 'items.id', '=', 'request_items.item_id')
                ->when($from, fn ($query) => $query->whereDate('requests.date', '>=', $from))
                ->when($to, fn ($query) => $query->whereDate('requests.date', '<=', $to))
                ->selectRaw('COALESCE(SUM(request_items.quantity * items.unit_price), 0) as total_cost')
                ->value('total_cost'),
            'pendingApprovalValue' => (float) DB::table('request_items')
                ->join('requests', 'requests.id', '=', 'request_items.request_id')
                ->join('items', 'items.id', '=', 'request_items.item_id')
                ->where('requests.status', 'Pending Approval')
                ->when($from, fn ($query) => $query->whereDate('requests.date', '>=', $from))
                ->when($to, fn ($query) => $query->whereDate('requests.date', '<=', $to))
                ->selectRaw('COALESCE(SUM(request_items.quantity * items.unit_price), 0) as total_cost')
                ->value('total_cost'),
            'approvedValue' => (float) DB::table('request_items')
                ->join('requests', 'requests.id', '=', 'request_items.request_id')
                ->join('items', 'items.id', '=', 'request_items.item_id')
                ->whereIn('requests.status', ['Approved', 'Released', 'Completed'])
                ->when($from, fn ($query) => $query->whereDate('requests.date', '>=', $from))
                ->when($to, fn ($query) => $query->whereDate('requests.date', '<=', $to))
                ->selectRaw('COALESCE(SUM(request_items.quantity * items.unit_price), 0) as total_cost')
                ->value('total_cost'),
            'releasedValue' => (float) DeliveryReceipt::query()
                ->when($from, fn ($query) => $query->whereDate('delivery_date', '>=', $from))
                ->when($to, fn ($query) => $query->whereDate('delivery_date', '<=', $to))
                ->sum('total'),
            'averageRequestValue' => (float) (DB::table('request_items')
                ->join('requests', 'requests.id', '=', 'request_items.request_id')
                ->join('items', 'items.id', '=', 'request_items.item_id')
                ->when($from, fn ($query) => $query->whereDate('requests.date', '>=', $from))
                ->when($to, fn ($query) => $query->whereDate('requests.date', '<=', $to))
                ->selectRaw('COALESCE(SUM(request_items.quantity * items.unit_price), 0) as total_cost')
                ->value('total_cost') / max(SupplyRequest::query()->when($from, fn ($query) => $query->whereDate('date', '>=', $from))->when($to, fn ($query) => $query->whereDate('date', '<=', $to))->count(), 1)),
            'pendingApprovals' => SupplyRequest::query()->where('status', 'Pending Approval')->when($from, fn ($query) => $query->whereDate('date', '>=', $from))->when($to, fn ($query) => $query->whereDate('date', '<=', $to))->count(),
            'highestPendingRequestValue' => (float) ($highestPendingRequest->total_cost ?? 0),
            'highestPendingRequestDepartment' => $highestPendingRequest->name ?? 'No pending approvals',
        ];

        return Inertia::render('VPFinance/Dashboard', [
            'stats' => $stats,
            'departmentRequestCost' => $departmentRequestCost,
            'itemRequestCost' => $itemRequestCost,
            'costByStatus' => $costByStatus,
            'recentPendingApprovals' => $recentPendingApprovals,
            'filters' => [
                'from' => $from,
                'to' => $to,
            ],
        ]);
    }
}