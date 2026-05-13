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
        return $this->buildReport()['summary'];
    }

    public function details(): array
    {
        return $this->buildReport();
    }

    protected function buildReport(): array
    {
        $completedTrades = $this->completedTrades();
        $assetGroups = $this->assetGroupsCollection($completedTrades);
        $tradeSessions = $completedTrades
            ->map(fn (Trade $trade) => $this->mapTradeSummarySession($trade))
            ->values();

        return [
            'summary' => $this->summarizeReport($tradeSessions, $assetGroups),
            'assets' => $assetGroups->all(),
        ];
    }

    protected function completedTrades(): Collection
    {
        return Trade::query()
            ->where('session_status', 'completed')
            ->orderByDesc('end_time')
            ->orderByDesc('created_at')
            ->get();
    }

    protected function assetGroupsCollection(Collection $completedTrades): Collection
    {
        return $completedTrades
            ->flatMap(fn (Trade $trade) => $this->mapTradeAssetSessions($trade))
            ->groupBy('asset_key')
            ->map(fn (Collection $assetSessions) => $this->summarizeAssetSessions($assetSessions))
            ->sortBy([
                ['room_sort', 'asc'],
                ['service_sort', 'asc'],
                ['asset_order_sort', 'asc'],
                ['asset_name_sort', 'asc'],
            ])
            ->values()
            ->map(function (array $assetGroup) {
                unset(
                    $assetGroup['asset_key'],
                    $assetGroup['room_sort'],
                    $assetGroup['service_sort'],
                    $assetGroup['asset_order_sort'],
                    $assetGroup['asset_name_sort'],
                );

                return $assetGroup;
            });
    }

    protected function mapTradeSummarySession(Trade $trade): array
    {
        $durationSeconds = $this->resolveDurationSeconds($trade);

        return [
            'trade_id' => $trade->id,
            'duration_seconds' => $durationSeconds,
            'amount' => round((float) $trade->total_cost, 2),
        ];
    }

    protected function mapTradeAssetSessions(Trade $trade): Collection
    {
        $assets = $this->normalizeAssets($trade->asset_snapshot);

        if ($assets === []) {
            $assets = [$this->fallbackAsset($trade)];
        }

        $durationSeconds = $this->resolveDurationSeconds($trade);
        $allocatedAmounts = $this->allocateTradeAmountAcrossAssets($trade, $assets);
        $paymentStatus = $trade->payment_status === 'debt_closed' ? 'debt' : 'paid';

        return collect($assets)
            ->values()
            ->map(function (array $asset, int $index) use ($allocatedAmounts, $durationSeconds, $paymentStatus, $trade) {
                $assetName = $asset['name'] ?? ($asset['id'] ? "Asset #{$asset['id']}" : "Noma'lum asset");
                $roomName = $asset['room_name'] ?? $asset['room_number'] ?? 'Xona N/A';
                $serviceName = $asset['service_name'] ?? 'Xizmat N/A';
                $completedAt = $trade->end_time ?? $trade->created_at;

                return [
                    'asset_key' => $this->assetKey($asset),
                    'asset_id' => $asset['id'],
                    'asset_name' => $assetName,
                    'room_name' => $roomName,
                    'service_name' => $serviceName,
                    'asset_order' => $asset['asset_order'],
                    'room_sort' => mb_strtolower($roomName),
                    'service_sort' => mb_strtolower($serviceName),
                    'asset_order_sort' => $asset['asset_order'] ?? PHP_INT_MAX,
                    'asset_name_sort' => mb_strtolower($assetName),
                    'session' => [
                        'session_id' => $trade->booking_id,
                        'trade_id' => $trade->id,
                        'start_time' => $trade->start_time,
                        'end_time' => $trade->end_time,
                        'completed_at' => $completedAt,
                        'duration_seconds' => $durationSeconds,
                        'duration_formatted' => $this->formatDuration($durationSeconds),
                        'amount' => $allocatedAmounts[$index] ?? 0,
                        'payment_status' => $paymentStatus,
                        'payment_status_code' => $trade->payment_status,
                        'payment_status_label' => $paymentStatus === 'debt' ? 'Qarz' : "To'langan",
                        'payment_method' => $paymentStatus === 'debt' ? 'debt' : 'cash',
                        'payment_method_label' => $paymentStatus === 'debt' ? 'Qarz' : 'Naqd',
                        'debtor_name' => $trade->debt_name,
                        'debtor_phone' => $trade->debt_phone_number,
                    ],
                ];
            });
    }

    protected function summarizeAssetSessions(Collection $assetSessions): array
    {
        $firstRecord = $assetSessions->first();
        $sessions = $assetSessions
            ->pluck('session')
            ->sortByDesc(fn (array $session) => $this->sortTimestamp($session['completed_at'] ?? $session['end_time'] ?? $session['start_time'] ?? null))
            ->values();
        $totalDurationSeconds = (int) $sessions->sum('duration_seconds');
        $totalIncome = round((float) $sessions->sum('amount'), 2);

        return [
            'asset_key' => $firstRecord['asset_key'],
            'asset_id' => $firstRecord['asset_id'],
            'asset_name' => $firstRecord['asset_name'],
            'room_name' => $firstRecord['room_name'],
            'service_name' => $firstRecord['service_name'],
            'asset_order' => $firstRecord['asset_order'],
            'total_duration_seconds' => $totalDurationSeconds,
            'total_duration_formatted' => $this->formatDuration($totalDurationSeconds),
            'total_income' => $totalIncome,
            'sessions' => $sessions->all(),
            'room_sort' => $firstRecord['room_sort'],
            'service_sort' => $firstRecord['service_sort'],
            'asset_order_sort' => $firstRecord['asset_order_sort'],
            'asset_name_sort' => $firstRecord['asset_name_sort'],
        ];
    }

    protected function summarizeReport(Collection $tradeSessions, Collection $assetGroups): array
    {
        $totalDurationSeconds = (int) $tradeSessions->sum('duration_seconds');
        $totalIncome = round((float) $tradeSessions->sum('amount'), 2);

        return [
            'total_duration_seconds' => $totalDurationSeconds,
            'total_duration_formatted' => $this->formatDuration($totalDurationSeconds),
            'total_income' => $totalIncome,
            'total_earned_amount' => $totalIncome,
            'total_records' => $assetGroups->count(),
            'total_session_records' => $tradeSessions->count(),
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

    protected function fallbackAsset(Trade $trade): array
    {
        return [
            'id' => null,
            'name' => 'Noma\'lum asset',
            'service_id' => null,
            'service_name' => $trade->tariff_name ?: 'Xizmat N/A',
            'room_id' => null,
            'room_name' => 'Xona N/A',
            'room_number' => null,
            'asset_order' => null,
            'hourly_price' => null,
        ];
    }

    protected function allocateTradeAmountAcrossAssets(Trade $trade, array $assets): array
    {
        $assetsCount = count($assets);

        if ($assetsCount === 0) {
            return [];
        }

        if ($assetsCount === 1) {
            return [round((float) $trade->total_cost, 2)];
        }

        $weights = collect($assets)
            ->map(fn (array $asset) => max(0, (float) ($asset['hourly_price'] ?? 0)))
            ->values();

        if ($weights->sum() <= 0) {
            $weights = collect(range(1, $assetsCount))->map(fn () => 1.0);
        }

        $totalCost = round((float) $trade->total_cost, 2);
        $allocatedAmounts = [];
        $remaining = $totalCost;
        $totalWeight = (float) $weights->sum();

        foreach ($weights as $index => $weight) {
            if ($index === $weights->count() - 1) {
                $allocatedAmounts[] = round($remaining, 2);
                continue;
            }

            $allocated = round($totalCost * ($weight / $totalWeight), 2);
            $allocatedAmounts[] = $allocated;
            $remaining = round($remaining - $allocated, 2);
        }

        return $allocatedAmounts;
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

    protected function assetKey(array $asset): string
    {
        if (($asset['id'] ?? null) !== null) {
            return 'asset-id:'.$asset['id'];
        }

        return implode('|', [
            'asset-name:'.mb_strtolower((string) ($asset['name'] ?? 'unknown')),
            'room:'.mb_strtolower((string) ($asset['room_name'] ?? $asset['room_number'] ?? 'n/a')),
            'service:'.mb_strtolower((string) ($asset['service_name'] ?? 'n/a')),
            'order:'.($asset['asset_order'] ?? 'n/a'),
        ]);
    }

    protected function sortTimestamp(mixed $value): int
    {
        $dateTime = $this->toCarbon($value);

        return $dateTime?->getTimestamp() ?? 0;
    }
}
