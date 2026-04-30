<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthRegistrationMailTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_register_and_it_attempts_to_send_email(): void
    {
        $data = [
            'name' => 'User3',
            'gmail' => 'user3@gmail.com',
            'phone_number' => '+998777777777',
            'password' => 'User$H123',
        ];

        $response = $this->postJson('/api/auth/register', $data);

        $response->assertStatus(201);
        $response->assertJson(['message' => 'User registered successfully']);
        $response->assertJsonPath('user.name', 'User3');

        $this->assertDatabaseHas('users', [
            'name' => 'User3',
            'gmail' => 'user3@gmail.com',
            'phone_number' => '+998777777777',
        ]);
    }
}
