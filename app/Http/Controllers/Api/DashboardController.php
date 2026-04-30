<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\FormatsSessionPayloads;
use App\Http\Controllers\Controller;
use App\Models\Asset;
use App\Models\Booking;
use App\Models\Manufacturer;
use App\Models\Service;
use App\Models\Tariff;
use App\Models\Trade;
use App\Services\SessionLifecycleService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class DashboardController extends Controller
{
    use FormatsSessionPayloads;

    public function bootstrap(Request $request, SessionLifecycleService $sessionLifecycle): JsonResponse
    {
        $sessionLifecycle->syncElapsedSessions();

        $groupedServices = Service::query()
            ->orderBy('room_id')
            ->orderBy('game_name')
            ->get()
            ->groupBy('room_id')
            ->map(function ($roomServices, $roomId) {
                return [
                    'id' => (string) $roomId,
                    'room_id' => (int) $roomId,
                    'room_number' => (string) $roomId,
                    'items' => $roomServices->pluck('game_name')->values()->all(),
                    'service_ids' => $roomServices->pluck('id')->values()->all(),
                ];
            })
            ->values();

        $tariffs = Tariff::query()
            ->orderBy('name')
            ->get()
            ->map(function (Tariff $tariff) {
                return [
                    'id' => (string) $tariff->id,
                    'backend_id' => $tariff->id,
                    'name' => $tariff->name,
                    'hourly_price' => (float) $tariff->hourly_cost,
                ];
            })
            ->values();

        $assets = Asset::query()
            ->orderBy('room_id')
            ->orderBy('category')
            ->get()
            ->map(function (Asset $asset) {
                return [
                    'id' => (string) $asset->id,
                    'backend_id' => $asset->id,
                    'category' => $asset->category,
                    'room_id' => $asset->room_id,
                    'room_number' => (string) $asset->room_id,
                    'total_usage_duration_minutes' => $asset->total_usage_duration_minutes,
                    'total_earned_money' => (float) $asset->total_earned_money,
                ];
            })
            ->values();

        $companies = Manufacturer::query()
            ->with(['warehouseItems' => fn ($query) => $query->orderBy('product_name')])
            ->orderBy('name')
            ->get()
            ->map(function (Manufacturer $manufacturer) {
                return [
                    'id' => (string) $manufacturer->id,
                    'backend_id' => $manufacturer->id,
                    'name' => $manufacturer->name,
                    'products' => $manufacturer->warehouseItems->map(function ($item) {
                        return [
                            'id' => (string) $item->id,
                            'backend_id' => $item->id,
                            'manufacturer' => $item->manufacturer,
                            'name' => $item->product_name,
                            'barcode' => $item->shtrix_code,
                            'quantity' => $item->count,
                            'unit' => $item->unit,
                            'purchase_price' => (float) $item->purchase_price,
                            'selling_price' => (float) $item->sell_price,
                        ];
                    })->values()->all(),
                ];
            })
            ->values();

        $sessions = Booking::query()
            ->with(['assets', 'tariff', 'trade'])
            ->orderByRaw("case when session_status = 'active' then 0 else 1 end")
            ->latest('start_time')
            ->get();

        $sales = Trade::query()
            ->latest('end_time')
            ->get()
            ->map(fn (Trade $trade) => $this->formatDashboardSale($trade))
            ->values();

        $today = Carbon::now()->startOfDay();
        $roomsCount = collect($groupedServices)
            ->pluck('room_id')
            ->merge(collect($assets)->pluck('room_id'))
            ->unique()
            ->count();

        return response()->json([
            'user' => $request->user(),
            'summary' => [
                'active_sessions' => $sessions->where('session_status', 'active')->count(),
                'total_session_devices' => $assets->count(),
                'pending_sessions' => $tariffs->count(),
                'rooms_count' => $roomsCount,
                'sales_total_today' => (float) Trade::query()
                    ->where('end_time', '>=', $today)
                    ->sum('total_cost'),
            ],
            'services' => $groupedServices,
            'tariffs' => $tariffs,
            'sales' => $sales,
            'sessions' => $sessions->map(fn (Booking $booking) => $this->formatSession($booking))->values(),
            'companies' => $companies,
            'assets' => $assets,
            'sections' => [
                ['key' => 'dashboard', 'name' => 'Asosiy', 'path' => '/asosiy'],
                ['key' => 'booking', 'name' => 'Band qilish', 'path' => '/band-qilish'],
                ['key' => 'sessions', 'name' => 'Aktiv seanslar', 'path' => '/aktiv-seanslar'],
                ['key' => 'cashier', 'name' => 'Kassa', 'path' => '/kassa'],
                ['key' => 'sales', 'name' => 'Savdo', 'path' => '/savdo'],
                ['key' => 'computers', 'name' => 'Kompyuterlar', 'path' => '/kompyuterlar'],
                ['key' => 'inventory', 'name' => 'Ombor', 'path' => '/ombor'],
                ['key' => 'services', 'name' => 'Xizmatlar', 'path' => '/xizmatlar'],
                ['key' => 'tariffs', 'name' => 'Tariflar', 'path' => '/tariflar'],
                ['key' => 'finance', 'name' => 'Moliya', 'path' => '/moliya'],
                ['key' => 'staff', 'name' => 'Xodimlar', 'path' => '/xodimlar'],
                ['key' => 'analytics', 'name' => 'Analitika', 'path' => '/analitika'],
            ],
        ]);
    }
}
