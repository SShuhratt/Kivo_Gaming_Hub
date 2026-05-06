<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\ValidatesApiRequests;
use App\Http\Controllers\Controller;
use App\Models\Asset;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class AssetController extends Controller
{
    use ValidatesApiRequests;

    public function index() { return response()->json(Asset::with(['room', 'service'])->get()); }

    public function store(Request $request)
    {
        $validated = $this->validateApi($request, [
            'name' => 'required|string|max:255',
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
            'category' => 'required|string|max:255',
            'room_id' => 'required|integer',
=======
            'service_id' => 'required|integer|exists:services,id',
            'room_id' => 'required|integer|exists:rooms,id',
>>>>>>> theirs
=======
            'service_id' => 'required|integer|exists:services,id',
            'room_id' => 'required|integer|exists:rooms,id',
>>>>>>> theirs
=======
            'service_id' => 'required|integer|exists:services,id',
            'room_id' => 'required|integer|exists:rooms,id',
>>>>>>> theirs
=======
            'service_id' => 'required|integer|exists:services,id',
            'room_id' => 'required|integer|exists:rooms,id',
>>>>>>> theirs
            'total_usage_duration_minutes' => 'sometimes|integer|min:0',
            'total_earned_money' => 'sometimes|numeric|min:0',
        ]);

        return response()->json(Asset::create($validated)->load(['room', 'service']), 201);
    }

    public function show(Asset $asset) { return response()->json($asset->load(['room', 'service'])); }

    public function update(Request $request, Asset $asset)
    {
        $validated = $this->validateApi($request, [
            'name' => 'sometimes|required|string|max:255',
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
            'category' => 'sometimes|required|string|max:255',
            'room_id' => 'sometimes|required|integer',
=======
            'service_id' => 'sometimes|required|integer|exists:services,id',
            'room_id' => 'sometimes|required|integer|exists:rooms,id',
>>>>>>> theirs
=======
            'service_id' => 'sometimes|required|integer|exists:services,id',
            'room_id' => 'sometimes|required|integer|exists:rooms,id',
>>>>>>> theirs
=======
            'service_id' => 'sometimes|required|integer|exists:services,id',
            'room_id' => 'sometimes|required|integer|exists:rooms,id',
>>>>>>> theirs
=======
            'service_id' => 'sometimes|required|integer|exists:services,id',
            'room_id' => 'sometimes|required|integer|exists:rooms,id',
>>>>>>> theirs
            'total_usage_duration_minutes' => 'sometimes|required|integer|min:0',
            'total_earned_money' => 'sometimes|required|numeric|min:0',
        ]);

        $asset->update($validated);

        return response()->json($asset->load(['room', 'service']));
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
