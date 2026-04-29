<?php

namespace Database\Seeders;

use App\Models\Asset;
use App\Models\Booking;
use App\Models\Service;
use App\Models\Tariff;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Database\Seeder;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $adminPhone = $this->normalizePhoneNumber('+998 90 123 45 67');
        $userPhone = $this->normalizePhoneNumber('+998 91 765 43 21');

        User::query()->updateOrCreate(
            ['phone_number' => $adminPhone],
            [
                'name' => 'Kivo Admin',
                'gmail' => 'admin@kivo.local',
                'phone_number' => $adminPhone,
                'password_hash' => Hash::make('admin'),
            ],
        );

        User::query()->updateOrCreate(
            ['phone_number' => $userPhone],
            [
                'name' => 'Kivo User',
                'gmail' => 'user@kivo.local',
                'phone_number' => $userPhone,
                'password_hash' => Hash::make('user123'),
            ],
        );

        foreach ([
            ['game_name' => 'PS5', 'room_id' => 1],
            ['game_name' => 'FIFA', 'room_id' => 1],
            ['game_name' => 'PC Arena', 'room_id' => 2],
            ['game_name' => 'CS2', 'room_id' => 2],
            ['game_name' => 'VIP Booth', 'room_id' => 3],
        ] as $serviceData) {
            Service::query()->firstOrCreate($serviceData);
        }

        $standardTariff = Tariff::query()->firstOrCreate(
            ['name' => 'Standard'],
            ['hourly_cost' => 40000],
        );

        $vipTariff = Tariff::query()->firstOrCreate(
            ['name' => 'VIP'],
            ['hourly_cost' => 60000],
        );

        $computerOne = Asset::query()->firstOrCreate(
            ['category' => 'Computer', 'room_id' => 2],
            ['total_usage_duration_minutes' => 0, 'total_earned_money' => 0],
        );

        $computerTwo = Asset::query()->firstOrCreate(
            ['category' => 'Computer', 'room_id' => 3],
            ['total_usage_duration_minutes' => 0, 'total_earned_money' => 0],
        );

        $playStation = Asset::query()->firstOrCreate(
            ['category' => 'PS', 'room_id' => 1],
            ['total_usage_duration_minutes' => 0, 'total_earned_money' => 0],
        );

        foreach ([
            [
                'manufacturer' => 'Coca-Cola',
                'product_name' => 'Coca-Cola 0.5L',
                'shtrix_code' => '4780011111111',
                'unit' => 'bottle',
                'count' => 24,
                'purchase_price' => 7000,
                'sell_price' => 10000,
            ],
            [
                'manufacturer' => 'Pepsi',
                'product_name' => 'Pepsi 0.5L',
                'shtrix_code' => '4780022222222',
                'unit' => 'bottle',
                'count' => 16,
                'purchase_price' => 6500,
                'sell_price' => 9500,
            ],
            [
                'manufacturer' => 'Lay’s',
                'product_name' => 'Lay’s Classic',
                'shtrix_code' => '4780033333333',
                'unit' => 'bag',
                'count' => 30,
                'purchase_price' => 9000,
                'sell_price' => 13000,
            ],
        ] as $warehouseItem) {
            Warehouse::query()->updateOrCreate(
                ['shtrix_code' => $warehouseItem['shtrix_code']],
                $warehouseItem,
            );
        }

        $demoBooking = Booking::query()->firstOrCreate(
            [
                'tariff_id' => $standardTariff->id,
                'start_time' => now()->subHours(3),
                'end_time' => now()->subHours(1),
            ],
            [
                'duration_minutes' => 120,
                'total_cost' => 80000,
                'status' => 'submitted',
            ],
        );

        $demoBooking->assets()->syncWithoutDetaching([$computerOne->id, $computerTwo->id]);

        $debtBooking = Booking::query()->firstOrCreate(
            [
                'tariff_id' => $vipTariff->id,
                'start_time' => now()->subDay()->setTime(20, 0),
                'end_time' => now()->subDay()->setTime(22, 0),
            ],
            [
                'duration_minutes' => 120,
                'total_cost' => 120000,
                'status' => 'debt_closed',
                'debt_name' => 'Test Customer',
                'debt_phone_number' => '+998901112233',
            ],
        );

        $debtBooking->assets()->syncWithoutDetaching([$playStation->id]);
    }

    protected function normalizePhoneNumber(string $phoneNumber): string
    {
        return preg_replace('/[^\d+]/', '', $phoneNumber) ?? $phoneNumber;
    }
}
