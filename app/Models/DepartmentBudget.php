<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DepartmentBudget extends Model
{
    protected $fillable = [
        'department_id',
        'semester_id',
        'allocated_amount',
        'reserved_amount',
        'spent_amount',
        'low_budget_threshold',
    ];

    protected $casts = [
        'allocated_amount'    => 'decimal:2',
        'reserved_amount'     => 'decimal:2',
        'spent_amount'        => 'decimal:2',
        'low_budget_threshold'=> 'decimal:2',
    ];

    // Computed: funds available for new reservations
    public function getAvailableAmountAttribute(): float
    {
        return max(0, (float) $this->allocated_amount
            - (float) $this->reserved_amount
            - (float) $this->spent_amount);
    }

    public function isNearThreshold(): bool
    {
        if ($this->low_budget_threshold === null) {
            return false;
        }

        return $this->available_amount <= (float) $this->low_budget_threshold;
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function semester(): BelongsTo
    {
        return $this->belongsTo(Semester::class);
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(BudgetTransaction::class);
    }
}
