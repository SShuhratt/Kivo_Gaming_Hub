<?php

namespace Tests\Feature;

use App\Models\Asset;
use App\Models\Booking;
use App\Models\Tariff;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class BookingAndFinanceApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_booking_calculation_returns_positive_duration_and_cost(): void
    {
        $tariff = Tariff::create([
            'name' => 'Standard Hour',
            'hourly_cost' => 60000,
        ]);
        $assetOne = Asset::create(['category' => 'Computer', 'room_id' => 101]);
        $assetTwo = Asset::create(['category' => 'PS', 'room_id' => 102]);

        $this->postJson('/api/bookings/calculate', [
            'tariff_id' => $tariff->id,
            'asset_ids' => [$assetOne->id, $assetTwo->id],
            'start_time' => '2026-04-25T10:00:00+05:00',
            'end_time' => '2026-04-25T12:00:00+05:00',
        ], $this->authHeaders())
            ->assertOk()
            ->assertJsonPath('duration_minutes', 120)
            ->assertJsonPath('total_cost', 240000);
    }

    public function test_booking_create_accepts_status_and_updates_attached_assets(): void
    {
        $tariff = Tariff::create([
            'name' => 'Standard Hour',
            'hourly_cost' => 60000,
        ]);
        $assetOne = Asset::create(['category' => 'Computer', 'room_id' => 101]);
        $assetTwo = Asset::create(['category' => 'PS', 'room_id' => 102]);

        $this->postJson('/api/bookings', [
            'tariff_id' => $tariff->id,
            'asset_ids' => [$assetOne->id, $assetTwo->id],
            'start_time' => '2026-04-25T10:00:00+05:00',
            'end_time' => '2026-04-25T12:00:00+05:00',
            'status' => 'debt_closed',
            'debt_name' => 'Alex Debt',
            'debt_phone_number' => '+998991234567',
        ], $this->authHeaders())
            ->assertCreated()
            ->assertJsonPath('status', 'debt_closed')
            ->assertJsonPath('duration_minutes', 120)
            ->assertJsonPath('total_cost', 240000);

        $this->assertDatabaseHas('assets', [
            'id' => $assetOne->id,
            'total_usage_duration_minutes' => 120,
            'total_earned_money' => 120000,
        ]);
        $this->assertDatabaseHas('assets', [
            'id' => $assetTwo->id,
            'total_usage_duration_minutes' => 120,
            'total_earned_money' => 120000,
        ]);
    }

    public function test_finance_ledger_can_be_filtered_from_swagger_query_parameters(): void
    {
        $tariff = Tariff::create([
            'name' => 'Standard Hour',
            'hourly_cost' => 60000,
        ]);

        Booking::create([
            'tariff_id' => $tariff->id,
            'start_time' => '2026-04-25T10:00:00+05:00',
            'end_time' => '2026-04-25T12:00:00+05:00',
            'duration_minutes' => 120,
            'total_cost' => 120000,
            'status' => 'submitted',
        ]);

        Booking::create([
            'tariff_id' => $tariff->id,
            'start_time' => '2026-04-25T13:00:00+05:00',
            'end_time' => '2026-04-25T13:00:00+05:00',
            'duration_minutes' => 0,
            'total_cost' => 75000,
            'status' => 'debt_closed',
            'debt_name' => 'Alex Debt',
            'debt_phone_number' => '+998991234567',
        ]);

        $this->getJson('/api/trades?type=Income', $this->authHeaders())
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.type', 'Income')
            ->assertJsonPath('0.status', 'submitted');

        $this->getJson('/api/trades?status=debt_closed', $this->authHeaders())
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.type', 'Debt')
            ->assertJsonPath('0.status', 'debt_closed');
    }

    public function test_protected_api_requires_a_real_jwt_bearer_token(): void
    {
        $this->getJson('/api/assets')
            ->assertUnauthorized();

        $token = $this->loginToken();

        $this->assertSame(2, substr_count($token, '.'));

        $this->getJson('/api/assets', ['Authorization' => "Bearer {$token}"])
            ->assertOk();
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
                'name' => 'JWT User',
                'gmail' => 'jwt-user@example.test',
                'password_hash' => Hash::make('secret123'),
            ],
        );

        return $this->postJson('/api/auth/login', [
            'phone_number' => '+998901234567',
            'password' => 'secret123',
        ])->json('token');
    }
}
