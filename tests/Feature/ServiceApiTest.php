<?php

namespace Tests\Feature;

use App\Models\Room;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class ServiceApiTest extends TestCase
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

    public function test_rooms_assets_and_booking_actions_require_services_first(): void
    {
        $room = Room::create(['name' => 'Opshiy zal']);

        $this->postJson('/api/rooms', [
            'name' => 'VIP xona',
        ], $this->authHeaders())
            ->assertStatus(409)
            ->assertJsonPath('message', 'Create services first. Services define asset categories and prices.')
            ->assertJsonPath('code', 'services_required');

        $this->postJson('/api/assets', [
            'name' => 'computer1',
            'service_id' => 1,
            'room_id' => $room->id,
        ], $this->authHeaders())
            ->assertStatus(409)
            ->assertJsonPath('message', 'Create services first. Services define asset categories and prices.')
            ->assertJsonPath('code', 'services_required');

        $this->postJson('/api/bookings/calculate', [
            'asset_ids' => [1],
            'start_time' => '2026-04-25T10:00:00+05:00',
            'duration_hours' => 1,
        ], $this->authHeaders())
            ->assertStatus(409)
            ->assertJsonPath('message', 'Create services first. Services define asset categories and prices.')
            ->assertJsonPath('code', 'services_required');

        $this->postJson('/api/bookings', [
            'asset_ids' => [1],
            'start_time' => '2026-04-25T10:00:00+05:00',
            'duration_hours' => 1,
            'status' => 'submitted',
        ], $this->authHeaders())
            ->assertStatus(409)
            ->assertJsonPath('message', 'Create services first. Services define asset categories and prices.')
            ->assertJsonPath('code', 'services_required');
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
                'name' => 'Service User',
                'gmail' => 'service-user@example.test',
                'password_hash' => Hash::make('secret123'),
            ],
        );

        return $this->postJson('/api/auth/login', [
            'phone_number' => '+998901234567',
            'password' => 'secret123',
        ])->json('token');
    }
}
