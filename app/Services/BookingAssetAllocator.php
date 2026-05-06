<?php

namespace App\Services;

use App\Models\Asset;
use App\Models\Service;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\Exceptions\HttpResponseException;

class BookingAssetAllocator
{
    public function allocateFromCart(array $cart): Collection
    {
        $serviceIds = collect($cart)
            ->pluck('service_id')
            ->filter()
            ->map(fn ($serviceId) => (int) $serviceId)
            ->unique()
            ->values();

        $availableAssets = Asset::query()
            ->with(['room', 'service'])
            ->whereIn('service_id', $serviceIds)
            ->whereDoesntHave('bookings', fn ($query) => $query->where('session_status', 'active'))
            ->orderBy('room_id')
            ->orderBy('service_id')
            ->orderBy('name')
            ->orderBy('id')
            ->lockForUpdate()
            ->get();

        $groupedByServiceId = $availableAssets->groupBy('service_id');
        $allocatedAssets = collect();
        $errors = [];

        foreach ($cart as $cartLine) {
            $serviceId = (int) $cartLine['service_id'];
            $quantity = (int) $cartLine['quantity'];
            $serviceName = $cartLine['service_name'] ?? 'Service #'.$serviceId;
            $availableForService = $groupedByServiceId->get($serviceId, collect());

            if ($availableForService->count() < $quantity) {
                $errors['cart_items'][] = "{$serviceName} requires {$quantity} available assets, but only {$availableForService->count()} are free.";
                continue;
            }

            $selectedAssets = $availableForService->take($quantity);
            $allocatedAssets = $allocatedAssets->merge($selectedAssets);
            $groupedByServiceId->put($serviceId, $availableForService->slice($quantity)->values());
        }

        if ($errors !== []) {
            $this->abortBadRequest($errors);
        }

        return $allocatedAssets->values();
    }

    public function validateAssetSelectionAvailability(Collection $assets): void
    {
        $assets->loadMissing('service');

        $activeAssetIds = Asset::query()
            ->whereIn('id', $assets->pluck('id'))
            ->whereHas('bookings', fn ($query) => $query->where('session_status', 'active'))
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->all();

        if ($activeAssetIds === []) {
            return;
        }

        $lockedAssets = $assets
            ->whereIn('id', $activeAssetIds)
            ->map(fn (Asset $asset) => $asset->name ?: 'Asset #'.$asset->id)
            ->values()
            ->all();

        $this->abortBadRequest([
            'asset_ids' => ['These assets are already active: '.implode(', ', $lockedAssets).'.'],
        ]);
    }

    public function distributeEffectiveHourlyRates(Collection $assets, array $serviceHourlyAllocations): array
    {
        $assets->loadMissing('service');

        $ratesByAssetId = [];

        foreach ($assets->groupBy('service_id') as $serviceId => $serviceAssets) {
            $service = $serviceAssets->first()?->service;
            $serviceKey = Service::normalizeRequirementKey($service?->name);
            $serviceTotal = round((float) ($serviceHourlyAllocations[$serviceKey] ?? 0), 2);
            $count = $serviceAssets->count();

            if ($count === 0) {
                continue;
            }

            $distributed = 0.0;

            foreach ($serviceAssets->values() as $index => $asset) {
                if ($index === $count - 1) {
                    $effectiveRate = round($serviceTotal - $distributed, 2);
                } else {
                    $effectiveRate = round($serviceTotal / $count, 2);
                    $distributed += $effectiveRate;
                }

                $ratesByAssetId[$asset->id] = $effectiveRate;
            }
        }

        return $ratesByAssetId;
    }

    protected function abortBadRequest(array $errors): never
    {
        throw new HttpResponseException(response()->json([
            'message' => 'Bad request.',
            'errors' => $errors,
        ], 400));
    }
}
