<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\ValidatesApiRequests;
use App\Http\Controllers\Controller;
use App\Models\Warehouse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class WarehouseController extends Controller
{
    use ValidatesApiRequests;

    public function index() { return response()->json(Warehouse::all()); }

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

        $warehouse = Warehouse::create($validated);

        return response()->json($warehouse, 201);
    }

    public function show(Warehouse $warehouse) { return response()->json($warehouse); }

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

        $warehouse->update($validated);

        return response()->json($warehouse);
    }

    public function destroy(Warehouse $warehouse)
    {
        $warehouse->delete();
        return response()->json(null, 204);
    }
}
