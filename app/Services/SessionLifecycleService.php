<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\Trade;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class SessionLifecycleService
{
    public function __construct(
        protected TariffPricingService $tariffPricing,
    ) {
    }

    public function syncElapsedSessions(): void
    {
        Booking::query()
            ->where('session_status', 'active')
            ->where('is_vip', false)
            ->whereNotNull('end_time')
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
                ->with(['assets', 'tariff.categoryPrices', 'trade'])
                ->lockForUpdate()
                ->findOrFail($bookingId);

            if ($lockedBooking->session_status !== 'active') {
                return $lockedBooking;
            }

            $snapshot = $lockedBooking->asset_snapshot ?? $this->buildAssetSnapshot($lockedBooking);
            $startTime = Carbon::parse($lockedBooking->start_time);
            $scheduledEndTime = $lockedBooking->end_time ? Carbon::parse($lockedBooking->end_time) : null;
            $effectiveEndTime = $endedAt
                ? Carbon::parse($endedAt)
                : ($scheduledEndTime ? $scheduledEndTime->copy() : Carbon::now());

            if ($scheduledEndTime && ! $lockedBooking->is_vip && $effectiveEndTime->greaterThan($scheduledEndTime)) {
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
                'requested_duration_hours' => $totals['duration_hours'],
                'total_cost' => $totals['total_cost'],
                'session_status' => 'completed',
                'tariff_name_snapshot' => $lockedBooking->tariff_name_snapshot ?: $lockedBooking->tariff?->name,
                'hourly_rate_snapshot' => $totals['hourly_rate_total'],
                'asset_snapshot' => $snapshot,
            ]);

            if (! $lockedBooking->asset_stats_recorded) {
                $this->recordAssetStats($lockedBooking, $snapshot);
            }

            Trade::query()->updateOrCreate(
                ['booking_id' => $lockedBooking->id],
                $this->tradePayload($lockedBooking, $snapshot),
            );

            return $lockedBooking->fresh(['assets', 'tariff.categoryPrices', 'trade']);
        });
    }

    protected function calculateTotals(Booking $booking, Carbon $effectiveEndTime, array $snapshot): array
    {
        $startTime = Carbon::parse($booking->start_time);
        $durationMinutes = (int) $startTime->diffInMinutes($effectiveEndTime);
        $durationHours = round($durationMinutes / 60, 2);
        $hourlyRateTotal = $this->resolveHourlyRateTotal($booking, $snapshot);
        $totalCost = $durationMinutes > 0
            ? round($durationHours * $hourlyRateTotal, 2)
            : 0;

        return [
            'duration_hours' => $durationHours,
            'duration_minutes' => $durationMinutes,
            'hourly_rate_total' => $hourlyRateTotal,
            'total_cost' => $totalCost,
        ];
    }

    protected function resolveHourlyRateTotal(Booking $booking, array $snapshot): float
    {
        $snapshotHasExplicitPrices = collect($snapshot)->contains(
            fn ($asset) => array_key_exists('hourly_price', $asset) && $asset['hourly_price'] !== null
        );

        if ($snapshotHasExplicitPrices) {
            return round(
                collect($snapshot)->sum(fn ($asset) => (float) ($asset['hourly_price'] ?? 0)),
                2,
            );
        }

        if ((float) $booking->hourly_rate_snapshot > 0) {
            return round((float) $booking->hourly_rate_snapshot * max(1, count($snapshot)), 2);
        }

        return 0;
    }

    protected function recordAssetStats(Booking $booking, array $snapshot): void
    {
        $durationHours = round($booking->duration_minutes / 60, 2);
        $assetEarnings = collect($snapshot)
            ->filter(fn ($asset) => isset($asset['id']))
            ->keyBy(fn ($asset) => (int) $asset['id'])
            ->map(fn ($asset) => round($durationHours * (float) ($asset['hourly_price'] ?? 0), 2));

        foreach ($booking->assets as $asset) {
            $asset->increment('total_usage_duration_minutes', $booking->duration_minutes);

            $earnedMoney = $assetEarnings->has($asset->id)
                ? (float) $assetEarnings->get($asset->id)
                : $this->fallbackAssetEarnings($booking, count($snapshot));

            $asset->increment('total_earned_money', $earnedMoney);
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
        if ($booking->tariff) {
            try {
                return $this->tariffPricing->buildAssetSnapshot($booking->tariff, $booking->assets);
            } catch (\Throwable) {
                // Fall back to a minimal snapshot if the tariff no longer has matching category prices.
            }
        }

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
                'hourly_price' => null,
            ])
            ->values()
            ->all();
    }

    protected function fallbackAssetEarnings(Booking $booking, int $assetCount): float
    {
        if ($assetCount <= 0) {
            return 0;
        }

        return round((float) $booking->total_cost / $assetCount, 2);
    }
}
