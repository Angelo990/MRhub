<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class DeliveryReceipt extends Model
{
    use HasFactory;

    protected $fillable = [
        'request_id', 'delivery_date', 'prepared_by', 'checked_by', 'received_by', 'total', 'status'
    ];

    public function request()
    {
        return $this->belongsTo(Request::class);
    }

    public function items()
    {
        return $this->hasMany(DeliveryReceiptItem::class);
    }
}
