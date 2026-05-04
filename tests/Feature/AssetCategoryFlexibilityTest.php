<?php

namespace Tests\Feature;

use App\Models\Asset;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AssetCategoryFlexibilityTest extends TestCase
{
    use RefreshDatabase;

    public function test_assets_accept_and_return_custom_categories(): void
    {
        $createResponse = $this->postJson('/api/assets', [
            'category' => 'VR headset',
            'room_id' => 14,
        ], $this->authHeaders());

        $assetId = $createResponse
            ->assertCreated()
            ->assertJsonPath('category', 'VR headset')
            ->assertJsonPath('room_id', 14)
            ->json('id');

        $this->patchJson("/api/assets/{$assetId}", [
            'category' => 'Racing simulator',
        ], $this->authHeaders())
            ->assertOk()
            ->assertJsonPath('category', 'Racing simulator');

        $this->assertDatabaseHas('assets', [
            'id' => $assetId,
            'category' => 'Racing simulator',
            'room_id' => 14,
        ]);

        $this->getJson('/api/dashboard/bootstrap', $this->authHeaders())
            ->assertOk()
            ->assertJsonFragment([
                'backend_id' => $assetId,
                'category' => 'Racing simulator',
                'room_id' => 14,
                'room_number' => '14',
            ]);

        Asset::create([
            'category' => 'Computer',
            'room_id' => 15,
        ]);

        $this->assertDatabaseHas('assets', [
            'category' => 'Computer',
            'room_id' => 15,
        ]);
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
