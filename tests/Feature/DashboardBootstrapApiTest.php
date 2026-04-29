<?php

namespace Tests\Feature;

use App\Models\Asset;
use App\Models\Booking;
use App\Models\Service;
use App\Models\Tariff;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class DashboardBootstrapApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_dashboard_bootstrap_returns_frontend_ready_payload(): void
    {
        $tariff = Tariff::create([
            'name' => 'Night Boost',
            'hourly_cost' => 45000,
        ]);

        $asset = Asset::create([
            'category' => 'Computer',
            'room_id' => 7,
            'total_usage_duration_minutes' => 180,
            'total_earned_money' => 135000,
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

        $booking = Booking::create([
            'tariff_id' => $tariff->id,
            'start_time' => '2026-04-28T10:00:00+05:00',
            'end_time' => '2026-04-28T12:00:00+05:00',
            'duration_minutes' => 120,
            'total_cost' => 90000,
            'status' => 'submitted',
        ]);

        $booking->assets()->sync([$asset->id]);

        $response = $this->getJson('/api/dashboard/bootstrap', $this->authHeaders());

        $response
            ->assertOk()
            ->assertJsonPath('services.0.room_id', 7)
            ->assertJsonPath('services.0.items.0', 'CS2')
            ->assertJsonPath('tariffs.0.backend_id', $tariff->id)
            ->assertJsonPath('assets.0.room_id', 7)
            ->assertJsonPath('companies.0.name', 'Pepsi')
            ->assertJsonPath('sales.0.total', 90000);
    }

    protected function authHeaders(): array
    {
        return ['Authorization' => 'Bearer ' . $this->loginToken()];
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
