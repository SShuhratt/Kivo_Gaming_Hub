<?php

namespace App\Services;

use App\Models\Asset;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\Exceptions\HttpResponseException;

class AssetServicePricingService
{
    public function buildPricedAssetSnapshot(Collection $assets): array
    {
        $assets->loadMissing(['room', 'service']);

        $errors = [];

        $snapshot = $assets
            ->sortBy(fn (Asset $asset) => sprintf(
                '%s|%s|%s|%010d',
                mb_strtolower((string) ($asset->room?->name ?? '')),
                mb_strtolower((string) ($asset->service?->name ?? '')),
                mb_strtolower((string) $asset->name),
                $asset->id,
            ))
            ->map(function (Asset $asset) use (&$errors) {
                $label = $asset->name ?: 'Asset #'.$asset->id;

                if (! $asset->room) {
                    $errors['asset_ids'][] = "{$label} is not assigned to a room.";
                }

                if (! $asset->service || $asset->service->name === null || $asset->service->price === null) {
                    $errors['asset_ids'][] = "{$label} has no valid service category price.";
                }

                return [
                    'id' => $asset->id,
                    'name' => $asset->name,
                    'category' => $asset->service?->name,
                    'service_id' => $asset->service?->id,
                    'room_id' => $asset->room_id,
                    'room_name' => $asset->room?->name,
                    'room_number' => $asset->room?->name ?? ($asset->room_id ? (string) $asset->room_id : null),
                    'hourly_price' => $asset->service?->price !== null
                        ? round((float) $asset->service->price, 2)
                        : null,
                ];
            })
            ->values()
            ->all();

        if ($errors !== []) {
            $this->abortBadRequest($errors);
        }

        return $snapshot;
    }

    public function summarizeSnapshot(array $snapshot, ?float $durationHours = null): array
    {
        $hourlyRateTotal = round(
            collect($snapshot)->sum(fn ($asset) => (float) ($asset['hourly_price'] ?? 0)),
            2,
        );

        if ($durationHours === null) {
            return [
                'duration_hours' => null,
                'duration_minutes' => 0,
                'hourly_rate_total' => $hourlyRateTotal,
                'total_cost' => 0,
            ];
        }

        $durationHours = round($durationHours, 2);
        $durationMinutes = (int) round($durationHours * 60);

        return [
            'duration_hours' => $durationHours,
            'duration_minutes' => $durationMinutes,
            'hourly_rate_total' => $hourlyRateTotal,
            'total_cost' => round($hourlyRateTotal * $durationHours, 2),
        ];
    }

    protected function abortBadRequest(array $errors): never
    {
        throw new HttpResponseException(response()->json([
            'message' => 'Bad request.',
            'errors' => $errors,
        ], 400));
    }
}
