<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Warehouse;
use Illuminate\Http\Request;

class WarehouseController extends Controller
{
    public function index() { return response()->json(Warehouse::all()); }

    public function store(Request $request)
    {
        $warehouse = Warehouse::create($request->all());
        return response()->json($warehouse, 201);
    }

    public function show(Warehouse $warehouse) { return response()->json($warehouse); }

    public function update(Request $request, Warehouse $warehouse)
    {
        $warehouse->update($request->all());
        return response()->json($warehouse);
    }

    public function destroy(Warehouse $warehouse)
    {
        $warehouse->delete();
        return response()->json(null, 204);
    }
}
