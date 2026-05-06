<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('manufacturers')) {
            Schema::create('manufacturers', function (Blueprint $table) {
                $table->id();
                $table->string('name')->unique();
                $table->timestamps();
            });
        }

        if (!Schema::hasColumn('warehouse', 'manufacturer_id')) {
            Schema::table('warehouse', function (Blueprint $table) {
                $table->foreignId('manufacturer_id')
                    ->nullable()
                    ->after('id')
                    ->constrained('manufacturers');
            });
        }

        $manufacturerIds = [];
        $timestamp = now();

        foreach (DB::table('warehouse')->select('id', 'manufacturer')->orderBy('id')->cursor() as $item) {
            $name = trim((string) $item->manufacturer);

            if ($name === '') {
                continue;
            }

            if (! array_key_exists($name, $manufacturerIds)) {
                DB::table('manufacturers')->updateOrInsert(
                    ['name' => $name],
                    ['name' => $name, 'created_at' => $timestamp, 'updated_at' => $timestamp],
                );

                $manufacturerIds[$name] = (int) DB::table('manufacturers')
                    ->where('name', $name)
                    ->value('id');
            }

            DB::table('warehouse')
                ->where('id', $item->id)
                ->update([
                    'manufacturer' => $name,
                    'manufacturer_id' => $manufacturerIds[$name],
                ]);
        }

        Schema::table('bookings', function (Blueprint $table) {
            $table->dropForeign(['tariff_id']);
        });

        Schema::table('bookings', function (Blueprint $table) {
            $table->foreignId('tariff_id')->nullable()->change();
        });

        Schema::table('bookings', function (Blueprint $table) {
            $table->foreign('tariff_id')->references('id')->on('tariffs')->nullOnDelete();
        });
    }

    public function down(): void
    {
        $replacementTariffId = DB::table('tariffs')->value('id');

        if ($replacementTariffId === null) {
            DB::table('bookings')->whereNull('tariff_id')->delete();
        } else {
            DB::table('bookings')
                ->whereNull('tariff_id')
                ->update(['tariff_id' => $replacementTariffId]);
        }

        Schema::table('bookings', function (Blueprint $table) {
            $table->dropForeign(['tariff_id']);
        });

        Schema::table('bookings', function (Blueprint $table) {
            $table->foreignId('tariff_id')->nullable(false)->change();
        });

        Schema::table('bookings', function (Blueprint $table) {
            $table->foreign('tariff_id')->references('id')->on('tariffs');
        });

        Schema::table('warehouse', function (Blueprint $table) {
            $table->dropForeign(['manufacturer_id']);
            $table->dropColumn('manufacturer_id');
        });

        Schema::dropIfExists('manufacturers');
    }
};
