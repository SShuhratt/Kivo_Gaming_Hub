<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\ValidatesApiRequests;
use App\Http\Controllers\Controller;
use App\Models\Asset;
use App\Models\Service;
use App\Services\ServiceSetupGuard;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class AssetController extends Controller
{
    use ValidatesApiRequests;

    public function index()
    {
        return response()->json(
            Asset::query()
                ->with(['room', 'service'])
                ->orderBy('room_id')
                ->orderBy('service_id')
                ->orderBy('name')
                ->get()
        );
    }

    public function store(Request $request, ServiceSetupGuard $serviceSetupGuard)
    {
        $serviceSetupGuard->ensureServicesExist();

        $validated = $this->validateApi($request, [
            'asset_name' => 'nullable|required_without:name|string|max:255',
            'name' => 'nullable|required_without:asset_name|string|max:255',
            'category_name' => 'nullable|required_without:service_id|string|max:255',
            'service_id' => 'nullable|required_without:category_name|integer|exists:services,id',
            'room_number' => 'nullable|required_without:room_id|string|max:255',
            'room_id' => 'nullable|required_without:room_number|integer|exists:rooms,id',
            'total_usage_duration_minutes' => 'sometimes|integer|min:0',
            'total_earned_money' => 'sometimes|numeric|min:0',
        ]);

        $assetData = $this->resolveAssetData($validated);

        return response()->json(
            Asset::create($assetData)->load(['room', 'service']),
            201,
        );
    }

    public function show(Asset $asset)
    {
        return response()->json($asset->load(['room', 'service']));
    }

    public function update(Request $request, Asset $asset, ServiceSetupGuard $serviceSetupGuard)
    {
        $serviceSetupGuard->ensureServicesExist();

        $validated = $this->validateApi($request, [
            'asset_name' => 'sometimes|string|max:255',
            'name' => 'sometimes|string|max:255',
            'category_name' => 'sometimes|nullable|string|max:255',
            'service_id' => 'sometimes|nullable|integer|exists:services,id',
            'room_number' => 'sometimes|nullable|string|max:255',
            'room_id' => 'sometimes|nullable|integer|exists:rooms,id',
            'total_usage_duration_minutes' => 'sometimes|required|integer|min:0',
            'total_earned_money' => 'sometimes|required|numeric|min:0',
        ]);

        $assetData = $this->resolveAssetData($validated);
        $asset->update($assetData);

        return response()->json($asset->fresh()->load(['room', 'service']));
    }

    protected function resolveAssetData(array $validated): array
    {
        if (isset($validated['service_id']) && $validated['service_id'] !== null) {
            $this->assertBaseServiceSelection((int) $validated['service_id']);
        }

        $data = [
            'name' => $validated['asset_name'] ?? $validated['name'] ?? null,
            'service_id' => $validated['service_id'] ?? null,
            'room_id' => $validated['room_id'] ?? null,
            'total_usage_duration_minutes' => $validated['total_usage_duration_minutes'] ?? 0,
            'total_earned_money' => $validated['total_earned_money'] ?? 0,
        ];

        if (isset($validated['category_name']) && $validated['category_name'] !== '') {
            $service = Service::firstOrCreate(
                ['name' => trim((string) $validated['category_name'])],
                ['rate' => null, 'requirements' => null],
            );
            $data['service_id'] = $service->id;
        }

        if (isset($validated['room_number']) && $validated['room_number'] !== '') {
            $roomName = is_numeric($validated['room_number']) 
                ? 'Xona ' . $validated['room_number'] 
                : $validated['room_number'];
            $room = \App\Models\Room::firstOrCreate(['name' => $roomName]);
            $data['room_id'] = $room->id;
        }

        return array_filter($data, fn($v) => $v !== null);
    }

    protected function assertBaseServiceSelection(int $serviceId): void
    {
        $service = Service::query()->find($serviceId);

        if ($service && $service->is_bundle) {
            $this->abortBadRequest([
                'service_id' => ['Assets can only be linked to base services, not bundles.'],
            ]);
        }
    }

    public function destroy(Asset $asset)
    {
        try {
            $asset->delete();

            return response()->json(null, 204);
        } catch (\Throwable $e) {
            Log::error('Failed to delete asset', [
                'asset_id' => $asset->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'message' => 'Failed to delete asset.',
            ], 500);
        }
    }
}
