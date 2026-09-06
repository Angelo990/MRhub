<?php

namespace App\Http\Controllers\PropertyCustodian;

use App\Http\Controllers\Controller;
use App\Models\Item;
use App\Models\Request as SupplyRequest;
use App\Models\StockCardEntry;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function __invoke(Request $httpRequest)
    {
        $from = $httpRequest->string('from')->toString() ?: null;
        $to = $httpRequest->string('to')->toString() ?: null;

        $requestQuery = SupplyRequest::query()
            ->when($from, fn ($query) => $query->whereDate('date', '>=', $from))
            ->when($to, fn ($query) => $query->whereDate('date', '<=', $to));

        $requestStatuses = collect([
            'Pending Endorsement',
            'Pending Approval',
            'Approved',
            'Released',
            'Completed',
            'Rejected',
        ])->map(fn (string $status) => [
            'name' => $status,
            'count' => (clone $requestQuery)->where('status', $status)->count(),
        ])->values();

        $stockLevels = Item::query()
            ->orderByDesc('quantity')
            ->limit(8)
            ->get(['id', 'name', 'quantity', 'unit'])
            ->map(fn (Item $item) => [
                'name' => $item->name,
                'quantity' => $item->quantity,
                'unit' => $item->unit,
            ])
            ->values();

        $stockMovements = collect([
            'stock_in' => 'Stock In',
            'stock_out' => 'Stock Out',
        ])->map(fn (string $label, string $movementType) => [
            'name' => $label,
            'quantity' => (int) StockCardEntry::query()
                ->where('movement_type', $movementType)
                ->when($from, fn ($query) => $query->whereDate('transaction_date', '>=', $from))
                ->when($to, fn ($query) => $query->whereDate('transaction_date', '<=', $to))
                ->sum('quantity'),
        ])->values();

        $lowStockItems = Item::query()
            ->where('quantity', '<=', 5)
            ->orderBy('quantity')
            ->limit(6)
            ->get(['id', 'name', 'quantity', 'unit'])
            ->map(fn (Item $item) => [
                'id' => $item->id,
                'name' => $item->name,
                'quantity' => $item->quantity,
                'unit' => $item->unit,
            ])
            ->values();

        $requestsByDepartment = SupplyRequest::query()
            ->select('departments.name')
            ->selectRaw('COUNT(requests.id) as total_requests')
            ->join('departments', 'departments.id', '=', 'requests.department_id')
            ->when($from, fn ($query) => $query->whereDate('requests.date', '>=', $from))
            ->when($to, fn ($query) => $query->whereDate('requests.date', '<=', $to))
            ->groupBy('departments.name')
            ->orderByDesc('total_requests')
            ->limit(6)
            ->get()
            ->map(fn ($row) => [
                'name' => $row->name,
                'count' => (int) $row->total_requests,
            ])
            ->values();

        $requestedItemsByDepartment = DB::table('request_items')
            ->join('requests', 'requests.id', '=', 'request_items.request_id')
            ->join('departments', 'departments.id', '=', 'requests.department_id')
            ->when($from, fn ($query) => $query->whereDate('requests.date', '>=', $from))
            ->when($to, fn ($query) => $query->whereDate('requests.date', '<=', $to))
            ->select('departments.name')
            ->selectRaw('SUM(request_items.quantity) as total_items')
            ->groupBy('departments.name')
            ->orderByDesc('total_items')
            ->limit(6)
            ->get()
            ->map(fn ($row) => [
                'name' => $row->name,
                'count' => (int) $row->total_items,
            ])
            ->values();

        $mostRequestedItems = DB::table('request_items')
            ->join('requests', 'requests.id', '=', 'request_items.request_id')
            ->when($from, fn ($query) => $query->whereDate('requests.date', '>=', $from))
            ->when($to, fn ($query) => $query->whereDate('requests.date', '<=', $to))
            ->select('particular')
            ->selectRaw('SUM(quantity) as total_quantity')
            ->groupBy('particular')
            ->orderByDesc('total_quantity')
            ->limit(8)
            ->get()
            ->map(fn ($row) => [
                'name' => $row->particular,
                'count' => (int) $row->total_quantity,
            ])
            ->values();

        $stats = [
            'totalItems' => Item::count(),
            'totalUnitsOnHand' => (int) Item::sum('quantity'),
            'lowStockItems' => Item::where('quantity', '<=', 5)->count(),
            'pendingEndorsement' => (clone $requestQuery)->where('status', 'Pending Endorsement')->count(),
            'approvedForRelease' => (clone $requestQuery)->where('status', 'Approved')->count(),
            'releasedRequests' => (clone $requestQuery)->where('status', 'Released')->count(),
        ];

        return Inertia::render('PropertyCustodian/Dashboard', [
            'stats' => $stats,
            'requestStatuses' => $requestStatuses,
            'stockLevels' => $stockLevels,
            'stockMovements' => $stockMovements,
            'lowStockItems' => $lowStockItems,
            'requestsByDepartment' => $requestsByDepartment,
            'requestedItemsByDepartment' => $requestedItemsByDepartment,
            'mostRequestedItems' => $mostRequestedItems,
            'filters' => [
                'from' => $from,
                'to' => $to,
            ],
        ]);
    }
}