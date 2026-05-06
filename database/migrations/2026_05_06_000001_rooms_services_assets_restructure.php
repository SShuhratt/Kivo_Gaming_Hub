<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('rooms', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->timestamps();
        });

        Schema::table('services', function (Blueprint $table) {
            $table->string('name')->nullable()->after('id');
            $table->decimal('price', 15, 2)->nullable()->after('name');
        });

        Schema::table('assets', function (Blueprint $table) {
            $table->string('name')->nullable()->after('id');
            $table->foreignId('service_id')->nullable()->after('name')->constrained('services')->nullOnDelete();
            $table->foreignId('room_id')->nullable()->change();
            $table->dropColumn('category');
        });

        Schema::table('services', function (Blueprint $table) {
            $table->dropColumn(['game_name', 'room_id']);
        });
    }

    public function down(): void
    {
        Schema::table('services', function (Blueprint $table) {
            $table->string('game_name')->nullable();
            $table->unsignedBigInteger('room_id')->nullable();
        });

        Schema::table('assets', function (Blueprint $table) {
            $table->enum('category', ['Computer', 'PS'])->nullable();
            $table->dropConstrainedForeignId('service_id');
            $table->dropColumn('name');
        });

        Schema::table('services', function (Blueprint $table) {
            $table->dropColumn(['name', 'price']);
        });

        Schema::dropIfExists('rooms');
    }
};
