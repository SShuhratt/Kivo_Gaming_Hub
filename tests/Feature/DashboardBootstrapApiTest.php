<?php

namespace Tests\Feature;

use App\Models\Asset;
use App\Models\Booking;
use App\Models\Service;
use App\Models\Tariff;
use App\Models\Trade;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class DashboardBootstrapApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_dashboard_bootstrap_returns_frontend_ready_payload_with_active_and_completed_sessions(): void
    {
        $tariff = Tariff::create([
            'name' => 'Night Boost',
            'hourly_cost' => 45000,
        ]);

        $activeAsset = Asset::create([
            'category' => 'Computer',
            'room_id' => 7,
            'total_usage_duration_minutes' => 180,
            'total_earned_money' => 135000,
        ]);

        $completedAsset = Asset::create([
            'category' => 'PS',
            'room_id' => 8,
            'total_usage_duration_minutes' => 120,
            'total_earned_money' => 90000,
        ]);

        Service::create([
            'game_name' => 'CS2',
            'room_id' => 7,
        ]);

        Warehouse::create([
            'manufacturer' => 'Pepsi',
            'product_name' => 'Pepsi 0.5L',
            'shtrix_code' => '4780099999999',
            'unit' => 'bottle',
            'count' => 18,
            'purchase_price' => 6000,
            'sell_price' => 9000,
        ]);

        $activeBooking = Booking::create([
            'tariff_id' => $tariff->id,
            'tariff_name_snapshot' => $tariff->name,
            'hourly_rate_snapshot' => 45000,
            'asset_snapshot' => [['id' => $activeAsset->id, 'category' => 'Computer', 'room_id' => 7, 'room_number' => '7']],
            'asset_stats_recorded' => true,
            'start_time' => '2026-04-28T10:00:00+05:00',
            'end_time' => '2030-04-28T12:00:00+05:00',
            'duration_minutes' => 120,
            'total_cost' => 90000,
            'status' => 'submitted',
            'session_status' => 'active',
        ]);
        $activeBooking->assets()->sync([$activeAsset->id]);

        $completedBooking = Booking::create([
            'tariff_id' => $tariff->id,
            'tariff_name_snapshot' => $tariff->name,
            'hourly_rate_snapshot' => 45000,
            'asset_snapshot' => [['id' => $completedAsset->id, 'category' => 'PS', 'room_id' => 8, 'room_number' => '8']],
            'asset_stats_recorded' => true,
            'start_time' => '2026-04-28T13:00:00+05:00',
            'end_time' => '2026-04-28T15:00:00+05:00',
            'ended_at' => '2026-04-28T15:00:00+05:00',
            'duration_minutes' => 120,
            'total_cost' => 90000,
            'status' => 'submitted',
            'session_status' => 'completed',
        ]);
        $completedBooking->assets()->sync([$completedAsset->id]);

        Trade::create([
            'booking_id' => $completedBooking->id,
            'tariff_id' => $tariff->id,
            'tariff_name' => $tariff->name,
            'hourly_rate' => 45000,
            'payment_status' => 'submitted',
            'session_status' => 'completed',
            'start_time' => '2026-04-28T13:00:00+05:00',
            'end_time' => '2026-04-28T15:00:00+05:00',
            'duration_minutes' => 120,
            'total_cost' => 90000,
            'asset_snapshot' => [['id' => $completedAsset->id, 'category' => 'PS', 'room_id' => 8, 'room_number' => '8']],
            'assets_count' => 1,
        ]);

        $response = $this->getJson('/api/dashboard/bootstrap', $this->authHeaders());

        $response
            ->assertOk()
            ->assertJsonPath('services.0.room_id', 7)
            ->assertJsonPath('services.0.items.0', 'CS2')
            ->assertJsonPath('tariffs.0.backend_id', $tariff->id)
            ->assertJsonPath('assets.0.room_id', 7)
            ->assertJsonPath('companies.0.name', 'Pepsi')
            ->assertJsonPath('summary.active_sessions', 1)
            ->assertJsonPath('summary.total_session_devices', 2)
            ->assertJsonPath('sales.0.total', 90000)
            ->assertJsonPath('sessions.0.session_status', 'active');
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
