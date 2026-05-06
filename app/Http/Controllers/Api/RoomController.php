<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\ValidatesApiRequests;
use App\Http\Controllers\Controller;
use App\Models\Room;
use App\Services\ServiceSetupGuard;
use Illuminate\Http\Request;

class RoomController extends Controller
{
    use ValidatesApiRequests;

    public function index()
    {
        return response()->json(
            Room::query()
                ->with(['assets.room', 'assets.service'])
                ->orderBy('name')
                ->get()
        );
    }

    public function store(Request $request, ServiceSetupGuard $serviceSetupGuard)
    {
        $serviceSetupGuard->ensureServicesExist();

        $validated = $this->validateApi($request, [
            'name' => 'required|string|max:255',
        ]);

        return response()->json(Room::create($validated), 201);
    }

    public function show(Room $room)
    {
        return response()->json($room->load(['assets.room', 'assets.service']));
    }

    public function update(Request $request, Room $room)
    {
        $validated = $this->validateApi($request, [
            'name' => 'sometimes|required|string|max:255',
        ]);

        $room->update($validated);

        return response()->json($room);
    }

    public function destroy(Room $room)
    {
        if ($room->assets()->exists()) {
            return response()->json([
                'message' => 'This room has assets. Delete its assets first.',
                'message_uz' => 'Bu xonada jihozlar bor. Avval jihozlarni o\'chiring.',
            ], 409);
        }

        $room->delete();

        return response()->json(null, 204);
    }

    public function destroyAssets(Room $room)
    {
        $deletedAssetsCount = $room->assets()->count();
        $room->assets()->delete();

        return response()->json([
            'message' => 'All assets in this room have been deleted.',
            'message_uz' => 'Ushbu xonadagi barcha jihozlar o\'chirildi.',
            'deleted_assets_count' => $deletedAssetsCount,
        ]);
    }
}
