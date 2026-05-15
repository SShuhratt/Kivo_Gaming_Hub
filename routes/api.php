<?php

use App\Http\Controllers\Api\AssetController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BookingController;
use App\Http\Controllers\Api\CheckoutSaleController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\ManufacturerController;
use App\Http\Controllers\Api\RoomController;
use App\Http\Controllers\Api\ServiceController;
use App\Http\Controllers\Api\TestMailController;
use App\Http\Controllers\Api\TradeController;
use App\Http\Controllers\Api\WarehouseController;
use Illuminate\Support\Facades\Route;

Route::post('/auth/register', [AuthController::class, 'register'])
    ->defaults('openapiOperation', 'registerUser');
Route::post('/auth/login', [AuthController::class, 'login'])
    ->defaults('openapiOperation', 'loginUser');
Route::post('/auth/verify-registration-otp', [AuthController::class, 'verifyRegistrationOtp'])
    ->middleware('throttle:6,1')
    ->defaults('openapiOperation', 'verifyRegistrationOtp');
Route::post('/auth/resend-registration-otp', [AuthController::class, 'resendRegistrationOtp'])
    ->middleware('throttle:3,1')
    ->defaults('openapiOperation', 'resendRegistrationOtp');
Route::post('/auth/forgot-password/send-otp', [AuthController::class, 'sendForgotPasswordOtp'])
    ->middleware('throttle:3,1')
    ->defaults('openapiOperation', 'sendForgotPasswordOtp');
Route::post('/auth/forgot-password/verify-otp', [AuthController::class, 'verifyForgotPasswordOtp'])
    ->middleware('throttle:6,1')
    ->defaults('openapiOperation', 'verifyForgotPasswordOtp');
Route::post('/auth/forgot-password/reset', [AuthController::class, 'resetForgotPassword'])
    ->middleware('throttle:6,1')
    ->defaults('openapiOperation', 'resetForgotPassword');
Route::post('/auth/test-mail', TestMailController::class)
    ->defaults('openapiOperation', 'sendTestMail');

Route::middleware('api.token')->group(function () {
    Route::get('/dashboard/bootstrap', [DashboardController::class, 'bootstrap'])
        ->defaults('openapiOperation', 'getDashboardBootstrap');

    Route::get('/trades', [TradeController::class, 'index'])
        ->defaults('openapiOperation', 'listTrades');
    Route::get('/finance/service-summary', [TradeController::class, 'serviceSummary'])
        ->defaults('openapiOperation', 'getServiceFinanceSummary');
    Route::get('/finance/service-details', [TradeController::class, 'serviceDetails'])
        ->defaults('openapiOperation', 'listServiceFinanceDetails');
    Route::get('/trades/export', [TradeController::class, 'export'])
        ->defaults('openapiOperation', 'exportTrades');
    Route::get('/debts', [TradeController::class, 'debts'])
        ->defaults('openapiOperation', 'listDebts');
    Route::patch('/debts/{id}/mark-paid', [TradeController::class, 'markPaid'])
        ->defaults('openapiOperation', 'markDebtPaid');
    Route::delete('/debts/{id}', [TradeController::class, 'destroyDebt'])
        ->defaults('openapiOperation', 'deleteDebt');
    Route::post('/checkout-sales', [CheckoutSaleController::class, 'store'])
        ->defaults('openapiOperation', 'createCheckoutSale');

    Route::get('/rooms', [RoomController::class, 'index'])
        ->defaults('openapiOperation', 'listRooms');
    Route::post('/rooms', [RoomController::class, 'store'])
        ->defaults('openapiOperation', 'createRoom');
    Route::get('/rooms/{room}', [RoomController::class, 'show'])
        ->defaults('openapiOperation', 'getRoom');
    Route::put('/rooms/{room}', [RoomController::class, 'update'])
        ->defaults('openapiOperation', 'replaceRoom');
    Route::patch('/rooms/{room}', [RoomController::class, 'update'])
        ->defaults('openapiOperation', 'updateRoom');
    Route::delete('/rooms/{room}', [RoomController::class, 'destroy'])
        ->defaults('openapiOperation', 'deleteRoom');
    Route::delete('/rooms/{room}/assets', [RoomController::class, 'destroyAssets'])
        ->defaults('openapiOperation', 'deleteRoomAssets');

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
    Route::get('/manufacturers/{manufacturer}/products/export', [ManufacturerController::class, 'exportProducts'])
        ->defaults('openapiOperation', 'exportManufacturerProducts');

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

    Route::get('/sessions', [BookingController::class, 'index'])
        ->defaults('openapiOperation', 'listSessions');
    Route::get('/sessions/{booking}', [BookingController::class, 'show'])
        ->defaults('openapiOperation', 'getSession');
    Route::post('/sessions/{booking}/end', [BookingController::class, 'end'])
        ->defaults('openapiOperation', 'endSession');
    Route::delete('/sessions/{booking}', [BookingController::class, 'destroy'])
        ->defaults('openapiOperation', 'deleteSession');

});
