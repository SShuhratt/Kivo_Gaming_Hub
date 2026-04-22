<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function bootstrap(Request $request): JsonResponse
    {
        return response()->json([
            'user' => $request->user(),
            'summary' => [
                'active_sessions' => 2,
                'pending_sessions' => 1,
                'rooms_count' => 4,
                'sales_total_today' => 365000,
            ],
            'services' => $this->services(),
            'tariffs' => $this->tariffs(),
            'sales' => $this->sales(),
            'companies' => $this->companies(),
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

    protected function services(): array
    {
        return [
            [
                'id' => 1,
                'name' => 'VIP Arena',
                'type' => 'room',
                'status' => 'active',
                'devices_count' => 12,
            ],
            [
                'id' => 2,
                'name' => 'Standard Arena',
                'type' => 'room',
                'status' => 'active',
                'devices_count' => 20,
            ],
            [
                'id' => 3,
                'name' => 'PlayStation Zone',
                'type' => 'console',
                'status' => 'maintenance',
                'devices_count' => 6,
            ],
            [
                'id' => 4,
                'name' => 'Streaming Booth',
                'type' => 'studio',
                'status' => 'active',
                'devices_count' => 2,
            ],
        ];
    }

    protected function tariffs(): array
    {
        return [
            [
                'id' => 1,
                'name' => 'Night Boost',
                'status' => 'active',
                'price' => 45000,
                'duration_minutes' => 120,
            ],
            [
                'id' => 2,
                'name' => 'Daily Grind',
                'status' => 'pending',
                'price' => 30000,
                'duration_minutes' => 90,
            ],
            [
                'id' => 3,
                'name' => 'Pro Session',
                'status' => 'active',
                'price' => 60000,
                'duration_minutes' => 180,
            ],
        ];
    }

    protected function sales(): array
    {
        return [
            [
                'id' => 1,
                'receipt_number' => 'SL-1001',
                'customer_name' => 'Azizbek',
                'total' => 120000,
                'paid_at' => '2026-04-22T10:15:00+05:00',
            ],
            [
                'id' => 2,
                'receipt_number' => 'SL-1002',
                'customer_name' => 'Madina',
                'total' => 95000,
                'paid_at' => '2026-04-22T13:40:00+05:00',
            ],
            [
                'id' => 3,
                'receipt_number' => 'SL-1003',
                'customer_name' => 'Temur',
                'total' => 150000,
                'paid_at' => '2026-04-22T18:05:00+05:00',
            ],
        ];
    }

    protected function companies(): array
    {
        return [
            [
                'id' => 1,
                'name' => 'Logitech Uzbekistan',
                'category' => 'peripherals',
                'contact_phone' => '+998 90 555 11 22',
            ],
            [
                'id' => 2,
                'name' => 'PlayZone Distribution',
                'category' => 'consoles',
                'contact_phone' => '+998 91 444 33 22',
            ],
        ];
    }
}
