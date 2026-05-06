<?php

namespace Tests\Feature;

use App\Models\Tariff;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class ServiceAndTariffApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_service_price_is_required_and_room_number_is_not_needed(): void
    {
        $this->postJson('/api/services', [
            'name' => 'Computer',
        ], $this->authHeaders())
            ->assertStatus(400)
            ->assertJsonPath('message', 'Bad request.')
            ->assertJsonPath('errors.price.0', 'The price field is required.');

        $this->postJson('/api/services', [
            'name' => 'Computer',
            'price' => 20000,
        ], $this->authHeaders())
            ->assertCreated()
            ->assertJsonPath('name', 'Computer')
            ->assertJsonPath('price', 20000)
            ->assertJsonMissingPath('room_id');
    }

    public function test_tariff_can_store_and_update_category_prices(): void
    {
        $createResponse = $this->postJson('/api/tariffs', [
            'name' => 'Standard',
            'category_prices' => [
                ['category' => 'Computer', 'hourly_price' => 20000],
                ['category' => 'PS5', 'hourly_price' => 35000],
            ],
        ], $this->authHeaders())
            ->assertCreated()
            ->assertJsonPath('name', 'Standard')
            ->assertJsonPath('hourly_cost', 20000)
            ->assertJsonCount(2, 'category_prices');

        $tariffId = $createResponse->json('backend_id');

        $this->patchJson("/api/tariffs/{$tariffId}", [
            'name' => 'Standard Plus',
            'category_prices' => [
                ['category' => 'Computer', 'hourly_price' => 22000],
                ['category' => 'PS5', 'hourly_price' => 36000],
                ['category' => 'VR headset', 'hourly_price' => 45000],
            ],
        ], $this->authHeaders())
            ->assertOk()
            ->assertJsonPath('name', 'Standard Plus')
            ->assertJsonPath('hourly_cost', 22000)
            ->assertJsonCount(3, 'category_prices');

        $tariff = Tariff::query()->with('categoryPrices')->findOrFail($tariffId);

        $this->assertSame('Standard Plus', $tariff->name);
        $this->assertSame(22000.0, (float) $tariff->hourly_cost);
        $this->assertCount(3, $tariff->categoryPrices);
        $this->assertNotNull($tariff->categoryPrices->firstWhere('category_key', 'computer'));
        $this->assertNotNull($tariff->categoryPrices->firstWhere('category_key', 'ps5'));
        $this->assertNotNull($tariff->categoryPrices->firstWhere('category_key', 'vr headset'));
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
                'name' => 'Service Tariff User',
                'gmail' => 'service-tariff@example.test',
                'password_hash' => Hash::make('secret123'),
            ],
        );

        return $this->postJson('/api/auth/login', [
            'phone_number' => '+998901234567',
            'password' => 'secret123',
        ])->json('token');
    }
}
