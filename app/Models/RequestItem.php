<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class RequestItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'request_id', 'item_id', 'quantity', 'particular', 'unit', 'is_custom', 'unit_price_at_request',
        'rejection_reason', 'rejected_by', 'quantity_fulfilled',
    ];

    public function isRejected(): bool
    {
        return ! is_null($this->rejection_reason);
    }

    public function remainingQuantity(): int
    {
        return max(0, $this->quantity - $this->quantity_fulfilled);
    }

    public function request()
    {
        return $this->belongsTo(Request::class);
    }

    public function item()
    {
        return $this->belongsTo(Item::class);
    }
}
