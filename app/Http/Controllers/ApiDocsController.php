<?php

namespace App\Http\Controllers;

use App\Services\OpenApiSpec;
use Illuminate\Contracts\View\View;
use Illuminate\Http\JsonResponse;

class ApiDocsController extends Controller
{
    public function index(): View
    {
        return view('api-docs', [
            'specUrl' => url('/docs/openapi.json'),
        ]);
    }

    public function spec(OpenApiSpec $spec): JsonResponse
    {
        return response()->json($spec->toArray());
    }
}
