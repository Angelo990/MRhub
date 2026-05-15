<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
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
        Schema::table('delivery_receipt_items', function (Blueprint $table) {
            $table->unsignedBigInteger('item_id')->nullable(false)->change();
        });
    }
};
