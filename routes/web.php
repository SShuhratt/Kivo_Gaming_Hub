<?php

use App\Http\Controllers\ApiDocsController;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/api-docs', [ApiDocsController::class, 'index']);
Route::get('/docs/openapi.json', function () {
    $path = base_path('docs/openapi.json');

    abort_unless(File::exists($path), 404, 'OpenAPI spec not found.');

    return response()->file($path, [
        'Content-Type' => 'application/json',
    ]);
});
