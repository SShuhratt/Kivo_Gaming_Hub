<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('warehouse')) {
            Schema::table('warehouse', function (Blueprint $table) {
                $table->string('unit', 32)->change();
            });
        }

        if (! Schema::hasTable('checkout_sales')) {
            Schema::create('checkout_sales', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->string('payment_method', 20)->default('cash');
                $table->decimal('total_amount', 15, 2);
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('checkout_sale_items')) {
            Schema::create('checkout_sale_items', function (Blueprint $table) {
                $table->id();
                $table->foreignId('checkout_sale_id')->constrained('checkout_sales')->cascadeOnDelete();
                $table->foreignId('warehouse_id')->nullable()->constrained('warehouse')->nullOnDelete();
                $table->string('manufacturer_name');
                $table->string('product_name');
                $table->string('barcode');
                $table->string('unit', 32);
                $table->integer('quantity');
                $table->decimal('unit_price', 15, 2);
                $table->decimal('total_price', 15, 2);
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('checkout_sale_items');
        Schema::dropIfExists('checkout_sales');
    }
};
