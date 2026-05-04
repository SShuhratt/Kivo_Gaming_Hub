<?php

namespace App\Services;

use App\Models\Asset;
use App\Models\Tariff;
use App\Models\TariffCategoryPrice;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\Collection;

class TariffPricingService
{
    public function normalizeCategoryLabel(?string $category): string
    {
        return trim((string) $category);
    }

    public function normalizeCategoryKey(?string $category): string
    {
        return mb_strtolower($this->normalizeCategoryLabel($category));
    }

    public function normalizeCategoryPrices(array $rows, string $field = 'category_prices'): array
    {
        $normalizedRows = [];
        $errors = [];

        foreach ($rows as $index => $row) {
            $label = $this->normalizeCategoryLabel($row['category'] ?? null);
            $key = $this->normalizeCategoryKey($label);
            $hourlyPrice = round((float) ($row['hourly_price'] ?? 0), 2);

            if ($label === '') {
                $errors["{$field}.{$index}.category"][] = 'Category is required.';
                continue;
            }

            if (array_key_exists($key, $normalizedRows)) {
                $errors["{$field}.{$index}.category"][] = 'Category must be unique within the tariff.';
                continue;
            }

            $normalizedRows[$key] = [
                'category' => $label,
                'category_key' => $key,
                'hourly_price' => $hourlyPrice,
            ];
        }

        if ($normalizedRows === []) {
            $errors[$field][] = 'At least one category price is required.';
        }

        if ($errors !== []) {
            $this->abortBadRequest($errors);
        }

        return array_values($normalizedRows);
    }

    public function syncTariffCategoryPrices(Tariff $tariff, array $rows): void
    {
        $keepIds = [];

        foreach ($rows as $row) {
            $price = $tariff->categoryPrices()->updateOrCreate(
                ['category_key' => $row['category_key']],
                [
                    'category' => $row['category'],
                    'hourly_price' => $row['hourly_price'],
                ],
            );

            $keepIds[] = $price->id;
        }

        $tariff->categoryPrices()
            ->whereNotIn('id', $keepIds)
            ->delete();

        $tariff->update([
            'hourly_cost' => $this->resolveDisplayHourlyPrice($rows),
        ]);
    }

    public function resolveDisplayHourlyPrice(iterable $rows): float
    {
        $prices = collect($rows)
            ->map(fn ($row) => (float) ($row['hourly_price'] ?? 0))
            ->filter(fn (float $price) => $price >= 0)
            ->values();

        return $prices->isEmpty() ? 0 : round((float) $prices->min(), 2);
    }

    public function buildAssetSnapshot(Tariff $tariff, Collection $assets): array
    {
        $tariff->loadMissing('categoryPrices');

        if ($tariff->categoryPrices->isEmpty() && (float) $tariff->hourly_cost > 0) {
            return $assets
                ->sortBy([
                    ['room_id', 'asc'],
                    ['id', 'asc'],
                ])
                ->map(fn (Asset $asset) => [
                    'id' => $asset->id,
                    'name' => $asset->name,
                    'category' => $asset->category,
                    'room_id' => $asset->room_id,
                    'room_number' => (string) $asset->room_id,
                    'hourly_price' => round((float) $tariff->hourly_cost, 2),
                ])
                ->values()
                ->all();
        }

        /** @var Collection<string, TariffCategoryPrice> $pricesByKey */
        $pricesByKey = $tariff->categoryPrices
            ->keyBy(fn (TariffCategoryPrice $price) => $this->normalizeCategoryKey($price->category));

        $missingCategories = [];

        $snapshot = $assets
            ->sortBy([
                ['room_id', 'asc'],
                ['id', 'asc'],
            ])
            ->map(function (Asset $asset) use ($pricesByKey, &$missingCategories) {
                $categoryKey = $this->normalizeCategoryKey($asset->category);
                $matchedPrice = $pricesByKey->get($categoryKey);

                if (! $matchedPrice) {
                    $missingCategories[$categoryKey] = $this->normalizeCategoryLabel($asset->category);

                    return [
                        'id' => $asset->id,
                        'name' => $asset->name,
                        'category' => $asset->category,
                        'room_id' => $asset->room_id,
                        'room_number' => (string) $asset->room_id,
                        'hourly_price' => null,
                    ];
                }

                return [
                    'id' => $asset->id,
                    'name' => $asset->name,
                    'category' => $asset->category,
                    'room_id' => $asset->room_id,
                    'room_number' => (string) $asset->room_id,
                    'hourly_price' => round((float) $matchedPrice->hourly_price, 2),
                ];
            })
            ->values()
            ->all();

        if ($missingCategories !== []) {
            $labels = collect($missingCategories)->values()->implode(', ');
            $this->abortBadRequest([
                'asset_ids' => ["Selected tariff does not have prices for: {$labels}."],
            ]);
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
