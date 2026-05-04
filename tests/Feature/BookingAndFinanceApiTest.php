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

    public function test_booking_calculation_uses_category_prices_and_duration_hours(): void
    {
        $tariff = $this->createTariffWithCategoryPrices([
            ['category' => 'Computer', 'hourly_price' => 20000],
            ['category' => 'PS5', 'hourly_price' => 35000],
        ]);
        $assetOne = Asset::create(['category' => 'Computer', 'room_id' => 101]);
        $assetTwo = Asset::create(['category' => 'PS5', 'room_id' => 102]);

        $this->postJson('/api/bookings/calculate', [
            'tariff_id' => $tariff->id,
            'asset_ids' => [$assetOne->id, $assetTwo->id],
            'start_time' => '2026-04-25T10:00:00+05:00',
            'duration_hours' => 2,
        ], $this->authHeaders())
            ->assertOk()
            ->assertJsonPath('duration_minutes', 120)
            ->assertJsonPath('duration_hours', 2)
            ->assertJsonPath('hourly_rate_total', 55000)
            ->assertJsonPath('total_cost', 110000)
            ->assertJsonPath('is_vip', false)
            ->assertJsonCount(2, 'asset_breakdown')
            ->assertJsonPath('asset_breakdown.0.category', 'Computer')
            ->assertJsonPath('asset_breakdown.0.hourly_price', 20000)
            ->assertJsonPath('asset_breakdown.1.category', 'PS5')
            ->assertJsonPath('asset_breakdown.1.hourly_price', 35000);
    }

    public function test_booking_calculation_rejects_assets_without_a_matching_tariff_category_price(): void
    {
        $tariff = $this->createTariffWithCategoryPrices([
            ['category' => 'Computer', 'hourly_price' => 20000],
        ]);
        $assetOne = Asset::create(['category' => 'Computer', 'room_id' => 101]);
        $assetTwo = Asset::create(['category' => 'Projector', 'room_id' => 102]);

        $this->postJson('/api/bookings/calculate', [
            'tariff_id' => $tariff->id,
            'asset_ids' => [$assetOne->id, $assetTwo->id],
            'start_time' => '2026-04-25T10:00:00+05:00',
            'duration_hours' => 1,
        ], $this->authHeaders())
            ->assertStatus(400)
            ->assertJsonPath('message', 'Bad request.')
            ->assertJsonPath('errors.asset_ids.0', 'Selected tariff does not have prices for: Projector.');
    }

    public function test_booking_create_uses_duration_hours_and_stays_active_without_creating_trade(): void
    {
        Carbon::setTestNow('2026-04-25T09:00:00+05:00');

        $tariff = $this->createTariffWithCategoryPrices([
            ['category' => 'Computer', 'hourly_price' => 20000],
            ['category' => 'PS5', 'hourly_price' => 35000],
        ]);
        $assetOne = Asset::create(['category' => 'Computer', 'room_id' => 101]);
        $assetTwo = Asset::create(['category' => 'PS5', 'room_id' => 102]);

        $this->postJson('/api/bookings', [
            'tariff_id' => $tariff->id,
            'asset_ids' => [$assetOne->id, $assetTwo->id],
            'start_time' => '2026-04-25T10:00:00+05:00',
            'duration_hours' => 2,
            'status' => 'debt_closed',
            'debt_name' => 'Alex Debt',
            'debt_phone_number' => '+998991234567',
        ], $this->authHeaders())
            ->assertCreated()
            ->assertJsonPath('status', 'debt_closed')
            ->assertJsonPath('session_status', 'active')
            ->assertJsonPath('requested_duration_hours', 2)
            ->assertJsonPath('total_cost', 110000)
            ->assertJsonPath('trade_exists', false)
            ->assertJsonPath('is_vip', false);

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
    }

    public function test_manual_session_end_creates_trade_and_updates_asset_stats_using_category_prices(): void
    {
        Carbon::setTestNow('2026-04-25T09:00:00+05:00');

        $tariff = $this->createTariffWithCategoryPrices([
            ['category' => 'Computer', 'hourly_price' => 20000],
            ['category' => 'PS5', 'hourly_price' => 35000],
        ]);
        $assetOne = Asset::create(['category' => 'Computer', 'room_id' => 101]);
        $assetTwo = Asset::create(['category' => 'PS5', 'room_id' => 102]);

        $bookingId = $this->postJson('/api/bookings', [
            'tariff_id' => $tariff->id,
            'asset_ids' => [$assetOne->id, $assetTwo->id],
            'start_time' => '2026-04-25T10:00:00+05:00',
            'duration_hours' => 2,
            'status' => 'submitted',
        ], $this->authHeaders())
            ->assertCreated()
            ->assertJsonPath('session_status', 'active')
            ->json('id');

        Carbon::setTestNow('2026-04-25T12:30:00+05:00');

        $this->postJson("/api/sessions/{$bookingId}/end", [], $this->authHeaders())
            ->assertOk()
            ->assertJsonPath('session_status', 'completed')
            ->assertJsonPath('trade_exists', true)
            ->assertJsonPath('duration_minutes', 120)
            ->assertJsonPath('requested_duration_hours', 2)
            ->assertJsonPath('total_cost', 110000);

        $this->assertDatabaseHas('trades', [
            'booking_id' => $bookingId,
            'payment_status' => 'submitted',
            'duration_minutes' => 120,
            'total_cost' => 110000,
        ]);
        $this->assertDatabaseHas('assets', [
            'id' => $assetOne->id,
            'total_usage_duration_minutes' => 120,
            'total_earned_money' => 40000,
        ]);
        $this->assertDatabaseHas('assets', [
            'id' => $assetTwo->id,
            'total_usage_duration_minutes' => 120,
            'total_earned_money' => 70000,
        ]);
    }

    public function test_vip_booking_is_priced_from_actual_elapsed_time_when_the_session_ends(): void
    {
        Carbon::setTestNow('2026-04-25T09:00:00+05:00');

        $tariff = $this->createTariffWithCategoryPrices([
            ['category' => 'Computer', 'hourly_price' => 20000],
            ['category' => 'PS5', 'hourly_price' => 35000],
        ]);
        $assetOne = Asset::create(['category' => 'Computer', 'room_id' => 101]);
        $assetTwo = Asset::create(['category' => 'PS5', 'room_id' => 102]);

        $bookingId = $this->postJson('/api/bookings', [
            'tariff_id' => $tariff->id,
            'asset_ids' => [$assetOne->id, $assetTwo->id],
            'start_time' => '2026-04-25T10:00:00+05:00',
            'is_vip' => true,
            'status' => 'submitted',
        ], $this->authHeaders())
            ->assertCreated()
            ->assertJsonPath('session_status', 'active')
            ->assertJsonPath('is_vip', true)
            ->assertJsonPath('requested_duration_hours', null)
            ->assertJsonPath('end_time', null)
            ->assertJsonPath('total_cost', 0)
            ->json('id');

        Carbon::setTestNow('2026-04-25T11:30:00+05:00');

        $this->postJson("/api/sessions/{$bookingId}/end", [], $this->authHeaders())
            ->assertOk()
            ->assertJsonPath('session_status', 'completed')
            ->assertJsonPath('is_vip', true)
            ->assertJsonPath('duration_minutes', 90)
            ->assertJsonPath('requested_duration_hours', 1.5)
            ->assertJsonPath('total_cost', 82500)
            ->assertJsonPath('trade_exists', true);

        $this->assertDatabaseHas('trades', [
            'booking_id' => $bookingId,
            'duration_minutes' => 90,
            'total_cost' => 82500,
        ]);
        $this->assertDatabaseHas('assets', [
            'id' => $assetOne->id,
            'total_usage_duration_minutes' => 90,
            'total_earned_money' => 30000,
        ]);
        $this->assertDatabaseHas('assets', [
            'id' => $assetTwo->id,
            'total_usage_duration_minutes' => 90,
            'total_earned_money' => 52500,
        ]);
    }

    public function test_finance_ledger_excludes_active_sessions_and_keeps_existing_filters(): void
    {
        Carbon::setTestNow('2026-04-25T09:00:00+05:00');

        $tariff = $this->createTariffWithCategoryPrices([
            ['category' => 'Computer', 'hourly_price' => 20000],
            ['category' => 'PS5', 'hourly_price' => 35000],
        ]);

        Booking::create([
            'tariff_id' => $tariff->id,
            'tariff_name_snapshot' => $tariff->name,
            'hourly_rate_snapshot' => 20000,
            'asset_snapshot' => [[
                'id' => 1,
                'category' => 'Computer',
                'room_id' => 101,
                'room_number' => '101',
                'hourly_price' => 20000,
            ]],
            'asset_stats_recorded' => true,
            'start_time' => '2026-04-25T10:00:00+05:00',
            'end_time' => '2026-04-25T12:00:00+05:00',
            'duration_minutes' => 120,
            'requested_duration_hours' => 2,
            'total_cost' => 40000,
            'status' => 'submitted',
            'session_status' => 'active',
        ]);

        $completedIncomeBooking = Booking::create([
            'tariff_id' => $tariff->id,
            'tariff_name_snapshot' => $tariff->name,
            'hourly_rate_snapshot' => 20000,
            'asset_snapshot' => [[
                'id' => 2,
                'category' => 'Computer',
                'room_id' => 102,
                'room_number' => '102',
                'hourly_price' => 20000,
            ]],
            'asset_stats_recorded' => true,
            'start_time' => '2026-04-25T10:00:00+05:00',
            'end_time' => '2026-04-25T12:00:00+05:00',
            'ended_at' => '2026-04-25T12:00:00+05:00',
            'duration_minutes' => 120,
            'requested_duration_hours' => 2,
            'total_cost' => 40000,
            'status' => 'submitted',
            'session_status' => 'completed',
        ]);

        $completedDebtBooking = Booking::create([
            'tariff_id' => $tariff->id,
            'tariff_name_snapshot' => $tariff->name,
            'hourly_rate_snapshot' => 35000,
            'asset_snapshot' => [[
                'id' => 3,
                'category' => 'PS5',
                'room_id' => 103,
                'room_number' => '103',
                'hourly_price' => 35000,
            ]],
            'asset_stats_recorded' => true,
            'start_time' => '2026-04-25T13:00:00+05:00',
            'end_time' => '2026-04-25T14:00:00+05:00',
            'ended_at' => '2026-04-25T14:00:00+05:00',
            'duration_minutes' => 60,
            'requested_duration_hours' => 1,
            'total_cost' => 35000,
            'status' => 'debt_closed',
            'session_status' => 'completed',
            'debt_name' => 'Alex Debt',
            'debt_phone_number' => '+998991234567',
        ]);

        Trade::create([
            'booking_id' => $completedIncomeBooking->id,
            'tariff_id' => $tariff->id,
            'tariff_name' => $tariff->name,
            'hourly_rate' => 20000,
            'payment_status' => 'submitted',
            'session_status' => 'completed',
            'start_time' => '2026-04-25T10:00:00+05:00',
            'end_time' => '2026-04-25T12:00:00+05:00',
            'duration_minutes' => 120,
            'total_cost' => 40000,
            'asset_snapshot' => [[
                'id' => 2,
                'category' => 'Computer',
                'room_id' => 102,
                'room_number' => '102',
                'hourly_price' => 20000,
            ]],
            'assets_count' => 1,
        ]);

        Trade::create([
            'booking_id' => $completedDebtBooking->id,
            'tariff_id' => $tariff->id,
            'tariff_name' => $tariff->name,
            'hourly_rate' => 35000,
            'payment_status' => 'debt_closed',
            'session_status' => 'completed',
            'start_time' => '2026-04-25T13:00:00+05:00',
            'end_time' => '2026-04-25T14:00:00+05:00',
            'duration_minutes' => 60,
            'total_cost' => 35000,
            'debt_name' => 'Alex Debt',
            'debt_phone_number' => '+998991234567',
            'asset_snapshot' => [[
                'id' => 3,
                'category' => 'PS5',
                'room_id' => 103,
                'room_number' => '103',
                'hourly_price' => 35000,
            ]],
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

    protected function createTariffWithCategoryPrices(array $rows, string $name = 'Standard Hour'): Tariff
    {
        $tariff = Tariff::create([
            'name' => $name,
            'hourly_cost' => collect($rows)->min('hourly_price') ?? 0,
        ]);

        $tariff->categoryPrices()->createMany(
            collect($rows)
                ->map(fn (array $row) => [
                    'category' => $row['category'],
                    'category_key' => mb_strtolower(trim($row['category'])),
                    'hourly_price' => $row['hourly_price'],
                ])
                ->all(),
        );

        return $tariff->fresh('categoryPrices');
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
