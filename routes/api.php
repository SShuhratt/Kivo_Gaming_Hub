<?php

use App\Http\Controllers\Api\{
    AssetController,
    AuthController,
    BookingController,
    DashboardController,
    ManufacturerController,
    ServiceController,
    TariffController,
    TradeController,
    WarehouseController
};
use Illuminate\Support\Facades\Route;

// Auth Routes
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

// Protected Routes
Route::middleware('api.token')->group(function () {
    
    // Dashboard
    Route::get('/dashboard/bootstrap', [DashboardController::class, 'bootstrap'])
        ->defaults('openapiOperation', 'getDashboardBootstrap');

    // Finance/Trades
    Route::get('/trades', [TradeController::class, 'index'])
        ->defaults('openapiOperation', 'listTrades');

    // Assets CRUD
    Route::get('/assets', [AssetController::class, 'index'])
        ->defaults('openapiOperation', 'listAssets');
    Route::post('/assets', [AssetController::class, 'store'])
        ->defaults('openapiOperation', 'createAsset');
    Route::get('/assets/{asset}', [AssetController::class, 'show'])
        ->defaults('openapiOperation', 'getAsset');
    Route::put('/assets/{asset}', [AssetController::class, 'update'])
        ->defaults('openapiOperation', 'replaceAsset');
    Route::patch('/assets/{asset}', [AssetController::class, 'update'])
        ->defaults('openapiOperation', 'updateAsset');
    Route::delete('/assets/{asset}', [AssetController::class, 'destroy'])
        ->defaults('openapiOperation', 'deleteAsset');

    // Warehouse CRUD
    Route::get('/warehouse', [WarehouseController::class, 'index'])
        ->defaults('openapiOperation', 'listWarehouseItems');
    Route::post('/warehouse', [WarehouseController::class, 'store'])
        ->defaults('openapiOperation', 'createWarehouseItem');
    Route::get('/warehouse/{warehouse}', [WarehouseController::class, 'show'])
        ->defaults('openapiOperation', 'getWarehouseItem');
    Route::put('/warehouse/{warehouse}', [WarehouseController::class, 'update'])
        ->defaults('openapiOperation', 'replaceWarehouseItem');
    Route::patch('/warehouse/{warehouse}', [WarehouseController::class, 'update'])
        ->defaults('openapiOperation', 'updateWarehouseItem');
    Route::delete('/warehouse/{warehouse}', [WarehouseController::class, 'destroy'])
        ->defaults('openapiOperation', 'deleteWarehouseItem');
    Route::delete('/manufacturers/{manufacturer}', [ManufacturerController::class, 'destroy'])
        ->defaults('openapiOperation', 'deleteManufacturer');

    // Services CRUD
    Route::get('/services', [ServiceController::class, 'index'])
        ->defaults('openapiOperation', 'listServices');
    Route::post('/services', [ServiceController::class, 'store'])
        ->defaults('openapiOperation', 'createService');
    Route::get('/services/{service}', [ServiceController::class, 'show'])
        ->defaults('openapiOperation', 'getService');
    Route::put('/services/{service}', [ServiceController::class, 'update'])
        ->defaults('openapiOperation', 'replaceService');
    Route::patch('/services/{service}', [ServiceController::class, 'update'])
        ->defaults('openapiOperation', 'updateService');
    Route::delete('/services/{service}', [ServiceController::class, 'destroy'])
        ->defaults('openapiOperation', 'deleteService');

    // Bookings
    Route::get('/bookings', [BookingController::class, 'index'])
        ->defaults('openapiOperation', 'listBookings');
    Route::post('/bookings/calculate', [BookingController::class, 'calculate'])
        ->defaults('openapiOperation', 'calculateBooking');
    Route::post('/bookings', [BookingController::class, 'store'])
        ->defaults('openapiOperation', 'createBooking');
    Route::get('/bookings/{booking}', [BookingController::class, 'show'])
        ->defaults('openapiOperation', 'getBooking');
    Route::put('/bookings/{booking}', [BookingController::class, 'update'])
        ->defaults('openapiOperation', 'replaceBooking');
    Route::patch('/bookings/{booking}', [BookingController::class, 'update'])
        ->defaults('openapiOperation', 'updateBooking');
    Route::delete('/bookings/{booking}', [BookingController::class, 'destroy'])
        ->defaults('openapiOperation', 'deleteBooking');

    // Tariffs CRUD
    Route::get('/tariffs', [TariffController::class, 'index'])
        ->defaults('openapiOperation', 'listTariffs');
    Route::post('/tariffs', [TariffController::class, 'store'])
        ->defaults('openapiOperation', 'createTariff');
    Route::get('/tariffs/{tariff}', [TariffController::class, 'show'])
        ->defaults('openapiOperation', 'getTariff');
    Route::put('/tariffs/{tariff}', [TariffController::class, 'update'])
        ->defaults('openapiOperation', 'replaceTariff');
    Route::patch('/tariffs/{tariff}', [TariffController::class, 'update'])
        ->defaults('openapiOperation', 'updateTariff');
    Route::delete('/tariffs/{tariff}', [TariffController::class, 'destroy'])
        ->defaults('openapiOperation', 'deleteTariff');
});
