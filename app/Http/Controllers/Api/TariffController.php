<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Tariff;
use Illuminate\Http\Request;

class TariffController extends Controller
{
    public function index() { return response()->json(Tariff::all()); }
    public function store(Request $request) { return response()->json(Tariff::create($request->all()), 201); }
    public function show(Tariff $tariff) { return response()->json($tariff); }
    public function update(Request $request, Tariff $tariff) { $tariff->update($request->all()); return response()->json($tariff); }
    public function destroy(Tariff $tariff) { $tariff->delete(); return response()->json(null, 204); }
}
