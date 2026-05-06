<?php

namespace App\Services;

use App\Models\Asset;
use App\Models\Service;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\Exceptions\HttpResponseException;

class PriceCalculator
{
    public function buildCartFromAssets(Collection $assets): array
    {
        $assets->loadMissing('service');

        $cart = [];
        $errors = [];

        foreach ($assets as $asset) {
            $service = $asset->service;
            $label = $asset->name ?: 'Asset #'.$asset->id;

            if (! $service || $service->rate === null || $service->is_bundle) {
                $errors['asset_ids'][] = "{$label} has no valid base service rate.";
                continue;
            }

            $serviceKey = Service::normalizeRequirementKey($service->name);

            if ($serviceKey === '') {
                $errors['asset_ids'][] = "{$label} has no valid base service key.";
                continue;
            }

            if (! isset($cart[$serviceKey])) {
                $cart[$serviceKey] = $this->makeCartLine($service, 0);
            }

            $cart[$serviceKey]['quantity']++;
        }

        if ($errors !== []) {
            $this->abortBadRequest($errors);
        }

        return $cart;
    }

    public function buildCartFromRequestedServices(array $cartItems): array
    {
        $serviceIds = collect($cartItems)
            ->pluck('service_id')
            ->filter()
            ->map(fn ($serviceId) => (int) $serviceId)
            ->unique()
            ->values();

        $services = Service::query()
            ->whereIn('id', $serviceIds)
            ->get()
            ->keyBy('id');

        $cart = [];
        $errors = [];

        foreach ($cartItems as $index => $item) {
            $service = $services->get((int) ($item['service_id'] ?? 0));
            $quantity = (int) ($item['quantity'] ?? 0);

            if (! $service) {
                $errors["cart_items.{$index}.service_id"][] = 'The selected service is invalid.';
                continue;
            }

            if ($service->is_bundle) {
                $errors["cart_items.{$index}.service_id"][] = "{$service->name} is a bundle and cannot be booked directly.";
                continue;
            }

            if ($service->rate === null) {
                $errors["cart_items.{$index}.service_id"][] = "{$service->name} has no valid base rate.";
                continue;
            }

            if ($quantity <= 0) {
                $errors["cart_items.{$index}.quantity"][] = 'Quantity must be at least 1.';
                continue;
            }

            $serviceKey = Service::normalizeRequirementKey($service->name);

            if (! isset($cart[$serviceKey])) {
                $cart[$serviceKey] = $this->makeCartLine($service, 0);
            }

            $cart[$serviceKey]['quantity'] += $quantity;
        }

        if ($errors !== []) {
            $this->abortBadRequest($errors);
        }

        return $cart;
    }

    public function calculate(array $cart, array $selectedBundleServiceIds = []): array
    {
        if ($cart === []) {
            $this->abortBadRequest([
                'cart_items' => ['At least one base service quantity is required.'],
            ]);
        }

        $remainingCart = collect($cart)->mapWithKeys(fn ($line, $serviceKey) => [$serviceKey => (int) $line['quantity']])->all();
        $baseRateLookup = collect($cart)->mapWithKeys(fn ($line, $serviceKey) => [$serviceKey => (float) $line['rate']]);
        $appliedLines = [];
        $serviceHourlyAllocations = $baseRateLookup->map(fn () => 0.0)->all();

        $bundleServices = Service::query()
            ->bundles()
            ->orderBy('name')
            ->get()
            ->keyBy('id');

        foreach ($selectedBundleServiceIds as $index => $bundleServiceId) {
            $bundle = $bundleServices->get((int) $bundleServiceId);

            if (! $bundle) {
                $this->abortBadRequest([
                    "selected_bundle_service_ids.{$index}" => ['The selected bundle is invalid.'],
                ]);
            }

            $requirements = $bundle->normalizedRequirements();

            if (! $this->cartFitsRequirements($remainingCart, $requirements)) {
                $this->abortBadRequest([
                    "selected_bundle_service_ids.{$index}" => ["{$bundle->name} no longer fits the current cart."],
                ]);
            }

            $this->applyBundleLine(
                $bundle,
                'explicit_selection',
                $requirements,
                $remainingCart,
                $appliedLines,
                $serviceHourlyAllocations,
                $baseRateLookup->all(),
            );
        }

        $priorityBundles = $bundleServices
            ->filter(fn (Service $bundle) => $bundle->manual_priority !== null)
            ->sortByDesc(fn (Service $bundle) => $bundle->manual_priority)
            ->values();

        foreach ($priorityBundles as $bundle) {
            $requirements = $bundle->normalizedRequirements();

            while ($this->cartFitsRequirements($remainingCart, $requirements)) {
                $this->applyBundleLine(
                    $bundle,
                    'admin_override',
                    $requirements,
                    $remainingCart,
                    $appliedLines,
                    $serviceHourlyAllocations,
                    $baseRateLookup->all(),
                );
            }
        }

        $optimizerBundles = $bundleServices
            ->filter(fn (Service $bundle) => $bundle->manual_priority === null)
            ->sortByDesc(fn (Service $bundle) => (float) $bundle->savings_ratio)
            ->values();

        foreach ($optimizerBundles as $bundle) {
            $requirements = $bundle->normalizedRequirements();

            while ($this->cartFitsRequirements($remainingCart, $requirements)) {
                $this->applyBundleLine(
                    $bundle,
                    'best_value',
                    $requirements,
                    $remainingCart,
                    $appliedLines,
                    $serviceHourlyAllocations,
                    $baseRateLookup->all(),
                );
            }
        }

        foreach ($remainingCart as $serviceKey => $quantity) {
            if ($quantity <= 0) {
                continue;
            }

            $cartLine = $cart[$serviceKey];
            $subtotal = round((float) $cartLine['rate'] * $quantity, 2);
            $serviceHourlyAllocations[$serviceKey] = round(($serviceHourlyAllocations[$serviceKey] ?? 0) + $subtotal, 4);

            $appliedLines[] = [
                'type' => 'residual',
                'phase' => 'residual',
                'service_id' => $cartLine['service_id'],
                'service_name' => $cartLine['service_name'],
                'service_key' => $serviceKey,
                'quantity' => $quantity,
                'rate' => round((float) $cartLine['rate'], 2),
                'subtotal' => $subtotal,
                'requirements' => [$serviceKey => $quantity],
                'manual_priority' => null,
                'savings_ratio' => 0.0,
                'is_recommendable' => false,
            ];
        }

        $hourlyRateTotal = round(collect($appliedLines)->sum('subtotal'), 2);

        return [
            'cart' => array_values(array_map(fn (array $line) => [
                'service_id' => $line['service_id'],
                'service_name' => $line['service_name'],
                'service_key' => $line['service_key'],
                'quantity' => $line['quantity'],
                'rate' => round((float) $line['rate'], 2),
            ], $cart)),
            'breakdown' => $appliedLines,
            'remaining_cart' => $remainingCart,
            'service_hourly_allocations' => array_map(fn ($value) => round((float) $value, 4), $serviceHourlyAllocations),
            'hourly_rate_total' => $hourlyRateTotal,
            'total_price' => $hourlyRateTotal,
        ];
    }

