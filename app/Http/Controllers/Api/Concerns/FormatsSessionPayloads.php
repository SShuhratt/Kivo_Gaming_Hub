<?php

namespace App\Http\Controllers\Api\Concerns;

use App\Models\Booking;
use App\Models\Trade;
use App\Services\AssetDisplayOrderService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

trait FormatsSessionPayloads
{
    protected function formatSession(Booking $booking): array
    {
        $assets = $this->snapshotAssets($booking->asset_snapshot, $booking->relationLoaded('assets') ? $booking->assets : collect());
        $trade = $booking->relationLoaded('trade')
            ? $booking->trade
            : $booking->trade()->first();
        $tradeExists = $trade !== null;

        return [
            'id' => $booking->id,
            'status' => $booking->status,
            'session_status' => $booking->session_status,
            'start_time' => $booking->start_time,
            'end_time' => $booking->end_time,
            'ended_at' => $booking->ended_at,
            'duration_minutes' => $booking->duration_minutes,
            'requested_duration_hours' => $booking->requested_duration_hours,
            'total_cost' => (float) $booking->total_cost,
            'debt_name' => $booking->debt_name,
            'debt_phone_number' => $booking->debt_phone_number,
            'is_vip' => $booking->is_vip,
            'pricing' => [
                'label' => $booking->tariff_name_snapshot ?: 'Service pricing',
                'hourly_rate' => (float) $booking->hourly_rate_snapshot,
            ],
            'assets' => $assets,
            'assets_count' => count($assets),
            'room_label' => $this->roomLabelFromAssets($assets),
            'trade_exists' => $tradeExists,
            'can_delete' => $booking->session_status !== 'active' && $tradeExists,
            'trade' => $trade ? $this->formatSessionTrade($trade) : null,
        ];
    }

    protected function formatSessionTrade(Trade $trade): array
    {
        return [
            'id' => $trade->id,
            'status' => $trade->payment_status,
            'session_status' => $trade->session_status,
            'saved_cost' => (float) $trade->total_cost,
            'duration_minutes' => $trade->duration_minutes,
            'start_time' => $trade->start_time,
            'end_time' => $trade->end_time,
        ];
    }

    protected function formatTradeLedgerEntry(Trade $trade): array
    {
        $assets = $this->snapshotAssets($trade->asset_snapshot, collect());

        return [
            'id' => $trade->id,
            'booking_id' => $trade->booking_id,
            'type' => $trade->payment_status === 'submitted' ? 'Income' : 'Debt',
            'amount' => (float) $trade->total_cost,
            'status' => $trade->payment_status,
            'session_status' => $trade->session_status,
            'details' => [
                'start_time' => $trade->start_time,
                'end_time' => $trade->end_time,
                'duration_minutes' => $trade->duration_minutes,
                'debt_info' => [
                    'name' => $trade->debt_name,
                    'phone' => $trade->debt_phone_number,
                ],
            ],
            'pricing_label' => $trade->tariff_name ?: 'Service pricing',
            'pricing' => [
                'label' => $trade->tariff_name ?: 'Service pricing',
                'hourly_rate' => (float) $trade->hourly_rate,
            ],
            'assets' => $assets,
            'assets_count' => count($assets),
        ];
    }

    protected function formatDashboardSale(Trade $trade): array
    {
        $assets = $this->snapshotAssets($trade->asset_snapshot, collect());
        $submitted = $trade->payment_status === 'submitted';

        return [
            'id' => (string) $trade->id,
            'room' => $this->roomLabelFromAssets($assets),
            'base_price' => (float) $trade->hourly_rate,
            'start' => optional($trade->start_time)->format('H:i'),
            'end' => optional($trade->end_time)->format('H:i'),
            'service_cost' => (float) $trade->total_cost,
            'products' => 0,
            'total' => (float) $trade->total_cost,
            'cash' => $submitted ? (float) $trade->total_cost : 0,
            'terminal' => 0,
            'click' => 0,
            'payme' => 0,
            'debt' => $submitted ? 0 : (float) $trade->total_cost,
            'paid' => $submitted ? (float) $trade->total_cost : 0,
            'timestamp' => optional($trade->created_at)->getTimestampMs(),
        ];
    }

    protected function collectDebtRecords(): Collection
    {
        $trades = Trade::query()
            ->where(fn (Builder $query) => $this->constrainDebtRelatedQuery($query, 'payment_status', 'debt_name', 'debt_phone_number'))
            ->latest('end_time')
            ->get()
            ->map(fn (Trade $trade) => $this->formatDebtRecordFromTrade($trade));

        $bookings = Booking::query()
            ->with(['assets.room', 'assets.service'])
            ->whereDoesntHave('trade')
            ->where(fn (Builder $query) => $this->constrainDebtRelatedQuery($query, 'status', 'debt_name', 'debt_phone_number'))
            ->latest('start_time')
            ->get()
            ->map(fn (Booking $booking) => $this->formatDebtRecordFromBooking($booking));

        return $trades
            ->concat($bookings)
            ->sortByDesc(fn (array $record) => $record['sort_time'])
            ->values()
            ->map(function (array $record) {
                unset($record['sort_time']);

                return $record;
            });
    }

