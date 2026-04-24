<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Service;
use Illuminate\Http\Request;

class ServiceController extends Controller
{
    public function index() { return response()->json(Service::all()); }
    public function store(Request $request) { return response()->json(Service::create($request->all()), 201); }
    public function show(Service $service) { return response()->json($service); }
    public function update(Request $request, Service $service) { $service->update($request->all()); return response()->json($service); }
    public function destroy(Service $service) { $service->delete(); return response()->json(null, 204); }
}
