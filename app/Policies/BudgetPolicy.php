<?php

namespace App\Policies;

use App\Models\DepartmentBudget;
use App\Models\User;

class BudgetPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasAnyRole(['finance', 'admin', 'vp-finance']);
    }

    public function view(User $user, DepartmentBudget $budget): bool
    {
        return $user->hasAnyRole(['finance', 'admin', 'vp-finance']);
    }

    public function create(User $user): bool
    {
        return $user->hasAnyRole(['finance', 'admin']);
    }

    public function update(User $user, DepartmentBudget $budget): bool
    {
        return $user->hasAnyRole(['finance', 'admin']);
    }

    public function delete(User $user, DepartmentBudget $budget): bool
    {
        return $user->hasRole('admin');
    }
}