    protected function formatDebtRecordFromTrade(Trade $trade): array
    {
        $assets = $this->snapshotAssets($trade->asset_snapshot, collect());
        $sessionDate = $trade->end_time ?? $trade->start_time ?? $trade->created_at;
        $isPaid = $trade->payment_status === 'submitted';
        $originalAmount = (float) $trade->total_cost;
        $remainingAmount = $isPaid ? 0 : $originalAmount;

        return [
            'id' => "trade-{$trade->id}",
            'source' => 'trade',
            'booking_id' => $trade->booking_id,
            'trade_id' => $trade->id,
            'session_id' => $trade->booking_id,
            'debtor_name' => $trade->debt_name,
            'debtor_phone_number' => $trade->debt_phone_number,
            'debt_amount' => $originalAmount,
            'final_cost' => $originalAmount,
            'original_amount' => $originalAmount,
            'paid_amount' => $isPaid ? $originalAmount : 0,
            'remaining_amount' => $remainingAmount,
            'session_state' => 'ended',
            'payment_state' => $isPaid ? 'paid' : 'unpaid',
            'session_status' => $trade->session_status,
            'payment_status' => $trade->payment_status,
            'can_delete' => $isPaid && abs($remainingAmount) < 0.00001,
            'created_at' => $trade->created_at,
            'session_date' => $sessionDate,
            'start_time' => $trade->start_time,
            'end_time' => $trade->end_time,
            'duration_minutes' => $trade->duration_minutes,
            'room_label' => $this->roomLabelFromAssets($assets),
            'pricing_label' => $trade->tariff_name ?: 'Service pricing',
            'reference_label' => "Trade #{$trade->id}",
            'sort_time' => optional($sessionDate)->getTimestamp() ?? 0,
        ];
    }

    protected function formatDebtRecordFromBooking(Booking $booking): array
    {
        $assets = $this->snapshotAssets(
            $booking->asset_snapshot,
            $booking->relationLoaded('assets') ? $booking->assets : collect(),
        );
        $sessionDate = $booking->ended_at ?? $booking->start_time ?? $booking->created_at;
        $isPaid = $booking->status === 'submitted';
        $originalAmount = (float) $booking->total_cost;
        $remainingAmount = $isPaid ? 0 : $originalAmount;

        return [
            'id' => "booking-{$booking->id}",
            'source' => 'booking',
            'booking_id' => $booking->id,
            'trade_id' => null,
            'session_id' => $booking->id,
            'debtor_name' => $booking->debt_name,
            'debtor_phone_number' => $booking->debt_phone_number,
            'debt_amount' => $originalAmount,
            'final_cost' => $originalAmount,
            'original_amount' => $originalAmount,
            'paid_amount' => $isPaid ? $originalAmount : 0,
            'remaining_amount' => $remainingAmount,
            'session_state' => $booking->session_status === 'active' ? 'active' : 'ended',
            'payment_state' => $isPaid ? 'paid' : 'unpaid',
            'session_status' => $booking->session_status,
            'payment_status' => $booking->status,
            'can_delete' => $isPaid && abs($remainingAmount) < 0.00001,
            'created_at' => $booking->created_at,
            'session_date' => $sessionDate,
            'start_time' => $booking->start_time,
            'end_time' => $booking->ended_at ?? $booking->end_time,
            'duration_minutes' => $booking->duration_minutes,
            'room_label' => $this->roomLabelFromAssets($assets),
            'pricing_label' => $booking->tariff_name_snapshot ?: 'Service pricing',
            'reference_label' => "Session #{$booking->id}",
            'sort_time' => optional($sessionDate)->getTimestamp() ?? 0,
        ];
    }

    protected function constrainDebtRelatedQuery(
        Builder $query,
        string $statusColumn,
        string $nameColumn,
        string $phoneColumn,
    ): void {
        $query->where('is_deleted_from_debts', false)
              ->where(function (Builder $q) use ($statusColumn, $nameColumn, $phoneColumn) {
                  $q->where($statusColumn, 'debt_closed')
                    ->orWhereNotNull($nameColumn)
                    ->orWhereNotNull($phoneColumn);
              });
    }

    protected function roomLabelFromAssets(array $assets): string
    {
        $roomLabels = collect($assets)
            ->map(fn ($asset) => $asset['room_name'] ?? $asset['room_number'] ?? $asset['room_id'] ?? null)
            ->filter(fn ($label) => $label !== null && $label !== '')
            ->unique()
            ->values();

        return $roomLabels->isNotEmpty()
            ? $roomLabels->implode(', ')
            : 'Xona N/A';
    }

    protected function snapshotAssets(?array $snapshot, Collection $fallbackAssets): array
    {
        $fallbackOrderMap = $fallbackAssets->isNotEmpty()
            ? $this->assetOrderMapForRooms($fallbackAssets->pluck('room_id')->all())
            : [];

        if (is_array($snapshot) && $snapshot !== []) {
            $snapshotOrderMap = $this->assetOrderMapForRooms(
                collect($snapshot)->pluck('room_id')->all(),
            );

            return collect($snapshot)
                ->map(fn ($asset) => [
                    'id' => $asset['id'] ?? null,
                    'name' => $asset['name'] ?? null,
                    'category' => $asset['category'] ?? null,
                    'service_id' => $asset['service_id'] ?? null,
                    'service_name' => $asset['service_name'] ?? $asset['category'] ?? null,
                    'room_id' => $asset['room_id'] ?? null,
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

        return $fallbackAssets
            ->map(fn ($asset) => [
                'id' => $asset->id,
                'name' => $asset->name,
                'category' => $asset->category,
                'service_id' => $asset->service_id,
                'service_name' => $asset->service?->name,
                'room_id' => $asset->room_id,
                'room_name' => $asset->room?->name,
                'room_number' => $asset->room?->name ?? ($asset->room_id ? (string) $asset->room_id : null),
                'asset_order' => $fallbackOrderMap[$asset->id] ?? null,
                'hourly_price' => null,
            ])
            ->values()
            ->all();
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
            $cache[$cacheKey] = app(AssetDisplayOrderService::class)->buildOrderMapForRooms($normalizedRoomIds);
        }

        return $cache[$cacheKey];
    }
}
