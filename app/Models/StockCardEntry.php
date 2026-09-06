<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StockCardEntry extends Model
{
    use HasFactory;

    protected $fillable = [
        'item_id',
        'created_by',
        'transaction_date',
        'movement_type',
        'reference',
        'party',
        'quantity',
        'unit_cost',
        'amount',
        'stock_on_hand',
        'notes',
    ];

    public function item()
    {
        return $this->belongsTo(Item::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}