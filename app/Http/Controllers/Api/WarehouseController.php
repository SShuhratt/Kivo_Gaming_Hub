<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\ValidatesApiRequests;
use App\Http\Controllers\Controller;
use App\Models\Manufacturer;
use App\Models\Warehouse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;

class WarehouseController extends Controller
{
    use ValidatesApiRequests;

    public function index()
    {
        return response()->json(Warehouse::query()->with('manufacturerRecord')->get());
    }

    public function store(Request $request)
    {
        $validated = $this->validateApi($request, [
            'manufacturer' => 'required|string',
            'product_name' => 'required|string',
            'shtrix_code' => 'required|string|unique:warehouse,shtrix_code',
            'unit' => 'required|in:bottle,box,container,bag',
            'count' => 'required|integer|min:0',
            'purchase_price' => 'required|numeric|min:0',
            'sell_price' => 'required|numeric|min:0',
        ]);

        $warehouse = DB::transaction(function () use ($validated) {
            $manufacturer = Manufacturer::firstOrCreate([
                'name' => trim($validated['manufacturer']),
            ]);

            return Warehouse::create([
                ...$validated,
                'manufacturer' => $manufacturer->name,
                'manufacturer_id' => $manufacturer->id,
            ]);
        });

        return response()->json($warehouse, 201);
    }

    public function show(Warehouse $warehouse)
    {
        return response()->json($warehouse->load('manufacturerRecord'));
    }

    public function update(Request $request, Warehouse $warehouse)
    {
        $validated = $this->validateApi($request, [
            'manufacturer' => 'sometimes|required|string',
            'product_name' => 'sometimes|required|string',
            'shtrix_code' => [
                'sometimes',
                'required',
                'string',
                Rule::unique('warehouse', 'shtrix_code')->ignore($warehouse->id),
            ],
            'unit' => 'sometimes|required|in:bottle,box,container,bag',
            'count' => 'sometimes|required|integer|min:0',
            'purchase_price' => 'sometimes|required|numeric|min:0',
            'sell_price' => 'sometimes|required|numeric|min:0',
        ]);

        $warehouse = DB::transaction(function () use ($validated, $warehouse) {
            if (array_key_exists('manufacturer', $validated)) {
                $manufacturer = Manufacturer::firstOrCreate([
                    'name' => trim($validated['manufacturer']),
                ]);

                $validated['manufacturer'] = $manufacturer->name;
                $validated['manufacturer_id'] = $manufacturer->id;
            }

            $warehouse->update($validated);

            return $warehouse;
        });

        return response()->json($warehouse);
    }

    public function destroy(Warehouse $warehouse)
    {
        try {
            $warehouse->delete();

            return response()->json(null, 204);
        } catch (\Throwable $e) {
            Log::error('Failed to delete warehouse product', [
                'warehouse_id' => $warehouse->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'message' => 'Failed to delete warehouse product.',
            ], 500);
        }
    }
}
