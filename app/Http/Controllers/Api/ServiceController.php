<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\ValidatesApiRequests;
use App\Http\Controllers\Controller;
use App\Models\Service;
use Illuminate\Http\Request;

class ServiceController extends Controller
{
    use ValidatesApiRequests;

    public function index() { return response()->json(Service::all()); }

    public function store(Request $request)
    {
        $validated = $this->validateApi($request, [
            'game_name' => 'required|string',
            'room_id' => 'required|integer',
        ]);

        return response()->json(Service::create($validated), 201);
    }

    public function show(Service $service) { return response()->json($service); }

    public function update(Request $request, Service $service)
    {
        $validated = $this->validateApi($request, [
            'game_name' => 'sometimes|required|string',
            'room_id' => 'sometimes|required|integer',
        ]);

        $service->update($validated);

        return response()->json($service);
    }

    public function destroy(Service $service) { $service->delete(); return response()->json(null, 204); }
}
