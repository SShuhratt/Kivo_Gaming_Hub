<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Asset;
use Illuminate\Http\Request;

class AssetController extends Controller
{
    public function index() { return response()->json(Asset::all()); }
    public function store(Request $request) { return response()->json(Asset::create($request->all()), 201); }
    public function show(Asset $asset) { return response()->json($asset); }
    public function update(Request $request, Asset $asset) { $asset->update($request->all()); return response()->json($asset); }
    public function destroy(Asset $asset) { $asset->delete(); return response()->json(null, 204); }
}
