<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Item extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'unit',
        'quantity',
        'unit_price',
    ];

    public function stockCardEntries()
    {
        return $this->hasMany(StockCardEntry::class)
            ->orderByDesc('transaction_date')
            ->orderByDesc('id');
    }
}
