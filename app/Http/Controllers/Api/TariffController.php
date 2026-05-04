<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\ValidatesApiRequests;
use App\Http\Controllers\Controller;
use App\Models\Asset;
use App\Models\Tariff;
use App\Services\TariffPricingService;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class TariffController extends Controller
{
    use ValidatesApiRequests;

    public function index()
    {
        return response()->json(
            Tariff::query()
                ->with('categoryPrices')
                ->orderBy('name')
                ->get()
                ->map(fn (Tariff $tariff) => $this->serializeTariff($tariff))
                ->values()
        );
    }

    public function store(Request $request, TariffPricingService $tariffPricing)
    {
        $validated = $this->validateApi($request, [
            'name' => 'required|string',
            'hourly_cost' => 'nullable|numeric|min:0',
            'category_prices' => 'nullable|array|min:1',
            'category_prices.*.category' => 'required|string',
            'category_prices.*.hourly_price' => 'required|numeric|min:0',
        ]);

        $categoryPrices = $this->resolveCategoryPricesPayload($validated, $tariffPricing);

        $tariff = DB::transaction(function () use ($validated, $categoryPrices, $tariffPricing) {
            $tariff = Tariff::create([
                'name' => $validated['name'],
                'hourly_cost' => $tariffPricing->resolveDisplayHourlyPrice($categoryPrices),
            ]);

            $tariffPricing->syncTariffCategoryPrices($tariff, $categoryPrices);

            return $tariff->load('categoryPrices');
        });

        return response()->json($this->serializeTariff($tariff), 201);
    }

    public function show(Tariff $tariff)
    {
        return response()->json($this->serializeTariff($tariff->load('categoryPrices')));
    }

    public function update(Request $request, Tariff $tariff, TariffPricingService $tariffPricing)
    {
        $validated = $this->validateApi($request, [
            'name' => 'sometimes|required|string',
            'hourly_cost' => 'nullable|numeric|min:0',
            'category_prices' => 'sometimes|required|array|min:1',
            'category_prices.*.category' => 'required|string',
            'category_prices.*.hourly_price' => 'required|numeric|min:0',
        ]);

        $categoryPrices = array_key_exists('category_prices', $validated)
            ? $this->resolveCategoryPricesPayload($validated, $tariffPricing)
            : null;

        DB::transaction(function () use ($validated, $categoryPrices, $tariff, $tariffPricing) {
            if (array_key_exists('name', $validated)) {
                $tariff->update([
                    'name' => $validated['name'],
                ]);
            }

            if ($categoryPrices !== null) {
                $tariffPricing->syncTariffCategoryPrices($tariff, $categoryPrices);
            }
        });

        return response()->json($this->serializeTariff($tariff->fresh()->load('categoryPrices')));
    }

    public function destroy(Tariff $tariff)
    {
        try {
            $tariff->delete();

            return response()->json(null, 204);
        } catch (\Throwable $e) {
            Log::error('Failed to delete tariff', [
                'tariff_id' => $tariff->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'message' => 'Failed to delete tariff.',
            ], 500);
        }
    }

    protected function serializeTariff(Tariff $tariff): array
    {
        return [
            'id' => $tariff->id,
            'backend_id' => $tariff->id,
            'name' => $tariff->name,
            'hourly_cost' => (float) $tariff->hourly_cost,
            'category_prices' => $tariff->categoryPrices
                ->map(fn ($price) => [
                    'id' => $price->id,
                    'category' => $price->category,
                    'hourly_price' => (float) $price->hourly_price,
                ])
                ->values()
                ->all(),
        ];
    }

    protected function resolveCategoryPricesPayload(array $validated, TariffPricingService $tariffPricing): array
    {
        if (! empty($validated['category_prices'])) {
            return $tariffPricing->normalizeCategoryPrices($validated['category_prices']);
        }

        if (! array_key_exists('hourly_cost', $validated)) {
            throw new HttpResponseException(response()->json([
                'message' => 'Bad request.',
                'errors' => [
                    'category_prices' => ['At least one category price is required.'],
                ],
            ], 400));
        }

        $assetCategories = Asset::query()
            ->select('category')
            ->distinct()
            ->orderBy('category')
            ->get()
            ->map(fn (Asset $asset) => [
                'category' => trim((string) $asset->category),
                'hourly_price' => round((float) $validated['hourly_cost'], 2),
            ])
            ->filter(fn (array $row) => $row['category'] !== '')
            ->values()
            ->all();

        if ($assetCategories === []) {
            throw new HttpResponseException(response()->json([
                'message' => 'Bad request.',
                'errors' => [
                    'category_prices' => ['Add at least one asset category before using legacy hourly pricing.'],
                ],
            ], 400));
        }

        return $tariffPricing->normalizeCategoryPrices($assetCategories);
    }
}
