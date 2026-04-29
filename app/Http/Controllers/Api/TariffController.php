<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\ValidatesApiRequests;
use App\Http\Controllers\Controller;
use App\Models\Tariff;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class TariffController extends Controller
{
    use ValidatesApiRequests;

    public function index() { return response()->json(Tariff::all()); }

    public function store(Request $request)
    {
        $validated = $this->validateApi($request, [
            'name' => 'required|string',
            'hourly_cost' => 'required|numeric|min:0',
        ]);

        return response()->json(Tariff::create($validated), 201);
    }

    public function show(Tariff $tariff) { return response()->json($tariff); }

    public function update(Request $request, Tariff $tariff)
    {
        $validated = $this->validateApi($request, [
            'name' => 'sometimes|required|string',
            'hourly_cost' => 'sometimes|required|numeric|min:0',
        ]);

        $tariff->update($validated);

        return response()->json($tariff);
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
}
