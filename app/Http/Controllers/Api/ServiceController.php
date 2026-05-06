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
        );
    }

    public function store(Request $request)
    {
        $validated = $this->validateApi($request, [
            'name' => 'required|string|max:255',
            'price' => 'required|numeric|min:0',
        ]);

        return response()->json(Service::create($validated)->loadCount('assets'), 201);
    }

    public function show(Service $service)
    {
        return response()->json($service->loadCount('assets'));
    }

    public function update(Request $request, Service $service)
    {
        $validated = $this->validateApi($request, [
            'name' => 'sometimes|required|string|max:255',
            'price' => 'sometimes|required|numeric|min:0',
        ]);

        $service->update($validated);

        return response()->json($service->fresh()->loadCount('assets'));
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
}
