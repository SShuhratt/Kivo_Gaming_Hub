<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\ValidatesApiRequests;
use App\Http\Controllers\Controller;
use App\Models\Asset;
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
            'name' => 'required|string|max:255',
            'service_id' => 'required|integer|exists:services,id',
            'room_id' => 'required|integer|exists:rooms,id',
            'total_usage_duration_minutes' => 'sometimes|integer|min:0',
            'total_earned_money' => 'sometimes|numeric|min:0',
        ]);

        return response()->json(
            Asset::create($validated)->load(['room', 'service']),
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
            'name' => 'sometimes|required|string|max:255',
            'service_id' => 'sometimes|required|integer|exists:services,id',
            'room_id' => 'sometimes|required|integer|exists:rooms,id',
            'total_usage_duration_minutes' => 'sometimes|required|integer|min:0',
            'total_earned_money' => 'sometimes|required|numeric|min:0',
        ]);

        $asset->update($validated);

        return response()->json($asset->fresh()->load(['room', 'service']));
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
