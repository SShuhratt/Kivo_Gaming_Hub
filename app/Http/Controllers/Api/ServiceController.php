<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\ValidatesApiRequests;
use App\Http\Controllers\Controller;
use App\Models\Service;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class ServiceController extends Controller
{
    use ValidatesApiRequests;

    public function index()
    {
        return response()->json(
            Service::query()
                ->withCount('assets')
                ->orderBy('name')
                ->get()
                ->map(fn (Service $service) => $this->formatService($service))
                ->values(),
        );
    }

    public function store(Request $request)
    {
        try {
            Log::info('Creating service', ['payload' => $request->all()]);
            $validated = $this->validateApi($request, $this->rules());

            $service = Service::create($this->payloadFromValidation($validated))->loadCount('assets');

            return response()->json($this->formatService($service), 201);
        } catch (\Throwable $e) {
            Log::error('Failed to create service', [
                'error' => $e->getMessage(),
                'payload' => $request->all(),
            ]);
            throw $e;
        }
    }

    public function show(Service $service)
    {
        return response()->json($this->formatService($service->loadCount('assets')));
    }

    public function update(Request $request, Service $service)
    {
        try {
            Log::info('Updating service', ['id' => $service->id, 'payload' => $request->all()]);
            $validated = $this->validateApi($request, $this->rules(false));

            $service->update($this->payloadFromValidation($validated));

            return response()->json($this->formatService($service->fresh()->loadCount('assets')));
        } catch (\Throwable $e) {
            Log::error('Failed to update service', [
                'service_id' => $service->id,
                'error' => $e->getMessage(),
                'payload' => $request->all(),
            ]);
            throw $e;
        }
    }

    public function destroy(Service $service)
    {
        if ($service->assets()->exists()) {
            return response()->json([
                'message' => 'Delete or reassign assets before deleting this service.',
            ], 409);
        }

        try {
            $service->delete();

            return response()->json(null, 204);
        } catch (\Throwable $e) {
            Log::error('Failed to delete service', [
                'service_id' => $service->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'message' => 'Failed to delete service.',
            ], 500);
        }
    }

    protected function rules(bool $isCreate = true): array
    {
        $rateRule = $isCreate
            ? 'nullable|required_without:price|numeric|min:0'
            : 'sometimes|nullable|required_without:price|numeric|min:0';
        $priceRule = $isCreate
            ? 'nullable|required_without:rate|numeric|min:0'
            : 'sometimes|nullable|required_without:rate|numeric|min:0';

        return [
            'name' => $isCreate ? 'required|string|max:255' : 'sometimes|required|string|max:255',
            'rate' => $rateRule,
            'price' => $priceRule,
            'requirements' => 'sometimes|nullable|array',
            'requirements.*' => 'integer|min:1',
            'manual_priority' => 'sometimes|nullable|integer',
            'is_recommendable' => 'sometimes|boolean',
        ];
    }

    protected function payloadFromValidation(array $validated): array
    {
        $rate = array_key_exists('rate', $validated)
            ? $validated['rate']
            : ($validated['price'] ?? null);

        $payload = [];

        if (array_key_exists('name', $validated)) {
            $payload['name'] = trim((string) $validated['name']);
        }

        if ($rate !== null) {
            $payload['rate'] = round((float) $rate, 2);
        }

        if (array_key_exists('requirements', $validated)) {
            $payload['requirements'] = $validated['requirements'];
        }

        if (array_key_exists('manual_priority', $validated)) {
            $payload['manual_priority'] = $validated['manual_priority'];
        }

        if (array_key_exists('is_recommendable', $validated)) {
            $payload['is_recommendable'] = (bool) $validated['is_recommendable'];
        }

        return $payload;
    }

    protected function formatService(Service $service): array
    {
        return [
            'id' => $service->id,
            'name' => $service->name,
            'rate' => $service->rate,
            'price' => $service->rate,
            'requirements' => $service->requirements ?? [],
            'manual_priority' => $service->manual_priority,
            'savings_ratio' => (float) $service->savings_ratio,
            'is_recommendable' => (bool) $service->is_recommendable,
            'is_bundle' => (bool) $service->is_bundle,
            'assets_count' => $service->assets_count ?? $service->assets()->count(),
        ];
    }
}
