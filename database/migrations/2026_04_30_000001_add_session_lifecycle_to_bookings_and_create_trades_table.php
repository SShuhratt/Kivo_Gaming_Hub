<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('bookings', 'session_status')) {
            Schema::table('bookings', function (Blueprint $table) {
                $table->enum('session_status', ['active', 'completed', 'cancelled'])
                    ->default('active')
                    ->after('status');
                $table->dateTime('ended_at')->nullable()->after('end_time');
                $table->string('tariff_name_snapshot')->nullable()->after('tariff_id');
                $table->decimal('hourly_rate_snapshot', 15, 2)->default(0)->after('tariff_name_snapshot');
                $table->json('asset_snapshot')->nullable()->after('hourly_rate_snapshot');
                $table->boolean('asset_stats_recorded')->default(false)->after('asset_snapshot');
            });
        }

        if (!Schema::hasTable('trades')) {
            Schema::create('trades', function (Blueprint $table) {
                $table->id();
                $table->foreignId('booking_id')->nullable()->constrained('bookings')->nullOnDelete()->unique();
                $table->foreignId('tariff_id')->nullable()->index();
                $table->string('tariff_name')->nullable();
                $table->decimal('hourly_rate', 15, 2)->default(0);
                $table->enum('payment_status', ['submitted', 'debt_closed']);
                $table->enum('session_status', ['completed', 'cancelled'])->default('completed');
                $table->dateTime('start_time');
                $table->dateTime('end_time');
                $table->integer('duration_minutes');
                $table->decimal('total_cost', 15, 2);
                $table->string('debt_name')->nullable();
                $table->string('debt_phone_number')->nullable();
                $table->json('asset_snapshot')->nullable();
                $table->integer('assets_count')->default(0);
                $table->timestamps();
            });
        }

        $now = Carbon::now();

        foreach (DB::table('bookings')->orderBy('id')->get() as $booking) {
            $assets = DB::table('asset_booking')
                ->join('assets', 'assets.id', '=', 'asset_booking.asset_id')
                ->where('asset_booking.booking_id', $booking->id)
                ->orderBy('assets.room_id')
                ->orderBy('assets.id')
                ->get([
                    'assets.id',
                    'assets.category',
                    'assets.room_id',
                ])
                ->map(fn ($asset) => [
                    'id' => (int) $asset->id,
                    'category' => $asset->category,
                    'room_id' => (int) $asset->room_id,
                    'room_number' => (string) $asset->room_id,
                ])
                ->values()
                ->all();

            $assetCount = count($assets);
            $tariff = $booking->tariff_id
                ? DB::table('tariffs')->where('id', $booking->tariff_id)->first()
                : null;

            $hourlyRate = $tariff?->hourly_cost !== null
                ? (float) $tariff->hourly_cost
                : $this->deriveHourlyRate((float) $booking->total_cost, (int) $booking->duration_minutes, $assetCount);

            $completed = Carbon::parse($booking->end_time)->lessThanOrEqualTo($now);

            DB::table('bookings')
                ->where('id', $booking->id)
                ->update([
                    'session_status' => $completed ? 'completed' : 'active',
                    'ended_at' => $completed ? $booking->end_time : null,
                    'tariff_name_snapshot' => $tariff?->name,
                    'hourly_rate_snapshot' => $hourlyRate,
                    'asset_snapshot' => json_encode($assets),
                    'asset_stats_recorded' => true,
                ]);

            if (! $completed) {
                continue;
            }

            DB::table('trades')->updateOrInsert(
                ['booking_id' => $booking->id],
                [
                    'tariff_id' => $booking->tariff_id,
                    'tariff_name' => $tariff?->name,
                    'hourly_rate' => $hourlyRate,
                    'payment_status' => $booking->status,
                    'session_status' => 'completed',
                    'start_time' => $booking->start_time,
                    'end_time' => $booking->end_time,
                    'duration_minutes' => $booking->duration_minutes,
                    'total_cost' => $booking->total_cost,
                    'debt_name' => $booking->debt_name,
                    'debt_phone_number' => $booking->debt_phone_number,
                    'asset_snapshot' => json_encode($assets),
                    'assets_count' => $assetCount,
                    'created_at' => $booking->created_at ?? $now,
                    'updated_at' => $booking->updated_at ?? $now,
                ],
            );
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('trades');

        Schema::table('bookings', function (Blueprint $table) {
            $table->dropColumn([
                'session_status',
                'ended_at',
                'tariff_name_snapshot',
                'hourly_rate_snapshot',
                'asset_snapshot',
                'asset_stats_recorded',
            ]);
        });
    }

    protected function deriveHourlyRate(float $totalCost, int $durationMinutes, int $assetCount): float
    {
        if ($durationMinutes <= 0 || $assetCount <= 0) {
            return 0;
        }

        return round($totalCost / (($durationMinutes / 60) * $assetCount), 2);
    }
};
