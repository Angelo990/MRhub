<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class DeliveryReceiptItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'delivery_receipt_id', 'item_id', 'quantity_requested', 'quantity_delivered', 'quantity_undelivered', 'unit_cost', 'total', 'particular', 'unit'
    ];

    public function deliveryReceipt()
    {
        return $this->belongsTo(DeliveryReceipt::class);
    }

    public function item()
    {
        return $this->belongsTo(Item::class);
    }
}
