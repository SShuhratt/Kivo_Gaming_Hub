<?php

use App\Http\Controllers\ApiDocsController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/api-docs', [ApiDocsController::class, 'index']);
Route::get('/docs/openapi.json', [ApiDocsController::class, 'spec']);
Route::get('/docs/openapi_final.json', [ApiDocsController::class, 'spec']);