    protected function makeCartLine(Service $service, int $quantity): array
    {
        return [
            'service_id' => $service->id,
            'service_name' => $service->name,
            'service_key' => Service::normalizeRequirementKey($service->name),
            'quantity' => $quantity,
            'rate' => round((float) $service->rate, 2),
        ];
    }

    protected function cartFitsRequirements(array $remainingCart, array $requirements): bool
    {
        foreach ($requirements as $serviceKey => $requiredQuantity) {
            if (($remainingCart[$serviceKey] ?? 0) < $requiredQuantity) {
                return false;
            }
        }

        return true;
    }

    protected function applyBundleLine(
        Service $bundle,
        string $phase,
        array $requirements,
        array &$remainingCart,
        array &$appliedLines,
        array &$serviceHourlyAllocations,
        array $baseRateLookup,
    ): void {
        $bundleRate = round((float) $bundle->rate, 2);
        $baseRequirementsTotal = 0.0;

        foreach ($requirements as $serviceKey => $requiredQuantity) {
            $remainingCart[$serviceKey] -= $requiredQuantity;
            $baseRequirementsTotal += round((float) ($baseRateLookup[$serviceKey] ?? 0), 2) * $requiredQuantity;
        }

        foreach ($requirements as $serviceKey => $requiredQuantity) {
            $componentBaseTotal = round((float) ($baseRateLookup[$serviceKey] ?? 0), 2) * $requiredQuantity;
            $share = $baseRequirementsTotal > 0
                ? $bundleRate * ($componentBaseTotal / $baseRequirementsTotal)
                : 0;

            $serviceHourlyAllocations[$serviceKey] = round(($serviceHourlyAllocations[$serviceKey] ?? 0) + $share, 4);
        }

        $lineKey = "{$phase}:{$bundle->id}";
        $existingIndex = collect($appliedLines)->search(
            fn (array $line) => ($line['line_key'] ?? null) === $lineKey,
        );

        if ($existingIndex === false) {
            $appliedLines[] = [
                'line_key' => $lineKey,
                'type' => 'bundle',
                'phase' => $phase,
                'service_id' => $bundle->id,
                'service_name' => $bundle->name,
                'service_key' => Service::normalizeRequirementKey($bundle->name),
                'quantity' => 1,
                'rate' => $bundleRate,
                'subtotal' => $bundleRate,
                'requirements' => $requirements,
                'manual_priority' => $bundle->manual_priority,
                'savings_ratio' => round((float) $bundle->savings_ratio, 4),
                'is_recommendable' => (bool) $bundle->is_recommendable,
            ];

            return;
        }

        $appliedLines[$existingIndex]['quantity']++;
        $appliedLines[$existingIndex]['subtotal'] = round(
            (float) $appliedLines[$existingIndex]['subtotal'] + $bundleRate,
            2,
        );
    }

    protected function abortBadRequest(array $errors): never
    {
        throw new HttpResponseException(response()->json([
            'message' => 'Bad request.',
            'errors' => $errors,
        ], 400));
    }
}
