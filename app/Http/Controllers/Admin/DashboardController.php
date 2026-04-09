<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Department;
use App\Models\Item;
use App\Models\Request as SupplyRequest;
use App\Models\User;
use Inertia\Inertia;
use Spatie\Permission\Models\Role;

class DashboardController extends Controller
{
    public function __invoke()
    {
        $usersByRole = Role::query()
            ->withCount('users')
            ->orderByDesc('users_count')
            ->get()
            ->map(fn (Role $role) => [
                'name' => str($role->name)->replace('-', ' ')->title()->toString(),
                'count' => $role->users_count,
            ])
            ->values();

        $usersByDepartment = Department::query()
            ->withCount('users')
            ->orderByDesc('users_count')
            ->get()
            ->map(fn (Department $department) => [
                'name' => $department->name,
                'count' => $department->users_count,
            ])
            ->values();

        $requestsByStatus = collect([
            'Pending Endorsement',
            'Pending Approval',
            'Approved',
            'Released',
            'Completed',
            'Rejected',
        ])->map(fn (string $status) => [
            'name' => $status,
            'count' => SupplyRequest::where('status', $status)->count(),
        ])->values();

        $stats = [
            'totalUsers' => User::count(),
            'departmentHeads' => User::role('department-head')->count(),
            'totalDepartments' => Department::count(),
            'pendingRequests' => SupplyRequest::whereIn('status', ['Pending Endorsement', 'Pending Approval'])->count(),
            'releasedRequests' => SupplyRequest::where('status', 'Released')->count(),
            'lowStockItems' => Item::where('quantity', '<=', 5)->count(),
        ];

        return Inertia::render('Admin/Dashboard', [
            'usersByRole' => $usersByRole,
            'usersByDepartment' => $usersByDepartment,
            'requestsByStatus' => $requestsByStatus,
            'stats' => $stats,
        ]);
    }
}