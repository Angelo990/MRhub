<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stock_card_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('item_id')->constrained()->cascadeOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->date('transaction_date');
            $table->string('movement_type', 20);
            $table->string('reference')->nullable();
            $table->string('party')->nullable();
            $table->integer('quantity');
            $table->decimal('unit_cost', 12, 2)->default(0);
            $table->decimal('amount', 12, 2)->default(0);
            $table->integer('stock_on_hand');
            $table->string('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_card_entries');
    }
};