<?php

namespace Tests\Feature;

use App\Models\Asset;
use App\Models\Booking;
use App\Models\Tariff;
use App\Models\Trade;
use App\Models\User;
use Carbon\Carbon;
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

    public function test_booking_create_creates_an_active_session_without_an_immediate_trade(): void
    {
        Carbon::setTestNow('2026-04-25T09:00:00+05:00');

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
            ->assertJsonPath('session_status', 'active')
            ->assertJsonPath('trade_exists', false);

        $this->assertDatabaseHas('assets', [
            'id' => $assetOne->id,
            'total_usage_duration_minutes' => 0,
            'total_earned_money' => 0,
        ]);
        $this->assertDatabaseHas('assets', [
            'id' => $assetTwo->id,
            'total_usage_duration_minutes' => 0,
            'total_earned_money' => 0,
        ]);
        $this->assertDatabaseCount('trades', 0);

        $this->getJson('/api/trades', $this->authHeaders())
            ->assertOk()
            ->assertJsonCount(0);

        Carbon::setTestNow();
    }

    public function test_manual_session_end_creates_trade_and_updates_asset_stats(): void
    {
        Carbon::setTestNow('2026-04-25T11:00:00+05:00');

        $tariff = Tariff::create([
            'name' => 'Standard Hour',
            'hourly_cost' => 60000,
        ]);
        $assetOne = Asset::create(['category' => 'Computer', 'room_id' => 101]);
        $assetTwo = Asset::create(['category' => 'PS', 'room_id' => 102]);

        $bookingId = $this->postJson('/api/bookings', [
            'tariff_id' => $tariff->id,
            'asset_ids' => [$assetOne->id, $assetTwo->id],
            'start_time' => '2026-04-25T10:00:00+05:00',
            'end_time' => '2026-04-25T12:00:00+05:00',
            'status' => 'submitted',
        ], $this->authHeaders())
            ->assertCreated()
            ->assertJsonPath('session_status', 'active')
            ->json('id');

        $this->postJson("/api/sessions/{$bookingId}/end", [], $this->authHeaders())
            ->assertOk()
            ->assertJsonPath('session_status', 'completed')
            ->assertJsonPath('trade_exists', true)
            ->assertJsonPath('duration_minutes', 60)
            ->assertJsonPath('total_cost', 120000);

        $this->assertDatabaseHas('trades', [
            'booking_id' => $bookingId,
            'payment_status' => 'submitted',
            'duration_minutes' => 60,
            'total_cost' => 120000,
        ]);
        $this->assertDatabaseHas('assets', [
            'id' => $assetOne->id,
            'total_usage_duration_minutes' => 60,
            'total_earned_money' => 60000,
        ]);
        $this->assertDatabaseHas('assets', [
            'id' => $assetTwo->id,
            'total_usage_duration_minutes' => 60,
            'total_earned_money' => 60000,
        ]);

        Carbon::setTestNow();
    }

    public function test_finance_ledger_excludes_active_sessions_and_keeps_existing_filters(): void
    {
        Carbon::setTestNow('2026-04-25T09:00:00+05:00');

        $tariff = Tariff::create([
            'name' => 'Standard Hour',
            'hourly_cost' => 60000,
        ]);

        Booking::create([
            'tariff_id' => $tariff->id,
            'tariff_name_snapshot' => $tariff->name,
            'hourly_rate_snapshot' => 60000,
            'asset_snapshot' => [['id' => 1, 'category' => 'Computer', 'room_id' => 101, 'room_number' => '101']],
            'asset_stats_recorded' => true,
            'start_time' => '2026-04-25T10:00:00+05:00',
            'end_time' => '2026-04-25T12:00:00+05:00',
            'duration_minutes' => 120,
            'total_cost' => 120000,
            'status' => 'submitted',
            'session_status' => 'active',
        ]);

        $completedIncomeBooking = Booking::create([
            'tariff_id' => $tariff->id,
            'tariff_name_snapshot' => $tariff->name,
            'hourly_rate_snapshot' => 60000,
            'asset_snapshot' => [['id' => 2, 'category' => 'Computer', 'room_id' => 102, 'room_number' => '102']],
            'asset_stats_recorded' => true,
            'start_time' => '2026-04-25T10:00:00+05:00',
            'end_time' => '2026-04-25T12:00:00+05:00',
            'ended_at' => '2026-04-25T12:00:00+05:00',
            'duration_minutes' => 120,
            'total_cost' => 120000,
            'status' => 'submitted',
            'session_status' => 'completed',
        ]);

        $completedDebtBooking = Booking::create([
            'tariff_id' => $tariff->id,
            'tariff_name_snapshot' => $tariff->name,
            'hourly_rate_snapshot' => 60000,
            'asset_snapshot' => [['id' => 3, 'category' => 'PS', 'room_id' => 103, 'room_number' => '103']],
            'asset_stats_recorded' => true,
            'start_time' => '2026-04-25T13:00:00+05:00',
            'end_time' => '2026-04-25T14:00:00+05:00',
            'ended_at' => '2026-04-25T14:00:00+05:00',
            'duration_minutes' => 60,
            'total_cost' => 60000,
            'status' => 'debt_closed',
            'session_status' => 'completed',
            'debt_name' => 'Alex Debt',
            'debt_phone_number' => '+998991234567',
        ]);

        Trade::create([
            'booking_id' => $completedIncomeBooking->id,
            'tariff_id' => $tariff->id,
            'tariff_name' => $tariff->name,
            'hourly_rate' => 60000,
            'payment_status' => 'submitted',
            'session_status' => 'completed',
            'start_time' => '2026-04-25T10:00:00+05:00',
            'end_time' => '2026-04-25T12:00:00+05:00',
            'duration_minutes' => 120,
            'total_cost' => 120000,
            'asset_snapshot' => [['id' => 2, 'category' => 'Computer', 'room_id' => 102, 'room_number' => '102']],
            'assets_count' => 1,
        ]);

        Trade::create([
            'booking_id' => $completedDebtBooking->id,
            'tariff_id' => $tariff->id,
            'tariff_name' => $tariff->name,
            'hourly_rate' => 60000,
            'payment_status' => 'debt_closed',
            'session_status' => 'completed',
            'start_time' => '2026-04-25T13:00:00+05:00',
            'end_time' => '2026-04-25T14:00:00+05:00',
            'duration_minutes' => 60,
            'total_cost' => 60000,
            'debt_name' => 'Alex Debt',
            'debt_phone_number' => '+998991234567',
            'asset_snapshot' => [['id' => 3, 'category' => 'PS', 'room_id' => 103, 'room_number' => '103']],
            'assets_count' => 1,
        ]);

        $this->getJson('/api/trades', $this->authHeaders())
            ->assertOk()
            ->assertJsonCount(2);

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

        Carbon::setTestNow();
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
        return ['Authorization' => 'Bearer '.$this->loginToken()];
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

    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }
}
