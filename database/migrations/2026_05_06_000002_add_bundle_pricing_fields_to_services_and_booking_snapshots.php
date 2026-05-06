<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('services', function (Blueprint $table) {
            if (! Schema::hasColumn('services', 'rate')) {
                $table->decimal('rate', 15, 2)->nullable()->after('price');
            }

            if (! Schema::hasColumn('services', 'requirements')) {
                $table->json('requirements')->nullable()->after('rate');
            }

            if (! Schema::hasColumn('services', 'manual_priority')) {
                $table->integer('manual_priority')->nullable()->after('requirements');
            }

            if (! Schema::hasColumn('services', 'savings_ratio')) {
                $table->decimal('savings_ratio', 10, 4)->default(0)->after('manual_priority');
            }

            if (! Schema::hasColumn('services', 'is_recommendable')) {
                $table->boolean('is_recommendable')->default(false)->after('savings_ratio');
            }
        });

        if (Schema::hasColumn('services', 'price')) {
            DB::table('services')
                ->whereNull('rate')
                ->update([
                    'rate' => DB::raw('price'),
                ]);
        }

        Schema::table('bookings', function (Blueprint $table) {
            if (! Schema::hasColumn('bookings', 'cart_snapshot')) {
                $table->json('cart_snapshot')->nullable()->after('asset_snapshot');
            }

            if (! Schema::hasColumn('bookings', 'pricing_breakdown_snapshot')) {
                $table->json('pricing_breakdown_snapshot')->nullable()->after('cart_snapshot');
            }

            if (! Schema::hasColumn('bookings', 'selected_bundle_service_ids')) {
                $table->json('selected_bundle_service_ids')->nullable()->after('pricing_breakdown_snapshot');
            }
        });

        Schema::table('trades', function (Blueprint $table) {
            if (! Schema::hasColumn('trades', 'cart_snapshot')) {
                $table->json('cart_snapshot')->nullable()->after('asset_snapshot');
            }

            if (! Schema::hasColumn('trades', 'pricing_breakdown_snapshot')) {
                $table->json('pricing_breakdown_snapshot')->nullable()->after('cart_snapshot');
            }
        });
    }

    public function down(): void
    {
        Schema::table('trades', function (Blueprint $table) {
            $columnsToDrop = [];

            if (Schema::hasColumn('trades', 'pricing_breakdown_snapshot')) {
                $columnsToDrop[] = 'pricing_breakdown_snapshot';
            }

            if (Schema::hasColumn('trades', 'cart_snapshot')) {
                $columnsToDrop[] = 'cart_snapshot';
            }

            if ($columnsToDrop !== []) {
                $table->dropColumn($columnsToDrop);
            }
        });

        Schema::table('bookings', function (Blueprint $table) {
            $columnsToDrop = [];

            if (Schema::hasColumn('bookings', 'selected_bundle_service_ids')) {
                $columnsToDrop[] = 'selected_bundle_service_ids';
            }

            if (Schema::hasColumn('bookings', 'pricing_breakdown_snapshot')) {
                $columnsToDrop[] = 'pricing_breakdown_snapshot';
            }

            if (Schema::hasColumn('bookings', 'cart_snapshot')) {
                $columnsToDrop[] = 'cart_snapshot';
            }

            if ($columnsToDrop !== []) {
                $table->dropColumn($columnsToDrop);
            }
        });

        Schema::table('services', function (Blueprint $table) {
            $columnsToDrop = [];

            foreach (['is_recommendable', 'savings_ratio', 'manual_priority', 'requirements', 'rate'] as $column) {
                if (Schema::hasColumn('services', $column)) {
                    $columnsToDrop[] = $column;
                }
            }

            if ($columnsToDrop !== []) {
                $table->dropColumn($columnsToDrop);
            }
        });
    }
};
