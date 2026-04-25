<?php

use App\Http\Controllers\ApiDocsController;
use Illuminate\Session\Middleware\StartSession;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
})->withoutMiddleware([StartSession::class]);

Route::get('/api-docs', [ApiDocsController::class, 'index'])
    ->withoutMiddleware([StartSession::class]);
Route::get('/docs/openapi.json', [ApiDocsController::class, 'spec'])
    ->withoutMiddleware([StartSession::class]);
Route::get('/docs/openapi_final.json', [ApiDocsController::class, 'spec'])
    ->withoutMiddleware([StartSession::class]);
