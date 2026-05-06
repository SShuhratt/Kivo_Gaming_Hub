<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\ValidatesApiRequests;
use App\Http\Controllers\Controller;
use App\Models\Room;
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

    public function store(Request $request)
    {
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
                'message' => 'Delete or move room assets before deleting this room.',
            ], 409);
        }

        $room->delete();

        return response()->json(null, 204);
    }
}
