<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Department;
use App\Models\Item;
use App\Models\Request as SupplyRequest;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Spatie\Permission\Models\Role;

class DashboardController extends Controller
{
    public function __invoke(Request $httpRequest)
    {
        $from = $httpRequest->string('from')->toString() ?: null;
        $to = $httpRequest->string('to')->toString() ?: null;

        $usersByRole = Role::query()
            ->withCount(['users' => function ($query) use ($from, $to) {
                $query
                    ->when($from, fn ($builder) => $builder->whereDate('users.created_at', '>=', $from))
                    ->when($to, fn ($builder) => $builder->whereDate('users.created_at', '<=', $to));
            }])
            ->orderByDesc('users_count')
            ->get()
            ->map(fn (Role $role) => [
                'name' => str($role->name)->replace('-', ' ')->title()->toString(),
                'count' => $role->users_count,
            ])
            ->values();

        $usersByDepartment = Department::query()
            ->withCount(['users' => function ($query) use ($from, $to) {
                $query
                    ->when($from, fn ($builder) => $builder->whereDate('users.created_at', '>=', $from))
                    ->when($to, fn ($builder) => $builder->whereDate('users.created_at', '<=', $to));
            }])
            ->orderByDesc('users_count')
            ->get()
            ->map(fn (Department $department) => [
                'name' => $department->name,
                'count' => $department->users_count,
            ])
            ->values();

        $requestQuery = SupplyRequest::query()
            ->when($from, fn ($query) => $query->whereDate('date', '>=', $from))
            ->when($to, fn ($query) => $query->whereDate('date', '<=', $to));

        $userQuery = User::query()
            ->when($from, fn ($query) => $query->whereDate('created_at', '>=', $from))
            ->when($to, fn ($query) => $query->whereDate('created_at', '<=', $to));

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

        $stats = [
            'totalUsers' => (clone $userQuery)->count(),
            'departmentHeads' => (clone $userQuery)->role('department-head')->count(),
            'totalDepartments' => Department::count(),
            'pendingRequests' => (clone $requestQuery)->whereIn('status', ['Pending Endorsement', 'Pending Approval'])->count(),
            'releasedRequests' => (clone $requestQuery)->where('status', 'Released')->count(),
            'lowStockItems' => Item::where('quantity', '<=', 5)->count(),
        ];

        return Inertia::render('Admin/Dashboard', [
            'usersByRole' => $usersByRole,
            'usersByDepartment' => $usersByDepartment,
            'requestsByStatus' => $requestsByStatus,
            'stats' => $stats,
            'filters' => [
                'from' => $from,
                'to' => $to,
            ],
        ]);
    }
}