<?php

use App\Http\Controllers\Api\{AuthController, AssetController, WarehouseController, TariffController, ServiceController, BookingController, TradeController};
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    // Auth API
    Route::post('/auth/register', [AuthController::class, 'register']);
    Route::post('/auth/login', [AuthController::class, 'login']);
    Route::post('/auth/forgot-password', [AuthController::class, 'forgotPassword']);
    Route::post('/auth/verify-otp', [AuthController::class, 'verifyOtp']);
    Route::post('/auth/reset-password', [AuthController::class, 'resetPassword']);

    // CRUD APIs
    Route::apiResource('assets', AssetController::class);
    Route::apiResource('warehouse', WarehouseController::class);
    Route::apiResource('services', ServiceController::class);
    Route::apiResource('tariffs', TariffController::class);

    // Booking Engine
    Route::post('/bookings/calculate', [BookingController::class, 'calculate']);
    Route::post('/bookings', [BookingController::class, 'store']);

    // Trade & Finance
    Route::get('/trades', [TradeController::class, 'index']);
});
