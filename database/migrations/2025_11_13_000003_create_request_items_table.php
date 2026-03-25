<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('request_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('request_id')->constrained('requests')->onDelete('cascade');
            $table->foreignId('item_id')->constrained('items');
            $table->integer('quantity');
            $table->string('particular');
            $table->string('unit');
            $table->timestamps();
        });
    }
    public function down(): void
    {
        Schema::dropIfExists('request_items');
    }
};
