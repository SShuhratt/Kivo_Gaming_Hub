<?php

namespace App\Services;

use App\Models\Asset;
use Illuminate\Database\Eloquent\Collection;

class AssetDisplayOrderService
{
    public function buildOrderMap(Collection $assets): array
    {
        $assets->loadMissing(['room', 'service']);

        $sortedAssets = $assets->sortBy(fn (Asset $asset) => sprintf(
            '%s|%s|%s|%010d',
            mb_strtolower((string) ($asset->room?->name ?? '')),
            mb_strtolower((string) ($asset->service?->name ?? $asset->category ?? '')),
            mb_strtolower((string) $asset->name),
            $asset->id,
        ));

        $counters = [];
        $orderMap = [];

        foreach ($sortedAssets as $asset) {
            if (! $asset->id) {
                continue;
            }

            $groupKey = $this->groupKey(
                $asset->room_id,
                $asset->room?->name,
                $asset->service_id,
                $asset->service?->name ?? $asset->category,
            );

            $counters[$groupKey] = ($counters[$groupKey] ?? 0) + 1;
            $orderMap[$asset->id] = $counters[$groupKey];
        }

        return $orderMap;
    }

    public function buildOrderMapForRooms(iterable $roomIds): array
    {
        $normalizedRoomIds = collect($roomIds)
            ->filter(fn ($roomId) => $roomId !== null && $roomId !== '')
            ->map(fn ($roomId) => (int) $roomId)
            ->unique()
            ->values();

        if ($normalizedRoomIds->isEmpty()) {
            return [];
        }

        $roomAssets = Asset::query()
            ->with(['room', 'service'])
            ->whereIn('room_id', $normalizedRoomIds)
            ->get();

        return $this->buildOrderMap($roomAssets);
    }

    protected function groupKey(
        ?int $roomId,
        ?string $roomName,
        ?int $serviceId,
        ?string $serviceName,
    ): string {
        return implode('|', [
            $roomId ?? 'room:'.mb_strtolower((string) $roomName),
            $serviceId ?? 'service:'.mb_strtolower((string) $serviceName),
        ]);
    }
}
