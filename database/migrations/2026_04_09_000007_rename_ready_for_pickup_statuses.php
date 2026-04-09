<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('requests')
            ->where('status', 'Ready for Pickup')
            ->update(['status' => 'Released']);

        DB::table('delivery_receipts')
            ->where('status', 'Ready for Pickup')
            ->update(['status' => 'Released']);
    }

    public function down(): void
    {
        DB::table('requests')
            ->where('status', 'Released')
            ->update(['status' => 'Ready for Pickup']);

        DB::table('delivery_receipts')
            ->where('status', 'Released')
            ->update(['status' => 'Ready for Pickup']);
    }
};