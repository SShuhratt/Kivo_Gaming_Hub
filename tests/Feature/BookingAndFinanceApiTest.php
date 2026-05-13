<?php

namespace Tests\Feature;

use App\Models\Asset;
use App\Models\Booking;
use App\Models\CheckoutSale;
use App\Models\CheckoutSaleItem;
use App\Models\Room;
use App\Models\Service;
use App\Models\Trade;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class BookingAndFinanceApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_booking_calculation_uses_service_category_prices_and_duration_hours(): void
    {
        $room = Room::create(['name' => 'Opshiy zal']);
        $computer = Service::create(['name' => 'Computer', 'price' => 20000]);
        $ps5 = Service::create(['name' => 'PS5', 'price' => 35000]);
        $assetOne = Asset::create(['name' => 'computer1', 'service_id' => $computer->id, 'room_id' => $room->id]);
        $assetTwo = Asset::create(['name' => 'ps5(1)', 'service_id' => $ps5->id, 'room_id' => $room->id]);

        $this->postJson('/api/bookings/calculate', [
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
            ->assertJsonPath('asset_breakdown.0.category', 'Computer')
            ->assertJsonPath('asset_breakdown.0.hourly_price', 20000)
            ->assertJsonPath('asset_breakdown.1.category', 'PS5')
            ->assertJsonPath('asset_breakdown.1.hourly_price', 35000);
    }

    public function test_booking_calculation_applies_matching_bundle_price_and_returns_bundle_breakdown(): void
    {
        $room = Room::create(['name' => 'Opshiy zal']);
        $computer = Service::create(['name' => 'Computer', 'price' => 20000]);
        $ps5 = Service::create(['name' => 'PS5', 'price' => 35000]);
        $bundle = Service::create([
            'name' => 'Gaming Mix',
            'price' => 45000,
            'requirements' => [
                'computer' => 1,
                'ps5' => 1,
            ],
        ]);

        $assetOne = Asset::create(['name' => 'computer1', 'service_id' => $computer->id, 'room_id' => $room->id]);
        $assetTwo = Asset::create(['name' => 'ps5(1)', 'service_id' => $ps5->id, 'room_id' => $room->id]);

        $this->postJson('/api/bookings/calculate', [
            'asset_ids' => [$assetOne->id, $assetTwo->id],
            'start_time' => '2026-04-25T10:00:00+05:00',
            'duration_hours' => 2,
        ], $this->authHeaders())
            ->assertOk()
            ->assertJsonPath('hourly_rate_total', 45000)
            ->assertJsonPath('total_cost', 90000)
            ->assertJsonPath('breakdown.0.type', 'bundle')
            ->assertJsonPath('breakdown.0.service_id', $bundle->id)
            ->assertJsonPath('breakdown.0.service_name', 'Gaming Mix')
            ->assertJsonPath('breakdown.0.subtotal', 45000)
            ->assertJsonPath('breakdown.0.requirements.computer', 1)
            ->assertJsonPath('breakdown.0.requirements.ps5', 1);
    }

    public function test_booking_calculation_rejects_assets_without_a_valid_service_price(): void
    {
        $room = Room::create(['name' => '2-xona']);
        $pricedService = Service::create(['name' => 'Computer', 'price' => 20000]);
        $missingPriceService = Service::create(['name' => 'Projector', 'price' => null]);
        $assetOne = Asset::create(['name' => 'computer1', 'service_id' => $pricedService->id, 'room_id' => $room->id]);
        $assetTwo = Asset::create(['name' => 'projector1', 'service_id' => $missingPriceService->id, 'room_id' => $room->id]);

        $this->postJson('/api/bookings/calculate', [
            'asset_ids' => [$assetOne->id, $assetTwo->id],
            'start_time' => '2026-04-25T10:00:00+05:00',
            'duration_hours' => 1,
        ], $this->authHeaders())
            ->assertStatus(400)
            ->assertJsonPath('message', 'Bad request.')
            ->assertJsonPath('errors.asset_ids.0', 'projector1 has no valid base service rate.');
    }

    public function test_active_session_payload_includes_asset_order_within_room_service_group(): void
    {
        $room = Room::create(['name' => 'Opshiy zal']);
        $service = Service::create(['name' => 'Computer', 'price' => 20000]);

        Asset::create(['name' => 'computer1', 'service_id' => $service->id, 'room_id' => $room->id]);
        $targetAsset = Asset::create(['name' => 'computer2', 'service_id' => $service->id, 'room_id' => $room->id]);

        $this->postJson('/api/bookings', [
            'asset_ids' => [$targetAsset->id],
            'start_time' => '2026-04-25T10:00:00+05:00',
            'duration_hours' => 1,
            'status' => 'submitted',
        ], $this->authHeaders())
            ->assertCreated()
            ->assertJsonPath('room_label', 'Opshiy zal')
            ->assertJsonPath('assets.0.name', 'computer2')
            ->assertJsonPath('assets.0.service_name', 'Computer')
            ->assertJsonPath('assets.0.room_name', 'Opshiy zal')
            ->assertJsonPath('assets.0.asset_order', 2);
    }

    public function test_booking_create_uses_service_prices_and_stays_active_without_creating_trade(): void
    {
        Carbon::setTestNow('2026-04-25T09:00:00+05:00');

        [$assetOne, $assetTwo] = $this->createPricedAssets();

        $this->postJson('/api/bookings', [
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
            ->assertJsonPath('debt_name', 'Alex Debt')
            ->assertJsonPath('debt_phone_number', '+998991234567')
            ->assertJsonPath('requested_duration_hours', 2)
            ->assertJsonPath('total_cost', 110000)
            ->assertJsonPath('trade_exists', false)
            ->assertJsonPath('is_vip', false)
            ->assertJsonPath('pricing.label', 'Service pricing');

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
    }

    public function test_booking_create_uses_dynamic_bundle_pricing_when_selected_assets_match_bundle(): void
    {
        Carbon::setTestNow('2026-04-25T09:00:00+05:00');

        $room = Room::create(['name' => 'Opshiy zal']);
        $computer = Service::create(['name' => 'Computer', 'price' => 20000]);
        $ps5 = Service::create(['name' => 'PS5', 'price' => 35000]);
        Service::create([
            'name' => 'Gaming Mix',
            'price' => 45000,
            'requirements' => [
                'computer' => 1,
                'ps5' => 1,
            ],
        ]);

        $assetOne = Asset::create(['name' => 'computer1', 'service_id' => $computer->id, 'room_id' => $room->id]);
        $assetTwo = Asset::create(['name' => 'ps5(1)', 'service_id' => $ps5->id, 'room_id' => $room->id]);

        $this->postJson('/api/bookings', [
            'asset_ids' => [$assetOne->id, $assetTwo->id],
            'start_time' => '2026-04-25T10:00:00+05:00',
            'duration_hours' => 2,
            'status' => 'submitted',
        ], $this->authHeaders())
            ->assertCreated()
            ->assertJsonPath('total_cost', 90000)
            ->assertJsonPath('pricing.label', 'Dynamic bundle pricing')
            ->assertJsonPath('pricing.hourly_rate', 45000);
    }

    public function test_manual_session_end_creates_trade_and_updates_asset_stats_using_service_prices(): void
    {
        Carbon::setTestNow('2026-04-25T09:00:00+05:00');

        [$assetOne, $assetTwo] = $this->createPricedAssets();

        $bookingId = $this->postJson('/api/bookings', [
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
            ->assertJsonPath('total_cost', 110000)
            ->assertJsonPath('trade.status', 'submitted')
            ->assertJsonPath('trade.session_status', 'completed')
            ->assertJsonPath('trade.saved_cost', 110000)
            ->assertJsonPath('trade.duration_minutes', 120);

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

        [$assetOne, $assetTwo] = $this->createPricedAssets();

        $bookingId = $this->postJson('/api/bookings', [
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

    public function test_booking_create_requires_debt_fields_with_updated_labels(): void
    {
        Carbon::setTestNow('2026-04-25T09:00:00+05:00');

        [$assetOne] = $this->createPricedAssets();

        $this->postJson('/api/bookings', [
            'asset_ids' => [$assetOne->id],
            'start_time' => '2026-04-25T10:00:00+05:00',
            'duration_hours' => 1,
            'status' => 'debt_closed',
        ], $this->authHeaders())
            ->assertStatus(400)
            ->assertJsonPath('errors.debt_name.0', 'Qarzdorning ismi maydoni qarz uchun majburiy.')
            ->assertJsonPath('errors.debt_phone_number.0', 'Qarzdorning telefon raqami maydoni qarz uchun majburiy.');
    }

    public function test_finance_ledger_excludes_active_sessions_and_keeps_existing_filters(): void
    {
        $room = Room::create(['name' => 'Opshiy zal']);

        Booking::create([
            'tariff_id' => null,
            'tariff_name_snapshot' => 'Service pricing',
            'hourly_rate_snapshot' => 20000,
            'asset_snapshot' => [[
                'id' => 1,
                'name' => 'computer1',
                'category' => 'Computer',
                'room_id' => $room->id,
                'room_name' => $room->name,
                'room_number' => $room->name,
                'hourly_price' => 20000,
            ]],
            'asset_stats_recorded' => true,
            'start_time' => '2026-04-25T10:00:00+05:00',
            'end_time' => '2030-04-25T12:00:00+05:00',
            'duration_minutes' => 120,
            'requested_duration_hours' => 2,
            'total_cost' => 40000,
            'status' => 'submitted',
            'session_status' => 'active',
        ]);

        $completedIncomeBooking = Booking::create([
            'tariff_id' => null,
            'tariff_name_snapshot' => 'Service pricing',
            'hourly_rate_snapshot' => 20000,
            'asset_snapshot' => [[
                'id' => 2,
                'name' => 'computer2',
                'category' => 'Computer',
                'room_id' => $room->id,
                'room_name' => $room->name,
                'room_number' => $room->name,
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
            'tariff_id' => null,
            'tariff_name_snapshot' => 'Service pricing',
            'hourly_rate_snapshot' => 35000,
            'asset_snapshot' => [[
                'id' => 3,
                'name' => 'ps5(1)',
                'category' => 'PS5',
                'room_id' => $room->id,
                'room_name' => $room->name,
                'room_number' => $room->name,
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
            'tariff_id' => null,
            'tariff_name' => 'Service pricing',
            'hourly_rate' => 20000,
            'payment_status' => 'submitted',
            'session_status' => 'completed',
            'start_time' => '2026-04-25T10:00:00+05:00',
            'end_time' => '2026-04-25T12:00:00+05:00',
            'duration_minutes' => 120,
            'total_cost' => 40000,
            'asset_snapshot' => [[
                'id' => 2,
                'name' => 'computer2',
                'category' => 'Computer',
                'room_id' => $room->id,
                'room_name' => $room->name,
                'room_number' => $room->name,
                'hourly_price' => 20000,
            ]],
            'assets_count' => 1,
        ]);

        Trade::create([
            'booking_id' => $completedDebtBooking->id,
            'tariff_id' => null,
            'tariff_name' => 'Service pricing',
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
                'name' => 'ps5(1)',
                'category' => 'PS5',
                'room_id' => $room->id,
                'room_name' => $room->name,
                'room_number' => $room->name,
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

    public function test_service_finance_summary_and_details_only_include_completed_service_trades(): void
    {
        $headers = $this->authHeaders();
        $cashier = User::where('phone_number', '+998901234567')->firstOrFail();
        $room = Room::create(['name' => 'Opshiy zal']);

        Booking::create([
            'tariff_name_snapshot' => 'Service pricing',
            'hourly_rate_snapshot' => 20000,
            'asset_snapshot' => [[
                'id' => 99,
                'name' => 'computer-active',
                'service_name' => 'Computer',
                'room_id' => $room->id,
                'room_name' => $room->name,
                'room_number' => $room->name,
                'asset_order' => 1,
                'hourly_price' => 20000,
            ]],
            'asset_stats_recorded' => true,
            'start_time' => '2026-04-25T09:00:00+05:00',
            'end_time' => '2030-04-25T10:00:00+05:00',
            'duration_minutes' => 60,
            'requested_duration_hours' => 1,
            'total_cost' => 20000,
            'status' => 'submitted',
            'session_status' => 'active',
        ]);

        $paidTrade = Trade::create([
            'booking_id' => null,
            'tariff_name' => 'Service pricing',
            'hourly_rate' => 20000,
            'payment_status' => 'submitted',
            'session_status' => 'completed',
            'start_time' => '2026-04-25T10:00:00+05:00',
            'end_time' => '2026-04-25T11:15:30+05:00',
            'duration_minutes' => 75,
            'total_cost' => 25000,
            'asset_snapshot' => [[
                'id' => 2,
                'name' => 'computer2',
                'service_name' => 'Computer',
                'room_id' => $room->id,
                'room_name' => $room->name,
                'room_number' => $room->name,
                'asset_order' => 1,
                'hourly_price' => 20000,
            ]],
            'assets_count' => 1,
        ]);

        $completedDebtBooking = Booking::create([
            'tariff_name_snapshot' => 'Service pricing',
            'hourly_rate_snapshot' => 35000,
            'asset_snapshot' => [[
                'id' => 3,
                'name' => 'ps5(1)',
                'service_name' => 'PS5',
                'room_id' => $room->id,
                'room_name' => $room->name,
                'room_number' => $room->name,
                'asset_order' => 1,
                'hourly_price' => 35000,
            ]],
            'asset_stats_recorded' => true,
            'start_time' => '2026-04-24T08:00:00+05:00',
            'end_time' => '2026-04-25T10:00:00+05:00',
            'ended_at' => '2026-04-25T10:00:00+05:00',
            'duration_minutes' => 1560,
            'requested_duration_hours' => 26,
            'total_cost' => 50000,
            'status' => 'debt_closed',
            'session_status' => 'completed',
            'debt_name' => 'Vali',
            'debt_phone_number' => '+998909876543',
        ]);

        $debtTrade = Trade::create([
            'booking_id' => $completedDebtBooking->id,
            'tariff_name' => 'Service pricing',
            'hourly_rate' => 35000,
            'payment_status' => 'debt_closed',
            'session_status' => 'completed',
            'start_time' => '2026-04-24T08:00:00+05:00',
            'end_time' => '2026-04-25T10:00:00+05:00',
            'duration_minutes' => 1560,
            'total_cost' => 50000,
            'debt_name' => 'Vali',
            'debt_phone_number' => '+998909876543',
            'asset_snapshot' => [[
                'id' => 3,
                'name' => 'ps5(1)',
                'service_name' => 'PS5',
                'room_id' => $room->id,
                'room_name' => $room->name,
                'room_number' => $room->name,
                'asset_order' => 1,
                'hourly_price' => 35000,
            ]],
            'assets_count' => 1,
        ]);

        Trade::create([
            'booking_id' => null,
            'tariff_name' => 'Service pricing',
            'hourly_rate' => 15000,
            'payment_status' => 'submitted',
            'session_status' => 'cancelled',
            'start_time' => '2026-04-25T12:00:00+05:00',
            'end_time' => '2026-04-25T13:00:00+05:00',
            'duration_minutes' => 60,
            'total_cost' => 15000,
            'asset_snapshot' => [[
                'id' => 4,
                'name' => 'cancelled-device',
                'service_name' => 'Simulator',
                'room_id' => $room->id,
                'room_name' => $room->name,
                'room_number' => $room->name,
                'asset_order' => 1,
                'hourly_price' => 15000,
            ]],
            'assets_count' => 1,
        ]);

        $sale = CheckoutSale::create([
            'user_id' => $cashier->id,
            'payment_method' => 'cash',
            'total_amount' => 15000,
        ]);

        CheckoutSaleItem::create([
            'checkout_sale_id' => $sale->id,
            'manufacturer_name' => 'Pepsi',
            'product_name' => 'Pepsi 0.5L',
            'barcode' => '4780099999999',
            'unit' => 'bottle',
            'quantity' => 1,
            'unit_price' => 15000,
            'total_price' => 15000,
        ]);

        $this->getJson('/api/finance/service-summary', $headers)
            ->assertOk()
            ->assertJsonPath('total_duration_seconds', 98130)
            ->assertJsonPath('total_duration_formatted', '27:15:30')
            ->assertJsonPath('total_income', 75000)
            ->assertJsonPath('total_records', 2);

        $details = $this->getJson('/api/finance/service-details', $headers)
            ->assertOk()
            ->assertJsonPath('summary.total_duration_seconds', 98130)
            ->assertJsonPath('summary.total_duration_formatted', '27:15:30')
            ->assertJsonPath('summary.total_income', 75000)
            ->assertJsonCount(2, 'assets')
            ->json();

        $paidAsset = collect($details['assets'])->firstWhere('asset_name', 'computer2');
        $debtAsset = collect($details['assets'])->firstWhere('asset_name', 'ps5(1)');

        $this->assertNotNull($paidAsset);
        $this->assertSame('Opshiy zal', $paidAsset['room_name']);
        $this->assertSame('Computer', $paidAsset['service_name']);
        $this->assertSame(1, $paidAsset['asset_order']);
        $this->assertSame('01:15:30', $paidAsset['total_duration_formatted']);
        $this->assertEquals(25000.0, $paidAsset['total_income']);
        $this->assertCount(1, $paidAsset['sessions']);
        $this->assertSame($paidTrade->id, $paidAsset['sessions'][0]['trade_id']);
        $this->assertSame('paid', $paidAsset['sessions'][0]['payment_status']);
        $this->assertSame("To'langan", $paidAsset['sessions'][0]['payment_status_label']);

        $this->assertNotNull($debtAsset);
        $this->assertSame($completedDebtBooking->id, $debtAsset['sessions'][0]['session_id']);
        $this->assertSame('26:00:00', $debtAsset['total_duration_formatted']);
        $this->assertSame('debt', $debtAsset['sessions'][0]['payment_status']);
        $this->assertSame('Qarz', $debtAsset['sessions'][0]['payment_status_label']);
        $this->assertSame('Vali', $debtAsset['sessions'][0]['debtor_name']);
        $this->assertSame('+998909876543', $debtAsset['sessions'][0]['debtor_phone']);
    }

    public function test_service_finance_details_allocate_multi_asset_trade_income_by_asset_pricing_weight(): void
    {
        $headers = $this->authHeaders();
        $room = Room::create(['name' => '2-xona']);

        Trade::create([
            'booking_id' => null,
            'tariff_name' => 'Service pricing',
            'hourly_rate' => 55000,
            'payment_status' => 'submitted',
            'session_status' => 'completed',
            'start_time' => '2026-04-25T12:00:00+05:00',
            'end_time' => '2026-04-25T14:00:00+05:00',
            'duration_minutes' => 120,
            'total_cost' => 110000,
            'asset_snapshot' => [
                [
                    'id' => 21,
                    'name' => 'computer1',
                    'service_name' => 'Computer',
                    'room_id' => $room->id,
                    'room_name' => $room->name,
                    'room_number' => $room->name,
                    'asset_order' => 1,
                    'hourly_price' => 20000,
                ],
                [
                    'id' => 22,
                    'name' => 'ps5(1)',
                    'service_name' => 'PS5',
                    'room_id' => $room->id,
                    'room_name' => $room->name,
                    'room_number' => $room->name,
                    'asset_order' => 1,
                    'hourly_price' => 35000,
                ],
            ],
            'assets_count' => 2,
        ]);

        $assets = $this->getJson('/api/finance/service-details', $headers)
            ->assertOk()
            ->json('assets');

        $computerAsset = collect($assets)->firstWhere('asset_name', 'computer1');
        $ps5Asset = collect($assets)->firstWhere('asset_name', 'ps5(1)');

        $this->assertNotNull($computerAsset);
        $this->assertNotNull($ps5Asset);
        $this->assertSame('02:00:00', $computerAsset['total_duration_formatted']);
        $this->assertSame('02:00:00', $ps5Asset['total_duration_formatted']);
        $this->assertEquals(40000.0, $computerAsset['total_income']);
        $this->assertEquals(70000.0, $ps5Asset['total_income']);
        $this->assertEquals(110000.0, (float) $computerAsset['total_income'] + (float) $ps5Asset['total_income']);
    }

    public function test_debt_list_includes_active_and_saved_records_without_duplicates_and_survives_session_deletion(): void
    {
        Carbon::setTestNow('2026-04-25T09:00:00+05:00');

        [$assetOne, $assetTwo] = $this->createPricedAssets();

        $activeDebtBookingId = $this->postJson('/api/bookings', [
            'asset_ids' => [$assetOne->id],
            'start_time' => '2026-04-25T11:30:00+05:00',
            'duration_hours' => 3,
            'status' => 'debt_closed',
            'debt_name' => 'Ali',
            'debt_phone_number' => '+998901234567',
        ], $this->authHeaders())
            ->assertCreated()
            ->json('id');

        $endedDebtBookingId = $this->postJson('/api/bookings', [
            'asset_ids' => [$assetTwo->id],
            'start_time' => '2026-04-25T12:00:00+05:00',
            'duration_hours' => 2,
            'status' => 'debt_closed',
            'debt_name' => 'Vali',
            'debt_phone_number' => '+998909876543',
        ], $this->authHeaders())
            ->assertCreated()
            ->json('id');

        Carbon::setTestNow('2026-04-25T13:00:00+05:00');

        $endedTradeId = $this->postJson("/api/sessions/{$endedDebtBookingId}/end", [], $this->authHeaders())
            ->assertOk()
            ->assertJsonPath('trade.status', 'debt_closed')
            ->assertJsonPath('trade.saved_cost', 35000)
            ->json('trade.id');
        $this->assertNotNull($endedTradeId);

        $debtResponse = $this->getJson('/api/debts', $this->authHeaders())
            ->assertOk()
            ->assertJsonCount(2);

        $debtRecords = $debtResponse->json();

        $activeRecord = collect($debtRecords)->firstWhere('booking_id', $activeDebtBookingId);
        $endedRecord = collect($debtRecords)->firstWhere('trade_id', $endedTradeId);

        $this->assertNotNull($activeRecord);
        $this->assertSame('Ali', $activeRecord['debtor_name']);
        $this->assertSame('+998901234567', $activeRecord['debtor_phone_number']);
        $this->assertSame('booking', $activeRecord['source']);
        $this->assertSame('active', $activeRecord['session_state']);
        $this->assertSame('unpaid', $activeRecord['payment_state']);
        $this->assertEquals(60000.0, $activeRecord['final_cost']);

        $this->assertNotNull($endedRecord);
        $this->assertSame('Vali', $endedRecord['debtor_name']);
        $this->assertSame('+998909876543', $endedRecord['debtor_phone_number']);
        $this->assertSame('trade', $endedRecord['source']);
        $this->assertSame('ended', $endedRecord['session_state']);
        $this->assertSame('unpaid', $endedRecord['payment_state']);
        $this->assertEquals(35000.0, $endedRecord['final_cost']);

        $bootstrapDebts = $this->getJson('/api/dashboard/bootstrap', $this->authHeaders())
            ->assertOk()
            ->assertJsonCount(2, 'debts')
            ->json('debts');

        $this->assertCount(1, collect($bootstrapDebts)->where('debtor_name', 'Ali'));
        $this->assertCount(1, collect($bootstrapDebts)->where('debtor_name', 'Vali'));

        $this->deleteJson("/api/sessions/{$endedDebtBookingId}", [], $this->authHeaders())
            ->assertNoContent();

        $debtResponseAfterDelete = $this->getJson('/api/debts', $this->authHeaders())
            ->assertOk()
            ->assertJsonCount(2);

        $debtRecordsAfterDelete = $debtResponseAfterDelete->json();
        $remainingEndedRecord = collect($debtRecordsAfterDelete)->firstWhere('trade_id', $endedTradeId);

        $this->assertNotNull($remainingEndedRecord);
        $this->assertNull($remainingEndedRecord['booking_id']);
        $this->assertSame('Vali', $remainingEndedRecord['debtor_name']);
        $this->assertCount(1, collect($debtRecordsAfterDelete)->where('debtor_name', 'Vali'));
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

    protected function createPricedAssets(): array
    {
        $room = Room::create(['name' => 'Opshiy zal']);
        $computer = Service::create(['name' => 'Computer', 'price' => 20000]);
        $ps5 = Service::create(['name' => 'PS5', 'price' => 35000]);

        return [
            Asset::create([
                'name' => 'computer1',
                'service_id' => $computer->id,
                'room_id' => $room->id,
            ]),
            Asset::create([
                'name' => 'ps5(1)',
                'service_id' => $ps5->id,
                'room_id' => $room->id,
            ]),
        ];
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
