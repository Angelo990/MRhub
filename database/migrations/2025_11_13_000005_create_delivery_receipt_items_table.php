<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('delivery_receipt_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('delivery_receipt_id')->constrained('delivery_receipts')->onDelete('cascade');
            $table->foreignId('item_id')->constrained('items');
            $table->integer('quantity_requested');
            $table->integer('quantity_delivered');
            $table->integer('quantity_undelivered')->default(0);
            $table->decimal('unit_cost', 12, 2)->default(0);
            $table->decimal('total', 12, 2)->default(0);
            $table->string('particular');
            $table->string('unit');
            $table->timestamps();
        });
    }
    public function down(): void
    {
        Schema::dropIfExists('delivery_receipt_items');
    }
};
