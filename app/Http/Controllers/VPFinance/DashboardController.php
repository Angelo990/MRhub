<?php

namespace App\Http\Controllers\VPFinance;

use App\Http\Controllers\Controller;
use App\Models\DeliveryReceipt;
use App\Models\Request as SupplyRequest;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function __invoke()
    {
        $departmentRequestCost = DB::table('request_items')
            ->join('requests', 'requests.id', '=', 'request_items.request_id')
            ->join('departments', 'departments.id', '=', 'requests.department_id')
            ->join('items', 'items.id', '=', 'request_items.item_id')
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
            ->join('items', 'items.id', '=', 'request_items.item_id')
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
        ])->map(function (string $status) {
            $total = DB::table('request_items')
                ->join('requests', 'requests.id', '=', 'request_items.request_id')
                ->join('items', 'items.id', '=', 'request_items.item_id')
                ->where('requests.status', $status)
                ->selectRaw('COALESCE(SUM(request_items.quantity * items.unit_price), 0) as total_cost')
                ->value('total_cost');

            return [
                'name' => $status,
                'total' => (float) $total,
            ];
        })->values();

        $stats = [
            'totalRequestValue' => (float) DB::table('request_items')
                ->join('items', 'items.id', '=', 'request_items.item_id')
                ->selectRaw('COALESCE(SUM(request_items.quantity * items.unit_price), 0) as total_cost')
                ->value('total_cost'),
            'pendingApprovalValue' => (float) DB::table('request_items')
                ->join('requests', 'requests.id', '=', 'request_items.request_id')
                ->join('items', 'items.id', '=', 'request_items.item_id')
                ->where('requests.status', 'Pending Approval')
                ->selectRaw('COALESCE(SUM(request_items.quantity * items.unit_price), 0) as total_cost')
                ->value('total_cost'),
            'approvedValue' => (float) DB::table('request_items')
                ->join('requests', 'requests.id', '=', 'request_items.request_id')
                ->join('items', 'items.id', '=', 'request_items.item_id')
                ->whereIn('requests.status', ['Approved', 'Released', 'Completed'])
                ->selectRaw('COALESCE(SUM(request_items.quantity * items.unit_price), 0) as total_cost')
                ->value('total_cost'),
            'releasedValue' => (float) DeliveryReceipt::sum('total'),
            'averageRequestValue' => (float) (DB::table('request_items')
                ->join('requests', 'requests.id', '=', 'request_items.request_id')
                ->join('items', 'items.id', '=', 'request_items.item_id')
                ->selectRaw('COALESCE(SUM(request_items.quantity * items.unit_price), 0) as total_cost')
                ->value('total_cost') / max(SupplyRequest::count(), 1)),
            'pendingApprovals' => SupplyRequest::where('status', 'Pending Approval')->count(),
        ];

        return Inertia::render('VPFinance/Dashboard', [
            'stats' => $stats,
            'departmentRequestCost' => $departmentRequestCost,
            'itemRequestCost' => $itemRequestCost,
            'costByStatus' => $costByStatus,
        ]);
    }
}