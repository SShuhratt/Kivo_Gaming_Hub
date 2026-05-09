<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Manufacturer;
use Illuminate\Support\Facades\Log;

class ManufacturerController extends Controller
{
    public function destroy(Manufacturer $manufacturer)
    {
        if ($manufacturer->warehouseItems()->exists()) {
            return response()->json([
                'message' => 'Delete the manufacturer only after deleting all of its products.',
                'message_uz' => "Bu ishlab chiqaruvchiga tegishli mahsulotlar mavjud. Avval mahsulotlarni o'chiring.",
            ], 409);
        }

        try {
            $manufacturer->delete();

            return response()->json(null, 204);
        } catch (\Throwable $e) {
            Log::error('Failed to delete manufacturer', [
                'manufacturer_id' => $manufacturer->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'message' => 'Failed to delete manufacturer.',
                'message_uz' => "Ishlab chiqaruvchini o'chirib bo'lmadi.",
            ], 500);
        }
    }
}
