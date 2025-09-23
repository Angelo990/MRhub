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
        return Inertia::render('PropertyCustodian/dashboard');
    })->middleware('role:property-custodian')->name('dashboard.property-custodian');

    Route::get('dashboard/vp-finance', function () {
        return Inertia::render('VPFinance/dashboard');
    })->middleware('role:vp-finance')->name('dashboard.vp-finance');

    Route::get('dashboard/department-head', function () {
        return Inertia::render('DepartmentHead/dashboard');
    })->middleware('role:department-head')->name('dashboard.department-head');

    Route::get('dashboard/admin', function () {
        return Inertia::render('Admin/dashboard');
    })->middleware('role:admin')->name('dashboard.admin');

    /* -- Admin Routes -- */
    Route::group(['middleware' => ['role:admin']], function () {
        // Add admin-only routes here
    });
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
