<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Asset;
use App\Models\Booking;
use App\Models\Service;
use App\Models\Tariff;
use App\Models\Warehouse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

class DashboardController extends Controller
{
    public function bootstrap(Request $request): JsonResponse
    {
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

        $companies = Warehouse::query()
            ->orderBy('manufacturer')
            ->orderBy('product_name')
            ->get()
            ->groupBy('manufacturer')
            ->map(function ($manufacturerItems, $manufacturer) {
                $firstItem = $manufacturerItems->first();

                return [
                    'id' => Str::slug($manufacturer) . '-' . $firstItem->id,
                    'name' => $manufacturer,
                    'products' => $manufacturerItems->map(function (Warehouse $item) {
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

        $bookings = Booking::query()
            ->with(['assets', 'tariff'])
            ->latest('start_time')
            ->get();

        $sales = $bookings->map(function (Booking $booking) {
            $roomIds = $booking->assets
                ->pluck('room_id')
                ->unique()
                ->sort()
                ->values();

            $submitted = $booking->status === 'submitted';

            return [
                'id' => (string) $booking->id,
                'room' => $roomIds->isNotEmpty() ? 'Xona ' . $roomIds->implode(', ') : 'Xona N/A',
                'base_price' => (float) ($booking->tariff->hourly_cost ?? 0),
                'start' => optional($booking->start_time)->format('H:i'),
                'end' => optional($booking->end_time)->format('H:i'),
                'service_cost' => (float) $booking->total_cost,
                'products' => 0,
                'total' => (float) $booking->total_cost,
                'cash' => $submitted ? (float) $booking->total_cost : 0,
                'terminal' => 0,
                'click' => 0,
                'payme' => 0,
                'debt' => $submitted ? 0 : (float) $booking->total_cost,
                'paid' => $submitted ? (float) $booking->total_cost : 0,
                'timestamp' => optional($booking->created_at)->getTimestampMs(),
            ];
        })->values();

        $today = Carbon::now()->startOfDay();
        $roomsCount = collect($groupedServices)
            ->pluck('room_id')
            ->merge(collect($assets)->pluck('room_id'))
            ->unique()
            ->count();

        return response()->json([
            'user' => $request->user(),
            'summary' => [
                'active_sessions' => 0,
                'pending_sessions' => $tariffs->count(),
                'rooms_count' => $roomsCount,
                'sales_total_today' => (float) $bookings
                    ->filter(fn (Booking $booking) => $booking->created_at && $booking->created_at->greaterThanOrEqualTo($today))
                    ->sum('total_cost'),
            ],
            'services' => $groupedServices,
            'tariffs' => $tariffs,
            'sales' => $sales,
            'companies' => $companies,
            'assets' => $assets,
            'sections' => [
                ['key' => 'dashboard', 'name' => 'Asosiy', 'path' => '/asosiy'],
                ['key' => 'booking', 'name' => 'Band qilish', 'path' => '/band-qilish'],
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
