<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('delivery_receipt_items', function (Blueprint $table) {
            // Custom request items are not linked to inventory, so item_id can be null.
            $table->unsignedBigInteger('item_id')->nullable()->change();
        });
    }

    public function down(): void
    {
        $hasNullItemIds = DB::table('delivery_receipt_items')->whereNull('item_id')->exists();

        if ($hasNullItemIds) {
            throw new RuntimeException(
                'Cannot rollback migration 2026_05_16_000001_make_item_id_nullable_on_delivery_receipt_items_table: '
                .'delivery_receipt_items contains rows with null item_id. '
                .'Re-link or delete those custom receipt rows before rolling back.'
            );
        }

        Schema::table('delivery_receipt_items', function (Blueprint $table) {
            $table->unsignedBigInteger('item_id')->nullable(false)->change();
        });
    }
};
