<?php

use App\Http\Controllers\Api\{
    AssetController,
    AuthController,
    BookingController,
    DashboardController,
    ServiceController,
    TariffController,
    TradeController,
    WarehouseController
};
use Illuminate\Support\Facades\Route;

Route::get('/auth/db-test', function () {
    try {
        \Illuminate\Support\Facades\DB::connection()->getPdo();
        return response()->json(['status' => 'connected', 'database' => \Illuminate\Support\Facades\DB::connection()->getDatabaseName()]);
    } catch (\Exception $e) {
        return response()->json(['status' => 'error', 'message' => $e->getMessage()], 500);
    }
});

Route::post('/auth/register', [AuthController::class, 'register'])
    ->defaults('openapiOperation', 'registerUser');
Route::post('/auth/login', [AuthController::class, 'login'])
    ->defaults('openapiOperation', 'loginUser');
Route::post('/auth/forgot-password', [AuthController::class, 'forgotPassword'])
    ->defaults('openapiOperation', 'forgotPassword');
Route::post('/auth/verify-otp', [AuthController::class, 'verifyOtp'])
    ->defaults('openapiOperation', 'verifyOtp');
Route::post('/auth/reset-password', [AuthController::class, 'resetPassword'])
    ->defaults('openapiOperation', 'resetPassword');

Route::middleware('api.token')->group(function () {
    Route::get('/dashboard/bootstrap', [DashboardController::class, 'bootstrap'])
        ->defaults('openapiOperation', 'getDashboardBootstrap');

    Route::get('/assets', [AssetController::class, 'index'])
        ->defaults('openapiOperation', 'listAssets');
    Route::post('/assets', [AssetController::class, 'store'])
        ->defaults('openapiOperation', 'createAsset');
    Route::get('/assets/{asset}', [AssetController::class, 'show'])
        ->defaults('openapiOperation', 'getAsset');
    Route::put('/assets/{asset}', [AssetController::class, 'update'])
        ->defaults('openapiOperation', 'updateAsset');
    Route::delete('/assets/{asset}', [AssetController::class, 'destroy'])
        ->defaults('openapiOperation', 'deleteAsset');

    Route::get('/warehouse', [WarehouseController::class, 'index'])
        ->defaults('openapiOperation', 'listWarehouse');
    Route::post('/warehouse', [WarehouseController::class, 'store'])
        ->defaults('openapiOperation', 'createWarehouse');
    Route::get('/warehouse/{warehouse}', [WarehouseController::class, 'show'])
        ->defaults('openapiOperation', 'getWarehouse');
    Route::put('/warehouse/{warehouse}', [WarehouseController::class, 'update'])
        ->defaults('openapiOperation', 'updateWarehouse');
    Route::delete('/warehouse/{warehouse}', [WarehouseController::class, 'destroy'])
        ->defaults('openapiOperation', 'deleteWarehouse');

    Route::get('/services', [ServiceController::class, 'index'])
        ->defaults('openapiOperation', 'listServices');
    Route::post('/services', [ServiceController::class, 'store'])
        ->defaults('openapiOperation', 'createService');
    Route::get('/services/{service}', [ServiceController::class, 'show'])
        ->defaults('openapiOperation', 'getService');
    Route::put('/services/{service}', [ServiceController::class, 'update'])
        ->defaults('openapiOperation', 'updateService');
    Route::delete('/services/{service}', [ServiceController::class, 'destroy'])
        ->defaults('openapiOperation', 'deleteService');

    Route::get('/bookings', [BookingController::class, 'index'])
        ->defaults('openapiOperation', 'listBookings');
    Route::post('/bookings', [BookingController::class, 'store'])
        ->defaults('openapiOperation', 'createBooking');
    Route::get('/bookings/{booking}', [BookingController::class, 'show'])
        ->defaults('openapiOperation', 'getBooking');
    Route::put('/bookings/{booking}', [BookingController::class, 'update'])
        ->defaults('openapiOperation', 'updateBooking');
    Route::delete('/bookings/{booking}', [BookingController::class, 'destroy'])
        ->defaults('openapiOperation', 'deleteBooking');

    Route::get('/tariffs', [TariffController::class, 'index'])
        ->defaults('openapiOperation', 'listTariffs');
    Route::post('/tariffs', [TariffController::class, 'store'])
        ->defaults('openapiOperation', 'createTariff');
    Route::get('/tariffs/{tariff}', [TariffController::class, 'show'])
        ->defaults('openapiOperation', 'getTariff');
    Route::put('/tariffs/{tariff}', [TariffController::class, 'update'])
        ->defaults('openapiOperation', 'updateTariff');
    Route::delete('/tariffs/{tariff}', [TariffController::class, 'destroy'])
        ->defaults('openapiOperation', 'deleteTariff');
});
