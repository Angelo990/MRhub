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
        // The renamed rows cannot be distinguished from later Released records.
    }
};