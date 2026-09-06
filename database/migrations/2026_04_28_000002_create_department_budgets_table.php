<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('department_budgets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('department_id')->constrained()->cascadeOnDelete();
            $table->foreignId('semester_id')->constrained()->cascadeOnDelete();
            $table->decimal('allocated_amount', 12, 2)->default(0);
            $table->decimal('reserved_amount', 12, 2)->default(0);  // held by endorsed requests
            $table->decimal('spent_amount', 12, 2)->default(0);     // locked by approved requests
            $table->decimal('low_budget_threshold', 12, 2)->nullable(); // alert threshold set by Finance
            $table->timestamps();

            $table->unique(['department_id', 'semester_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('department_budgets');
    }
};
