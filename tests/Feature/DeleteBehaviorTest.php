<?php

namespace Tests\Feature;

use App\Models\Asset;
use App\Models\Booking;
use App\Models\Manufacturer;
use App\Models\Room;
use App\Models\Service;
use App\Models\Trade;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class DeleteBehaviorTest extends TestCase
{
    use RefreshDatabase;

    public function test_deleting_a_product_keeps_the_manufacturer_record_and_bootstrap_company(): void
    {
        $product = Warehouse::create([
            'manufacturer' => 'Coca-Cola',
            'product_name' => 'Coca-Cola Zero',
            'shtrix_code' => '1234567890001',
            'unit' => 'bottle',
            'count' => 10,
            'purchase_price' => 7000,
            'sell_price' => 10000,
        ])->refresh();

        $manufacturer = Manufacturer::findOrFail($product->manufacturer_id);

        $this->deleteJson("/api/warehouse/{$product->id}", [], $this->authHeaders())
            ->assertNoContent();

        $this->assertDatabaseMissing('warehouse', ['id' => $product->id]);
        $this->assertDatabaseHas('manufacturers', [
            'id' => $manufacturer->id,
            'name' => 'Coca-Cola',
        ]);

        $payload = $this->getJson('/api/dashboard/bootstrap', $this->authHeaders())
            ->assertOk()
            ->json();

        $company = collect($payload['companies'])->firstWhere('backend_id', $manufacturer->id);

        $this->assertNotNull($company);
        $this->assertSame('Coca-Cola', $company['name']);
        $this->assertSame([], $company['products']);
    }

    public function test_manufacturer_requires_a_separate_delete_action_and_cannot_be_removed_while_products_exist(): void
    {
        $product = Warehouse::create([
            'manufacturer' => 'Pepsi',
            'product_name' => 'Pepsi Max',
            'shtrix_code' => '1234567890002',
            'unit' => 'bottle',
            'count' => 8,
            'purchase_price' => 6500,
            'sell_price' => 9500,
        ])->refresh();

        $manufacturer = Manufacturer::findOrFail($product->manufacturer_id);

        $this->deleteJson("/api/manufacturers/{$manufacturer->id}", [], $this->authHeaders())
            ->assertStatus(409)
            ->assertJson([
                'message' => 'Delete the manufacturer only after deleting all of its products.',
                'message_uz' => "Bu ishlab chiqaruvchiga tegishli mahsulotlar mavjud. Avval mahsulotlarni o'chiring.",
            ]);

        $this->deleteJson("/api/warehouse/{$product->id}", [], $this->authHeaders())
            ->assertNoContent();

        $this->deleteJson("/api/manufacturers/{$manufacturer->id}", [], $this->authHeaders())
            ->assertNoContent();

        $this->assertDatabaseMissing('manufacturers', ['id' => $manufacturer->id]);
    }

    public function test_room_must_be_empty_before_it_can_be_deleted(): void
    {
        $room = Room::create(['name' => 'VIP xona']);
        $service = Service::create(['name' => 'Computer', 'price' => 20000]);
        $asset = Asset::create([
            'name' => 'computer1',
            'service_id' => $service->id,
            'room_id' => $room->id,
        ]);

        $this->deleteJson("/api/rooms/{$room->id}", [], $this->authHeaders())
            ->assertStatus(409)
            ->assertJson([
                'message' => 'This room has assets. Delete its assets first.',
                'message_uz' => 'Bu xonada jihozlar bor. Avval jihozlarni o\'chiring.',
            ]);

        $this->deleteJson("/api/rooms/{$room->id}/assets", [], $this->authHeaders())
            ->assertOk()
            ->assertJsonPath('deleted_assets_count', 1);

        $this->assertDatabaseHas('rooms', ['id' => $room->id]);
        $this->assertDatabaseMissing('assets', ['id' => $asset->id]);

        $this->deleteJson("/api/rooms/{$room->id}", [], $this->authHeaders())
            ->assertNoContent();

        $this->assertDatabaseMissing('rooms', ['id' => $room->id]);
    }

    public function test_active_sessions_cannot_be_deleted_and_completed_sessions_require_a_trade_record(): void
    {
        $activeSession = Booking::create([
            'tariff_id' => null,
            'tariff_name_snapshot' => 'Service pricing',
            'hourly_rate_snapshot' => 50000,
            'asset_snapshot' => [['id' => 1, 'category' => 'Computer', 'room_id' => 10, 'room_number' => '10']],
            'asset_stats_recorded' => true,
            'start_time' => '2026-04-28T10:00:00+05:00',
            'end_time' => '2030-04-28T12:00:00+05:00',
            'duration_minutes' => 120,
            'total_cost' => 100000,
            'status' => 'submitted',
            'session_status' => 'active',
        ]);

        $completedWithoutTrade = Booking::create([
            'tariff_id' => null,
            'tariff_name_snapshot' => 'Service pricing',
            'hourly_rate_snapshot' => 50000,
            'asset_snapshot' => [['id' => 2, 'category' => 'PS', 'room_id' => 11, 'room_number' => '11']],
            'asset_stats_recorded' => true,
            'start_time' => '2026-04-28T12:00:00+05:00',
            'end_time' => '2026-04-28T14:00:00+05:00',
            'ended_at' => '2026-04-28T14:00:00+05:00',
            'duration_minutes' => 120,
            'total_cost' => 100000,
            'status' => 'submitted',
            'session_status' => 'completed',
        ]);

        $completedWithTrade = Booking::create([
            'tariff_id' => null,
            'tariff_name_snapshot' => 'Service pricing',
            'hourly_rate_snapshot' => 50000,
            'asset_snapshot' => [['id' => 3, 'category' => 'Computer', 'room_id' => 12, 'room_number' => '12']],
            'asset_stats_recorded' => true,
            'start_time' => '2026-04-28T15:00:00+05:00',
            'end_time' => '2026-04-28T17:00:00+05:00',
            'ended_at' => '2026-04-28T17:00:00+05:00',
            'duration_minutes' => 120,
            'total_cost' => 100000,
            'status' => 'submitted',
            'session_status' => 'completed',
        ]);

        $trade = Trade::create([
            'booking_id' => $completedWithTrade->id,
            'tariff_id' => null,
            'tariff_name' => 'Service pricing',
            'hourly_rate' => 50000,
            'payment_status' => 'submitted',
            'session_status' => 'completed',
            'start_time' => '2026-04-28T15:00:00+05:00',
            'end_time' => '2026-04-28T17:00:00+05:00',
            'duration_minutes' => 120,
            'total_cost' => 100000,
            'asset_snapshot' => [['id' => 3, 'category' => 'Computer', 'room_id' => 12, 'room_number' => '12']],
            'assets_count' => 1,
        ]);

        $this->deleteJson("/api/sessions/{$activeSession->id}", [], $this->authHeaders())
            ->assertStatus(409)
            ->assertJson([
                'message' => 'Active sessions cannot be deleted.',
            ]);

        $this->deleteJson("/api/sessions/{$completedWithoutTrade->id}", [], $this->authHeaders())
            ->assertStatus(409)
            ->assertJson([
                'message' => 'Completed session cannot be deleted before its trade history is saved.',
            ]);

        $this->deleteJson("/api/sessions/{$completedWithTrade->id}", [], $this->authHeaders())
            ->assertNoContent();

        $this->assertDatabaseMissing('bookings', ['id' => $completedWithTrade->id]);
        $this->assertDatabaseHas('trades', ['id' => $trade->id]);
    }

    public function test_paid_debt_deletion_hides_the_record_from_all_debt_list_sources(): void
    {
        $trade = Trade::create([
            'booking_id' => null,
            'tariff_id' => null,
            'tariff_name' => 'Service pricing',
            'hourly_rate' => 50000,
            'payment_status' => 'submitted',
            'session_status' => 'completed',
            'start_time' => '2026-05-01T10:00:00+05:00',
            'end_time' => '2026-05-01T11:00:00+05:00',
            'duration_minutes' => 60,
            'total_cost' => 50000,
            'debt_name' => 'Ali',
            'debt_phone_number' => '+998901234567',
            'asset_snapshot' => [['id' => 1, 'category' => 'Computer', 'room_id' => 1, 'room_number' => 'VIP 1']],
            'assets_count' => 1,
        ]);

        $debtId = "trade-{$trade->id}";

        $this->getJson('/api/debts', $this->authHeaders())
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.id', $debtId)
            ->assertJsonPath('0.payment_state', 'paid')
            ->assertJsonPath('0.remaining_amount', 0)
            ->assertJsonPath('0.can_delete', true);

        $this->deleteJson("/api/debts/{$debtId}", [], $this->authHeaders())
            ->assertOk()
            ->assertJson([
                'message' => 'Debt removed from list',
            ]);

        $this->assertDatabaseHas('trades', [
            'id' => $trade->id,
            'is_deleted_from_debts' => true,
        ]);

        $this->getJson('/api/debts', $this->authHeaders())
            ->assertOk()
            ->assertJsonCount(0);

        $this->getJson('/api/dashboard/bootstrap', $this->authHeaders())
            ->assertOk()
            ->assertJsonCount(0, 'debts');

        $this->assertDatabaseHas('trades', ['id' => $trade->id]);
    }

    public function test_unpaid_debts_cannot_be_deleted_from_the_debtors_list(): void
    {
        $booking = Booking::create([
            'tariff_id' => null,
            'tariff_name_snapshot' => 'Service pricing',
            'hourly_rate_snapshot' => 50000,
            'asset_snapshot' => [['id' => 2, 'category' => 'Computer', 'room_id' => 2, 'room_number' => 'VIP 2']],
            'asset_stats_recorded' => true,
            'start_time' => '2026-05-02T12:00:00+05:00',
            'end_time' => '2026-05-02T13:00:00+05:00',
            'ended_at' => '2026-05-02T13:00:00+05:00',
            'duration_minutes' => 60,
            'requested_duration_hours' => 1,
            'total_cost' => 50000,
            'status' => 'debt_closed',
            'session_status' => 'completed',
            'is_vip' => false,
            'debt_name' => 'Vali',
            'debt_phone_number' => '+998909876543',
        ]);

        $debtId = "booking-{$booking->id}";

        $this->deleteJson("/api/debts/{$debtId}", [], $this->authHeaders())
            ->assertStatus(409)
            ->assertJson([
                'message' => 'Faqat to\'liq to\'langan qarzlarni o\'chirish mumkin.',
            ]);

        $this->assertDatabaseHas('bookings', [
            'id' => $booking->id,
            'is_deleted_from_debts' => false,
        ]);

        $this->getJson('/api/debts', $this->authHeaders())
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.id', $debtId)
            ->assertJsonPath('0.payment_state', 'unpaid')
            ->assertJsonPath('0.can_delete', false);
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
                'name' => 'Delete Test User',
                'gmail' => 'delete-user@example.test',
                'password_hash' => Hash::make('secret123'),
            ],
        );

        return $this->postJson('/api/auth/login', [
            'phone_number' => '+998901234567',
            'password' => 'secret123',
        ])->json('token');
    }
}
