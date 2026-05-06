<?php

namespace App\Observers;

use App\Models\Service;
use Illuminate\Support\Facades\Log;

class ServiceObserver
{
    public function saving(Service $service): void
    {
        try {
            $normalizedRequirements = $service->normalizedRequirements();
            $service->requirements = $normalizedRequirements === [] ? null : $normalizedRequirements;
            $service->manual_priority = $service->manual_priority !== null && $service->manual_priority !== ''
                ? (int) $service->manual_priority
                : null;
            $service->savings_ratio = $this->calculateSavingsRatio($service, $normalizedRequirements);
        } catch (\Throwable $e) {
            Log::error('ServiceObserver failed', [
                'service_id' => $service->id,
                'name' => $service->name,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            throw $e;
        }
    }

    protected function calculateSavingsRatio(Service $service, array $normalizedRequirements): float
    {
        if ($normalizedRequirements === []) {
            return 0.0;
        }

        $baseRateLookup = Service::query()
            ->baseServices()
            ->get()
            ->mapWithKeys(fn (Service $baseService) => [
                Service::normalizeRequirementKey($baseService->name) => $baseService->rate,
            ]);

        $baseTotal = 0.0;

        foreach ($normalizedRequirements as $requirementKey => $quantity) {
            $rate = $baseRateLookup->get($requirementKey);

            if ($rate === null) {
                return 0.0;
            }

            $baseTotal += round((float) $rate, 2) * $quantity;
        }

        $bundleRate = $service->rate;

        if ($baseTotal <= 0 || $bundleRate === null) {
            return 0.0;
        }

        return round(1 - (round((float) $bundleRate, 2) / $baseTotal), 4);
    }
}
