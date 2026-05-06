<?php

namespace Tests\Feature;

use App\Models\Room;
use App\Models\Service;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AssetCategoryFlexibilityTest extends TestCase
{
    use RefreshDatabase;

    public function test_assets_must_reference_existing_service_categories_and_rooms(): void
    {
        $room = Room::create(['name' => 'Opshiy zal']);
        $service = Service::create(['name' => 'Computer', 'price' => 20000]);

        $createResponse = $this->postJson('/api/assets', [
            'name' => 'computer1',
            'service_id' => $service->id,
            'room_id' => $room->id,
        ], $this->authHeaders());

        $assetId = $createResponse
            ->assertCreated()
            ->assertJsonPath('name', 'computer1')
            ->assertJsonPath('category', 'Computer')
            ->assertJsonPath('room.id', $room->id)
            ->assertJsonPath('service.id', $service->id)
            ->json('id');

        $updatedService = Service::create(['name' => 'PS5', 'price' => 35000]);

        $this->patchJson("/api/assets/{$assetId}", [
            'name' => 'ps5(1)',
            'service_id' => $updatedService->id,
        ], $this->authHeaders())
            ->assertOk()
            ->assertJsonPath('name', 'ps5(1)')
            ->assertJsonPath('category', 'PS5');

        $this->assertDatabaseHas('assets', [
            'id' => $assetId,
            'name' => 'ps5(1)',
            'service_id' => $updatedService->id,
            'room_id' => $room->id,
        ]);

        $this->getJson('/api/dashboard/bootstrap', $this->authHeaders())
            ->assertOk()
            ->assertJsonFragment([
                'backend_id' => $assetId,
                'name' => 'ps5(1)',
                'category' => 'PS5',
                'room_name' => 'Opshiy zal',
            ]);
    }

    public function test_asset_creation_fails_for_missing_service_category(): void
    {
        $room = Room::create(['name' => '2-xona']);
        Service::create(['name' => 'Computer', 'price' => 20000]);

        $this->postJson('/api/assets', [
            'name' => 'computer2',
            'service_id' => 9999,
            'room_id' => $room->id,
        ], $this->authHeaders())
            ->assertStatus(400)
            ->assertJsonPath('errors.service_id.0', 'The selected service id is invalid.');
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
                'name' => 'Asset Test User',
                'gmail' => 'asset-user@example.test',
                'password_hash' => Hash::make('secret123'),
            ],
        );

        return $this->postJson('/api/auth/login', [
            'phone_number' => '+998901234567',
            'password' => 'secret123',
        ])->json('token');
    }
}
