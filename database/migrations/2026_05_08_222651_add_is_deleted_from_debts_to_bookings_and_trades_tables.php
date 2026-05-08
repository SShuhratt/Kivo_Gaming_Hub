<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->boolean('is_deleted_from_debts')->default(false);
        });
        Schema::table('trades', function (Blueprint $table) {
            $table->boolean('is_deleted_from_debts')->default(false);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->dropColumn('is_deleted_from_debts');
        });
        Schema::table('trades', function (Blueprint $table) {
            $table->dropColumn('is_deleted_from_debts');
        });
    }
};
