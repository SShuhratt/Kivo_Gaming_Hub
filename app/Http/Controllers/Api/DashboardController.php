<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\FormatsSessionPayloads;
use App\Http\Controllers\Controller;
use App\Models\Asset;
use App\Models\Booking;
use App\Models\Manufacturer;
use App\Models\Room;
use App\Models\Service;
use App\Models\Trade;
use App\Services\AssetDisplayOrderService;
use App\Services\SessionLifecycleService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class DashboardController extends Controller
{
    use FormatsSessionPayloads;

    public function bootstrap(
        Request $request,
        SessionLifecycleService $sessionLifecycle,
        AssetDisplayOrderService $assetDisplayOrder,
    ): JsonResponse
    {
        $sessionLifecycle->syncElapsedSessions();

        $services = Service::query()
            ->withCount('assets')
            ->orderBy('name')
            ->get()
            ->map(fn (Service $service) => [
                'id' => (string) $service->id,
                'backend_id' => $service->id,
                'name' => $service->name,
                'rate' => $service->rate !== null ? (float) $service->rate : null,
                'price' => $service->rate !== null ? (float) $service->rate : null,
                'requirements' => $service->requirements ?? [],
                'manual_priority' => $service->manual_priority,
                'savings_ratio' => (float) $service->savings_ratio,
                'is_recommendable' => (bool) $service->is_recommendable,
                'is_bundle' => (bool) $service->is_bundle,
                'assets_count' => $service->assets_count,
            ])
            ->values();

        $assetCollection = Asset::query()
            ->with(['room', 'service'])
            ->orderBy('room_id')
            ->orderBy('service_id')
            ->orderBy('name')
            ->get();
        $assetOrderMap = $assetDisplayOrder->buildOrderMap($assetCollection);

        $assets = $assetCollection
            ->map(fn (Asset $asset) => $this->serializeAsset($asset, $assetOrderMap))
            ->values();

        $rooms = Room::query()
            ->with(['assets.room', 'assets.service'])
            ->orderBy('name')
            ->get()
            ->map(function (Room $room) use ($assetOrderMap) {
                return [
                    'id' => (string) $room->id,
                    'backend_id' => $room->id,
                    'name' => $room->name,
                    'assets' => $room->assets
                        ->sortBy(fn (Asset $asset) => sprintf(
                            '%s|%s|%010d',
                            mb_strtolower((string) ($asset->service?->name ?? '')),
                            mb_strtolower((string) $asset->name),
                            $asset->id,
                        ))
                        ->map(fn (Asset $asset) => $this->serializeAsset($asset, $assetOrderMap))
                        ->values()
                        ->all(),
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
            ->with(['assets.room', 'assets.service', 'trade'])
            ->orderByRaw("case when session_status = 'active' then 0 else 1 end")
            ->latest('start_time')
            ->get();

        $sales = Trade::query()
            ->latest('end_time')
            ->get()
            ->map(fn (Trade $trade) => $this->formatDashboardSale($trade))
            ->values();

        $today = Carbon::now()->startOfDay();

        return response()->json([
            'user' => $request->user(),
            'summary' => [
                'active_sessions' => $sessions->where('session_status', 'active')->count(),
                'total_session_devices' => $assets->count(),
                'services_count' => $services->count(),
                'services_ready' => $services->contains(fn (array $service) => ! $service['is_bundle'] && $service['rate'] !== null),
                'rooms_count' => $rooms->count(),
                'sales_total_today' => (float) Trade::query()
                    ->where('end_time', '>=', $today)
                    ->sum('total_cost'),
            ],
            'services' => $services,
            'rooms' => $rooms,
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
                ['key' => 'rooms', 'name' => 'Xonalar', 'path' => '/xonalar'],
                ['key' => 'inventory', 'name' => 'Ombor', 'path' => '/ombor'],
                ['key' => 'services', 'name' => 'Xizmatlar', 'path' => '/xizmatlar'],
                ['key' => 'finance', 'name' => 'Moliya', 'path' => '/moliya'],
                ['key' => 'staff', 'name' => 'Xodimlar', 'path' => '/xodimlar'],
                ['key' => 'analytics', 'name' => 'Analitika', 'path' => '/analitika'],
            ],
        ]);
    }

    protected function serializeAsset(Asset $asset, array $assetOrderMap): array
    {
        return [
            'id' => (string) $asset->id,
            'backend_id' => $asset->id,
            'name' => $asset->name,
            'category' => $asset->category,
            'service_id' => $asset->service_id,
            'service_name' => $asset->service?->name,
            'service_price' => $asset->service?->rate !== null ? (float) $asset->service->rate : null,
            'room_id' => $asset->room_id,
            'room_name' => $asset->room?->name,
            'room_number' => $asset->room?->name ?? ($asset->room_id ? (string) $asset->room_id : null),
            'asset_order' => $assetOrderMap[$asset->id] ?? null,
            'total_usage_duration_minutes' => $asset->total_usage_duration_minutes,
            'total_earned_money' => (float) $asset->total_earned_money,
        ];
    }
}
