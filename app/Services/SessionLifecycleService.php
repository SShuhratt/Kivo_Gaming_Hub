<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\Trade;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class SessionLifecycleService
{
    public function syncElapsedSessions(): void
    {
        Booking::query()
            ->where('session_status', 'active')
            ->where('end_time', '<=', Carbon::now())
            ->pluck('id')
            ->each(fn (int $bookingId) => $this->completeBooking($bookingId));
    }

    public function completeBooking(Booking|int $booking, Carbon|string|null $endedAt = null): Booking
    {
        $bookingId = $booking instanceof Booking ? $booking->id : $booking;

        return DB::transaction(function () use ($bookingId, $endedAt) {
            /** @var Booking $lockedBooking */
            $lockedBooking = Booking::query()
                ->with(['assets', 'tariff', 'trade'])
                ->lockForUpdate()
                ->findOrFail($bookingId);

            if ($lockedBooking->session_status !== 'active') {
                return $lockedBooking;
            }

            $snapshot = $lockedBooking->asset_snapshot ?? $this->buildAssetSnapshot($lockedBooking);
            $startTime = Carbon::parse($lockedBooking->start_time);
            $scheduledEndTime = Carbon::parse($lockedBooking->end_time);
            $effectiveEndTime = $endedAt ? Carbon::parse($endedAt) : $scheduledEndTime->copy();

            if ($effectiveEndTime->greaterThan($scheduledEndTime)) {
                $effectiveEndTime = $scheduledEndTime->copy();
            }

            if ($effectiveEndTime->lessThan($startTime)) {
                $effectiveEndTime = $startTime->copy();
            }

            $totals = $this->calculateTotals($lockedBooking, $effectiveEndTime, $snapshot);

            $lockedBooking->update([
                'end_time' => $effectiveEndTime,
                'ended_at' => $effectiveEndTime,
                'duration_minutes' => $totals['duration_minutes'],
                'total_cost' => $totals['total_cost'],
                'session_status' => 'completed',
                'tariff_name_snapshot' => $lockedBooking->tariff_name_snapshot ?: $lockedBooking->tariff?->name,
                'hourly_rate_snapshot' => $totals['hourly_rate'],
                'asset_snapshot' => $snapshot,
            ]);

            if (! $lockedBooking->asset_stats_recorded) {
                $this->recordAssetStats($lockedBooking, $snapshot);
            }

            Trade::query()->updateOrCreate(
                ['booking_id' => $lockedBooking->id],
                $this->tradePayload($lockedBooking, $snapshot),
            );

            return $lockedBooking->fresh(['assets', 'tariff', 'trade']);
        });
    }

    protected function calculateTotals(Booking $booking, Carbon $effectiveEndTime, array $snapshot): array
    {
        $startTime = Carbon::parse($booking->start_time);
        $durationMinutes = (int) $startTime->diffInMinutes($effectiveEndTime);
        $assetCount = count($snapshot);
        $hourlyRate = $this->resolveHourlyRate($booking, $durationMinutes, $assetCount);
        $totalCost = $durationMinutes > 0 && $assetCount > 0
            ? round(($durationMinutes / 60) * $hourlyRate * $assetCount, 2)
            : 0;

        return [
            'duration_minutes' => $durationMinutes,
            'total_cost' => $totalCost,
            'hourly_rate' => $hourlyRate,
        ];
    }

    protected function resolveHourlyRate(Booking $booking, int $durationMinutes, int $assetCount): float
    {
        if ((float) $booking->hourly_rate_snapshot > 0) {
            return (float) $booking->hourly_rate_snapshot;
        }

        if ($booking->tariff && $booking->tariff->hourly_cost !== null) {
            return (float) $booking->tariff->hourly_cost;
        }

        if ($durationMinutes <= 0 || $assetCount <= 0) {
            return 0;
        }

        return round((float) $booking->total_cost / (($durationMinutes / 60) * $assetCount), 2);
    }

    protected function recordAssetStats(Booking $booking, array $snapshot): void
    {
        $snapshotAssetCount = count($snapshot);
        $earnedPerAsset = $snapshotAssetCount > 0
            ? round((float) $booking->total_cost / $snapshotAssetCount, 2)
            : 0;

        foreach ($booking->assets as $asset) {
            $asset->increment('total_usage_duration_minutes', $booking->duration_minutes);
            $asset->increment('total_earned_money', $earnedPerAsset);
        }

        $booking->update(['asset_stats_recorded' => true]);
    }

    protected function tradePayload(Booking $booking, array $snapshot): array
    {
        return [
            'tariff_id' => $booking->tariff_id,
            'tariff_name' => $booking->tariff_name_snapshot,
            'hourly_rate' => $booking->hourly_rate_snapshot,
            'payment_status' => $booking->status,
            'session_status' => $booking->session_status === 'cancelled' ? 'cancelled' : 'completed',
            'start_time' => $booking->start_time,
            'end_time' => $booking->end_time,
            'duration_minutes' => $booking->duration_minutes,
            'total_cost' => $booking->total_cost,
            'debt_name' => $booking->debt_name,
            'debt_phone_number' => $booking->debt_phone_number,
            'asset_snapshot' => $snapshot,
            'assets_count' => count($snapshot),
        ];
    }

    protected function buildAssetSnapshot(Booking $booking): array
    {
        return $booking->assets
            ->sortBy([
                ['room_id', 'asc'],
                ['id', 'asc'],
            ])
            ->map(fn ($asset) => [
                'id' => $asset->id,
                'category' => $asset->category,
                'room_id' => $asset->room_id,
                'room_number' => (string) $asset->room_id,
            ])
            ->values()
            ->all();
    }
}
