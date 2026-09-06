<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BudgetTransaction extends Model
{
    public const UPDATED_AT = null; // immutable — no updated_at column

    protected $fillable = [
        'department_budget_id',
        'request_id',
        'type',
        'amount',
        'balance_after',
        'performed_by',
        'notes',
    ];

    protected $casts = [
        'amount'       => 'decimal:2',
        'balance_after'=> 'decimal:2',
    ];

    public function departmentBudget(): BelongsTo
    {
        return $this->belongsTo(DepartmentBudget::class);
    }

    public function request(): BelongsTo
    {
        return $this->belongsTo(Request::class);
    }

    public function performer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'performed_by');
    }
}
