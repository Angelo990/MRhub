<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('welcome');
})->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    // Main dashboard route redirects to the correct dashboard
    Route::get('dashboard', function () {
        $user = auth()->user();
        if ($user->hasRole('property-custodian')) {
            return redirect()->route('dashboard.property-custodian');
        } elseif ($user->hasRole('vp-finance')) {
            return redirect()->route('dashboard.vp-finance');
        } elseif ($user->hasRole('department-head')) {
            return redirect()->route('dashboard.department-head');
        } elseif ($user->hasRole('admin')) {
            return redirect()->route('dashboard.admin');
        }
        return Inertia::render('errors/404');
    })->name('dashboard');

    // Individual dashboards for each role
    Route::get('dashboard/property-custodian', function () {
        return Inertia::render('PropertyCustodian/Dashboard');
    })->middleware('role:property-custodian')->name('dashboard.property-custodian');

    Route::get('dashboard/vp-finance', function () {
        return Inertia::render('VPFinance/Dashboard');
    })->middleware('role:vp-finance')->name('dashboard.vp-finance');

    Route::get('dashboard/department-head', function () {
        return Inertia::render('DepartmentHead/Dashboard');
    })->middleware('role:department-head')->name('dashboard.department-head');

    Route::get('dashboard/admin', function () {
        return Inertia::render('Admin/Dashboard');
    })->middleware('role:admin')->name('dashboard.admin');

    /* -- Admin Routes -- */
    Route::group(['middleware' => ['role:admin']], function () {
        // User management CRUD routes
        Route::prefix('admin/users')->name('admin.users.')->group(function () {
            Route::get('/', [\App\Http\Controllers\Admin\UserController::class, 'index'])->name('index');
            Route::get('/create', [\App\Http\Controllers\Admin\UserController::class, 'create'])->name('create');
            Route::post('/', [\App\Http\Controllers\Admin\UserController::class, 'store'])->name('store');
            Route::get('/{user}/edit', [\App\Http\Controllers\Admin\UserController::class, 'edit'])->name('edit');
            Route::put('/{user}', [\App\Http\Controllers\Admin\UserController::class, 'update'])->name('update');
            Route::delete('/{user}', [\App\Http\Controllers\Admin\UserController::class, 'destroy'])->name('destroy');
        });
    });
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
