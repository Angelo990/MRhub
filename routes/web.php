<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return redirect()->route('login');
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
    Route::get('dashboard/property-custodian', \App\Http\Controllers\PropertyCustodian\DashboardController::class)
        ->middleware('role:property-custodian')
        ->name('dashboard.property-custodian');

    Route::get('dashboard/vp-finance', function () {
        return Inertia::render('VPFinance/Dashboard');
    })->middleware('role:vp-finance')->name('dashboard.vp-finance');

    Route::get('dashboard/department-head', function () {
        return Inertia::render('DepartmentHead/Dashboard');
    })->middleware('role:department-head')->name('dashboard.department-head');

    Route::get('dashboard/admin', \App\Http\Controllers\Admin\DashboardController::class)
        ->middleware('role:admin')
        ->name('dashboard.admin');

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

    /* -- Property Custodian Routes -- */
    Route::group(['middleware' => ['role:property-custodian']], function () {
        // Inventory management CRUD for items
        Route::prefix('property-custodian/items')->name('property-custodian.items.')->group(function () {
            Route::get('/', [\App\Http\Controllers\PropertyCustodian\ItemController::class, 'index'])->name('index');
            Route::post('/', [\App\Http\Controllers\PropertyCustodian\ItemController::class, 'store'])->name('store');
            Route::put('/{item}', [\App\Http\Controllers\PropertyCustodian\ItemController::class, 'update'])->name('update');
            Route::delete('/{item}', [\App\Http\Controllers\PropertyCustodian\ItemController::class, 'destroy'])->name('destroy');
        });
        // Request endorsement and delivery receipt
        Route::prefix('property-custodian/requests')->name('property-custodian.requests.')->group(function () {
            Route::get('/', [\App\Http\Controllers\PropertyCustodian\RequestApprovalController::class, 'index'])->name('index');
            Route::post('/{request}/endorse', [\App\Http\Controllers\PropertyCustodian\RequestApprovalController::class, 'endorse'])->name('endorse');
            Route::post('/{request}/delivery-receipt', [\App\Http\Controllers\PropertyCustodian\DeliveryReceiptController::class, 'store'])->name('delivery_receipt');
        });
    });

    /* -- VP Finance Routes -- */
    Route::group(['middleware' => ['role:vp-finance']], function () {
        // Request approval
        Route::prefix('vp-finance/requests')->name('vp-finance.requests.')->group(function () {
            Route::get('/', [\App\Http\Controllers\VPFinance\RequestApprovalController::class, 'index'])->name('index');
            Route::post('/{request}/approve', [\App\Http\Controllers\VPFinance\RequestApprovalController::class, 'approve'])->name('approve');
            Route::post('/{request}/reject', [\App\Http\Controllers\VPFinance\RequestApprovalController::class, 'reject'])->name('reject');
        });
    });

    /* -- Department Head Routes -- */
    Route::group(['middleware' => ['role:department-head']], function () {
        // Request creation and viewing
        Route::prefix('department-head/requests')->name('department-head.requests.')->group(function () {
            Route::get('/', [\App\Http\Controllers\DepartmentHead\RequestController::class, 'index'])->name('index');
            Route::get('/create', [\App\Http\Controllers\DepartmentHead\RequestController::class, 'create'])->name('create');
            Route::post('/', [\App\Http\Controllers\DepartmentHead\RequestController::class, 'store'])->name('store');
            Route::post('/{request}/received', [\App\Http\Controllers\DepartmentHead\RequestController::class, 'markReceived'])->name('received');
        });
    });
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
