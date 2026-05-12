<?php

namespace App\Services;

use App\Models\Trade;
use Carbon\CarbonInterface;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

class ServiceFinanceReportService
{
    public function __construct(
        protected AssetDisplayOrderService $assetDisplayOrder,
    ) {
    }

    public function summary(): array
    {
        return $this->summarize($this->detailsCollection());
    }

    public function details(): array
    {
        return $this->detailsCollection()->all();
    }

    public function summarize(Collection $details): array
    {
        $totalDurationSeconds = (int) $details->sum('duration_seconds');

        return [
            'total_duration_seconds' => $totalDurationSeconds,
            'total_duration_formatted' => $this->formatDuration($totalDurationSeconds),
            'total_earned_amount' => round((float) $details->sum('amount'), 2),
            'total_records' => $details->count(),
        ];
    }

    protected function detailsCollection(): Collection
    {
        return Trade::query()
            ->where('session_status', 'completed')
            ->orderByDesc('end_time')
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (Trade $trade) => $this->mapTrade($trade))
            ->values();
    }

    protected function mapTrade(Trade $trade): array
    {
        $assets = $this->normalizeAssets($trade->asset_snapshot);
        $serviceNames = collect($assets)
            ->map(fn (array $asset) => $asset['service_name'] ?? null)
            ->filter(fn ($serviceName) => $serviceName !== null && $serviceName !== '')
            ->unique()
            ->values()
            ->all();
        $roomNames = collect($assets)
            ->map(fn (array $asset) => $asset['room_name'] ?? $asset['room_number'] ?? null)
            ->filter(fn ($roomName) => $roomName !== null && $roomName !== '')
            ->unique()
            ->values();
        $durationSeconds = $this->resolveDurationSeconds($trade);
        $paymentStatus = $trade->payment_status;
        $paymentMethod = $paymentStatus === 'debt_closed' ? 'debt' : 'cash';
        $completedAt = $trade->end_time ?? $trade->created_at;

        return [
            'id' => $trade->id,
            'booking_id' => $trade->booking_id,
            'reference_label' => "Trade #{$trade->id}",
            'session_label' => $trade->booking_id ? "Session #{$trade->booking_id}" : null,
            'room_name' => $roomNames->isNotEmpty() ? $roomNames->implode(', ') : 'Xona N/A',
            'assets' => $assets,
            'services' => $serviceNames,
            'start_time' => $trade->start_time,
            'end_time' => $trade->end_time,
            'duration_seconds' => $durationSeconds,
            'duration_formatted' => $this->formatDuration($durationSeconds),
            'amount' => (float) $trade->total_cost,
            'payment_status' => $paymentStatus,
            'payment_status_label' => $paymentStatus === 'debt_closed' ? 'Qarz' : "To'langan",
            'payment_method' => $paymentMethod,
            'payment_method_label' => $paymentMethod === 'debt' ? 'Qarz' : 'Naqd',
            'debtor_name' => $trade->debt_name,
            'debtor_phone' => $trade->debt_phone_number,
            'completed_at' => $completedAt,
            'created_at' => $trade->created_at,
        ];
    }

    protected function normalizeAssets(?array $snapshot): array
    {
        if (! is_array($snapshot) || $snapshot === []) {
            return [];
        }

        $snapshotOrderMap = $this->assetOrderMapForRooms(
            collect($snapshot)->pluck('room_id')->all(),
        );

        return collect($snapshot)
            ->map(fn ($asset) => [
                'id' => isset($asset['id']) ? (int) $asset['id'] : null,
                'name' => $asset['name'] ?? null,
                'service_id' => isset($asset['service_id']) ? (int) $asset['service_id'] : null,
                'service_name' => $asset['service_name'] ?? $asset['category'] ?? null,
                'room_id' => isset($asset['room_id']) ? (int) $asset['room_id'] : null,
                'room_name' => $asset['room_name'] ?? null,
                'room_number' => isset($asset['room_number']) ? (string) $asset['room_number'] : (isset($asset['room_id']) ? (string) $asset['room_id'] : null),
                'asset_order' => isset($asset['asset_order'])
                    ? (int) $asset['asset_order']
                    : (isset($asset['id']) ? ($snapshotOrderMap[(int) $asset['id']] ?? null) : null),
                'hourly_price' => array_key_exists('hourly_price', $asset) ? (float) $asset['hourly_price'] : null,
            ])
            ->values()
            ->all();
    }

    protected function resolveDurationSeconds(Trade $trade): int
    {
        if ($trade->start_time && $trade->end_time) {
            $startTime = $this->toCarbon($trade->start_time);
            $endTime = $this->toCarbon($trade->end_time);

            if ($startTime && $endTime) {
                return max(0, $startTime->diffInSeconds($endTime));
            }
        }

        return max(0, (int) $trade->duration_minutes * 60);
    }

    protected function formatDuration(int $totalSeconds): string
    {
        $hours = intdiv($totalSeconds, 3600);
        $minutes = intdiv($totalSeconds % 3600, 60);
        $seconds = $totalSeconds % 60;

        return sprintf('%02d:%02d:%02d', $hours, $minutes, $seconds);
    }

    protected function toCarbon(mixed $value): ?CarbonInterface
    {
        if ($value instanceof CarbonInterface) {
            return $value;
        }

        if (! is_string($value) || trim($value) === '') {
            return null;
        }

        return Carbon::parse($value);
    }

    protected function assetOrderMapForRooms(array $roomIds): array
    {
        static $cache = [];

        $normalizedRoomIds = collect($roomIds)
            ->filter(fn ($roomId) => $roomId !== null && $roomId !== '')
            ->map(fn ($roomId) => (int) $roomId)
            ->unique()
            ->sort()
            ->values()
            ->all();

        if ($normalizedRoomIds === []) {
            return [];
        }

        $cacheKey = implode(',', $normalizedRoomIds);

        if (! array_key_exists($cacheKey, $cache)) {
            $cache[$cacheKey] = $this->assetDisplayOrder->buildOrderMapForRooms($normalizedRoomIds);
        }

        return $cache[$cacheKey];
    }
}
