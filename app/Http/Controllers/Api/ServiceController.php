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

    public function index() { return response()->json(Service::all()); }

    public function store(Request $request)
    {
        $validated = $this->validateApi($request, [
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
            'game_name' => 'required|string',
            'room_id' => 'required|integer',
            'cost' => 'required|numeric|min:0',
=======
            'name' => 'required|string|max:255',
            'price' => 'required|numeric|min:0',
>>>>>>> theirs
=======
            'name' => 'required|string|max:255',
            'price' => 'required|numeric|min:0',
>>>>>>> theirs
=======
            'name' => 'required|string|max:255',
            'price' => 'required|numeric|min:0',
>>>>>>> theirs
=======
            'name' => 'required|string|max:255',
            'price' => 'required|numeric|min:0',
>>>>>>> theirs
        ]);

        return response()->json(Service::create($validated), 201);
    }

    public function show(Service $service) { return response()->json($service); }

    public function update(Request $request, Service $service)
    {
        $validated = $this->validateApi($request, [
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
            'game_name' => 'sometimes|required|string',
            'room_id' => 'sometimes|required|integer',
            'cost' => 'sometimes|required|numeric|min:0',
=======
            'name' => 'sometimes|required|string|max:255',
            'price' => 'sometimes|required|numeric|min:0',
>>>>>>> theirs
=======
            'name' => 'sometimes|required|string|max:255',
            'price' => 'sometimes|required|numeric|min:0',
>>>>>>> theirs
=======
            'name' => 'sometimes|required|string|max:255',
            'price' => 'sometimes|required|numeric|min:0',
>>>>>>> theirs
=======
            'name' => 'sometimes|required|string|max:255',
            'price' => 'sometimes|required|numeric|min:0',
>>>>>>> theirs
        ]);

        $service->update($validated);

        return response()->json($service);
    }

    public function destroy(Service $service)
    {
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
