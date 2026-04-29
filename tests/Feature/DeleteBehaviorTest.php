<?php

namespace Tests\Feature;

use App\Models\Asset;
use App\Models\Booking;
use App\Models\Manufacturer;
use App\Models\Tariff;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class DeleteBehaviorTest extends TestCase
{
    use RefreshDatabase;

    public function test_tariff_can_be_deleted_without_removing_existing_bookings(): void
    {
        $tariff = Tariff::create([
            'name' => 'Night Tariff',
            'hourly_cost' => 50000,
        ]);

        $asset = Asset::create([
            'category' => 'Computer',
            'room_id' => 9,
        ]);

        $booking = Booking::create([
            'tariff_id' => $tariff->id,
            'start_time' => '2026-04-28T10:00:00+05:00',
            'end_time' => '2026-04-28T12:00:00+05:00',
            'duration_minutes' => 120,
            'total_cost' => 100000,
            'status' => 'submitted',
        ]);

        $booking->assets()->sync([$asset->id]);

        $this->deleteJson("/api/tariffs/{$tariff->id}", [], $this->authHeaders())
            ->assertNoContent();

        $this->assertDatabaseMissing('tariffs', ['id' => $tariff->id]);
        $this->assertDatabaseHas('bookings', [
            'id' => $booking->id,
            'tariff_id' => null,
        ]);
    }

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
            ]);

        $this->deleteJson("/api/warehouse/{$product->id}", [], $this->authHeaders())
            ->assertNoContent();

        $this->deleteJson("/api/manufacturers/{$manufacturer->id}", [], $this->authHeaders())
            ->assertNoContent();

        $this->assertDatabaseMissing('manufacturers', ['id' => $manufacturer->id]);
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
