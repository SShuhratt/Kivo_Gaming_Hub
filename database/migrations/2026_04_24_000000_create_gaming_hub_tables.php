<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('assets', function (Blueprint $table) {
            $table->id();
            $table->enum('category', ['Computer', 'PS']);
            $table->foreignId('room_id')->index();
            $table->integer('total_usage_duration_minutes')->default(0);
            $table->decimal('total_earned_money', 15, 2)->default(0);
            $table->timestamps();
        });

        Schema::create('warehouse', function (Blueprint $table) {
            $table->id();
            $table->string('manufacturer');
            $table->string('product_name');
            $table->string('shtrix_code')->unique();
            $table->enum('unit', ['bottle', 'box', 'container', 'bag']);
            $table->integer('count');
            $table->decimal('purchase_price', 15, 2);
            $table->decimal('sell_price', 15, 2);
            $table->timestamps();
        });

        Schema::create('services', function (Blueprint $table) {
            $table->id();
            $table->string('game_name');
            $table->foreignId('room_id')->index();
            $table->timestamps();
        });

        Schema::create('tariffs', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->decimal('hourly_cost', 15, 2);
            $table->timestamps();
        });

        Schema::create('bookings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tariff_id')->constrained();
            $table->dateTime('start_time');
            $table->dateTime('end_time');
            $table->integer('duration_minutes');
            $table->decimal('total_cost', 15, 2);
            $table->enum('status', ['submitted', 'debt_closed']);
            $table->string('debt_name')->nullable();
            $table->string('debt_phone_number')->nullable();
            $table->timestamps();
        });

        Schema::create('asset_booking', function (Blueprint $table) {
            $table->foreignId('asset_id')->constrained()->cascadeOnDelete();
            $table->foreignId('booking_id')->constrained()->cascadeOnDelete();
        });
    }

    public function down(): void {
        Schema::dropIfExists('asset_booking');
        Schema::dropIfExists('bookings');
        Schema::dropIfExists('tariffs');
        Schema::dropIfExists('services');
        Schema::dropIfExists('warehouse');
        Schema::dropIfExists('assets');
    }
};
