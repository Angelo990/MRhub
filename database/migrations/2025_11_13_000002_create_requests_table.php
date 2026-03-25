<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('requests', function (Blueprint $table) {
            $table->id();
            $table->date('date');
            $table->foreignId('department_id')->constrained('departments');
            $table->string('purpose');
            $table->string('requested_by');
            $table->string('reviewed_by')->nullable();
            $table->string('approved_by')->nullable();
            $table->string('noted_by')->nullable();
            $table->string('status')->default('Pending Endorsement');
            $table->timestamps();
        });
    }
    public function down(): void
    {
        Schema::dropIfExists('requests');
    }
};
