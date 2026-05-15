<?php

namespace App\Http\Controllers\DepartmentHead;

use App\Http\Controllers\Controller;
use App\Models\DepartmentBudget;
use App\Models\Request as SupplyRequest;
use App\Models\Semester;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function __invoke(Request $httpRequest)
    {
        $user = auth()->user()->loadMissing('department');
        $departmentId = $user->department_id;
        $departmentName = $user->department?->name ?? 'Department';
        $from = $httpRequest->string('from')->toString() ?: null;
        $to = $httpRequest->string('to')->toString() ?: null;

        $driver = DB::connection()->getDriverName();
        $monthKeyExpression = match ($driver) {
            'sqlite' => "strftime('%Y-%m', date)",
            'pgsql'  => "to_char(date, 'YYYY-MM')",
            default  => "DATE_FORMAT(date, '%Y-%m')",
        };
        $requestsMonthKeyExpression = match ($driver) {
            'sqlite' => "strftime('%Y-%m', requests.date)",
            'pgsql'  => "to_char(requests.date, 'YYYY-MM')",
            default  => "DATE_FORMAT(requests.date, '%Y-%m')",
        };

        $requestQuery = SupplyRequest::query()
            ->where('department_id', $departmentId)
            ->when($from, fn ($query) => $query->whereDate('date', '>=', $from))
            ->when($to, fn ($query) => $query->whereDate('date', '<=', $to));

        $requestsByStatus = collect([
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

        $mostRequestedItems = DB::table('request_items')
            ->join('requests', 'requests.id', '=', 'request_items.request_id')
            ->where('requests.department_id', $departmentId)
            ->when($from, fn ($query) => $query->whereDate('requests.date', '>=', $from))
            ->when($to, fn ($query) => $query->whereDate('requests.date', '<=', $to))
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
            ->when($from, fn ($query) => $query->whereDate('date', '>=', $from))
            ->when($to, fn ($query) => $query->whereDate('date', '<=', $to))
            ->selectRaw("{$monthKeyExpression} as month_key")
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

        $monthlySpending = DB::table('request_items')
            ->join('requests', 'requests.id', '=', 'request_items.request_id')
            ->leftJoin('items', 'items.id', '=', 'request_items.item_id')
            ->where('requests.department_id', $departmentId)
            ->when($from, fn ($query) => $query->whereDate('requests.date', '>=', $from))
            ->when($to, fn ($query) => $query->whereDate('requests.date', '<=', $to))
            ->selectRaw("{$requestsMonthKeyExpression} as month_key")
            ->selectRaw('COALESCE(SUM(request_items.quantity * COALESCE(request_items.unit_price_at_request, items.unit_price, 0)), 0) as total_spending')
            ->groupBy('month_key')
            ->orderBy('month_key')
            ->limit(6)
            ->get()
            ->map(fn ($row) => [
                'name' => $row->month_key,
                'total' => (float) $row->total_spending,
            ])
            ->values();

        $requestValue = (float) DB::table('request_items')
            ->join('requests', 'requests.id', '=', 'request_items.request_id')
            ->join('items', 'items.id', '=', 'request_items.item_id')
            ->where('requests.department_id', $departmentId)
            ->when($from, fn ($query) => $query->whereDate('requests.date', '>=', $from))
            ->when($to, fn ($query) => $query->whereDate('requests.date', '<=', $to))
            ->selectRaw('COALESCE(SUM(request_items.quantity * items.unit_price), 0) as total_cost')
            ->value('total_cost');

        $recentRequests = (clone $requestQuery)
            ->with(['items'])
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
            'totalRequests' => (clone $requestQuery)->count(),
            'pendingRequests' => (clone $requestQuery)->whereIn('status', ['Pending Endorsement', 'Pending Approval'])->count(),
            'approvedRequests' => (clone $requestQuery)->whereIn('status', ['Approved', 'Released'])->count(),
            'completedRequests' => (clone $requestQuery)->where('status', 'Completed')->count(),
            'rejectedRequests' => (clone $requestQuery)->where('status', 'Rejected')->count(),
            'estimatedRequestValue' => $requestValue,
        ];

        $activeSemester = Semester::current();
        $departmentBudget = $activeSemester
            ? DepartmentBudget::where('department_id', $departmentId)
                ->where('semester_id', $activeSemester->id)
                ->first()
            : null;

        $budget = [
            'semesterLabel'   => $activeSemester?->label ?? 'No Active Semester',
            'allocatedAmount' => $departmentBudget ? (float) $departmentBudget->allocated_amount : 0.0,
            'totalSpent'      => $departmentBudget ? (float) $departmentBudget->spent_amount : 0.0,
            'reservedAmount'  => $departmentBudget ? (float) $departmentBudget->reserved_amount : 0.0,
            'remainingBudget' => $departmentBudget ? $departmentBudget->available_amount : 0.0,
        ];

        return Inertia::render('DepartmentHead/Dashboard', [
            'departmentName' => $departmentName,
            'stats' => $stats,
            'requestsByStatus' => $requestsByStatus,
            'mostRequestedItems' => $mostRequestedItems,
            'monthlyRequests' => $monthlyRequests,
            'monthlySpending' => $monthlySpending,
            'recentRequests' => $recentRequests,
            'filters' => [
                'from' => $from,
                'to' => $to,
            ],
            'budget' => $budget,
        ]);
    }
}