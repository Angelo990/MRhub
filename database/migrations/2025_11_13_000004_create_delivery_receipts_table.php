<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('delivery_receipts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('request_id')->constrained('requests')->onDelete('cascade');
            $table->date('delivery_date');
            $table->string('prepared_by');
            $table->string('checked_by');
            $table->string('received_by');
            $table->decimal('total', 12, 2)->default(0);
            $table->string('status')->default('Ready for Pickup');
            $table->timestamps();
        });
    }
    public function down(): void
    {
        Schema::dropIfExists('delivery_receipts');
    }
};
