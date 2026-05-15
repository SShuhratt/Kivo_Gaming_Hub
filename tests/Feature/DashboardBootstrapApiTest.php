<?php

namespace Tests\Feature;

use App\Models\Asset;
use App\Models\Booking;
use App\Models\Room;
use App\Models\Service;
use App\Models\Trade;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class DashboardBootstrapApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_dashboard_bootstrap_returns_frontend_ready_payload_with_rooms_services_and_sessions(): void
    {
        $roomOne = Room::create(['name' => 'Opshiy zal']);
        $roomTwo = Room::create(['name' => '2-xona']);
        $computer = Service::create(['name' => 'Computer', 'price' => 20000]);
        $ps5 = Service::create(['name' => 'PS5', 'price' => 35000]);

        $activeAsset = Asset::create([
            'name' => 'computer1',
            'service_id' => $computer->id,
            'room_id' => $roomOne->id,
            'total_usage_duration_minutes' => 180,
            'total_earned_money' => 60000,
        ]);

        $completedAsset = Asset::create([
            'name' => 'ps5(1)',
            'service_id' => $ps5->id,
            'room_id' => $roomTwo->id,
            'total_usage_duration_minutes' => 120,
            'total_earned_money' => 70000,
        ]);

        Warehouse::create([
            'manufacturer' => 'Pepsi',
            'product_name' => 'Pepsi 0.5L',
            'shtrix_code' => '4780099999999',
            'unit' => 'shisha',
            'count' => 18,
            'purchase_price' => 6000,
            'sell_price' => 9000,
        ]);

        $activeBooking = Booking::create([
            'tariff_id' => null,
            'tariff_name_snapshot' => 'Service pricing',
            'hourly_rate_snapshot' => 20000,
            'asset_snapshot' => [[
                'id' => $activeAsset->id,
                'name' => $activeAsset->name,
                'category' => 'Computer',
                'service_id' => $computer->id,
                'room_id' => $roomOne->id,
                'room_name' => $roomOne->name,
                'room_number' => $roomOne->name,
                'hourly_price' => 20000,
            ]],
            'asset_stats_recorded' => true,
            'start_time' => '2026-04-28T10:00:00+05:00',
            'end_time' => '2030-04-28T12:00:00+05:00',
            'duration_minutes' => 120,
            'requested_duration_hours' => 2,
            'total_cost' => 40000,
            'status' => 'submitted',
            'session_status' => 'active',
            'is_vip' => false,
        ]);
        $activeBooking->assets()->sync([$activeAsset->id]);

        $completedBooking = Booking::create([
            'tariff_id' => null,
            'tariff_name_snapshot' => 'Service pricing',
            'hourly_rate_snapshot' => 35000,
            'asset_snapshot' => [[
                'id' => $completedAsset->id,
                'name' => $completedAsset->name,
                'category' => 'PS5',
                'service_id' => $ps5->id,
                'room_id' => $roomTwo->id,
                'room_name' => $roomTwo->name,
                'room_number' => $roomTwo->name,
                'hourly_price' => 35000,
            ]],
            'asset_stats_recorded' => true,
            'start_time' => '2026-04-28T13:00:00+05:00',
            'end_time' => '2026-04-28T15:00:00+05:00',
            'ended_at' => '2026-04-28T15:00:00+05:00',
            'duration_minutes' => 120,
            'requested_duration_hours' => 2,
            'total_cost' => 70000,
            'status' => 'submitted',
            'session_status' => 'completed',
            'is_vip' => false,
        ]);
        $completedBooking->assets()->sync([$completedAsset->id]);

        Trade::create([
            'booking_id' => $completedBooking->id,
            'tariff_id' => null,
            'tariff_name' => 'Service pricing',
            'hourly_rate' => 35000,
            'payment_status' => 'submitted',
            'session_status' => 'completed',
            'start_time' => '2026-04-28T13:00:00+05:00',
            'end_time' => '2026-04-28T15:00:00+05:00',
            'duration_minutes' => 120,
            'total_cost' => 70000,
            'asset_snapshot' => [[
                'id' => $completedAsset->id,
                'name' => $completedAsset->name,
                'category' => 'PS5',
                'service_id' => $ps5->id,
                'room_id' => $roomTwo->id,
                'room_name' => $roomTwo->name,
                'room_number' => $roomTwo->name,
                'hourly_price' => 35000,
            ]],
            'assets_count' => 1,
        ]);

        $response = $this->getJson('/api/dashboard/bootstrap', $this->authHeaders());

        $response
            ->assertOk()
            ->assertJsonPath('services.0.name', 'Computer')
            ->assertJsonPath('services.0.price', 20000)
            ->assertJsonPath('rooms.0.name', '2-xona')
            ->assertJsonPath('rooms.1.name', 'Opshiy zal')
            ->assertJsonPath('rooms.1.assets.0.service_name', 'Computer')
            ->assertJsonPath('assets.0.service_name', 'Computer')
            ->assertJsonPath('assets.0.room_name', 'Opshiy zal')
            ->assertJsonPath('companies.0.name', 'Pepsi')
            ->assertJsonPath('summary.active_sessions', 1)
            ->assertJsonPath('summary.total_session_devices', 2)
            ->assertJsonPath('summary.services_count', 2)
            ->assertJsonPath('summary.services_ready', true)
            ->assertJsonPath('summary.rooms_count', 2)
            ->assertJsonPath('sales.0.total', 70000)
            ->assertJsonPath('sessions.0.session_status', 'active')
            ->assertJsonPath('sessions.0.pricing.label', 'Service pricing')
            ->assertJsonPath('sessions.0.requested_duration_hours', 2)
            ->assertJsonPath('sessions.0.is_vip', false)
            ->assertJsonPath('sections.5.name', 'Xonalar');
    }

    protected function authHeaders(): array
    {
        return ['Authorization' => 'Bearer '.$this->loginToken()];
    }

    protected function loginToken(): string
    {
        User::updateOrCreate(
            ['phone_number' => '+998901234567'],
            [
                'name' => 'Bootstrap User',
                'gmail' => 'bootstrap-user@example.test',
                'password_hash' => Hash::make('secret123'),
            ],
        );

        return $this->postJson('/api/auth/login', [
            'phone_number' => '+998 90 123 45 67',
            'password' => 'secret123',
        ])->json('token');
    }
}
