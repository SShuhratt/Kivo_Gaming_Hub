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
            $table->decimal('cost', 15, 2)->default(0)->after('room_id');
        });

        Schema::create('tariff_category_prices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tariff_id')->constrained()->cascadeOnDelete();
            $table->string('category');
            $table->string('category_key');
            $table->decimal('hourly_price', 15, 2);
            $table->timestamps();

            $table->unique(['tariff_id', 'category_key']);
        });

        $assetCategories = DB::table('assets')
            ->select('category')
            ->distinct()
            ->orderBy('category')
            ->get()
            ->map(function ($row) {
                $category = trim((string) $row->category);

                return [
                    'category' => $category,
                    'category_key' => $this->normalizeCategoryKey($category),
                ];
            })
            ->filter(fn (array $row) => $row['category'] !== '')
            ->unique('category_key')
            ->values();

        $timestamp = now();

        foreach (DB::table('tariffs')->select('id', 'hourly_cost')->orderBy('id')->cursor() as $tariff) {
            foreach ($assetCategories as $category) {
                DB::table('tariff_category_prices')->updateOrInsert(
                    [
                        'tariff_id' => $tariff->id,
                        'category_key' => $category['category_key'],
                    ],
                    [
                        'category' => $category['category'],
                        'hourly_price' => round((float) $tariff->hourly_cost, 2),
                        'created_at' => $timestamp,
                        'updated_at' => $timestamp,
                    ],
                );
            }
        }

        Schema::table('bookings', function (Blueprint $table) {
            $table->decimal('requested_duration_hours', 8, 2)->nullable()->after('duration_minutes');
            $table->boolean('is_vip')->default(false)->after('session_status');
        });

        Schema::table('bookings', function (Blueprint $table) {
            $table->dateTime('end_time')->nullable()->change();
        });

        foreach (DB::table('bookings')->select('id', 'duration_minutes', 'hourly_rate_snapshot', 'asset_snapshot')->orderBy('id')->cursor() as $booking) {
            $durationHours = $booking->duration_minutes > 0
                ? round(((int) $booking->duration_minutes) / 60, 2)
                : null;

            $snapshot = $this->withHourlyPrices($booking->asset_snapshot, (float) $booking->hourly_rate_snapshot);

            DB::table('bookings')
                ->where('id', $booking->id)
                ->update([
                    'requested_duration_hours' => $durationHours,
                    'asset_snapshot' => $snapshot !== null ? json_encode($snapshot) : $booking->asset_snapshot,
                ]);
        }

        foreach (DB::table('trades')->select('id', 'hourly_rate', 'asset_snapshot')->orderBy('id')->cursor() as $trade) {
            $snapshot = $this->withHourlyPrices($trade->asset_snapshot, (float) $trade->hourly_rate);

            if ($snapshot === null) {
                continue;
            }

            DB::table('trades')
                ->where('id', $trade->id)
                ->update([
                    'asset_snapshot' => json_encode($snapshot),
                ]);
        }
    }

    public function down(): void
    {
        DB::table('bookings')
            ->whereNull('end_time')
            ->update([
                'end_time' => DB::raw('COALESCE(ended_at, start_time)'),
            ]);

        Schema::table('bookings', function (Blueprint $table) {
            $table->dateTime('end_time')->nullable(false)->change();
        });

        Schema::table('bookings', function (Blueprint $table) {
            $table->dropColumn([
                'requested_duration_hours',
                'is_vip',
            ]);
        });

        Schema::dropIfExists('tariff_category_prices');

        Schema::table('services', function (Blueprint $table) {
            $table->dropColumn('cost');
        });
    }

    protected function withHourlyPrices(?string $snapshotJson, float $hourlyRate): ?array
    {
        $snapshot = json_decode((string) $snapshotJson, true);

        if (! is_array($snapshot) || $snapshot === []) {
            return null;
        }

        return collect($snapshot)
            ->map(function ($asset) use ($hourlyRate) {
                if (array_key_exists('hourly_price', $asset)) {
                    return $asset;
                }

                $asset['hourly_price'] = round($hourlyRate, 2);

                return $asset;
            })
            ->values()
            ->all();
    }

    protected function normalizeCategoryKey(string $category): string
    {
        return mb_strtolower(trim($category));
    }
};
