<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('budget_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('department_budget_id')->constrained()->cascadeOnDelete();
            $table->foreignId('request_id')->nullable()->constrained()->nullOnDelete();
            $table->enum('type', ['allocation', 'reservation', 'release', 'spending', 'adjustment']);
            $table->decimal('amount', 12, 2); // always positive; direction implied by type
            $table->decimal('balance_after', 12, 2); // snapshot of available_amount post-transaction
            $table->foreignId('performed_by')->constrained('users')->restrictOnDelete();
            $table->text('notes')->nullable();
            $table->timestamp('created_at')->useCurrent(); // immutable — no updated_at
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('budget_transactions');
    }
};
