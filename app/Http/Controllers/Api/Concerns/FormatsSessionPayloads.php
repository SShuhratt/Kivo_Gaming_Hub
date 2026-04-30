<?php

namespace App\Http\Controllers\Api\Concerns;

use App\Models\Booking;
use App\Models\Trade;
use Illuminate\Support\Collection;

trait FormatsSessionPayloads
{
    protected function formatSession(Booking $booking): array
    {
        $assets = $this->snapshotAssets($booking->asset_snapshot, $booking->relationLoaded('assets') ? $booking->assets : collect());
        $tradeExists = $booking->relationLoaded('trade')
            ? $booking->trade !== null
            : $booking->trade()->exists();

        return [
            'id' => $booking->id,
            'status' => $booking->status,
            'session_status' => $booking->session_status,
            'start_time' => $booking->start_time,
            'end_time' => $booking->end_time,
            'ended_at' => $booking->ended_at,
            'duration_minutes' => $booking->duration_minutes,
            'total_cost' => (float) $booking->total_cost,
            'debt_name' => $booking->debt_name,
            'debt_phone_number' => $booking->debt_phone_number,
            'tariff' => [
                'id' => $booking->tariff_id,
                'name' => $booking->tariff_name_snapshot ?: $booking->tariff?->name,
                'hourly_cost' => (float) $booking->hourly_rate_snapshot,
            ],
            'assets' => $assets,
            'assets_count' => count($assets),
            'room_label' => $this->roomLabelFromAssets($assets),
            'trade_exists' => $tradeExists,
            'can_delete' => $booking->session_status !== 'active' && $tradeExists,
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
            'tariff' => $trade->tariff_name ?? 'N/A',
            'tariff_data' => [
                'id' => $trade->tariff_id,
                'name' => $trade->tariff_name,
                'hourly_cost' => (float) $trade->hourly_rate,
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

    protected function roomLabelFromAssets(array $assets): string
    {
        $roomIds = collect($assets)
            ->pluck('room_id')
            ->filter(fn ($roomId) => $roomId !== null)
            ->unique()
            ->sort()
            ->values();

        return $roomIds->isNotEmpty()
            ? 'Xona '.$roomIds->implode(', ')
            : 'Xona N/A';
    }

    protected function snapshotAssets(?array $snapshot, Collection $fallbackAssets): array
    {
        if (is_array($snapshot) && $snapshot !== []) {
            return collect($snapshot)
                ->map(fn ($asset) => [
                    'id' => $asset['id'] ?? null,
                    'category' => $asset['category'] ?? null,
                    'room_id' => $asset['room_id'] ?? null,
                    'room_number' => isset($asset['room_number']) ? (string) $asset['room_number'] : (isset($asset['room_id']) ? (string) $asset['room_id'] : null),
                ])
                ->values()
                ->all();
        }

        return $fallbackAssets
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
