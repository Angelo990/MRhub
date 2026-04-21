<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('request_items', function (Blueprint $table) {
            $table->text('rejection_reason')->nullable()->after('unit_price_at_request');
            $table->string('rejected_by')->nullable()->after('rejection_reason');
            $table->unsignedInteger('quantity_fulfilled')->default(0)->after('rejected_by');
        });
    }

    public function down(): void
    {
        Schema::table('request_items', function (Blueprint $table) {
            $table->dropColumn(['rejection_reason', 'rejected_by', 'quantity_fulfilled']);
        });
    }
};
