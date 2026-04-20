<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('request_items', function (Blueprint $table) {
            // Allow null item_id for custom (non-inventory) items
            $table->unsignedBigInteger('item_id')->nullable()->change();
            // Flag: true = non-inventory custom item
            $table->boolean('is_custom')->default(false)->after('unit');
            // Snapshot of unit price at time of request (or user-entered estimate for custom)
            $table->decimal('unit_price_at_request', 12, 2)->nullable()->after('is_custom');
        });
    }

    public function down(): void
    {
        Schema::table('request_items', function (Blueprint $table) {
            $table->dropColumn(['is_custom', 'unit_price_at_request']);
            $table->unsignedBigInteger('item_id')->nullable(false)->change();
        });
    }
};
