<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Request extends Model
{
    use HasFactory;

    protected $fillable = [
        'date', 'department_id', 'purpose', 'requested_by', 'reviewed_by', 'approved_by', 'noted_by', 'status', 'locked_at',
    ];

    public function isLocked(): bool
    {
        return ! is_null($this->locked_at);
    }

    public function department()
    {
        return $this->belongsTo(Department::class);
    }

    public function items()
    {
        return $this->hasMany(RequestItem::class);
    }

    public function deliveryReceipt()
    {
        return $this->hasOne(DeliveryReceipt::class);
    }
}
