<?php

namespace App\Providers;

use App\Models\DepartmentBudget;
use App\Policies\BudgetPolicy;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        Gate::policy(DepartmentBudget::class, BudgetPolicy::class);
    }
}
